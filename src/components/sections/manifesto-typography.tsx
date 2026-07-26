"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { B2B_CONFIG } from "@/lib/b2b/config";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Inline photo chip that sits inside the headline sentence. */
function InlineImage({
  src,
  alt,
  rotate = 0,
  className = "",
}: {
  src: string;
  alt: string;
  rotate?: number;
  className?: string;
}) {
  return (
    <span
      className={`relative mx-[0.15em] inline-block h-[0.82em] w-[1.7em] translate-y-[0.1em] overflow-hidden align-baseline ${className}`}
      style={{ transform: `translateY(0.1em) rotate(${rotate}deg)` }}
    >
      <Image src={src} alt={alt} fill className="object-cover" sizes="12vw" />
    </span>
  );
}

/**
 * MANIFESTO — typography with the cloth inside it.
 *
 * One oversized sentence about the brand, with product photography embedded
 * inline so the words and the garments share the same line box. Line-by-line
 * masked reveal on scroll. This is the section that says "fashion house",
 * not "template": no cards, no grid, just language and cloth.
 */
export function ManifestoTypography() {
  const reduce = useReducedMotion();

  const lines = [
    // line 1: "We cut for" + [image] + "the women"
    <span key="l1" className="block">
      We cut for
      <InlineImage src="/images/premium_dupatta.png" alt="Premium dupatta fabric" rotate={-2} />
      the women
    </span>,
    // line 2: "who sell India" + [image] + "its colour."
    <span key="l2" className="block">
      who sell
      <InlineImage src="/images/collection-ethnic.png" alt="Ethnic collection" rotate={1.5} />
      India its colour.
    </span>,
  ];

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

        <h2 className="select-none font-sans text-[clamp(2.4rem,7vw,6.5rem)] font-black uppercase leading-[1.02] tracking-[-0.045em]">
          {lines.map((line, i) => (
            <span key={i} className="block overflow-hidden pb-[0.08em]">
              <motion.span
                initial={{ y: reduce ? "0%" : "110%" }}
                whileInView={{ y: "0%" }}
                viewport={{ once: true, margin: "-15%" }}
                transition={{
                  duration: reduce ? 0.4 : 0.9,
                  delay: reduce ? 0 : i * 0.14,
                  ease: EASE,
                }}
                className="block"
              >
                {line}
              </motion.span>
            </span>
          ))}
        </h2>

        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-15%" }}
          transition={{ duration: 0.7, delay: reduce ? 0 : 0.4, ease: EASE }}
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
