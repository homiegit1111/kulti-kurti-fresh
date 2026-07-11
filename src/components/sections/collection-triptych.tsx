"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

const EASE_EXPO = [0.16, 1, 0.3, 1] as const;
const EASE_QUINT = [0.22, 1, 0.36, 1] as const;

/**
 * One showcased collection. `images` drives the slow crossfade (only the
 * Dupatta set supplies more than one — it's the "living" panel at rest).
 * `chip` is the B2B substance a wholesale buyer weighs at a glance.
 */
interface ShowcaseCollection {
  index: string;
  title: string;
  handle: string;
  images: string[];
  spineLabel: string;
  chip: string;
  descriptor: string;
}

const COLLECTIONS: ShowcaseCollection[] = [
  {
    index: "01",
    title: "Co-ords",
    handle: "co-ords",
    images: ["/images/collection-coords.jpg"],
    spineLabel: "Co-ords",
    chip: "Matched sets · MOQ 4",
    descriptor: "Top-and-bottom, cut to move together.",
  },
  {
    index: "02",
    title: "2 Pcs Set",
    handle: "2-pcs-set",
    images: ["/images/collection-2pcs.jpg"],
    spineLabel: "2 Pcs Set",
    chip: "Kurta + bottom · MOQ 4",
    descriptor: "The boutique reseller's everyday rack-filler.",
  },
  {
    index: "03",
    title: "Dupatta Set",
    handle: "dupatta-set",
    images: [
      "/images/collection-dupatta.jpg",
      "/images/sheer_flowing_dupatta.png",
    ],
    spineLabel: "Dupatta Set",
    chip: "3-piece · dupatta incl.",
    descriptor: "Festive three-piece, finished with a flowing dupatta.",
  },
];

// Center panel (Dupatta, most layered) starts dominant — quiet hierarchy.
const DEFAULT_ACTIVE = 2;

/**
 * Collection showcase — "Triptych Spine".
 *
 * Three collections share the viewport as vertical panels. At rest the layout
 * is weighted (24 / 52 / 24), center dominant. Hover/focus expands one panel
 * to ~60% while the others compress to editorial spines showing only a
 * vertical title. The Dupatta panel slow-crossfades its imagery at rest — the
 * section's one "living" element. Mobile drops the hover model for a
 * tap-to-expand accordion (see the lg:hidden branch).
 *
 * Brutalist-editorial: hard `border-line` rules, massive uppercase display
 * type, lime rule that "arrives" under the active panel. All colour via theme
 * tokens so light + dark both hold. Reduced-motion collapses to opacity only.
 */
export function CollectionTriptych() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-surface text-content">
      {/* Section header — editorial label + oversized ghost watermark */}
      <div className="relative mx-auto max-w-[1600px] px-4 pb-8 pt-16 sm:px-6 lg:px-10 lg:pb-12 lg:pt-24">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-2 left-2 select-none text-[22vw] font-black uppercase leading-none tracking-[-0.06em] text-content/[0.04] sm:left-4 lg:text-[13vw]"
        >
          Sets
        </span>
        <div className="relative flex items-end justify-between gap-6">
          <div>
            <p className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.3em] text-accent-red sm:text-[10px]">
              <span className="h-px w-6 bg-accent-red" />
              Shop by set
            </p>
            <h2 className="mt-4 text-[clamp(2.5rem,6vw,5.5rem)] font-black uppercase leading-[0.82] tracking-[-0.05em]">
              Three ways
              <br />
              to fill a rail.
            </h2>
          </div>
          <Link
            href="/shop"
            className="mb-2 hidden shrink-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-content transition-colors hover:text-accent-red lg:inline-flex"
          >
            All collections
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </Link>
        </div>
      </div>

      {/* DESKTOP (lg+): breathing triptych driven by hover/focus */}
      <div className="hidden lg:block">
        <TriptychDesktop reduce={!!reduce} />
      </div>

      {/* MOBILE (< lg): tap-to-expand accordion */}
      <div className="lg:hidden">
        <TriptychMobile reduce={!!reduce} />
      </div>
    </section>
  );
}

/* ─── Desktop ───────────────────────────────────────────────────────────── */

function TriptychDesktop({ reduce }: { reduce: boolean }) {
  const [active, setActive] = useState(DEFAULT_ACTIVE);

  // Weighted flex-grow: active claims the room, neighbours compress to spines.
  const growFor = (i: number) => {
    if (reduce) return 1;
    if (i === active) return 60;
    return 20;
  };

  return (
    <div
      className="mx-auto flex h-[68vh] max-h-[760px] min-h-[520px] max-w-[1600px] border-y-2 border-line px-4 sm:px-6 lg:px-10"
      onMouseLeave={() => setActive(DEFAULT_ACTIVE)}
    >
      <div className="flex w-full">
        {COLLECTIONS.map((c, i) => {
          const isActive = i === active;
          return (
            <motion.div
              key={c.handle}
              className="relative overflow-hidden border-line [&:not(:first-child)]:border-l-2"
              style={{ flexGrow: growFor(i), flexBasis: 0 }}
              animate={{ flexGrow: growFor(i) }}
              transition={{ duration: 1.0, ease: EASE_EXPO }}
              onMouseEnter={() => setActive(i)}
              onFocusCapture={() => setActive(i)}
            >
              <PanelImage collection={c} isActive={isActive} reduce={reduce} />

              {/* Dark scrim — deepens on compressed panels so the active pops */}
              <motion.div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10"
                animate={{ opacity: isActive ? 1 : 0.55 }}
                transition={{ duration: 0.9, ease: EASE_QUINT }}
              />

              {/* Compressed spine: vertical title + index */}
              <AnimatePresence>
                {!isActive && (
                  <motion.div
                    key="spine"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: EASE_QUINT }}
                    className="absolute inset-0 flex flex-col items-center justify-between py-6"
                  >
                    <span className="text-[11px] font-black tabular-nums tracking-[0.1em] text-white/70">
                      {c.index}
                    </span>
                    <span
                      className="text-[13px] font-bold uppercase tracking-[0.35em] text-white/85"
                      style={{ writingMode: "vertical-rl" }}
                    >
                      {c.spineLabel}
                    </span>
                    <span className="h-6 w-px bg-white/40" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Expanded content: label, headline, chip, CTA + lime rule */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    key="expanded"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: EASE_QUINT, delay: 0.15 }}
                    className="absolute inset-0 flex flex-col justify-end p-8"
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute right-6 top-6 select-none text-[7rem] font-black leading-none tracking-[-0.05em] text-white/10"
                    >
                      {c.index}
                    </span>

                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/70">
                      Collection {c.index}
                    </p>
                    <h3 className="mt-2 text-[clamp(2.5rem,4vw,4rem)] font-black uppercase leading-[0.85] tracking-[-0.04em] text-white">
                      {c.title}
                    </h3>
                    <p className="mt-3 max-w-sm text-sm font-medium leading-snug text-white/75">
                      {c.descriptor}
                    </p>

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center border border-white/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/90">
                        {c.chip}
                      </span>
                      <Link
                        href={`/collections/${c.handle}`}
                        className="group inline-flex items-center gap-1.5 border-2 border-white px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-accent-lime hover:bg-accent-lime hover:text-on-accent"
                      >
                        Open set
                        <ArrowUpRight
                          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                          strokeWidth={2.5}
                        />
                      </Link>
                    </div>

                    {/* Lime rule "arrives" once the panel has mostly settled */}
                    <motion.div
                      className="absolute bottom-0 left-0 h-[3px] bg-accent-lime"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 0.5, ease: EASE_EXPO, delay: 0.7 }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Mobile ────────────────────────────────────────────────────────────── */

function TriptychMobile({ reduce }: { reduce: boolean }) {
  // First panel open by default — never an all-collapsed blank state.
  const [open, setOpen] = useState(0);

  return (
    <div className="flex flex-col border-y-2 border-line">
      {COLLECTIONS.map((c, i) => {
        const isOpen = i === open;
        return (
          <motion.button
            key={c.handle}
            type="button"
            onClick={() => setOpen(i)}
            whileTap={reduce ? undefined : { scale: 0.985 }}
            aria-expanded={isOpen}
            className="relative block w-full overflow-hidden border-line text-left [&:not(:first-child)]:border-t-2"
            animate={{ height: isOpen ? "72vw" : "21vw" }}
            transition={{ duration: reduce ? 0 : 0.85, ease: EASE_EXPO }}
          >
            <PanelImage collection={c} isActive={isOpen} reduce={reduce} />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/15"
            />

            {/* Collapsed: horizontal label + index tab */}
            {!isOpen && (
              <div className="absolute inset-0 flex items-center justify-between px-5">
                <span className="text-[15px] font-black uppercase tracking-[0.18em] text-white">
                  {c.title}
                </span>
                <span className="text-[11px] font-black tabular-nums tracking-[0.1em] text-white/60">
                  [{c.index}]
                </span>
              </div>
            )}

            {/* Expanded: full editorial block */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  key="m-expanded"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: EASE_QUINT, delay: 0.1 }}
                  className="absolute inset-0 flex flex-col justify-end p-5"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-4 top-3 select-none text-[4.5rem] font-black leading-none text-white/10"
                  >
                    {c.index}
                  </span>
                  <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/70">
                    Collection {c.index}
                  </p>
                  <h3 className="mt-1.5 text-4xl font-black uppercase leading-[0.85] tracking-[-0.03em] text-white">
                    {c.title}
                  </h3>
                  <div className="mt-4 flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center border border-white/30 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white/90">
                      {c.chip}
                    </span>
                    <Link
                      href={`/collections/${c.handle}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 border-2 border-white px-3.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-white"
                    >
                      Open set
                      <ArrowUpRight className="h-3 w-3" strokeWidth={2.5} />
                    </Link>
                  </div>
                  <div className="absolute bottom-0 left-0 h-[3px] w-full bg-accent-lime" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}

/* ─── Shared image layer (with Dupatta crossfade) ───────────────────────── */

function PanelImage({
  collection,
  isActive,
  reduce,
}: {
  collection: ShowcaseCollection;
  isActive: boolean;
  reduce: boolean;
}) {
  const multi = collection.images.length > 1;
  const [frame, setFrame] = useState(0);

  // Slow crossfade — only for the multi-image (Dupatta) panel, only while
  // active/expanded, and never under reduced-motion. Pausing when compressed
  // keeps idle GPU work off.
  useEffect(() => {
    if (!multi || reduce || !isActive) return;
    const id = setInterval(
      () => setFrame((f) => (f + 1) % collection.images.length),
      6000,
    );
    return () => clearInterval(id);
  }, [multi, reduce, isActive, collection.images.length]);

  return (
    // Slow settle-zoom on the active panel — the luxury tell. Wraps the images
    // so the scale actually applies to them.
    <motion.div
      className="absolute inset-0"
      animate={{ scale: reduce ? 1 : isActive ? 1.05 : 1 }}
      transition={{ duration: 1.4, ease: EASE_QUINT }}
    >
      {collection.images.map((src, i) => (
        <motion.div
          key={src}
          className="absolute inset-0"
          initial={false}
          animate={{ opacity: multi ? (i === frame ? 1 : 0) : 1 }}
          transition={{ duration: 2, ease: "easeInOut" }}
        >
          <Image
            src={src}
            alt={i === 0 ? `${collection.title} collection` : ""}
            fill
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="object-cover"
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
