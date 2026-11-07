import { Film, Heart, Play } from "lucide-react";

const feedItems = [
  {
    category: "FOR YOUR MOOD",
    title: "Your feed is ready to roll",
    description:
      "Tell your AI what you feel like watching and your next favorite is just a scroll away.",
    color: "from-orange-500/20 via-rose-500/10 to-[#111116]",
  },
  {
    category: "A LITTLE OF EVERYTHING",
    title: "Good things are coming",
    description:
      "Fresh ideas, tiny discoveries, and the occasional video you have to send to a friend.",
    color: "from-violet-500/20 via-fuchsia-500/10 to-[#111116]",
  },
];

export default function FeedPanel() {
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-[#2a2a35] bg-[#0a0a0f]/95 px-5 backdrop-blur md:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ff6b35]/10 text-[#ff6b35]">
            <Film aria-hidden="true" size={18} />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Your feed</h2>
            <p className="text-xs text-zinc-500">A scroll full of possibility</p>
          </div>
        </div>
        <span className="rounded-full border border-[#2a2a35] px-3 py-1 text-xs text-zinc-400">
          For you
        </span>
      </header>

      <div className="mx-auto max-w-2xl space-y-5 p-5 md:p-8">
        {feedItems.map((item, index) => (
          <article
            key={item.title}
            className="overflow-hidden rounded-2xl border border-[#2a2a35] bg-[#111116]"
          >
            <div
              className={`relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br ${item.color}`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),transparent_65%)]" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-black/20 text-white/80 backdrop-blur">
                <Play aria-hidden="true" className="ml-1" fill="currentColor" size={20} />
              </div>
              <span className="absolute bottom-4 left-4 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[10px] font-medium tracking-[0.18em] text-white/70 backdrop-blur">
                {item.category}
              </span>
              <button
                type="button"
                aria-label={`Like ${item.title}`}
                className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white/80 backdrop-blur transition-colors hover:text-[#ff6b35]"
              >
                <Heart aria-hidden="true" size={16} />
              </button>
              <span className="sr-only">Feed preview {index + 1}</span>
            </div>
            <div className="p-5">
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                {item.description}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
