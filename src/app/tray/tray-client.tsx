"use client";

/**
 * /tray — one working surface for shortlist + order.
 *
 * This replaces the split between /wishlist and /cart. Both bands render the
 * SAME columns in the SAME order, because the only difference between a
 * shortlisted style and a committed one is the set count — so the eye should
 * only have to move one column to see it. Promoting a style is a stepper tap,
 * not a re-navigation.
 *
 * PRESENTATIONAL: reads and writes tray state (localStorage) only. The three
 * exits hand off to existing routes/handlers; no checkout, tax or schema logic
 * is implemented here.
 */

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Download,
  MessageCircle,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { B2B_CONFIG, GST_CONFIG } from "@/lib/b2b/config";
import { buildLinesheetInquiryUrl } from "@/lib/b2b/whatsapp";
import { formatPrice } from "@/lib/commerce/catalog";
import {
  deriveGstRate,
  isSoldOut,
  linePieces,
  lineValue,
  type StyleLine,
} from "@/lib/line/contract";
import { useTray } from "@/lib/line/tray-context";
import { useTrayHandoff } from "@/lib/line/tray-handoff";
import { SetStepper } from "@/components/line/set-stepper";
import { SizeRun } from "@/components/line/size-run";
import { CodeChip, StockCell } from "@/components/line/stock-mark";
import { cn } from "@/lib/utils";

/* Shared grid so the two bands align to the same rails. */
const TRAY_COLS =
  "md:grid-cols-[3.25rem_minmax(0,1fr)_7rem_6.5rem_8.5rem_7.5rem_2.25rem]";

function Metric({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[8px] font-bold uppercase tracking-[0.24em] text-content/40">
        {label}
      </span>
      <span
        className={cn(
          "text-lg font-black leading-none tabular-nums tracking-[-0.035em]",
          accent ? "text-accent-red" : "text-content",
        )}
      >
        {value}
      </span>
      {sub && (
        <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-content/40">
          {sub}
        </span>
      )}
    </div>
  );
}

function TrayHead() {
  return (
    <div
      className={cn(
        "hidden border-b border-line/20 pb-2 md:grid md:items-end md:gap-4",
        TRAY_COLS,
      )}
    >
      {["", "Style", "Size run", "Stock", "Rate", "Sets", ""].map((label, i) => (
        <span
          key={i}
          className={cn(
            "text-[8px] font-bold uppercase tracking-[0.24em] text-content/40",
            i === 4 && "text-right",
          )}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function TrayRow({
  line,
  onSets,
  onDemote,
  onCommit,
  onRemove,
}: {
  line: StyleLine;
  onSets: (sets: number) => void;
  onDemote: () => void;
  onCommit: () => void;
  onRemove: () => void;
}) {
  const soldOut = isSoldOut(line);
  const committed = line.sets > 0;

  return (
    <div
      className={cn(
        "grid grid-cols-[3.25rem_minmax(0,1fr)] items-center gap-x-4 gap-y-3 border-b border-line/15 py-3 pl-3",
        TRAY_COLS,
        committed
          ? "border-l-2 border-l-accent-lime bg-accent-lime/[0.06]"
          : "border-l-2 border-l-transparent",
        soldOut && "opacity-55",
      )}
    >
      {/* Thumb — 4:5, links to the PDP */}
      <Link
        href={`/shop/${line.product.handle}`}
        className="relative block aspect-[4/5] w-full overflow-hidden bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime"
      >
        <Image
          src={line.product.image}
          alt={line.product.title}
          fill
          sizes="52px"
          className="object-cover"
        />
      </Link>

      {/* Title + code */}
      <div className="min-w-0 flex flex-col gap-1">
        <Link
          href={`/shop/${line.product.handle}`}
          className="truncate text-[13px] font-bold leading-tight text-content hover:text-accent-red"
        >
          {line.product.title}
        </Link>
        <div className="flex items-center gap-2">
          <CodeChip code={line.code} />
          <span className="truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-content/40">
            {line.product.category} · GST {line.gstRate}%
          </span>
        </div>
      </div>

      {/* Size run */}
      <SizeRun sizes={line.sizeRun} className="hidden md:block" />

      {/* Stock — silence unless explicitly sold out */}
      <div className="hidden md:block">
        <StockCell stock={line.stock} />
      </div>

      {/* Rate */}
      <div className="col-span-2 flex items-baseline gap-2 md:col-span-1 md:flex-col md:items-end md:gap-0.5">
        <span className="text-sm font-black tabular-nums tracking-[-0.03em] text-content">
          {formatPrice(line.perPiece)}
          <span className="ml-1 text-[9px] font-bold uppercase tracking-[0.16em] text-content/45">
            /pc
          </span>
        </span>
        <span className="text-[10px] font-semibold tabular-nums text-content/50">
          {formatPrice(line.setPrice)}/set
        </span>
      </div>

      {/* Sets — the only column that differs between the two bands */}
      <div className="col-span-2 md:col-span-1">
        {soldOut ? (
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-accent-red">
            Cannot order
          </span>
        ) : committed ? (
          <div className="flex flex-col items-start gap-1">
            <SetStepper sets={line.sets} onChange={onSets} onDemote={onDemote} />
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-content/45 tabular-nums">
              {linePieces(line)} pc · {formatPrice(lineValue(line))}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onCommit}
            className="flex h-7 items-center gap-1.5 border border-line px-2.5 text-[9px] font-bold uppercase tracking-[0.16em] text-content transition-colors hover:bg-surface-inverse hover:text-accent-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime"
          >
            <Plus className="h-3 w-3" strokeWidth={2.5} />
            Add {B2B_CONFIG.minimumOrderSets} sets
          </button>
        )}
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${line.product.title} from tray`}
        className="hidden h-7 w-7 items-center justify-center text-content/35 transition-colors hover:text-accent-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime md:flex"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}

function Band({
  eyebrow,
  count,
  note,
  action,
  children,
}: {
  eyebrow: string;
  count: number;
  note: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 first:mt-0">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-line pb-2.5">
        <div className="flex items-baseline gap-3">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.28em] text-content">
            {eyebrow}
          </h2>
          <span className="text-[10px] font-bold tabular-nums text-content/40">
            {String(count).padStart(2, "0")}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <p className="hidden text-[9px] font-semibold uppercase tracking-[0.14em] text-content/40 sm:block">
            {note}
          </p>
          {action}
        </div>
      </header>
      <TrayHead />
      {children}
    </section>
  );
}

export function TrayClient() {
  const {
    committed,
    shortlisted,
    totals,
    hydrated,
    commit,
    setSets,
    demote,
    remove,
    commitAllShortlisted,
    clearTray,
  } = useTray();
  const handoffToCheckout = useTrayHandoff();
  const [confirmClear, setConfirmClear] = useState(false);

  const gstEstimate = useMemo(
    () =>
      committed.reduce(
        (sum, l) => sum + (lineValue(l) * deriveGstRate(l.perPiece)) / 100,
        0,
      ),
    [committed],
  );

  const whatsappUrl = useMemo(
    () => buildLinesheetInquiryUrl([...committed, ...shortlisted].map((l) => l.product)),
    [committed, shortlisted],
  );

  const empty = totals.styleCount === 0;

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10">
        <div className="h-2 w-32 bg-line/15" />
      </div>
    );
  }

  if (empty) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-6 lg:px-10">
        <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-accent-red">
          Tray empty
        </p>
        <h1 className="mt-4 max-w-[18ch] text-[clamp(2rem,5vw,3.5rem)] font-black uppercase leading-[0.9] tracking-[-0.045em] text-content">
          Nothing on the table yet
        </h1>
        <p className="mt-5 max-w-[46ch] text-sm leading-6 text-content/60">
          Shortlist as you scan the line — no set count needed. Add sets when
          you&apos;re ready to order. Both live here, on one screen.
        </p>
        <Link
          href="/line"
          className="linebook-button linebook-button--dark mt-8 inline-flex"
        >
          Open the line <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface font-sans text-content">
      {/* ── Sticky summary: the numbers a buyer reports to their partner ── */}
      <div className="sticky top-0 z-30 border-b-2 border-line bg-surface">
        <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
            <div className="flex flex-wrap items-end gap-x-8 gap-y-5">
              <Metric
                label="Styles"
                value={String(totals.styleCount)}
                sub={`${totals.committedCount} on order`}
              />
              <Metric
                label="Sets"
                value={String(totals.totalSets)}
                sub={`${totals.totalPieces} pieces`}
              />
              <Metric label="Subtotal" value={formatPrice(totals.subtotal)} />
              <Metric
                label="Blended"
                value={
                  totals.blendedPerPiece > 0
                    ? `${formatPrice(totals.blendedPerPiece)}/pc`
                    : "—"
                }
                sub="across the order"
              />
              <Metric
                label={`${GST_CONFIG.label} (indicative)`}
                value={gstEstimate > 0 ? formatPrice(Math.round(gstEstimate)) : "—"}
                sub="final at invoice"
              />
            </div>

            {/* MOQ — the one gate between a tray and an order */}
            <div className="flex min-w-[13rem] flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[8px] font-bold uppercase tracking-[0.24em] text-content/40">
                  Minimum order
                </span>
                <span
                  className={cn(
                    "text-[9px] font-bold uppercase tracking-[0.16em] tabular-nums",
                    totals.moqMet ? "text-content/50" : "text-accent-red",
                  )}
                >
                  {totals.moqMet
                    ? "Met"
                    : `${totals.setsToMoq} more set${totals.setsToMoq === 1 ? "" : "s"}`}
                </span>
              </div>
              <div className="h-[3px] w-full bg-line/15">
                <div
                  className={cn(
                    "h-full transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                    totals.moqMet ? "bg-accent-lime" : "bg-accent-red",
                  )}
                  style={{
                    width: `${Math.min(100, (totals.totalSets / totals.moqTarget) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-[9px] font-semibold tabular-nums text-content/40">
                {totals.totalSets} / {totals.moqTarget} sets
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-10">
        {committed.length > 0 && (
          <Band
            eyebrow="On order"
            count={committed.length}
            note="Counts toward the minimum"
          >
            {committed.map((line) => (
              <TrayRow
                key={line.product.id}
                line={line}
                onSets={(sets) => setSets(line.product.id, sets)}
                onDemote={() => demote(line.product.id)}
                onCommit={() => commit(line.product, B2B_CONFIG.minimumOrderSets)}
                onRemove={() => remove(line.product.id)}
              />
            ))}
          </Band>
        )}

        {shortlisted.length > 0 && (
          <Band
            eyebrow="Shortlisted"
            count={shortlisted.length}
            note="Saved · no set count yet"
            action={
              <button
                type="button"
                onClick={commitAllShortlisted}
                className="text-[9px] font-bold uppercase tracking-[0.16em] text-content underline decoration-accent-lime decoration-2 underline-offset-4 hover:text-accent-red"
              >
                Add all at {B2B_CONFIG.minimumOrderSets} sets
              </button>
            }
          >
            {shortlisted.map((line) => (
              <TrayRow
                key={line.product.id}
                line={line}
                onSets={(sets) => setSets(line.product.id, sets)}
                onDemote={() => demote(line.product.id)}
                onCommit={() => commit(line.product, B2B_CONFIG.minimumOrderSets)}
                onRemove={() => remove(line.product.id)}
              />
            ))}
          </Band>
        )}

        {/* ── Three exits, equal weight. A wholesale buyer closes in one of
             three ways and the UI shouldn't rank them for him. ── */}
        <div className="mt-12 grid gap-3 border-t-2 border-line pt-6 sm:grid-cols-3">
          {/*
            onClick reconciles the cart to the tray BEFORE navigating. Without
            it this link was a dead end: /checkout reads cart-context, the tray
            writes tray state, so a buyer who committed sets here landed on an
            empty checkout. CartProvider sits above both routes, so the state
            written in this handler is present when /checkout mounts.
          */}
          <Link
            href="/checkout"
            onClick={handoffToCheckout}
            className={cn(
              "flex h-12 items-center justify-between gap-2 border px-4 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors",
              totals.moqMet
                ? "border-line bg-surface-inverse text-content-inverse hover:bg-accent-red hover:border-accent-red"
                : "pointer-events-none border-line/20 text-content/30",
            )}
            aria-disabled={!totals.moqMet}
          >
            Checkout <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          <Link
            href="/line-sheet"
            className="flex h-12 items-center justify-between gap-2 border border-line/25 px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-content transition-colors hover:border-line"
          >
            Export line sheet <Download className="h-3.5 w-3.5" />
          </Link>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 items-center justify-between gap-2 border border-line/25 px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-content transition-colors hover:border-line"
          >
            Send on WhatsApp <MessageCircle className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-[62ch] text-[10px] font-semibold leading-5 uppercase tracking-[0.12em] text-content/40">
            {GST_CONFIG.note}
          </p>
          {confirmClear ? (
            <span className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-[0.16em]">
              <button
                type="button"
                onClick={() => {
                  clearTray();
                  setConfirmClear(false);
                }}
                className="text-accent-red underline decoration-2 underline-offset-4"
              >
                Clear everything
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="text-content/45 hover:text-content"
              >
                Keep
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-content/40 transition-colors hover:text-accent-red"
            >
              <Trash2 className="h-3 w-3" strokeWidth={2} /> Clear tray
            </button>
          )}
        </div>

        <Link
          href="/line"
          className="mt-8 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-content/55 hover:text-accent-red"
        >
          Keep browsing the line <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
