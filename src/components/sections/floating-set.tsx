"use client";

/**
 * THE FLOATING SET — a garment held in space, not pasted on a page.
 *
 * The three flat-lay photographs are shot on plain white, so they matte out
 * cleanly (see the ingest script): kurta, trouser and dupatta as one silhouette
 * with real transparency. That makes a physical effect possible — the set sits
 * on a perspective plane and turns toward the pointer, its shadow sliding the
 * opposite way, the way an actual garment would if you tilted it under a light.
 *
 * WHY NOT A 3D MODEL: a real WebGL garment would need a mesh, a cloth sim and a
 * megabyte of runtime to look worse than the photographs already do. This is
 * three transforms on an image — the whole effect is a `rotateX/rotateY` on a
 * parent with `perspective`, plus a shadow that leans. It costs nothing, works
 * on a mid-range Android, and keeps the photography as the subject.
 *
 * COST DISCIPLINE:
 *   • Pointer work is read in a rAF, never in the event, so a fast mouse cannot
 *     force more than one layout-free transform write per frame.
 *   • Gated on `pointer: fine` — a phone gets the still image and no listener.
 *   • `prefers-reduced-motion` disables the tilt entirely and pins it flat.
 *   • Transform and filter only: no layout, no paint of the image itself.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export type FloatingSetItem = {
  /** Matted PNG — the garment with real transparency. */
  src: string;
  label: string;
  code: string;
  /** Per-piece rate, already formatted. */
  rate: string;
};

/** Degrees of turn at the far edge of the plate. Small on purpose. */
const MAX_TILT = 9;

export function FloatingSet({
  items,
  className,
}: {
  items: FloatingSetItem[];
  className?: string;
}) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const artRef = useRef<HTMLDivElement | null>(null);
  const frame = useRef(0);
  const target = useRef({ x: 0, y: 0 });
  const [index, setIndex] = useState(0);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setLive(fine.matches && !still.matches);
    sync();
    fine.addEventListener("change", sync);
    still.addEventListener("change", sync);
    return () => {
      fine.removeEventListener("change", sync);
      still.removeEventListener("change", sync);
    };
  }, []);

  /** One transform write per frame, regardless of pointer rate. */
  const paint = useCallback(() => {
    frame.current = 0;
    const art = artRef.current;
    if (!art) return;
    const { x, y } = target.current;
    art.style.transform = `rotateX(${(-y * MAX_TILT).toFixed(2)}deg) rotateY(${(x * MAX_TILT).toFixed(2)}deg) translateZ(0)`;
    // The shadow leans the other way — that is what sells the volume.
    art.style.filter = `drop-shadow(${(-x * 26).toFixed(0)}px ${(26 + y * 14).toFixed(0)}px 26px rgba(25,20,16,0.34))`;
  }, []);

  const onMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!live) return;
      const box = stageRef.current?.getBoundingClientRect();
      if (!box) return;
      target.current = {
        x: ((event.clientX - box.left) / box.width - 0.5) * 2,
        y: ((event.clientY - box.top) / box.height - 0.5) * 2,
      };
      if (!frame.current) frame.current = requestAnimationFrame(paint);
    },
    [live, paint],
  );

  const reset = useCallback(() => {
    target.current = { x: 0, y: 0 };
    if (!frame.current) frame.current = requestAnimationFrame(paint);
  }, [paint]);

  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const active = items[index];
  if (!active) return null;

  return (
    <div className={className}>
      <div
        ref={stageRef}
        onPointerMove={onMove}
        onPointerLeave={reset}
        className="relative [perspective:1200px]"
      >
        {/* The flat-lays are ~1.07:1. At 360px the stage is 320 wide, so a
            360px-tall box left ~60px of dead air under a width-bound image;
            300 makes the box very nearly the plate's own ratio and the
            garment fills it. */}
        <div
          ref={artRef}
          className="relative mx-auto h-[300px] w-full max-w-[560px] transition-[transform,filter] duration-300 ease-out will-change-transform motion-reduce:!transform-none sm:h-[440px] lg:h-[520px]"
          style={{
            filter: "drop-shadow(0 26px 26px rgba(25,20,16,0.34))",
            transformStyle: "preserve-3d",
          }}
        >
          {items.map((item, i) => (
            <Image
              key={item.src}
              src={item.src}
              alt={i === index ? `${item.label} — full set, flat lay` : ""}
              fill
              sizes="(max-width: 1024px) 90vw, 560px"
              className={cn(
                "object-contain transition-opacity duration-500 motion-reduce:transition-none",
                i === index ? "opacity-100" : "opacity-0",
              )}
              priority={i === 0}
            />
          ))}
        </div>
      </div>

      {/* Colourway switch — real sets, real codes, real rates. */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {items.map((item, i) => (
          <button
            key={item.code}
            type="button"
            aria-pressed={i === index}
            aria-label={`Show ${item.label}`}
            onClick={() => setIndex(i)}
            onMouseEnter={() => setIndex(i)}
            className={cn(
              "group relative h-[64px] w-[64px] overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-home-ink",
              i === index
                ? "border-home-ink"
                : "border-home-ink/20 hover:border-home-ink/50",
            )}
          >
            <Image
              src={item.src}
              alt=""
              fill
              sizes="62px"
              className="object-contain p-1"
            />
          </button>
        ))}
      </div>

      {/* Code · name · rate. On one typeset line where it fits; on a phone the
          three facts stack instead of breaking mid-clause across the middle
          dots, and the separators go with the line they belonged to. */}
      <p className="mt-5 flex flex-col items-center gap-1 text-center sm:flex-row sm:justify-center sm:gap-0">
        <span className="font-trade text-[11px] tracking-[0.08em] text-home-ink-mute">
          {active.code}
        </span>
        <span aria-hidden="true" className="mx-2 hidden text-home-ink/30 sm:inline">
          ·
        </span>
        <span className="font-editorial text-[19px] italic leading-tight">
          {active.label}
        </span>
        <span aria-hidden="true" className="mx-2 hidden text-home-ink/30 sm:inline">
          ·
        </span>
        <span className="text-[19px] font-extrabold tabular-nums tracking-[-0.02em]">
          {active.rate}
        </span>
      </p>
    </div>
  );
}
