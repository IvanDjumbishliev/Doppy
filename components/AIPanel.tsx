"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type AIPanelProps = {
  onThinkingChange: (thinking: boolean) => void;
};

export default function AIPanel({ onThinkingChange }: AIPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [input, setInput] = useState("");
  const [hasCompletedResponse, setHasCompletedResponse] = useState(false);
  const [extendedThinking, setExtendedThinking] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const messageList = messageListRef.current;
    if (messageList) {
      messageList.scrollTo({
        top: messageList.scrollHeight,
        behavior: "instant",
      });
    }
  }, [messages]);

  async function sendMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const message = input.trim();
    if (!message || isThinking) return;

    setInput("");
    setMessages((current) => [
      ...current,
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ]);
    setIsThinking(true);
    setHasCompletedResponse(false);
    onThinkingChange(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        let errorMessage = `Chat request failed (${response.status}).`;
        try {
          const errorBody: unknown = await response.json();
          if (
            typeof errorBody === "object" &&
            errorBody !== null &&
            "error" in errorBody &&
            typeof errorBody.error === "string"
          ) {
            errorMessage = errorBody.error;
          }
        } catch {
          // Use the status-based message when the response isn't JSON.
        }
        throw new Error(errorMessage);
      }

      if (!response.body) {
        throw new Error("The chat response did not include a readable stream.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          setMessages((current) => {
            const updated = [...current];
            const lastMessage = updated[updated.length - 1];
            if (lastMessage?.role === "assistant") {
              updated[updated.length - 1] = {
                ...lastMessage,
                content: lastMessage.content + chunk,
              };
            }
            return updated;
          });
        }
      }

      const remainingText = decoder.decode();
      if (remainingText) {
        setMessages((current) => {
          const updated = [...current];
          const lastMessage = updated[updated.length - 1];
          if (lastMessage?.role === "assistant") {
            updated[updated.length - 1] = {
              ...lastMessage,
              content: lastMessage.content + remainingText,
            };
          }
          return updated;
        });
      }

      setHasCompletedResponse(true);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong.";
      setMessages((current) => {
        const updated = [...current];
        const lastMessage = updated[updated.length - 1];
        if (lastMessage?.role === "assistant" && !lastMessage.content) {
          updated[updated.length - 1] = {
            ...lastMessage,
            content: errorMessage,
          };
        } else {
          updated.push({ role: "assistant", content: errorMessage });
        }
        return updated;
      });
    } finally {
      setIsThinking(false);
      onThinkingChange(false);
    }
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  const status = isThinking
    ? { label: "Thinking", color: "bg-[#ff6b35]", animate: true }
    : hasCompletedResponse
      ? { label: "Done", color: "bg-emerald-400", animate: false }
      : { label: "Idle", color: "bg-zinc-500", animate: false };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="z-10 flex h-16 shrink-0 items-center justify-between border-b border-[#2a2a35] bg-[#0a0a0f]/95 px-5 backdrop-blur md:px-8">
        <h1 className="bg-gradient-to-r from-[#ff6b35] to-[#ffb15e] bg-clip-text text-lg font-semibold tracking-tight text-transparent">
          ✦ Reel Scroll
        </h1>
        <div className="flex items-center gap-2" aria-live="polite">
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${status.color} ${
              status.animate ? "animate-pulse motion-reduce:animate-none" : ""
            }`}
          />
          <span className="text-xs text-zinc-400">{status.label}</span>
        </div>
      </header>

      <div
        ref={messageListRef}
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-6 md:px-8"
      >
        {messages.length === 0 ? (
          <div className="flex h-full min-h-48 flex-col items-center justify-center text-center">
            <Sparkles aria-hidden="true" className="mb-4 text-[#ff6b35]" size={24} />
            <h2 className="text-xl font-semibold">What are you in the mood for?</h2>
            <button
              type="button"
              onClick={() => setInput("Turn my notes into a client report 📊")}
              className="mt-3 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b35] motion-reduce:transition-none"
            >
              Try: Turn my notes into a client report 📊
            </button>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={`${index}-${message.role}`}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "rounded-br-md bg-[#ff6b35]/15 text-orange-50"
                    : "rounded-bl-md border border-[#2a2a35] bg-[#111116] text-zinc-200"
                }`}
              >
                {message.content ||
                  (isThinking && index === messages.length - 1 ? (
                    <span className="inline-flex items-center gap-1.5 text-zinc-500">
                      <span className="animate-pulse motion-reduce:animate-none">
                        ✦ thinking...
                      </span>
                    </span>
                  ) : null)}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="shrink-0 border-t border-[#2a2a35] px-5 pb-4 pt-4 md:px-8">
        <form onSubmit={sendMessage} className="mx-auto w-full max-w-2xl">
          <label htmlFor="reel-prompt" className="sr-only">
            Message Reel Scroll
          </label>
          <div className="flex items-end gap-3 rounded-2xl border border-[#2a2a35] bg-[#111116] p-2 pl-4 transition-colors focus-within:border-[#ff6b35]/70 motion-reduce:transition-none">
            <textarea
              id="reel-prompt"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleInputKeyDown}
              disabled={isThinking}
              rows={1}
              placeholder="Ask for anything..."
              className="max-h-32 min-h-10 min-w-0 flex-1 resize-y bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus-visible:ring-2 focus-visible:ring-[#ff6b35] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111116] disabled:opacity-60"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={!input.trim() || isThinking}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff6b35] text-white transition-colors hover:bg-[#ff8052] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb15e] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
            >
              <ArrowUp aria-hidden="true" size={18} />
            </button>
          </div>
        </form>

        <div className="mx-auto mt-3 flex w-full max-w-2xl items-center justify-between">
          <span className="text-xs text-zinc-500">Extended thinking</span>
          <button
            type="button"
            role="switch"
            aria-checked={extendedThinking}
            aria-label="Extended thinking"
            onClick={() => setExtendedThinking((enabled) => !enabled)}
            className={`relative h-5 w-9 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b35] motion-reduce:transition-none ${
              extendedThinking ? "bg-[#ff6b35]" : "bg-[#2a2a35]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform motion-reduce:transition-none ${
                extendedThinking ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
