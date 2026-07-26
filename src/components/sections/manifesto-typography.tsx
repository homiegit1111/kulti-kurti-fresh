"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { B2B_CONFIG } from "@/lib/b2b/config";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Inline photo chip that sits inside the headline sentence. */
function InlineImage({
  src,
  alt,
  rotate = 0,
}: {
  src: string;
  alt: string;
  rotate?: number;
}) {
  return (
    <span
      className="manifesto-word-img relative mx-[0.12em] inline-block h-[0.8em] w-[1.75em] overflow-hidden align-baseline"
      style={{ transform: `translateY(0.12em) rotate(${rotate}deg)` }}
    >
      <Image src={src} alt={alt} fill className="object-cover" sizes="12vw" />
    </span>
  );
}

/**
 * MANIFESTO — typography with the cloth inside it.
 *
 * One oversized sentence about the brand, product photography embedded
 * inline so words and garments share the same line box. Each word rises out
 * of its own overflow mask in sequence — a kinetic reveal, not a fade.
 */
export function ManifestoTypography() {
  const reduce = useReducedMotion();

  // Words and images interleaved per line; the cascade counter continues
  // across the break so the second line keeps the rhythm.
  const line1: ReactNode[] = [
    "We", "cut", "for",
    <InlineImage key="img1" src="/images/premium_dupatta.png" alt="Premium dupatta fabric" rotate={-2} />,
    "the", "women",
  ];
  const line2: ReactNode[] = [
    "who", "sell",
    <InlineImage key="img2" src="/images/collection-ethnic.png" alt="Ethnic collection" rotate={1.5} />,
    "India", "its", "colour.",
  ];

  const renderLine = (nodes: ReactNode[], offset: number) =>
    nodes.map((node, i) => (
      <span key={i} className="inline-block overflow-hidden pb-[0.08em]">
        <motion.span
          initial={{ y: reduce ? "0%" : "115%" }}
          whileInView={{ y: "0%" }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{
            duration: reduce ? 0.35 : 0.8,
            delay: reduce ? 0 : 0.1 + (offset + i) * 0.055,
            ease: EASE,
          }}
          className="inline-block will-change-transform"
        >
          {node}
        </motion.span>
      </span>
    ));

  return (
    <section className="relative overflow-hidden bg-surface px-5 py-24 text-content sm:px-8 lg:px-12 lg:py-36">
      <div className="mx-auto max-w-[1500px]">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.6 }}
          className="mb-10 flex items-center gap-3 text-[9px] font-bold uppercase tracking-[0.32em] text-accent-red"
        >
          <span className="h-px w-8 bg-accent-red" aria-hidden />
          The studio
        </motion.p>

        <h2
          aria-label="We cut for the women who sell India its colour."
          className="select-none font-sans text-[clamp(2.4rem,7vw,6.5rem)] font-black uppercase leading-[1.04] tracking-[-0.045em]"
        >
          <span aria-hidden className="block">
            <span className="flex flex-wrap items-baseline gap-x-[0.28em]">
              {renderLine(line1, 0)}
            </span>
            <span className="flex flex-wrap items-baseline gap-x-[0.28em]">
              {renderLine(line2, line1.length)}
            </span>
          </span>
        </h2>

        {/* hover bloom — images inside the sentence swell on hover */}
        <style>{`
          .manifesto-word-img {
            transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .manifesto-word-img:hover {
            transform: translateY(0.12em) rotate(0deg) scale(1.12) !important;
          }
        `}</style>

        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.7, delay: reduce ? 0 : 0.5, ease: EASE }}
          className="mt-14 grid gap-10 border-t border-line/15 pt-10 lg:grid-cols-[1fr_auto]"
        >
          <p className="max-w-[52ch] text-[15px] leading-7 text-content/65">
            Boutiques, resellers and online sellers across India stock Rangat
            Pehnawa because the maths works: size-complete packs of{" "}
            {B2B_CONFIG.setSize}, a {B2B_CONFIG.minimumOrderSets}-set minimum
            you can mix across styles, and one maker-direct rate that doesn&apos;t
            change between your first order and your fiftieth.
          </p>
          <div className="flex items-start gap-10">
            <div>
              <p className="text-4xl font-black tabular-nums tracking-[-0.04em] lg:text-5xl">
                {B2B_CONFIG.setSize}
              </p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.26em] text-content/45">
                Pieces per set
              </p>
            </div>
            <div>
              <p className="text-4xl font-black tabular-nums tracking-[-0.04em] text-accent-lime lg:text-5xl">
                {B2B_CONFIG.minimumOrderSets}
              </p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.26em] text-content/45">
                Set minimum, mix freely
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
