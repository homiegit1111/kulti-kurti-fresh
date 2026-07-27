"use client";

/**
 * /tray — "Your order": the buyer's working order as one ruled sheet.
 *
 * Two bands, same columns: styles on order (sets > 0) and saved styles
 * (sets === 0). The only difference between them is the set count, so the eye
 * moves one column and a stepper tap promotes a style — never a re-navigation.
 *
 * PRESENTATIONAL: reads and writes tray state (localStorage) only, through the
 * frozen tray-context contract (demote-not-delete, hydration placeholder). The
 * checkout exit reconciles the cart via useTrayHandoff; the WhatsApp exits use
 * the frozen builders (§1.1.4). SetBlocks is the one MOQ meter; the PO pane
 * renders the exact order message. No entrance animation (§1.6).
 */

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  MessageCircle,
  Plus,
  Printer,
  Trash2,
  X,
} from "lucide-react";
import { EntryHead } from "@/components/document/entry";
import { TermsRule } from "@/components/document/terms-rule";
import { POPane } from "@/components/document/po-pane";
import { SetBlocks } from "@/components/b2b/set-blocks";
import { SetStepper } from "@/components/line/set-stepper";
import { SizeRun } from "@/components/line/size-run";
import { CodeChip, StockCell } from "@/components/line/stock-mark";
import { B2B_CONFIG, GST_CONFIG } from "@/lib/b2b/config";
import { calculateGstBreakdown } from "@/lib/b2b/pricing";
import {
  buildLinesheetInquiryUrl,
  buildWholesaleWhatsAppUrl,
} from "@/lib/b2b/whatsapp";
import type { CartItem } from "@/lib/cart-context";
import { formatPrice } from "@/lib/commerce/catalog";
import {
  isSoldOut,
  linePieces,
  lineValue,
  type StyleLine,
} from "@/lib/line/contract";
import { useTray } from "@/lib/line/tray-context";
import { TRAY_CART_SIZE, useTrayHandoff } from "@/lib/line/tray-handoff";
import { useWholesaleBuyer } from "../bulk-order/use-wholesale-buyer";
import { cn } from "@/lib/utils";

/* Shared grid so both bands align to the same rails. */
const TRAY_COLS =
  "md:grid-cols-[3.25rem_minmax(0,1fr)_7rem_6.5rem_8.5rem_7.5rem_2.25rem]";

function TrayHead() {
  return (
    <div
      className={cn(
        "hidden border-b border-line/20 pb-2 pt-4 md:grid md:items-end md:gap-4",
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
      {/* Thumb — 4:5, links to the style */}
      <Link
        href={`/shop/${line.product.handle}`}
        className="relative block aspect-[4/5] w-full overflow-hidden bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime"
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
      <div className="flex min-w-0 flex-col gap-1">
        <Link
          href={`/shop/${line.product.handle}`}
          className="truncate text-[13px] font-bold leading-tight text-content underline-offset-2 hover:underline"
        >
          {line.product.title}
        </Link>
        <div className="flex items-center gap-2">
          <CodeChip code={line.code} active={committed} />
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
      <div className="ledger col-span-2 flex items-baseline gap-2 md:col-span-1 md:flex-col md:items-end md:gap-0.5">
        <span className="text-sm font-black tracking-[-0.03em] text-content">
          {formatPrice(line.perPiece)}
          <span className="ml-1 text-[9px] font-bold uppercase tracking-[0.16em] text-content/45">
            /pc
          </span>
        </span>
        <span className="text-[10px] font-semibold text-content/50">
          {formatPrice(line.setPrice)}/set
        </span>
      </div>

      {/* Sets — the one column that differs between the two bands */}
      <div className="col-span-2 md:col-span-1">
        {soldOut ? (
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-accent-red">
            Sold out
          </span>
        ) : committed ? (
          <div className="flex flex-col items-start gap-1">
            <SetStepper sets={line.sets} onChange={onSets} onDemote={onDemote} />
            <span className="ledger text-[9px] font-semibold uppercase tracking-[0.14em] text-content/45">
              {linePieces(line)} pc · {formatPrice(lineValue(line))}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={onCommit}
            className="flex h-7 items-center gap-1.5 border border-line px-2.5 text-[9px] font-bold uppercase tracking-[0.16em] text-content transition-colors hover:bg-surface-inverse hover:text-content-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime"
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
        aria-label={`Remove ${line.product.title} from your order`}
        className="hidden h-7 w-7 items-center justify-center text-content/35 transition-colors hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime md:flex"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}

function LadderRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-content/55">
        {label}
      </span>
      <span className="text-right text-base font-bold tracking-[-0.01em] text-content">
        {value}
      </span>
    </div>
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
  const buyer = useWholesaleBuyer();
  const [confirmClear, setConfirmClear] = useState(false);

  /**
   * The committed band, flattened to the wire shape the frozen WhatsApp
   * builders and GST math take. One colour per style — the tray has no colour
   * dimension (tray-handoff rule 4); colour lands at checkout reconcile.
   */
  const poItems = useMemo<CartItem[]>(
    () =>
      committed.map((line) => ({
        id: line.product.id,
        productId: line.product.id,
        title: line.product.title,
        handle: line.product.handle,
        image: line.product.image,
        price: line.product.price,
        salePrice: line.product.salePrice,
        size: TRAY_CART_SIZE,
        color: line.product.colors[0],
        quantity: line.sets,
      })),
    [committed],
  );

  const gst = useMemo(
    () => calculateGstBreakdown(poItems, totals.totalSets),
    [poItems, totals.totalSets],
  );

  /* Frozen builders only: the order message when sets exist, the price-list
     inquiry when the tray is saves-only. */
  const whatsappUrl = useMemo(
    () =>
      committed.length > 0
        ? buildWholesaleWhatsAppUrl(poItems, buyer)
        : buildLinesheetInquiryUrl(shortlisted.map((line) => line.product)),
    [committed.length, poItems, buyer, shortlisted],
  );

  const empty = totals.styleCount === 0;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 pb-24 pt-24 sm:px-10 lg:px-16 lg:pt-28">
      <div className="relative lg:pl-[72px]">
        {/* R2 — the folio rail rule (bulk-desk pattern; EntryHead letters land
            in the 72px margin this padding reserves). */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-[72px] hidden w-px bg-line/25 lg:block"
        />
      <header className="flex flex-wrap items-end justify-between gap-6 border-b-2 border-line pb-6">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.3em] text-content/55">
            Wholesale order sheet
          </p>
          <h1 className="mt-4 text-[clamp(2.75rem,6vw,5.5rem)] font-black uppercase leading-[0.95] tracking-[-0.04em]">
            Your order
          </h1>
        </div>
        {hydrated && !empty && (
          <p className="ledger pb-1.5 text-[10px] font-extrabold uppercase tracking-[0.22em] text-content/55">
            {totals.totalSets} sets · {totals.totalPieces} pcs
          </p>
        )}
      </header>

      {!hydrated ? (
        /* Hydration placeholder — same contract as before: nothing invented
           before localStorage is read. */
        <div className="py-16">
          <div className="h-2 w-32 bg-line/15" />
        </div>
      ) : empty ? (
        <div className="py-16">
          <p className="max-w-[52ch] text-sm leading-6 text-content/60">
            Nothing in your order yet. Save styles as you browse, add sets when
            you&apos;re ready — both live here.
          </p>
          <Link
            href="/shop"
            className="mt-6 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-content underline-offset-4 hover:underline"
          >
            Browse styles <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <>
          <TermsRule className="mt-6 border-t-0" />

          {/* ── Band A — styles with sets ── */}
          {committed.length > 0 && (
            <section>
              <EntryHead
                letter="A"
                name="On order"
                count={committed.length}
                countLabel={committed.length === 1 ? "style" : "styles"}
                className="mt-12 lg:mt-14"
              />
              <TrayHead />
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
            </section>
          )}

          {/* ── Band B — saved styles, no set count yet ── */}
          {shortlisted.length > 0 && (
            <section>
              <EntryHead
                letter={committed.length > 0 ? "B" : "A"}
                name="Saved styles"
                count={shortlisted.length}
                countLabel={shortlisted.length === 1 ? "style" : "styles"}
                action={
                  <button
                    type="button"
                    onClick={commitAllShortlisted}
                    className="text-[9px] font-bold uppercase tracking-[0.16em] text-content underline decoration-accent-lime decoration-2 underline-offset-4 hover:decoration-content"
                  >
                    Add all at {B2B_CONFIG.minimumOrderSets} sets
                  </button>
                }
                className="mt-12 lg:mt-14"
              />
              <TrayHead />
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
            </section>
          )}

          {/* ── Totals + exits, with the PO beside them ── */}
          <div className="mt-12 grid gap-10 lg:mt-14 lg:grid-cols-12 lg:gap-16">
            <section className="lg:col-span-7">
              <div className="entry-rule pt-4">
                <h2 className="text-[10px] font-extrabold uppercase tracking-[0.22em]">
                  Totals
                </h2>
              </div>

              <div className="mt-5">
                <SetBlocks size="md" />
              </div>

              <div className="ledger mt-6 space-y-3.5 border-t border-line/25 pt-5">
                <LadderRow
                  label="Sets"
                  value={`${totals.totalSets} sets · ${totals.totalPieces} pcs`}
                />
                <LadderRow label="Subtotal" value={formatPrice(totals.subtotal)} />
                {totals.blendedPerPiece > 0 && (
                  <LadderRow
                    label="Blended rate"
                    value={`${formatPrice(totals.blendedPerPiece)}/pc`}
                  />
                )}
                <LadderRow
                  label={`${GST_CONFIG.label} ${gst.gstRateLabel}${gst.isMixed ? " (mixed)" : ""}`}
                  value={formatPrice(gst.gstAmount)}
                />
              </div>

              <div className="ledger mt-5 flex items-end justify-between border-t-2 border-line pt-4">
                <span className="pb-1 text-[10px] font-extrabold uppercase tracking-[0.22em] text-content/70">
                  Est. invoice total
                </span>
                <span className="text-3xl font-black tracking-[-0.03em]">
                  {formatPrice(gst.grandTotal)}
                </span>
              </div>

              <p className="mt-4 text-[9px] font-semibold uppercase leading-relaxed tracking-[0.14em] text-content/45">
                {GST_CONFIG.note}
              </p>

              {/* Exits — checkout reconciles the cart to this order first. */}
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <Link
                  href="/checkout"
                  onClick={handoffToCheckout}
                  aria-disabled={!totals.moqMet}
                  className={cn(
                    "flex h-12 items-center justify-between gap-2 border px-4 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors",
                    totals.moqMet
                      ? "border-line bg-surface-inverse text-content-inverse hover:text-accent-lime"
                      : "pointer-events-none border-line/20 text-content/30",
                  )}
                >
                  Checkout <ArrowRight className="h-3.5 w-3.5" />
                </Link>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 items-center justify-between gap-2 border border-line/25 px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-content transition-colors hover:border-line"
                >
                  Send order on WhatsApp <MessageCircle className="h-3.5 w-3.5" />
                </a>

                <Link
                  href="/line-sheet"
                  className="flex h-12 items-center justify-between gap-2 border border-line/25 px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-content transition-colors hover:border-line"
                >
                  Print price list <Printer className="h-3.5 w-3.5" />
                </Link>
              </div>

              {!totals.moqMet && (
                <p className="ledger mt-3 text-[9px] font-semibold uppercase tracking-[0.14em] text-content/45">
                  {totals.setsToMoq} more {totals.setsToMoq === 1 ? "set" : "sets"}{" "}
                  to reach the minimum · mix any styles
                </p>
              )}

              <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-content/55 transition-colors hover:text-content"
                >
                  Keep browsing <ArrowRight className="h-3.5 w-3.5" />
                </Link>
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
                    <Trash2 className="h-3 w-3" strokeWidth={2} /> Clear order
                  </button>
                )}
              </div>
            </section>

            {/* The PO, verbatim — the exact WhatsApp message as a document. */}
            {committed.length > 0 && (
              <aside className="lg:col-span-5">
                <POPane items={poItems} buyer={buyer} sticky />
              </aside>
            )}
          </div>
        </>
      )}
      </div>
    </div>
  );
}
