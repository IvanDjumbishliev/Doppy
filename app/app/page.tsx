"use client";

import { useState } from "react";
import AIPanel from "@/components/AIPanel";
import FeedPanel from "@/components/FeedPanel";

export default function FeedPage() {
  const [isThinking, setIsThinking] = useState(false);

  return (
    <main className="grid h-dvh min-h-0 grid-cols-1 grid-rows-[55dvh_45dvh] overflow-hidden bg-[#0a0a0f] text-white md:grid-cols-2 md:grid-rows-1">
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
    </main>
  );
}
