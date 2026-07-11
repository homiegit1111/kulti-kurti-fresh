"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

/**
 * Brand story — pure narrative from 2021.
 * No catalog / support / trade-how-to chrome.
 */
const CHAPTERS = [
  {
    year: "2021",
    title: "A quiet beginning",
    copy: "One studio table in Bengaluru. First handloom lengths, first finishes, first quiet rail of kurtis made with care.",
  },
  {
    year: "2022",
    title: "Hands that weave",
    copy: "Master weavers and dyers join the circle. Cotton and Chanderi start carrying our name further than the room they began in.",
  },
  {
    year: "2023",
    title: "Sets that make sense",
    copy: "Ratio packing becomes second nature — balanced sizes, easier rails, fewer stock-outs for the shops that trust us.",
  },
  {
    year: "2024",
    title: "Shops, then stories",
    copy: "Boutiques and resellers stock Rangat. Reorders arrive with the same request: keep the craft, keep it clear.",
  },
  {
    year: "Today",
    title: "Still the same cloth",
    copy: "New drops, the same standard — hand-finished pieces, honest pricing, and a house that grows with the people who wear and sell it.",
  },
] as const;

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.08 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

export function WholesaleSteps() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      aria-label="Our story from 2021"
      className="content-auto relative overflow-hidden bg-[#0a0a0a] text-white"
    >
      {/* Atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(166,139,95,0.14),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.4)_100%)]"
      />

      {/* Large ghost year watermark */}
      <p
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 select-none font-serif text-[min(42vw,18rem)] leading-none tracking-[-0.06em] text-white/[0.03]"
      >
        21
      </p>

      {/* Decorative SVG — continuous story thread */}
      <svg
        aria-hidden
        className="pointer-events-none absolute top-0 right-0 h-full w-[42%] text-[#a68b5f]/12 max-lg:hidden"
        viewBox="0 0 200 800"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <path
          d="M160 40 C80 120, 180 200, 100 280 S20 400, 120 480 S200 600, 80 700 S40 760, 100 820"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="5 9"
          strokeLinecap="round"
        />
        <circle cx="160" cy="40" r="3" fill="currentColor" opacity="0.4" />
        <circle cx="100" cy="820" r="3" fill="currentColor" opacity="0.4" />
      </svg>

      <div className="relative mx-auto max-w-[900px] px-4 py-14 sm:px-6 sm:py-16 lg:py-24">
        {/* Opening */}
        <header className="mb-12 text-center sm:mb-16">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.32em] text-[#d4bd8b]">
            Est. 2021
          </p>
          <h2 className="font-serif text-[clamp(2rem,6vw,3.5rem)] font-light leading-[1.08] tracking-tight text-white">
            The story we still
            <span className="mt-1 block italic text-[#d4bd8b]">
              cut by hand.
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[13px] leading-relaxed text-white/45 sm:text-[14px]">
            Not a pitch — a path. Five chapters from a small studio note to the
            rails you stock today.
          </p>

          {/* Gold underline flourish */}
          <svg
            aria-hidden
            className="mx-auto mt-6 h-3 w-28 text-[#a68b5f]/50"
            viewBox="0 0 112 12"
            fill="none"
          >
            <path
              d="M2 8 C20 2, 40 10, 56 6 S90 2, 110 7"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </header>

        {/* Chapters — editorial journal */}
        <motion.ol
          variants={reduceMotion ? undefined : listVariants}
          initial={reduceMotion ? false : "hidden"}
          whileInView="show"
          viewport={{ once: true, margin: "-50px", amount: 0.12 }}
          className="relative"
        >
          {/* Center spine desktop / left spine mobile */}
          <div
            aria-hidden
            className="absolute top-3 bottom-3 left-3 w-px bg-gradient-to-b from-[#d4bd8b]/50 via-[#d4bd8b]/20 to-transparent sm:left-1/2 sm:-translate-x-px"
          />

          {CHAPTERS.map((ch, i) => {
            const left = i % 2 === 0;
            return (
              <motion.li
                key={ch.year}
                variants={reduceMotion ? undefined : itemVariants}
                className="relative grid grid-cols-[24px_1fr] gap-4 pb-10 last:pb-0 sm:grid-cols-[1fr_48px_1fr] sm:gap-0 sm:pb-14"
              >
                {/* Mobile year node */}
                <div className="relative z-[1] flex justify-center pt-1 sm:col-start-2 sm:row-start-1 sm:pt-0 sm:justify-center">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#d4bd8b]/50 bg-[#0a0a0a] sm:h-7 sm:w-7">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#d4bd8b]" />
                  </span>
                </div>

                {/* Content — alternate sides on desktop */}
                <div
                  className={
                    left
                      ? "sm:col-start-1 sm:row-start-1 sm:pr-10 sm:text-right"
                      : "sm:col-start-3 sm:row-start-1 sm:pl-10 sm:text-left"
                  }
                >
                  <p className="font-serif text-[2rem] leading-none tracking-tight text-[#d4bd8b]/90 sm:text-[2.35rem]">
                    {ch.year}
                  </p>
                  <h3 className="mt-2 font-serif text-[1.25rem] leading-snug tracking-tight text-white sm:text-[1.4rem]">
                    {ch.title}
                  </h3>
                  <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-white/45 sm:text-[14px] sm:leading-[1.65]">
                    {ch.copy}
                  </p>
                  {/* Side accent line */}
                  <span
                    aria-hidden
                    className={
                      left
                        ? "mt-4 hidden h-px w-12 bg-gradient-to-l from-transparent to-[#d4bd8b]/40 sm:ml-auto sm:block"
                        : "mt-4 hidden h-px w-12 bg-gradient-to-r from-[#d4bd8b]/40 to-transparent sm:block"
                    }
                  />
                </div>

                {/* Empty column for alternate layout */}
                <div
                  className={
                    left
                      ? "hidden sm:col-start-3 sm:row-start-1 sm:block"
                      : "hidden sm:col-start-1 sm:row-start-1 sm:block"
                  }
                  aria-hidden
                />
              </motion.li>
            );
          })}
        </motion.ol>

        {/* Close — quiet, not a support desk */}
        <div className="mt-6 border-t border-white/10 pt-10 text-center sm:mt-4 sm:pt-12">
          <p className="font-serif text-[1.35rem] italic leading-snug text-white/80 sm:text-[1.5rem]">
            The cloth changes.
            <span className="block text-[#d4bd8b]">The hand does not.</span>
          </p>
          <Link
            href="/shop"
            className="group mt-7 inline-flex items-center gap-2 border-b border-white/20 pb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white/70 transition-colors hover:border-[#d4bd8b] hover:text-[#d4bd8b]"
          >
            Explore styles
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
