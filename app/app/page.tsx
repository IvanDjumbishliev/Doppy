import AIPanel from "@/components/AIPanel";
import FeedPanel from "@/components/FeedPanel";

export default function FeedPage() {
  return (
    <main className="grid h-dvh min-h-0 grid-cols-1 grid-rows-[55dvh_45dvh] overflow-hidden bg-[#0a0a0f] text-white md:grid-cols-2 md:grid-rows-1">
      <section aria-label="AI chat" className="min-h-0 overflow-y-auto">
        <AIPanel />
      </section>
      <section
        aria-label="Social feed"
        className="min-h-0 overflow-y-auto border-t border-[#2a2a35] md:border-l md:border-t-0"
      >
        <FeedPanel />
      </section>
    </main>
  );
}
