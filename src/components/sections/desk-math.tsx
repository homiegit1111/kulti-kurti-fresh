"use client";

/**
 * DESK MATH — interactive margin planner. The one question every wholesale
 * buyer actually asks is "what do I make on this?" — so the section lets them
 * run it: pick a real cost lane from the line, set how many sets go on the
 * rail, type their street price, and watch margin / profit / break-even
 * compute live in big line-book numbers.
 *
 * Honest data only: set prices come from the live catalog (server-passed),
 * GST estimate follows GST_CONFIG (5% ≤ ₹1,000/pc, 12% above), and since the
 * wholesale tier is flat there is deliberately NO discount-ladder theatre.
 * Everything here is presentational math — no cart, no commerce calls.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Minus, Plus, ArrowRight, MessageCircle } from "lucide-react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import { B2B_CONFIG, GST_CONFIG } from "@/lib/b2b/config";
import { EASE_OUT_EXPO, VIEWPORT_EARLY, fadeUp, staggerContainer } from "@/lib/motion";

export type DeskLane = {
  /** e.g. "Entry lane" */
  label: string;
  /** real style code the price comes from, e.g. RP-KURTI-055 */
  code: string;
  /** wholesale set price (4 pcs) */
  setPrice: number;
  /** wholesale per-piece cost */
  perPiece: number;
};

const fmtInt = (n: number) => Math.round(n).toLocaleString("en-IN");
const fmtRupees = (n: number) => `₹${fmtInt(n)}`;
const fmtPct = (n: number) => `${Math.round(n)}%`;

/** Springy numeric readout; jumps instantly under reduced motion. */
function CountUp({
  value,
  format,
  className,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const spring = useSpring(mv, { stiffness: 140, damping: 24, mass: 0.6 });
  const [animated, setAnimated] = useState(() => format(value));

  // `format` is a stable module-level formatter (fmtInt & co.). State updates
  // happen only inside the spring's async callback; the reduced-motion path
  // renders the formatted value directly with no state at all.
  useEffect(() => {
    if (reduce) return;
    mv.set(value);
    const unsub = spring.on("change", (v) => setAnimated(format(v)));
    return unsub;
  }, [value, mv, spring, reduce, format]);

  return (
    <span className={`tabular-nums ${className ?? ""}`}>
      {reduce ? format(value) : animated}
    </span>
  );
}

/** Suggested street price: ~1.6× cost, rounded up to a ₹x99 shelf price. */
function suggestStreet(perPiece: number): number {
  const raw = perPiece * 1.6;
  return Math.max(199, Math.ceil(raw / 100) * 100 - 1);
}

export function DeskMath({ lanes }: { lanes: DeskLane[] }) {
  const reduce = useReducedMotion();
  const [laneIdx, setLaneIdx] = useState(0);
  const [sets, setSets] = useState(B2B_CONFIG.minimumOrderSets);
  const lane = lanes[Math.min(laneIdx, lanes.length - 1)];

  // street price is user-editable text; blank falls back to the suggestion
  const [street, setStreet] = useState("");
  const suggested = useMemo(
    () => (lane ? suggestStreet(lane.perPiece) : 0),
    [lane],
  );
  const streetNum = useMemo(() => {
    const parsed = parseInt(street.replace(/[^0-9]/g, ""), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : suggested;
  }, [street, suggested]);

  if (!lane) return null;

  const setSize = B2B_CONFIG.setSize;
  const pieces = sets * setSize;
  const orderValue = lane.setPrice * sets;
  const profitPerPiece = streetNum - lane.perPiece;
  const marginPct = streetNum > 0 ? (profitPerPiece / streetNum) * 100 : 0;
  const totalProfit = profitPerPiece * pieces;
  const gstRate =
    lane.perPiece <= GST_CONFIG.thresholdPerPiece
      ? GST_CONFIG.lowRate
      : GST_CONFIG.highRate;
  const gstEstimate = Math.round((orderValue * gstRate) / 100);
  const breakEvenPieces =
    streetNum > 0 ? Math.min(pieces, Math.ceil(orderValue / streetNum)) : pieces;
  const breakEvenShare = pieces > 0 ? breakEvenPieces / pieces : 1;
  const losing = profitPerPiece <= 0;
  const moqMet = sets >= B2B_CONFIG.minimumOrderSets;

  const stepSets = (dir: -1 | 1) =>
    setSets((s) => Math.min(48, Math.max(1, s + dir)));

  return (
    <section
      aria-labelledby="desk-math-title"
      className="relative overflow-hidden bg-surface-inverse px-4 py-20 text-content-inverse sm:px-6 lg:px-10 lg:py-28"
    >
      {/* giant faded backdrop numeral — editorial device */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 top-1/2 hidden -translate-y-1/2 select-none font-sans text-[38rem] font-black leading-none text-content-inverse/[0.04] lg:block"
      >
        %
      </span>

      <div className="relative mx-auto max-w-[1600px]">
        <motion.div
          initial={reduce ? false : "hidden"}
          whileInView="visible"
          viewport={VIEWPORT_EARLY}
          variants={staggerContainer(0.08, 0.1)}
        >
          <motion.div
            variants={fadeUp}
            className="grid gap-6 border-b-2 border-content-inverse/25 pb-6 lg:grid-cols-[1fr_auto] lg:items-end"
          >
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-accent-lime">
                Desk math / margin planner
              </p>
              <h2
                id="desk-math-title"
                className="mt-4 font-sans text-[clamp(2.6rem,6.5vw,6rem)] font-black uppercase leading-[0.85] tracking-[-0.05em]"
              >
                Run the numbers.
              </h2>
            </div>
            <p className="max-w-xs text-sm leading-6 text-content-inverse/55 lg:pb-2 lg:text-right">
              Wholesale is a margin game. Plan yours before a single set ships.
            </p>
          </motion.div>

          <div className="mt-10 grid gap-12 lg:mt-14 lg:grid-cols-12 lg:gap-16">
            {/* ── CONTROLS ── */}
            <motion.div variants={fadeUp} className="space-y-9 lg:col-span-5">
              {/* 01 — cost lane */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-content-inverse/45">
                  <span className="mr-3 text-accent-lime">01</span>
                  Pick a cost lane
                </p>
                <div className="mt-4 grid grid-cols-3 border border-content-inverse/20">
                  {lanes.map((l, i) => {
                    const active = i === laneIdx;
                    return (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => setLaneIdx(i)}
                        aria-pressed={active}
                        className={`flex flex-col items-start gap-1 border-r border-content-inverse/20 px-3 py-3.5 text-left transition-colors duration-300 last:border-r-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-lime sm:px-4 ${
                          active
                            ? "bg-accent-lime text-on-accent"
                            : "text-content-inverse/70 hover:bg-content-inverse/5 hover:text-content-inverse"
                        }`}
                      >
                        <span className="text-[8px] font-bold uppercase tracking-[0.2em] opacity-70">
                          {l.label}
                        </span>
                        <span className="text-base font-black tabular-nums tracking-[-0.02em] sm:text-lg">
                          ₹{fmtInt(l.perPiece)}
                          <span className="ml-0.5 text-[9px] font-bold uppercase opacity-60">
                            /pc
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.18em] text-content-inverse/35">
                  Live catalog pricing · style {lane.code}
                </p>
              </div>

              {/* 02 — sets */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-content-inverse/45">
                  <span className="mr-3 text-accent-lime">02</span>
                  Sets on the rail
                </p>
                <div className="mt-4 flex items-center gap-5">
                  <div className="flex items-center border border-content-inverse/25">
                    <button
                      type="button"
                      onClick={() => stepSets(-1)}
                      aria-label="Fewer sets"
                      className="flex h-12 w-12 items-center justify-center text-content-inverse/60 transition-colors hover:bg-content-inverse/10 hover:text-accent-lime focus-visible:outline-none focus-visible:bg-content-inverse/10"
                    >
                      <Minus className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                    <span className="w-16 border-x border-content-inverse/25 text-center text-2xl font-black tabular-nums">
                      {String(sets).padStart(2, "0")}
                    </span>
                    <button
                      type="button"
                      onClick={() => stepSets(1)}
                      aria-label="More sets"
                      className="flex h-12 w-12 items-center justify-center text-content-inverse/60 transition-colors hover:bg-content-inverse/10 hover:text-accent-lime focus-visible:outline-none focus-visible:bg-content-inverse/10"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                  <div>
                    <p className="text-sm font-bold tabular-nums">
                      {pieces} pieces
                    </p>
                    <p
                      className={`mt-0.5 text-[9px] font-bold uppercase tracking-[0.2em] ${
                        moqMet ? "text-accent-lime" : "text-accent-red"
                      }`}
                    >
                      {moqMet
                        ? "Clears MOQ"
                        : `MOQ ${B2B_CONFIG.minimumOrderSets} sets`}
                    </p>
                  </div>
                </div>
              </div>

              {/* 03 — street price */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-content-inverse/45">
                  <span className="mr-3 text-accent-lime">03</span>
                  Your street price
                </p>
                <div className="mt-4 flex items-end gap-4">
                  <label className="flex flex-1 items-baseline gap-1 border-b border-content-inverse/30 pb-2 transition-colors focus-within:border-accent-lime">
                    <span className="text-lg font-black text-content-inverse/50">
                      ₹
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder={String(suggested)}
                      aria-label="Your street price per piece"
                      className="w-full bg-transparent text-2xl font-black tabular-nums tracking-[-0.02em] text-content-inverse outline-none placeholder:text-content-inverse/30"
                    />
                    <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.18em] text-content-inverse/40">
                      /pc
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setStreet(String(suggested))}
                    className="shrink-0 border border-content-inverse/25 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.16em] text-content-inverse/60 transition-colors hover:border-accent-lime hover:text-accent-lime focus-visible:outline-none focus-visible:border-accent-lime"
                  >
                    Try ₹{fmtInt(suggested)}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* ── LEDGER ── */}
            <motion.div variants={fadeUp} className="lg:col-span-7">
              <div className="divide-y divide-content-inverse/15 border-y border-content-inverse/25">
                {/* margin */}
                <div className="flex items-end justify-between gap-6 py-6">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-content-inverse/45">
                      Your margin
                    </p>
                    <p className="mt-1 text-xs text-content-inverse/50">
                      {losing
                        ? "Street price is at or below cost"
                        : `₹${fmtInt(profitPerPiece)} kept per piece`}
                    </p>
                  </div>
                  <CountUp
                    value={marginPct}
                    format={fmtPct}
                    className={`font-sans text-[clamp(3rem,7vw,5.5rem)] font-black leading-[0.85] tracking-[-0.04em] ${
                      losing ? "text-accent-red" : "text-accent-lime"
                    }`}
                  />
                </div>

                {/* profit */}
                <div className="flex items-end justify-between gap-6 py-6">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-content-inverse/45">
                      Profit on this order
                    </p>
                    <p className="mt-1 text-xs text-content-inverse/50">
                      sold through at ₹{fmtInt(streetNum)}/pc
                    </p>
                  </div>
                  <CountUp
                    value={totalProfit}
                    format={fmtRupees}
                    className={`text-[clamp(1.8rem,4vw,3rem)] font-black leading-none tracking-[-0.03em] ${
                      losing ? "text-accent-red" : ""
                    }`}
                  />
                </div>

                {/* order value */}
                <div className="flex items-end justify-between gap-6 py-6">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-content-inverse/45">
                      Order value
                    </p>
                    <p className="mt-1 text-xs text-content-inverse/50">
                      {sets} sets · {pieces} pcs · + {fmtRupees(gstEstimate)}{" "}
                      GST ({gstRate}%) at invoice
                    </p>
                  </div>
                  <CountUp
                    value={orderValue}
                    format={fmtRupees}
                    className="text-[clamp(1.8rem,4vw,3rem)] font-black leading-none tracking-[-0.03em]"
                  />
                </div>

                {/* break-even */}
                <div className="py-6">
                  <div className="flex items-end justify-between gap-6">
                    <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-content-inverse/45">
                      Sell-through to break even
                    </p>
                    <p className="text-lg font-black tabular-nums tracking-[-0.02em]">
                      {breakEvenPieces}
                      <span className="text-content-inverse/45">
                        {" "}
                        / {pieces} pcs
                      </span>
                    </p>
                  </div>
                  <div
                    className="mt-3 h-1.5 w-full bg-content-inverse/10"
                    role="img"
                    aria-label={`Sell ${breakEvenPieces} of ${pieces} pieces to recover the order value`}
                  >
                    <motion.div
                      className={losing ? "h-full bg-accent-red" : "h-full bg-accent-lime"}
                      initial={false}
                      animate={{ width: `${Math.min(100, breakEvenShare * 100)}%` }}
                      transition={
                        reduce
                          ? { duration: 0 }
                          : { duration: 0.6, ease: EASE_OUT_EXPO }
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/bulk-order" className="linebook-button--dark">
                  Open the bulk desk <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <a
                  href={`https://wa.me/${B2B_CONFIG.whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-content-inverse/30 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-content-inverse/80 transition-colors hover:border-accent-lime hover:text-accent-lime focus-visible:outline-none focus-visible:border-accent-lime"
                >
                  WhatsApp the desk <MessageCircle className="h-3.5 w-3.5" />
                </a>
                <p className="basis-full pt-2 text-[9px] font-bold uppercase tracking-[0.18em] text-content-inverse/35 sm:basis-auto sm:pt-0">
                  Estimates on catalog set prices · {GST_CONFIG.note}
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
