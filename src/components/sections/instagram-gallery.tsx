"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Play } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import {
  CURATED_REAL_POSTS,
  INSTAGRAM_HANDLE,
  INSTAGRAM_PROFILE,
  type InstagramFeedItem,
} from "@/lib/instagram/posts";
import { VIEWPORT_EARLY, fadeUp, staggerContainer } from "@/lib/motion";

// ─── helpers ────────────────────────────────────────────────────────────────

function uniquePosts(posts: InstagramFeedItem[]): InstagramFeedItem[] {
  const seen = new Set<string>();
  return posts.filter((p) => {
    if (seen.has(p.permalink)) return false;
    seen.add(p.permalink);
    return true;
  });
}

function isReel(post: InstagramFeedItem): boolean {
  return (
    /video|reel/i.test(post.mediaType ?? "") ||
    /\/reel\//i.test(post.permalink)
  );
}

// ─── inline Instagram glyph (lucide has no brand icons) ─────────────────────
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

// ─── tile ────────────────────────────────────────────────────────────────────

function FeedTile({
  post,
  index,
  reduceMotion,
}: {
  post: InstagramFeedItem;
  index: number;
  reduceMotion: boolean | null;
}) {
  const reel = isReel(post);
  // Instagram media URLs are signed and expire; when one dies, degrade to a
  // branded catalogue plate instead of an empty dark well.
  const [imgFailed, setImgFailed] = useState(false);
  const alt = post.caption
    ? `${post.caption} — @${INSTAGRAM_HANDLE}`
    : `Post from @${INSTAGRAM_HANDLE}`;

  return (
    <motion.a
      variants={fadeUp}
      href={post.permalink}
      target="_blank"
      rel="noopener noreferrer"
      data-ig-tile
      aria-label={`${post.caption ?? "Instagram post"}, opens on Instagram`}
      className={[
        // snap tile sizing: mobile ~44vw capped at 220px; desktop fixed 13rem
        "group relative shrink-0 snap-start",
        "w-[44vw] max-w-[220px] sm:w-44 md:w-48 lg:w-52",
        // catalogue plate frame: thin charcoal border, dark well
        "overflow-hidden bg-[#1c1d18] ring-1 ring-[#292a24]",
        // focus ring in lime
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-lime",
      ].join(" ")}
    >
      {/* image well — 4/5 portrait */}
      <div className="relative aspect-[4/5] overflow-hidden bg-[#1c1d18]">
        {imgFailed ? (
          /* branded fallback plate — same footprint, no broken-image well */
          <div className="absolute inset-0 flex flex-col items-start justify-between p-3">
            <InstagramMark
              className="h-4 w-4 text-content-inverse/25"
              aria-hidden="true"
            />
            <div>
              {post.caption && (
                <p className="line-clamp-3 text-[9px] font-bold uppercase leading-snug tracking-[0.18em] text-content-inverse/55">
                  {post.caption}
                </p>
              )}
              <span className="mt-1.5 inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.22em] text-accent-lime/80">
                View on Instagram
                <ArrowUpRight className="h-2.5 w-2.5" aria-hidden="true" />
              </span>
            </div>
          </div>
        ) : (
          <Image
            src={post.mediaUrl}
            alt={alt}
            fill
            unoptimized
            priority={index < 3}
            sizes="(max-width: 640px) 44vw, (max-width: 768px) 11rem, (max-width: 1024px) 12rem, 13rem"
            className={[
              "object-cover",
              reduceMotion
                ? ""
                : "transition-transform duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]",
            ].join(" ")}
            onError={() => setImgFailed(true)}
          />
        )}

        {/* permanent bottom gradient — readable on mobile without hover */}
        {!imgFailed && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[#0e0f0c]/80 via-[#0e0f0c]/25 to-transparent"
          />
        )}

        {/* mobile permanent caption (hidden on md+ where hover takes over) */}
        <div className={imgFailed ? "hidden" : "absolute inset-x-0 bottom-0 p-2.5 md:hidden"}>
          {post.caption && (
            <p className="line-clamp-1 text-[9px] font-bold uppercase leading-none tracking-[0.18em] text-content-inverse/80">
              {post.caption}
            </p>
          )}
          <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.2em] text-content-inverse/40">
            @{INSTAGRAM_HANDLE}
          </p>
        </div>

        {/* desktop hover overlay: caption + lime rule + arrow */}
        <div
          aria-hidden="true"
          className={
            imgFailed
              ? "hidden"
              : "pointer-events-none absolute inset-0 hidden flex-col justify-end md:flex"
          }
        >
          {/* lime rule at very bottom — slides in from left */}
          <span
            className={[
              "absolute inset-x-0 bottom-0 h-[2px] bg-accent-lime",
              reduceMotion
                ? "opacity-0 group-hover:opacity-100"
                : "translate-x-[-100%] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0",
            ].join(" ")}
          />
          {/* caption block slides up */}
          <div
            className={[
              "p-3 pb-4",
              reduceMotion
                ? "opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                : "translate-y-2 opacity-0 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-0 group-hover:opacity-100",
            ].join(" ")}
          >
            {post.caption && (
              <p className="line-clamp-2 text-[9px] font-bold uppercase leading-snug tracking-[0.18em] text-content-inverse">
                {post.caption}
              </p>
            )}
            <span className="mt-1.5 inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.22em] text-accent-lime">
              View
              <ArrowUpRight className="h-2.5 w-2.5" aria-hidden="true" />
            </span>
          </div>
        </div>

        {/* reel chip — always visible */}
        {reel && (
          <span
            aria-label="Reel"
            className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#0e0f0c]/85 ring-1 ring-white/20"
          >
            <Play
              className="ml-px h-2.5 w-2.5 fill-content-inverse text-content-inverse"
              aria-hidden="true"
            />
          </span>
        )}
      </div>

      {/* plate footer: tiny catalogue label */}
      <div
        aria-hidden="true"
        className="flex items-center justify-between border-t border-[#292a24] px-2.5 py-1.5"
      >
        <span className="text-[8px] font-bold uppercase tracking-[0.22em] text-content-inverse/25">
          {reel ? "Film" : "Studio"}
        </span>
        <span className="font-mono text-[8px] tabular-nums tracking-[0.1em] text-content-inverse/20">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
    </motion.a>
  );
}

// ─── main export ─────────────────────────────────────────────────────────────

export function InstagramGallery() {
  const reduceMotion = useReducedMotion();
  const railRef = useRef<HTMLDivElement>(null);

  const [posts, setPosts] = useState<InstagramFeedItem[]>(() =>
    uniquePosts(CURATED_REAL_POSTS).slice(0, 8),
  );

  // fetch live feed; keep curated fallback silently on any error
  useEffect(() => {
    let cancelled = false;
    async function loadFeed() {
      try {
        const res = await fetch("/api/instagram/feed");
        if (!res.ok) return;
        const data = (await res.json()) as { items?: InstagramFeedItem[] };
        const next = uniquePosts(data.items ?? []).slice(0, 8);
        if (!cancelled && next.length) setPosts(next);
      } catch {
        // silent — curated fallback stays
      }
    }
    void loadFeed();
    return () => {
      cancelled = true;
    };
  }, []);

  // scroll rail by one tile + gap
  const scrollRail = (dir: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    const tile = rail.querySelector<HTMLElement>("[data-ig-tile]");
    const step = tile ? tile.offsetWidth + 8 : 200;
    rail.scrollBy({
      left: dir * step,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  const container = staggerContainer(0.055, 0.08);

  return (
    <section
      aria-labelledby="ig-gallery-title"
      className="bg-surface py-10 md:py-14"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-12">

        {/* ── header: left label+headline · right handle+CTA — one row on desktop */}
        <motion.div
          initial={reduceMotion ? false : "hidden"}
          whileInView="visible"
          viewport={VIEWPORT_EARLY}
          variants={container}
          className="mb-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 md:mb-6"
        >
          {/* left */}
          <motion.div variants={fadeUp} className="min-w-0">
            <p className="mb-1.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.22em] text-content/45">
              <InstagramMark className="h-3 w-3 text-content/35" />
              From the studio floor
            </p>
            <h2
              id="ig-gallery-title"
              className="font-sans text-[clamp(1.25rem,3.5vw,1.75rem)] font-black uppercase leading-none tracking-[-0.04em] text-content"
            >
              As seen on instagram
            </h2>
          </motion.div>

          {/* right: handle + follow CTA */}
          <motion.div
            variants={fadeUp}
            className="flex shrink-0 items-center gap-3"
          >
            <span className="hidden text-[9px] font-bold uppercase tracking-[0.2em] text-content/35 sm:block">
              @{INSTAGRAM_HANDLE}
            </span>
            <a
              href={INSTAGRAM_PROFILE}
              target="_blank"
              rel="noopener noreferrer"
              className={[
                "inline-flex h-8 items-center gap-1.5 px-4",
                "bg-accent-lime text-[9px] font-black uppercase tracking-[0.18em] text-on-accent",
                "transition-colors duration-300 hover:bg-white",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-line",
              ].join(" ")}
            >
              Follow
              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </a>
          </motion.div>
        </motion.div>

        {/* ── rail ── */}
        <div className="relative">
          <motion.div
            ref={railRef}
            initial={reduceMotion ? false : "hidden"}
            whileInView="visible"
            viewport={VIEWPORT_EARLY}
            variants={container}
            // scroll rail: bleed to viewport edge on mobile, contained on lg
            className={[
              "no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto",
              "-mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0",
              // right padding peeks ~half the next tile so users know it scrolls
              "pb-1 pr-[calc(1rem+22vw)] sm:pr-[calc(1.5rem+5rem)] lg:pr-8",
            ].join(" ")}
            style={{ WebkitOverflowScrolling: "touch" }}
            aria-label={`Latest posts from @${INSTAGRAM_HANDLE} on Instagram`}
          >
            {posts.map((post, i) => (
              <FeedTile
                key={post.id}
                post={post}
                index={i}
                reduceMotion={reduceMotion ?? false}
              />
            ))}

            {/* trailing "see all" catalogue plate — same tile footprint */}
            <motion.a
              variants={fadeUp}
              href={INSTAGRAM_PROFILE}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`See all posts from @${INSTAGRAM_HANDLE} on Instagram`}
              className={[
                "group relative shrink-0 snap-start",
                "w-[44vw] max-w-[220px] sm:w-44 md:w-48 lg:w-52",
                "flex aspect-[4/5] flex-col items-start justify-between",
                "border border-[#292a24] bg-[#1c1d18] p-4",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-lime",
              ].join(" ")}
            >
              <InstagramMark className="h-5 w-5 text-content-inverse/25" aria-hidden="true" />
              <div>
                <p className="font-sans text-[clamp(0.95rem,3vw,1.05rem)] font-black uppercase leading-none tracking-[-0.03em] text-content-inverse/60 transition-colors duration-300 group-hover:text-accent-lime">
                  See all
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.22em] text-content-inverse/30 transition-colors duration-300 group-hover:text-accent-lime/70">
                  @{INSTAGRAM_HANDLE}
                  <ArrowUpRight
                    className="h-2.5 w-2.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </div>
              {/* lime rule slides in from left on hover */}
              <span
                aria-hidden="true"
                className={[
                  "absolute inset-x-0 bottom-0 h-[2px] bg-accent-lime",
                  reduceMotion
                    ? "opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    : "translate-x-[-100%] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0",
                ].join(" ")}
              />
            </motion.a>

            {/* spacer so last tile isn't flush on desktop */}
            <div className="w-1 shrink-0" aria-hidden="true" />
          </motion.div>

          {/* desktop-only fade + arrow nudge hints on the right edge */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 hidden w-20 bg-gradient-to-l from-surface to-transparent lg:block"
          />

          {/* desktop prev/next micro-arrows */}
          <div className="mt-3 hidden items-center justify-end gap-1.5 lg:flex">
            <button
              type="button"
              onClick={() => scrollRail(-1)}
              aria-label="Previous Instagram posts"
              className={[
                "flex h-6 w-6 items-center justify-center",
                "border border-line/15 text-content/40",
                "transition-colors duration-200 hover:border-line/40 hover:text-content",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-line",
              ].join(" ")}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                className="h-3 w-3"
                aria-hidden="true"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => scrollRail(1)}
              aria-label="Next Instagram posts"
              className={[
                "flex h-6 w-6 items-center justify-center",
                "border border-line/15 text-content/40",
                "transition-colors duration-200 hover:border-line/40 hover:text-content",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-line",
              ].join(" ")}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                className="h-3 w-3"
                aria-hidden="true"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}
