import { NextResponse } from "next/server";

const SYSTEM_PROMPT =
  "You are a productive AI assistant. When given a task, think through it step by step. Format your final answer clearly with headers and bullet points.";

function getErrorMessage(body: unknown) {
  if (
    typeof body === "object" &&
    body !== null &&
    "error" in body &&
    typeof body.error === "object" &&
    body.error !== null &&
    "message" in body.error &&
    typeof body.error.message === "string"
  ) {
    return body.error.message;
  }

  return "The AI provider could not start the chat.";
}

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === "your_groq_api_key_here") {
    return NextResponse.json(
      { error: "Chat is not configured. Set GROQ_API_KEY in .env.local." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("message" in body) ||
    typeof body.message !== "string" ||
    body.message.trim().length === 0
  ) {
    return NextResponse.json(
      { error: "A non-empty message is required." },
      { status: 400 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: body.message },
        ],
      }),
      signal: request.signal,
    });
  } catch (error) {
    if (request.signal.aborted) {
      return new Response(null, { status: 499 });
    }

    console.error("Unable to reach Groq chat API.", error);
    return NextResponse.json(
      { error: "Unable to reach the AI provider. Please try again." },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    let responseBody: unknown;
    try {
      responseBody = await upstream.json();
    } catch (error) {
      console.error("Groq returned a non-JSON error response.", error);
    }

    const status =
      upstream.status === 429
        ? 429
        : upstream.status === 401 || upstream.status === 403
          ? 503
          : 502;
    console.error("Groq chat API returned an error.", {
      status: upstream.status,
      message: getErrorMessage(responseBody),
    });
    return NextResponse.json(
      {
        error:
          status === 429
            ? "The AI provider is busy. Please try again shortly."
            : status === 503
              ? "The Groq API key is invalid or does not have access."
              : "The AI provider could not start the chat.",
      },
      { status },
    );
  }

  if (!upstream.body) {
    return NextResponse.json(
      { error: "The AI provider returned an empty stream." },
      { status: 502 },
    );
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let finished = false;

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        while (!finished) {
          const newline = buffer.indexOf("\n");
          if (newline !== -1) {
            const line = buffer.slice(0, newline).trim();
            buffer = buffer.slice(newline + 1);
            if (!line.startsWith("data:")) continue;

            const data = line.slice(5).trim();
            if (data === "[DONE]") {
              finished = true;
              controller.close();
              return;
            }

            let event: unknown;
            try {
              event = JSON.parse(data);
            } catch (error) {
              console.error("Groq emitted malformed stream data.", error);
              controller.error(new Error("The AI provider returned invalid stream data."));
              return;
            }

            if (
              typeof event === "object" &&
              event !== null &&
              "choices" in event &&
              Array.isArray(event.choices)
            ) {
              const choice = event.choices[0];
              if (
                typeof choice === "object" &&
                choice !== null &&
                "delta" in choice &&
                typeof choice.delta === "object" &&
                choice.delta !== null &&
                "content" in choice.delta &&
                typeof choice.delta.content === "string"
              ) {
                controller.enqueue(encoder.encode(choice.delta.content));
                return;
              }
            }
            continue;
          }

          const { done, value } = await reader.read();
          if (done) {
            buffer += decoder.decode();
            if (buffer.trim()) {
              controller.error(new Error("The AI provider ended with an incomplete stream event."));
              return;
            }
            finished = true;
            controller.close();
            return;
          }
          buffer += decoder.decode(value, { stream: true });
        }
      } catch (error) {
        console.error("Groq chat stream failed.", error);
        controller.error(error);
      }
    },
    async cancel() {
      finished = true;
      await reader.cancel();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
