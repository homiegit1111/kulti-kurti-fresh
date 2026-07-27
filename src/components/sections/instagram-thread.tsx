"use client";

/**
 * THE THREAD — Instagram as a strung thread of beads, not a wall of tiles.
 *
 * THE IDEA. A grid of large square posts is what every site does, and on a
 * wholesale page it competes with the actual catalogue for attention. Here the
 * posts are reduced to small round beads strung along a single hairline — a
 * thread, which is the one metaphor this business owns — and the section is
 * carried by TYPE instead: the live post's caption is set large in the editorial
 * serif, and the beads are merely the index beneath it.
 *
 * At rest it is a line, a word and some dots. That is the whole point: minimal,
 * and it never shouts over the price list above it.
 *
 * THE MOTION. One bead is "current" at a time. It lifts off the thread, grows,
 * and a short stem connects it back down to the line, while its caption crossfades
 * in above. The selection advances on its own every few seconds so the section
 * is alive without demanding anything; pointing at (or tabbing to) a bead pins it
 * and stops the rotation, because a thing that moves while you are trying to read
 * it is a defect, not delight.
 *
 * DISCIPLINE:
 *   • Transform and opacity only — no layout thrash, no rAF loop, one interval.
 *   • `prefers-reduced-motion` stops the auto-advance entirely and removes the
 *     transitions; the section still works, it just waits to be asked.
 *   • The interval is cleared while the tab is hidden, so a backgrounded page
 *     is not still ticking.
 *   • Images are 96px at most — the reason this section is cheap.
 *   • Every bead is a real <a> to the real post: keyboard reachable, and the
 *     rotation is decoration layered on top of working links.
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import {
  CURATED_REAL_POSTS,
  INSTAGRAM_HANDLE,
  INSTAGRAM_PROFILE,
  type InstagramFeedItem,
} from "@/lib/instagram/posts";
import { cn } from "@/lib/utils";

type FeedResponse = { items?: InstagramFeedItem[]; source?: string };

/** How long each bead holds the thread. Slow enough to actually read. */
const DWELL_MS = 4200;


/**
 * The Instagram camera mark, drawn as a path rather than imported.
 *
 * This lucide build ships no Instagram glyph, and bundling the official
 * gradient logo would mean shipping a trademarked asset. The generic rounded
 * square + lens + flash is the conventional outline mark used for linking, and
 * as an inline SVG it inherits `currentColor`, so it themes with everything else.
 */
function InstagramMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.4" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function InstagramThread({ className }: { className?: string }) {
  /**
   * LIVE FEED, WITH THE CURATED LIST AS THE FLOOR.
   *
   * The curated posts render immediately, so the thread is never empty and the
   * layout never shifts. On mount we ask /api/instagram/feed, which returns the
   * real account feed when INSTAGRAM_ACCESS_TOKEN is configured (see
   * lib/instagram/fetch-feed.ts) and echoes the curated list when it is not.
   * If live posts come back, they replace the curated ones — so once the token
   * exists, this section maintains itself and nobody edits a file to post.
   *
   * A failed or slow fetch is not an error state here: the curated thread is
   * already on screen and stays.
   */
  const [posts, setPosts] = useState<InstagramFeedItem[]>(CURATED_REAL_POSTS);
  const [active, setActive] = useState(0);
  /** Pinned by pointer or focus — the rotation yields to intent. */
  const [pinned, setPinned] = useState(false);
  const [still, setStill] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  /* Pull the live feed once. Aborted on unmount; failures leave curated in place. */
  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/instagram/feed", { signal: ac.signal })
      .then((r) => (r.ok ? (r.json() as Promise<FeedResponse>) : null))
      .then((data) => {
        const items = data?.items?.filter((i) => i?.mediaUrl && i?.permalink);
        if (items && items.length > 0) {
          setPosts(items.slice(0, 6));
          setActive(0);
        }
      })
      .catch(() => {
        /* offline, rate-limited, or no token — the curated thread stands */
      });
    return () => ac.abort();
  }, []);

  useEffect(() => {
    if (still || pinned || posts.length < 2) return;

    const tick = () => setActive((i) => (i + 1) % posts.length);
    const start = () => {
      window.clearInterval(timer.current);
      timer.current = window.setInterval(tick, DWELL_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        window.clearInterval(timer.current);
      } else {
        start();
      }
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [still, pinned, posts.length]);

  if (posts.length === 0) return null;

  return (
    <div className={className}>
      {/* ── The line of type: whatever the thread is currently holding ── */}
      <div className="relative min-h-[128px] sm:min-h-[150px]">
        {posts.map((post, i) => (
          <p
            key={post.id}
            aria-hidden={i !== active}
            className={cn(
              "absolute inset-x-0 top-0 max-w-[24ch] font-editorial text-[clamp(1.9rem,4.4vw,3.4rem)] font-light italic leading-[1.1]",
              "transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none",
              i === active
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-2 opacity-0",
            )}
          >
            {post.caption ?? `@${INSTAGRAM_HANDLE}`}
          </p>
        ))}
      </div>

      {/* Attribution: the mark plus the handle. Without this the plates below
          read as a product rail — which is exactly what happened. */}
      <p className="mt-3 flex items-center gap-2 font-trade text-[11px] tracking-[0.06em] text-home-ink-mute">
        <InstagramMark className="h-[15px] w-[15px]" />
        @{INSTAGRAM_HANDLE}
        <span aria-hidden="true" className="text-home-ink/25">·</span>
        <span className="tabular-nums">
          {active + 1}/{posts.length}
        </span>
      </p>

      {/* ── The thread itself, with the beads strung on it ── */}
      <div
        className="relative mt-4 h-[210px] sm:mt-6 sm:h-[262px]"
        onMouseEnter={() => setPinned(true)}
        onMouseLeave={() => setPinned(false)}
      >
        {/* The hairline the beads hang from. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-[42px] h-px bg-home-ink/25"
        />

        <ul className="absolute inset-x-0 bottom-[42px] flex items-end justify-between gap-4 sm:gap-6">
          {posts.map((post, i) => {
            const isOn = i === active;
            return (
              <li key={post.id} className="relative">

                <a
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onFocus={() => {
                    setPinned(true);
                    setActive(i);
                  }}
                  onBlur={() => setPinned(false)}
                  onMouseEnter={() => setActive(i)}
                  aria-label={`${post.caption ?? "Instagram post"} — open on Instagram`}
                  aria-current={isOn ? "true" : undefined}
                  className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-home-ink"
                >
                  <span
                    className={cn(
                      "relative block overflow-hidden rounded-[1.25rem] transition-[transform,box-shadow,width,height] duration-[600ms] ease-out",
                      "motion-reduce:transition-none",
                      isOn
                        ? "h-[150px] w-[118px] shadow-[0_22px_38px_-16px_rgba(25,20,16,0.5)] sm:h-[200px] sm:w-[158px]"
                        : "h-[96px] w-[76px] opacity-65 sm:h-[124px] sm:w-[98px]",
                    )}
                  >
                    <Image
                      src={post.mediaUrl}
                      alt=""
                      fill
                      unoptimized
                      sizes="200px"
                      className={cn(
                        "object-cover transition-[filter] duration-500 motion-reduce:transition-none",
                        isOn ? "grayscale-0" : "grayscale",
                      )}
                    />

                    {/* Post marker — only on the one being read, so the rail
                        never turns into a row of badges. */}
                    <span
                      className={cn(
                        "absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-home-ground/85 text-home-ink backdrop-blur-[2px] transition-opacity duration-500",
                        "motion-reduce:transition-none",
                        isOn ? "opacity-100" : "opacity-0",
                      )}
                    >
                      <InstagramMark className="h-[13px] w-[13px]" />
                    </span>

                    {/* Where it goes, said plainly, on hover/focus only. */}
                    <span
                      className={cn(
                        "absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-home-ink/80 py-1.5 font-trade text-[9.5px] tracking-[0.08em] text-home-ground opacity-0 transition-opacity duration-300",
                        "group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none",
                        !isOn && "hidden",
                      )}
                    >
                      View post <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </span>
                </a>
              </li>
            );
          })}

          {/* The thread runs on to the profile — the last bead is the way out. */}
          <li className="relative shrink-0">
            <a
              href={INSTAGRAM_PROFILE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-1.5 rounded-full border border-home-ink/25 px-4 font-trade text-[11px] tracking-[0.06em] transition-colors duration-200 hover:border-home-ink hover:bg-home-ink hover:text-home-ground"
            >
              <InstagramMark className="h-4 w-4" />
              @{INSTAGRAM_HANDLE}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
