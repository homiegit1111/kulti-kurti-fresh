"use client";

/**
 * Instagram rail — the honest count of confirmed @rangatpehnawa posts.
 *
 * Document grammar: framed plates on the grid, grayscale at rest, captions
 * typeset below the image (no scrims, no hover zoom, no entrance animation —
 * a rail is legible on arrival). Every tile is a real post; the count is the
 * real count.
 */

import { useState } from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import {
  CURATED_REAL_POSTS,
  INSTAGRAM_HANDLE,
  type InstagramFeedItem,
} from "@/lib/instagram/posts";

function Tile({ post }: { post: InstagramFeedItem }) {
  // Instagram media URLs are signed and expire; when one dies, degrade to a
  // typeset plate instead of a broken-image well.
  const [imgFailed, setImgFailed] = useState(false);
  const alt = post.caption
    ? `${post.caption} — @${INSTAGRAM_HANDLE}`
    : `Post from @${INSTAGRAM_HANDLE}`;

  return (
    <a
      href={post.permalink}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${post.caption ?? "Instagram post"}, opens on Instagram`}
      className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-lime"
    >
      <div className="plate-frame relative aspect-[4/5] overflow-hidden bg-surface-hover">
        {imgFailed ? (
          <div className="absolute inset-0 flex flex-col justify-end p-3">
            {post.caption && (
              <p className="text-[9px] font-extrabold uppercase leading-snug tracking-[0.18em] text-content/55">
                {post.caption}
              </p>
            )}
            <span className="mt-1.5 inline-flex items-center gap-1 text-[8px] font-extrabold uppercase tracking-[0.22em] text-content/40">
              View on Instagram
              <ArrowUpRight className="h-2.5 w-2.5" aria-hidden="true" />
            </span>
          </div>
        ) : (
          <Image
            src={post.mediaUrl}
            alt={alt}
            fill
            unoptimized
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover grayscale motion-safe:transition-[filter] motion-safe:duration-200 group-hover:grayscale-0 group-focus-visible:grayscale-0"
            onError={() => setImgFailed(true)}
          />
        )}
      </div>

      {/* Caption set below the plate — never over it. */}
      <div className="flex items-baseline justify-between gap-3 border-b border-line/20 py-2">
        <span className="truncate text-[9px] font-extrabold uppercase tracking-[0.18em] text-content/55 group-hover:underline">
          {post.caption ?? `@${INSTAGRAM_HANDLE}`}
        </span>
        <span className="shrink-0 text-[8px] font-extrabold uppercase tracking-[0.2em] text-content/35">
          @{INSTAGRAM_HANDLE}
        </span>
      </div>
    </a>
  );
}

export function InstagramGallery({ className }: { className?: string }) {
  const posts = CURATED_REAL_POSTS;
  if (posts.length === 0) return null;

  return (
    <div
      className={className}
      aria-label={`Posts from @${INSTAGRAM_HANDLE} on Instagram`}
    >
      <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-3">
        {posts.map((post) => (
          <Tile key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
