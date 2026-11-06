import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const SYSTEM_PROMPT =
  "You are a productive AI assistant. When given a task, think through it step by step. Format your final answer clearly with headers and bullet points.";

function getErrorStatus(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 429
  ) {
    return 429;
  }

  if (error instanceof Error && error.name === "APIConnectionTimeoutError") {
    return 504;
  }

  return 502;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your_anthropic_api_key_here") {
    return NextResponse.json(
      { error: "Chat is not configured. Set ANTHROPIC_API_KEY." },
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

  const abortController = new AbortController();
  const abortRequest = () => abortController.abort();
  request.signal.addEventListener("abort", abortRequest, { once: true });

  let anthropicStream: Awaited<
    ReturnType<Anthropic["messages"]["create"]>
  >;
  try {
    const anthropic = new Anthropic({ apiKey });
    anthropicStream = await anthropic.messages.create(
      {
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: body.message }],
        stream: true,
      },
      { signal: abortController.signal },
    );
  } catch (error) {
    request.signal.removeEventListener("abort", abortRequest);
    return NextResponse.json(
      { error: "Unable to start the chat stream." },
      { status: getErrorStatus(error) },
    );
  }

  const iterator = anthropicStream[Symbol.asyncIterator]();
  const encoder = new TextEncoder();
  let closed = false;

  const cleanup = () => {
    if (!closed) {
      closed = true;
      request.signal.removeEventListener("abort", abortRequest);
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        while (true) {
          const { done, value } = await iterator.next();
          if (done) {
            cleanup();
            controller.close();
            return;
          }

          if (
            value.type === "content_block_delta" &&
            value.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(value.delta.text));
            return;
          }
        }
      } catch (error) {
        cleanup();
        controller.error(error);
      }
    },
    async cancel() {
      cleanup();
      abortController.abort();
      await iterator.return?.();
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
