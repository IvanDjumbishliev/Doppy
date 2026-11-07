import { ArrowUp, Sparkles } from "lucide-react";

const suggestions = [
  "Find me something funny",
  "Show me easy recipes",
  "I need a little inspiration",
];

export default function AIPanel() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-3 border-b border-[#2a2a35] bg-[#0a0a0f]/95 px-5 backdrop-blur md:px-8">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ff6b35]/10 text-[#ff6b35]">
          <Sparkles aria-hidden="true" size={18} />
        </span>
        <div>
          <h1 className="text-sm font-semibold">Your AI</h1>
          <p className="text-xs text-zinc-500">Here to find your next favorite</p>
        </div>
      </header>

      <div className="flex flex-1 flex-col px-5 py-8 md:px-8">
        <div className="mx-auto my-auto w-full max-w-xl py-8">
          <p className="mb-3 text-sm font-medium text-[#ff6b35]">
            Your personal reel guide
          </p>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            What are you in the mood for?
          </h2>
          <p className="mt-4 max-w-md text-sm leading-6 text-zinc-400">
            Ask for a vibe, a topic, or something completely unexpected. I&apos;ll
            find a reel for you.
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="rounded-full border border-[#2a2a35] px-3.5 py-2 text-left text-xs text-zinc-300 transition-colors hover:border-[#ff6b35]/60 hover:text-white"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-xl">
          <label htmlFor="reel-prompt" className="sr-only">
            Ask for a reel
          </label>
          <div className="flex items-center gap-3 rounded-2xl border border-[#2a2a35] bg-[#111116] p-2 pl-4 transition-colors focus-within:border-[#ff6b35]/70">
            <input
              id="reel-prompt"
              type="text"
              placeholder="Ask for anything..."
              className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white outline-none placeholder:text-zinc-600"
            />
            <button
              type="button"
              aria-label="Send message"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ff6b35] text-white transition-colors hover:bg-[#ff8052]"
            >
              <ArrowUp aria-hidden="true" size={18} />
            </button>
          </div>
          <p className="mt-3 text-center text-xs text-zinc-600">
            Your feed gets better with every request.
          </p>
        </div>
      </div>
    </div>
  );
}
