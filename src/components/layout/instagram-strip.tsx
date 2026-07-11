"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Layers,
  Play,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  CURATED_REAL_POSTS,
  INSTAGRAM_HANDLE,
  INSTAGRAM_PROFILE,
  type InstagramFeedItem,
} from "@/lib/instagram/posts";
import { DURATION, EASE_OUT_EXPO, VIEWPORT_EARLY, tween } from "@/lib/motion";

const FEED_ID = "instagram-studio-feed";

function InstagramMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5.5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.5 6.5h.01" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function uniquePosts(posts: InstagramFeedItem[]) {
  const seen = new Set<string>();
  return posts.filter((post) => {
    if (seen.has(post.permalink)) return false;
    seen.add(post.permalink);
    return true;
  });
}

function isReel(post: InstagramFeedItem) {
  return /video|reel/i.test(post.mediaType ?? "") || /\/reel\//i.test(post.permalink);
}

function postLabel(post: InstagramFeedItem) {
  // Mono trade-voice tag; sequential numerals dropped to respect anti-slop.
  return isReel(post) ? "Film" : "Studio";
}

/**
 * A quiet, editorial proof point: real Instagram media with browser-native
 * scrolling. Only the section itself reveals, avoiding per-card scroll work.
 */
export function InstagramStrip() {
  const reduceMotion = useReducedMotion();
  const trayRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const [posts, setPosts] = useState<InstagramFeedItem[]>(() =>
    uniquePosts(CURATED_REAL_POSTS).slice(0, 8),
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [canMoveBack, setCanMoveBack] = useState(false);
  const [canMoveForward, setCanMoveForward] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadFeed() {
      try {
        const response = await fetch("/api/instagram/feed");
        if (!response.ok) return;
        const data = (await response.json()) as { items?: InstagramFeedItem[] };
        const nextPosts = uniquePosts(data.items ?? []).slice(0, 8);
        if (!cancelled && nextPosts.length) setPosts(nextPosts);
      } catch {
        // Keep the curated, real-post fallback available without blocking render.
      }
    }

    void loadFeed();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const tray = trayRef.current;
    if (!tray) return;

    const updateTrayState = () => {
      const firstCard = tray.querySelector<HTMLElement>("[data-studio-card]");
      const step = firstCard ? firstCard.offsetWidth + 16 : tray.clientWidth * 0.72;
      const nextIndex = Math.max(
        0,
        Math.min(posts.length - 1, Math.round(tray.scrollLeft / Math.max(step, 1))),
      );

      setActiveIndex((current) => (current === nextIndex ? current : nextIndex));
      setCanMoveBack(tray.scrollLeft > 2);
      setCanMoveForward(
        tray.scrollLeft < tray.scrollWidth - tray.clientWidth - 2,
      );
    };

    const scheduleUpdate = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        updateTrayState();
      });
    };

    updateTrayState();
    tray.addEventListener("scroll", scheduleUpdate, { passive: true });
    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(tray);

    return () => {
      tray.removeEventListener("scroll", scheduleUpdate);
      resizeObserver.disconnect();
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, [posts.length]);

  const moveTray = (direction: -1 | 1) => {
    const tray = trayRef.current;
    if (!tray) return;
    const firstCard = tray.querySelector<HTMLElement>("[data-studio-card]");
    const distance = firstCard ? firstCard.offsetWidth + 16 : tray.clientWidth * 0.72;

    tray.scrollBy({
      left: direction * distance,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <section
      aria-labelledby="instagram-title"
      className="relative overflow-hidden border-y border-charcoal/[0.07] bg-[#f3eee5] text-charcoal dark:border-white/[0.08] dark:bg-[var(--surface-void)] dark:text-white"
    >
      <div
        aria-hidden="true"
        className="loom-threads pointer-events-none absolute inset-0"
      />

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VIEWPORT_EARLY}
        transition={tween(DURATION.enter, 0, EASE_OUT_EXPO)}
        className="relative mx-auto max-w-[1440px] px-4 py-14 sm:px-6 sm:py-16 lg:px-12 lg:py-20"
      >
        <header className="grid gap-8 border-b border-charcoal/10 pb-8 dark:border-white/10 lg:grid-cols-[minmax(0,0.9fr)_minmax(34rem,1.1fr)] lg:items-end lg:gap-16 lg:pb-10">
          <div>
            <p className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-indigo dark:text-gold">
              <InstagramMark className="h-3.5 w-3.5" />
              On Instagram
            </p>
            <h2
              id="instagram-title"
              className="mt-4 max-w-md font-serif text-[clamp(2.2rem,5vw,4.25rem)] font-light leading-[0.95] tracking-[-0.045em]"
            >
              From the <span className="italic text-madder dark:text-gold">studio.</span>
            </h2>
          </div>

          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-sm text-[14px] leading-relaxed text-charcoal/60 dark:text-white/55">
              New arrivals, fabric close-ups, and the work behind every set —
              published directly from our studio.
            </p>
            <a
              href={INSTAGRAM_PROFILE}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex h-11 shrink-0 items-center gap-2 border border-charcoal/15 bg-white/70 px-4 font-mono text-[10px] font-bold uppercase tracking-[0.14em] transition-[background-color,border-color,color] duration-300 hover:border-charcoal hover:bg-charcoal hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo dark:border-white/15 dark:bg-white/[0.06] dark:hover:border-white dark:hover:bg-white dark:hover:text-[var(--surface-void)]"
            >
              <span>@{INSTAGRAM_HANDLE}</span>
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </div>
        </header>

        <div className="relative mt-7 sm:mt-9">
          <div
            ref={trayRef}
            id={FEED_ID}
            className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0"
            style={{ WebkitOverflowScrolling: "touch" }}
            aria-label="Latest posts from Rangat Pehnawa"
          >
            {posts.map((post, index) => {
              const reel = isReel(post);

              return (
                <a
                  key={post.id}
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-studio-card
                  className="group relative w-[min(73vw,19rem)] shrink-0 snap-start overflow-hidden bg-[#ded5c7] shadow-[0_18px_38px_-28px_rgba(44,31,20,0.72)] ring-1 ring-charcoal/[0.08] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo active:scale-[0.99] dark:bg-[var(--surface-raised)] dark:ring-white/10 dark:shadow-[0_22px_48px_-30px_rgba(0,0,0,0.9)] sm:w-[18rem] lg:w-[19rem]"
                  aria-label={`${post.caption || "Instagram post"}, open on Instagram`}
                >
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <Image
                      src={post.mediaUrl}
                      alt={post.caption || `Post from @${INSTAGRAM_HANDLE}`}
                      fill
                      unoptimized
                      priority={index < 2}
                      sizes="(max-width: 640px) 73vw, (max-width: 1024px) 18rem, 19rem"
                      className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.035]"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10 opacity-75 transition-opacity duration-500 group-hover:opacity-100" />

                    <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4 text-white">
                      <span className="text-[9px] font-bold uppercase tracking-[0.18em] drop-shadow-sm">
                        {postLabel(post)}
                      </span>
                      {reel ? (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/30 bg-black/20" aria-label="Reel">
                          <Play className="ml-0.5 h-3 w-3 fill-current" />
                        </span>
                      ) : (
                        <Layers className="h-4 w-4 drop-shadow-sm" aria-label="Post" />
                      )}
                    </div>

                    <span className="absolute bottom-4 left-4 right-4 flex translate-y-1 items-end justify-between gap-3 text-white opacity-0 transition-[opacity,transform] duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em]">View post</span>
                      <ArrowUpRight className="h-4 w-4 shrink-0" />
                    </span>
                  </div>

                  <div className="min-h-[5.6rem] border-t border-charcoal/[0.08] bg-[#faf8f3] px-4 py-3.5 dark:border-white/[0.08] dark:bg-[var(--surface-raised)]">
                    <p className="line-clamp-2 font-serif text-[1.02rem] leading-snug tracking-[-0.02em] text-charcoal dark:text-white">
                      {post.caption || `A note from @${INSTAGRAM_HANDLE}`}
                    </p>
                    <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.17em] text-charcoal/40 dark:text-white/40">
                      @{INSTAGRAM_HANDLE}
                    </p>
                  </div>
                </a>
              );
            })}

            <a
              href={INSTAGRAM_PROFILE}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex w-[min(62vw,15rem)] shrink-0 snap-start flex-col justify-between border border-charcoal/15 bg-charcoal p-5 text-white transition-colors duration-300 hover:bg-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo dark:border-white/15 dark:bg-[var(--raw-silk)] dark:text-indigo dark:hover:bg-gold sm:w-[15rem]"
              aria-label={`See all posts from @${INSTAGRAM_HANDLE} on Instagram`}
            >
              <InstagramMark className="h-7 w-7" />
              <div>
                <p className="font-serif text-2xl font-light leading-none tracking-tight">Follow the work.</p>
                <span className="mt-5 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em]">
                  See all posts <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </div>
            </a>
            <div className="w-px shrink-0" aria-hidden="true" />
          </div>

          <div className="mt-6 flex items-center justify-between gap-5">
            <div className="flex items-center gap-3" aria-live="polite" aria-atomic="true">
              <span className="font-serif text-lg tabular-nums text-charcoal dark:text-white">
                {String(activeIndex + 1).padStart(2, "0")}
              </span>
              <span className="h-px w-8 bg-charcoal/20 dark:bg-white/25" />
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-charcoal/45 dark:text-white/45">
                {String(posts.length).padStart(2, "0")} selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => moveTray(-1)}
                disabled={!canMoveBack}
                aria-controls={FEED_ID}
                aria-label="Previous Instagram posts"
                className="flex h-10 w-10 items-center justify-center border border-charcoal/15 text-charcoal transition-colors duration-300 hover:border-charcoal hover:bg-charcoal hover:text-white disabled:pointer-events-none disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo dark:border-white/15 dark:text-white dark:hover:border-white dark:hover:bg-white dark:hover:text-[var(--surface-void)]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => moveTray(1)}
                disabled={!canMoveForward}
                aria-controls={FEED_ID}
                aria-label="Next Instagram posts"
                className="flex h-10 w-10 items-center justify-center border border-charcoal/15 text-charcoal transition-colors duration-300 hover:border-charcoal hover:bg-charcoal hover:text-white disabled:pointer-events-none disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo dark:border-white/15 dark:text-white dark:hover:border-white dark:hover:bg-white dark:hover:text-[var(--surface-void)]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
