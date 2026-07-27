"use client";

/**
 * THE CINEMATIC BAND — cloth in motion, full bleed.
 *
 * One quiet film between the still sections: the garment moving is the one thing
 * photographs cannot show, and it is what a buyer is really judging — how the
 * fabric falls.
 *
 * BANDWIDTH IS THE WHOLE DESIGN PROBLEM HERE. The source cut was 16 MB, which
 * would have been indefensible for a boutique owner on mobile data. It ships at
 * ~1.2 MB (VP9/H.264, 1280px, silent), and even that is not fetched until the
 * band is近 the viewport:
 *
 *   • `preload="none"` and no <source> children until we decide to load — the
 *     browser cannot start a download for a section nobody has scrolled to.
 *   • An IntersectionObserver mounts the sources ~40% of a viewport early, then
 *     plays only while visible and pauses the moment it leaves.
 *   • `prefers-reduced-motion` never loads the video at all: the poster frame is
 *     the section, and it is a real frame from the film, so nothing is lost.
 *   • Muted + playsInline + loop: the only autoplay any browser will honour, and
 *     the only kind that is not rude.
 *
 * The poster is always painted first, so the band never appears as a black hole
 * while bytes arrive.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export function CinematicBand({
  headline,
  accent,
  caption,
  href = "/shop",
  cta = "Browse styles",
  videoMp4 = "/video/atelier.mp4",
  videoWebm = "/video/atelier.webm",
  poster = "/video/atelier-poster.jpg",
}: {
  headline: string;
  /** Clause set in vermilion italic — the cover's signature. */
  accent?: string;
  caption?: string;
  href?: string;
  cta?: string;
  /**
   * The film itself, editable from Admin Studio → Content → Home → Film band.
   * MP4 is the universal fallback and is required; WebM is offered first when
   * present because it is materially smaller for the same quality. Defaults keep
   * the shipped film in place for any caller that does not pass them.
   */
  videoMp4?: string;
  videoWebm?: string;
  poster?: string;
}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  /** Sources are only attached once this flips — no early bytes. */
  const [load, setLoad] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (still.matches) return; // poster only; never fetch the film

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoad(true);
          videoRef.current?.play().catch(() => {
            /* autoplay refused — the poster stands in, which is fine */
          });
        } else {
          videoRef.current?.pause();
        }
      },
      { rootMargin: "40% 0px", threshold: 0 },
    );
    io.observe(node);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") videoRef.current?.pause();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  /*
   * THE BAND IS A PLATE, NOT A SECTION.
   *
   * Its ground, its type and its accent are the pinned --home-plate-* trio,
   * identical in both themes, because the scrim burned over the film is dark in
   * both themes. Using the theming --home-ink / --home-ground here was the bug
   * the owner reported in miniature: at night the fill turned to paper and the
   * cream headline turned to ink, so the type vanished into its own scrim.
   * Computed against the scrim colour: plate-ink 15.79:1, caption (70%) 8.18:1,
   * accent clause 5.24:1 (display scale, needs 3:1).
   */
  return (
    <section
      ref={sectionRef}
      aria-label="The cloth in motion"
      className="relative h-[62svh] min-h-[420px] w-full overflow-hidden bg-home-plate lg:h-[76svh]"
    >
      <video
        ref={videoRef}
        {...(poster ? { poster } : {})}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
        tabIndex={-1}
        className="absolute inset-0 h-full w-full object-cover"
      >
        {load && (
          <>
            {/* Order matters: the browser takes the first source it can play, so
                the smaller WebM is offered ahead of the MP4. An uploaded .mov is
                served as video/mp4 — Safari plays it, and the type attribute is
                a hint, not a contract. */}
            {videoWebm ? <source src={videoWebm} type="video/webm" /> : null}
            {videoMp4 ? (
              <source
                src={videoMp4}
                type={videoMp4.endsWith(".webm") ? "video/webm" : "video/mp4"}
              />
            ) : null}
          </>
        )}
      </video>

      {/* Legibility scrim — load-bearing, not decoration.
          The scrim has to run the way the text runs. On a wide screen the
          headline sits in the left third, so the gradient sweeps left→right and
          leaves the cloth clear on the right. On a phone the headline spans the
          full column, and that same horizontal sweep dropped its right-hand
          words onto a ~0.23 scrim — cream type over moving cloth, barely
          readable. Below `lg` the gradient is turned to run bottom-up instead,
          under the block where the type actually is. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(25,20,16,0.22)_0%,rgba(25,20,16,0.55)_46%,rgba(25,20,16,0.88)_100%)] lg:bg-[linear-gradient(90deg,rgba(25,20,16,0.82)_0%,rgba(25,20,16,0.45)_46%,rgba(25,20,16,0.12)_78%)]"
      />

      <div className="relative mx-auto flex h-full max-w-[1500px] flex-col justify-end px-5 pb-12 sm:px-8 lg:px-14 lg:pb-16">
        {/* 24ch at the phone's 1.8rem floor came to 242px inside a 320px
            column — a four-line headline with a third of the measure unused.
            Widened below `lg`; the signed-off measure returns at `lg`. */}
        <div className="max-w-[30ch] lg:max-w-[24ch]">
          <h2 className="font-editorial text-[clamp(1.8rem,3.4vw,2.9rem)] font-light leading-[1.12] text-home-plate-ink">
            {headline}
            {accent && (
              <>
                {" "}
                <span className="font-semibold italic text-home-plate-accent">
                  {accent}
                </span>
              </>
            )}
          </h2>
          {caption && (
            <p className="mt-4 max-w-[42ch] text-[14px] leading-[1.6] text-home-plate-ink/70">
              {caption}
            </p>
          )}
          <Link
            href={href}
            className="mt-7 inline-flex h-[52px] items-center bg-home-plate-ink px-7 text-[11px] font-extrabold uppercase tracking-[0.16em] text-home-plate transition-opacity duration-200 hover:opacity-85"
          >
            {cta}
          </Link>
        </div>
      </div>
    </section>
  );
}
