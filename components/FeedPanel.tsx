"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Heart, Link2, MessageCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Reel = {
  id: number;
  gradientFrom: string;
  gradientTo: string;
  emoji: string;
  username: string;
  caption: string;
  likes: string;
  comments: string;
};

const reels: Reel[] = [
  {
    id: 1,
    gradientFrom: "#48384b",
    gradientTo: "#17131e",
    emoji: "🐱",
    username: "@catsofsydney",
    caption: "POV: it's monday 9am 😩",
    likes: "48.2k",
    comments: "1,204",
  },
  {
    id: 2,
    gradientFrom: "#55402d",
    gradientTo: "#1d1714",
    emoji: "🐶",
    username: "@fluff.report",
    caption: "when you say the W word 🐾",
    likes: "102k",
    comments: "2,891",
  },
  {
    id: 3,
    gradientFrom: "#354b55",
    gradientTo: "#12191c",
    emoji: "🦜",
    username: "@birb.daily",
    caption: "me reviewing my own code 💀",
    likes: "67.5k",
    comments: "987",
  },
  {
    id: 4,
    gradientFrom: "#28515a",
    gradientTo: "#111b21",
    emoji: "🌊",
    username: "@naturepov",
    caption: "ocean sounds for your soul",
    likes: "31k",
    comments: "642",
  },
  {
    id: 5,
    gradientFrom: "#68402d",
    gradientTo: "#211612",
    emoji: "🍜",
    username: "@ramendiaries",
    caption: "3am ramen hits different 🍜",
    likes: "88.9k",
    comments: "1,560",
  },
  {
    id: 6,
    gradientFrom: "#41405b",
    gradientTo: "#171620",
    emoji: "🤖",
    username: "@aigeneration",
    caption: "AI did this in 2 seconds 🤯",
    likes: "214k",
    comments: "5,307",
  },
];

type FeedPanelProps = {
  isLocked: boolean;
};

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export default function FeedPanel({ isLocked }: FeedPanelProps) {
  const [hasUnlocked, setHasUnlocked] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [scrolledReels, setScrolledReels] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const reelListRef = useRef<HTMLDivElement>(null);
  const previousLockedRef = useRef(isLocked);
  const unlockedAtRef = useRef<number | null>(null);
  const elapsedBeforeUnlockRef = useRef(0);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const wasLocked = previousLockedRef.current;
    previousLockedRef.current = isLocked;

    if (wasLocked && !isLocked) {
      setHasUnlocked(true);
      setShowToast(true);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => setShowToast(false), 3000);
    } else if (!wasLocked && isLocked) {
      setShowToast(false);
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = null;
      }
    }

    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [isLocked]);

  useEffect(() => {
    if (isLocked) {
      if (unlockedAtRef.current !== null) {
        elapsedBeforeUnlockRef.current +=
          (Date.now() - unlockedAtRef.current) / 1000;
        unlockedAtRef.current = null;
        setElapsedSeconds(Math.floor(elapsedBeforeUnlockRef.current));
      }
      return;
    }

    unlockedAtRef.current ??= Date.now();
    const updateElapsed = () => {
      if (unlockedAtRef.current !== null) {
        setElapsedSeconds(
          Math.floor(
            elapsedBeforeUnlockRef.current +
              (Date.now() - unlockedAtRef.current) / 1000,
          ),
        );
      }
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [isLocked]);

  useEffect(
    () => () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    },
    [],
  );

  function handleScroll() {
    const reelList = reelListRef.current;
    if (!reelList) return;

    const currentIndex = Math.min(
      reels.length - 1,
      Math.floor((reelList.scrollTop + reelList.clientHeight / 2) / reelList.clientHeight),
    );
    setScrolledReels((count) => Math.max(count, currentIndex));
  }

  function focusChat() {
    document.getElementById("reel-prompt")?.focus();
  }

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-[#0a0a0f] text-white">
      <div
        ref={reelListRef}
        onScroll={handleScroll}
        aria-label="Reel feed"
        className={`h-full snap-y snap-mandatory overflow-y-auto overscroll-contain ${
          isLocked ? "pointer-events-none" : ""
        }`}
      >
        {reels.map((reel) => (
          <article
            key={reel.id}
            className="relative h-[45dvh] snap-start overflow-hidden md:h-dvh"
            style={{
              backgroundImage: `linear-gradient(145deg, ${reel.gradientFrom}, ${reel.gradientTo})`,
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,rgba(255,255,255,0.12),transparent_42%)]" />
            <span className="absolute inset-0 flex items-center justify-center pb-8 text-8xl drop-shadow-2xl sm:text-9xl">
              {reel.emoji}
            </span>

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent pb-7 pl-5 pr-20 pt-24 md:pb-10 md:pl-8">
              <div className="mb-2 flex items-center gap-3">
                <p className="font-semibold">{reel.username}</p>
                <button
                  type="button"
                  className="rounded-full border border-white/50 px-3 py-1 text-xs font-medium transition-colors hover:bg-white/15"
                >
                  Follow
                </button>
              </div>
              <p className="max-w-md text-sm leading-6 text-white/90">
                {reel.caption}
              </p>
            </div>

            <div className="absolute bottom-28 right-4 flex flex-col items-center gap-5 md:bottom-36 md:right-6">
              <ActionButton icon={<Heart fill="currentColor" />} label={`${reel.likes} likes`} />
              <ActionButton icon={<MessageCircle />} label={`${reel.comments} comments`} />
              <ActionButton icon={<Link2 />} label="Share" />
              <ActionButton icon={<Bookmark />} label="Save" />
            </div>

            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-1 bg-white/15"
            >
              {!isLocked && (
                <motion.div
                  className="h-full origin-left bg-[#ff6b35]"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: [0, 1, 0] }}
                  transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="pointer-events-none absolute left-4 right-4 top-4 z-10 flex items-center justify-between gap-2 md:left-6 md:right-6 md:top-6">
        <div className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-xs text-white/80 backdrop-blur-md">
          {scrolledReels} reels scrolled
        </div>
        <div className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-xs tabular-nums text-white/80 backdrop-blur-md">
          {formatTime(elapsedSeconds)} elapsed
        </div>
      </div>

      <AnimatePresence>
        {isLocked && (
          <motion.div
            key="feed-lock"
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-[#0a0a0f]/55 px-5"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.25 }}
              className="max-w-xs text-center"
            >
              <span className="mb-4 block text-4xl" aria-hidden="true">
                🔒
              </span>
              <h2 className="text-xl font-semibold">
                {hasUnlocked ? "Locked — Your answer is ready" : "Feed Locked"}
              </h2>
              {hasUnlocked ? (
                <button
                  type="button"
                  onClick={focusChat}
                  className="mt-5 rounded-xl bg-[#ff6b35] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#ff8052]"
                >
                  Back to work
                </button>
              ) : (
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  Give AI a task to unlock your feed
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showToast && !isLocked && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute left-1/2 top-14 z-30 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full border border-emerald-400/20 bg-[#112219]/95 px-4 py-2.5 text-center text-xs font-medium text-emerald-200 shadow-xl backdrop-blur-md sm:text-sm md:top-16"
          >
            🔓 Feed unlocked — scroll while I think!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionButton({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex flex-col items-center gap-1 text-xs text-white drop-shadow-md transition-transform hover:scale-110"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/20 text-white/90 backdrop-blur-sm">
        {icon}
      </span>
      <span className="max-w-14 truncate">{label}</span>
    </button>
  );
}
