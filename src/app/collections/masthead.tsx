"use client";

/**
 * Collections-index masthead — R11 frontispiece license #2 (this route's
 * single breath). Inter-black display under `premium_dupatta_v2.png`
 * multiply-blended into the paper, `botanical_shadow.png` as a light wash
 * translated ≤4% on scroll (transform-only, reduced-motion gated).
 *
 * Dark mode (declared, not left to chance): both blend layers die via
 * `dark:hidden`; a plain framed plate carries the cloth instead — knockout
 * Inter-black type over paper. Pure CSS `dark:` variants, never JS.
 *
 * No entrance animation. Total height stays under half the viewport.
 */

import { useRef } from "react";
import Image from "next/image";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { TermsRule } from "@/components/document/terms-rule";

export function CollectionsMasthead({ seasonLine }: { seasonLine: string }) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  // Light wash drifts at most 4% — transform-only, gated below.
  const washY = useTransform(scrollYProgress, [0, 1], ["0%", "4%"]);

  return (
    <header ref={ref} className="relative">
      {/* Botanical wash — light multiply layer across the composition. */}
      <motion.div
        aria-hidden="true"
        style={reduceMotion ? undefined : { y: washY }}
        className="pointer-events-none absolute -inset-x-6 -top-8 bottom-0 opacity-35 mix-blend-multiply dark:hidden"
      >
        <Image
          src="/images/botanical_shadow.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-right-top"
        />
      </motion.div>

      <div className="relative grid gap-x-6 gap-y-8 lg:grid-cols-12 lg:items-end">
        <div className="relative lg:col-span-8">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-content/55">
            Rangat Pehnawa — wholesale line book
          </p>
          <div className="relative mt-4">
            <h1 className="max-w-[16ch] text-[clamp(2.75rem,6vw,5.5rem)] font-black uppercase leading-[0.95] tracking-[-0.04em]">
              Wholesale kurti collections
            </h1>
            {/* Dupatta drape — multiply across the letterforms' upper third. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-12 right-0 h-[120%] w-[62%] mix-blend-multiply dark:hidden"
            >
              <Image
                src="/images/premium_dupatta_v2.png"
                alt=""
                fill
                sizes="(max-width: 1024px) 62vw, 700px"
                className="object-cover object-top opacity-90"
                priority
              />
            </div>
          </div>
        </div>

        <div className="relative lg:col-span-4 lg:pb-1">
          <p className="font-serif text-[16px] lowercase italic text-content/70">
            {seasonLine}
          </p>
          <TermsRule className="mt-4" />
          {/* Dark-mode fallback: the cloth as a plain framed plate. */}
          <div className="plate-frame relative mt-6 hidden aspect-[5/2] w-full max-w-[360px] dark:block">
            <Image
              src="/images/premium_dupatta_v2.png"
              alt=""
              fill
              sizes="360px"
              className="object-cover object-bottom"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
