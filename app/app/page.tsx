"use client";

import { useEffect, useState } from "react";
import AIPanel from "@/components/AIPanel";
import FeedPanel from "@/components/FeedPanel";

export default function FeedPage() {
  const [isThinking, setIsThinking] = useState(false);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("reel-prompt")?.focus();
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  return (
    <main className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[#0a0a0f] text-white">
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-[#2a2a35] px-4 sm:px-6">
        <p className="text-xs font-semibold tracking-wide text-zinc-300">
          Doppy <span className="text-[#ff6b35]">1.0</span>
        </p>
        <p className="text-[11px] text-zinc-500 sm:text-xs">
          Built for doomscrollers 🤙
        </p>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[55%_45%] md:grid-cols-2 md:grid-rows-1">
        <section aria-label="AI chat" className="min-h-0 overflow-hidden">
          <AIPanel onThinkingChange={setIsThinking} />
        </section>
        <section
          aria-label="Social feed"
          className="min-h-0 overflow-hidden border-t border-[#2a2a35] md:border-l md:border-t-0"
        >
          <FeedPanel isLocked={!isThinking} />
        </section>
        <span className="sr-only" aria-live="polite">
          {isThinking ? "AI is thinking" : ""}
        </span>
      </div>
    </main>
  );
}
