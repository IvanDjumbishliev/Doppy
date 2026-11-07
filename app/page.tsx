"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const platforms = [
  { id: "instagram", name: "Instagram", emoji: "📸" },
  { id: "tiktok", name: "TikTok", emoji: "🎵" },
  { id: "youtube", name: "YouTube", emoji: "▶️" },
] as const;

type PlatformId = (typeof platforms)[number]["id"];

type ConnectedAccount = {
  platform: PlatformId;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

function isConnectedAccount(value: unknown): value is ConnectedAccount {
  if (typeof value !== "object" || value === null || !("platform" in value)) {
    return false;
  }

  return (
    platforms.some((platform) => platform.id === value.platform) &&
    "username" in value &&
    typeof value.username === "string" &&
    "displayName" in value &&
    (typeof value.displayName === "string" || value.displayName === null) &&
    "avatarUrl" in value &&
    (typeof value.avatarUrl === "string" || value.avatarUrl === null)
  );
}

const steps = ["Connect your feeds", "Ask it anything", "Ready to scroll"];

export default function Home() {
  const router = useRouter();
  const [connections, setConnections] = useState<
    Partial<Record<PlatformId, ConnectedAccount>>
  >({});
  const [isLoadingConnections, setIsLoadingConnections] = useState(true);
  const [connectionError, setConnectionError] = useState("");
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const abortController = new AbortController();

    async function loadConnections() {
      try {
        const response = await fetch("/api/connections", {
          cache: "no-store",
          signal: abortController.signal,
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            typeof payload === "object" &&
              payload !== null &&
              "error" in payload &&
              typeof payload.error === "string"
              ? payload.error
              : "Unable to load connected accounts.",
          );
        }

        if (
          typeof payload !== "object" ||
          payload === null ||
          !("connections" in payload) ||
          !Array.isArray(payload.connections)
        ) {
          throw new Error("The connections response was invalid.");
        }

        const nextConnections: Partial<
          Record<PlatformId, ConnectedAccount>
        > = {};
        for (const connection of payload.connections) {
          if (isConnectedAccount(connection)) {
            nextConnections[connection.platform] = connection;
          }
        }
        setConnections(nextConnections);
      } catch (error) {
        if (!abortController.signal.aborted) {
          setConnectionError(
            error instanceof Error
              ? error.message
              : "Unable to load connected accounts.",
          );
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingConnections(false);
        }
      }
    }

    void loadConnections();

    const url = new URL(window.location.href);
    const errorCode = url.searchParams.get("connection_error");
    if (errorCode) {
      const messages: Record<string, string> = {
        setup:
          "Social sign-in is not configured. Complete the provider and Supabase setup in the README.",
        denied: "Sign-in was cancelled; no account was connected.",
        state: "Sign-in expired or could not be verified. Please try again.",
        callback: "The sign-in response was incomplete. Please try again.",
        provider:
          "Doppy could not verify that account. Check the provider app setup and permissions.",
      };
      setConnectionError(
        messages[errorCode] ?? "The social account could not be connected.",
      );
      url.searchParams.delete("connection_error");
      window.history.replaceState({}, "", url);
    }

    return () => abortController.abort();
  }, []);

  useEffect(() => {
    if (activeStep === 2) {
      router.replace("/app");
    }
  }, [activeStep, router]);

  async function disconnectPlatform(platform: PlatformId) {
    setConnectionError("");
    try {
      const response = await fetch(`/api/connections/${platform}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Unable to disconnect this account. Please try again.");
      }
      const result: unknown = await response.json();
      setConnections((current) => {
        const next = { ...current };
        delete next[platform];
        return next;
      });
      if (
        typeof result === "object" &&
        result !== null &&
        "providerRevoked" in result &&
        result.providerRevoked === false
      ) {
        setConnectionError(
          "Account removed from Doppy, but the provider could not revoke access. You can also remove Doppy in that platform’s connected-app settings.",
        );
      }
    } catch (error) {
      setConnectionError(
        error instanceof Error ? error.message : "Unable to disconnect account.",
      );
    }
  }

  const connectedCount = Object.keys(connections).length;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-5 py-12 text-white">
      <div className="w-full max-w-2xl">
        <header className="mb-12 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-[#ff6b35]">
            Doppy
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
              {connectionError && (
                <p
                  role="alert"
                  className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                >
                  {connectionError}
                </p>
              )}
              <p className="mb-4 text-xs leading-5 text-zinc-500">
                Connect to verify your account identity. Doppy does not import
                your posts or videos. Instagram connections require a
                professional account.
              </p>
              <ul className="space-y-3">
                {platforms.map(({ id, name, emoji }) => {
                  const account = connections[id];
                  const isConnected = Boolean(account);

                  return (
                    <li
                      key={id}
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
                            {isLoadingConnections
                              ? "Checking connection…"
                              : account?.username ?? "Not connected"}
                          </p>
                        </div>
                      </div>
                      {isConnected ? (
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="text-sm font-medium text-emerald-400">
                            ✓ Connected
                          </span>
                          <button
                            type="button"
                            onClick={() => void disconnectPlatform(id)}
                            className="text-xs text-zinc-500 underline-offset-2 hover:text-white hover:underline"
                          >
                            Disconnect
                          </button>
                        </div>
                      ) : (
                        <a
                          href={`/api/connections/${id}`}
                          aria-disabled={isLoadingConnections}
                          className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                            isLoadingConnections
                              ? "pointer-events-none bg-zinc-700 text-zinc-400"
                              : "bg-[#ff6b35] text-white hover:bg-[#ff8052]"
                          }`}
                        >
                          Connect
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={() => setActiveStep(1)}
                disabled={connectedCount === 0 || isLoadingConnections}
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
                Tell us what you&apos;re into and Doppy will help you find a
                good place to start.
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
