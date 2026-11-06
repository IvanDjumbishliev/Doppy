"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const platforms = [
  { name: "Instagram", emoji: "📸" },
  { name: "TikTok", emoji: "🎵" },
  { name: "YouTube", emoji: "▶️" },
] as const;

const steps = ["Connect your feeds", "Ask it anything", "Ready to scroll"];

export default function Home() {
  const router = useRouter();
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (activeStep === 2) {
      router.replace("/app");
    }
  }, [activeStep, router]);

  function connectPlatform(name: string) {
    setConnectedPlatforms((connected) =>
      connected.includes(name) ? connected : [...connected, name],
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-5 py-12 text-white">
      <div className="w-full max-w-2xl">
        <header className="mb-12 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-[#ff6b35]">
            Reel Scroll
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Your next favorite is waiting.
          </h1>
          <p className="mt-3 text-zinc-400">
            A couple of quick steps to make your feed yours.
          </p>
        </header>

        <nav aria-label="Onboarding progress" className="mb-10">
          <ol className="grid grid-cols-3">
            {steps.map((step, index) => {
              const isComplete = index < activeStep;
              const isCurrent = index === activeStep;

              return (
                <li
                  key={step}
                  aria-current={isCurrent ? "step" : undefined}
                  className="relative flex flex-col items-center text-center"
                >
                  {index > 0 && (
                    <span
                      aria-hidden="true"
                      className={`absolute right-1/2 top-4 h-px w-full ${
                        isComplete ? "bg-[#ff6b35]" : "bg-[#2a2a35]"
                      }`}
                    />
                  )}
                  <span
                    className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold ${
                      isCurrent
                        ? "border-[#ff6b35] bg-[#ff6b35] text-white"
                        : isComplete
                          ? "border-[#ff6b35] bg-[#ff6b35] text-white"
                          : "border-[#2a2a35] bg-[#111116] text-zinc-500"
                    }`}
                  >
                    {isComplete ? "✓" : index + 1}
                  </span>
                  <span
                    className={`mt-3 text-xs sm:text-sm ${
                      isCurrent ? "text-white" : "text-zinc-500"
                    }`}
                  >
                    {step}
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>

        <section
          aria-live="polite"
          className="rounded-2xl border border-[#2a2a35] bg-[#111116] p-6 shadow-2xl shadow-black/20 sm:p-8"
        >
          {activeStep === 0 ? (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold">Connect your feeds</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Pick at least one place to start finding videos you love.
                </p>
              </div>
              <ul className="space-y-3">
                {platforms.map(({ name, emoji }) => {
                  const isConnected = connectedPlatforms.includes(name);

                  return (
                    <li
                      key={name}
                      className={`flex items-center justify-between gap-4 rounded-xl border bg-[#0a0a0f] p-4 transition-colors ${
                        isConnected
                          ? "border-emerald-500/70"
                          : "border-[#2a2a35]"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <span
                          aria-hidden="true"
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1a1a22] text-xl"
                        >
                          {emoji}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium">{name}</p>
                          <p className="mt-0.5 truncate text-sm text-zinc-500">
                            @yourhandle
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => connectPlatform(name)}
                        disabled={isConnected}
                        className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-default ${
                          isConnected
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-[#ff6b35] text-white hover:bg-[#ff8052]"
                        }`}
                      >
                        {isConnected ? "✓ Connected" : "Connect"}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                disabled={connectedPlatforms.length === 0}
                className="mt-7 w-full rounded-xl bg-[#ff6b35] px-5 py-3.5 font-semibold text-white transition-colors hover:bg-[#ff8052] disabled:cursor-not-allowed disabled:bg-[#30201b] disabled:text-zinc-500"
              >
                Continue
              </button>
            </>
          ) : activeStep === 1 ? (
            <div className="py-8 text-center sm:py-12">
              <span
                aria-hidden="true"
                className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ff6b35]/10 text-3xl"
              >
                ✨
              </span>
              <h2 className="text-2xl font-semibold">Ask it anything</h2>
              <p className="mt-3 text-lg text-zinc-300">
                Reels unlock while I think.
              </p>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-zinc-500">
                Tell us what you&apos;re into, or let your connected feeds help
                us find a good place to start.
              </p>
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className="mt-8 w-full rounded-xl bg-[#ff6b35] px-5 py-3.5 font-semibold text-white transition-colors hover:bg-[#ff8052]"
              >
                Finish setup
              </button>
            </div>
          ) : (
            <p className="py-12 text-center text-zinc-400">
              You&apos;re all set. Opening your feed…
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
