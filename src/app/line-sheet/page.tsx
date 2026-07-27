import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getProducts, formatPrice } from "@/lib/commerce/catalog";
import { getStyleCode } from "@/lib/b2b/style-code";
import { getPerPiecePrice } from "@/lib/b2b/pricing";
import { B2B_CONFIG, SIZE_RATIO_LABEL } from "@/lib/b2b/config";
import { seasonLabel } from "@/lib/line/season";
import { loadCurrentWholesaleBuyer } from "@/lib/server/wholesale-profile";
import { PrintSheetStyles } from "@/components/document/print-sheet-styles";
import { PrintButton } from "./print-button";

export const metadata: Metadata = {
  // absolute: the layout's "%s | Rangat Pehnawa" template would double the
  // brand on a title that already carries it.
  title: { absolute: "Wholesale Line Sheet — Rangat Pehnawa" },
  robots: { index: false, follow: false },
};

/* ── Public contact facts, mirrored from the site footer ── */
const CONTACT = {
  whatsapp: "8660452247",
  email: "rangatpehnawa@gmail.com",
  address: "3rd Floor, NR Complex, 36, Siddanna Ln, Cubbonpete, Bengaluru 560002",
};

export default async function LineSheetPage() {
  const products = await getProducts(50);

  // Saved wholesale profile → the print letterhead's "Prepared for" line.
  const buyerProfile = await loadCurrentWholesaleBuyer();
  const preparedFor = buyerProfile?.businessName
    ? [buyerProfile.businessName, buyerProfile.city].filter(Boolean).join(" · ")
    : undefined;

  const issueDate = new Date();
  const dateStr = issueDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const season = seasonLabel(issueDate);

  return (
    <>
      {/* ── The A4 print contract (§1.7) — corrected accent pins, chrome
             suppression, "Prepared for" letterhead line when a wholesale
             profile exists, CSS-counter sheet numbering. ── */}
      <PrintSheetStyles preparedFor={preparedFor} />

      {/* ── Screen wrapper — paper preview constrained to A4-ish width ── */}
      <div className="ls-doc min-h-screen bg-surface px-4 py-10 text-content sm:px-8 lg:px-10 print:bg-white print:p-0 print:text-black">
        <div className="mx-auto max-w-[794px] print:max-w-none">

          {/* ── LETTERHEAD ── */}
          <header className="ls-letterhead mb-8 border-b-2 border-line pb-6 print:border-black">

            {/* Top row: masthead + screen-only actions */}
            <div className="flex items-start justify-between gap-4">
              <div>
                {/* Micro-label */}
                <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.32em] text-accent-red">
                  Wholesale Price List
                </p>
                {/* Masthead */}
                <h1 className="text-4xl font-black uppercase leading-[0.85] tracking-[-0.055em] sm:text-5xl">
                  Rangat Pehnawa
                </h1>
                {/* Season */}
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.22em] text-content/50">
                  {season}
                </p>
              </div>

              {/* Screen-only: print action + way back (this route renders no navbar) */}
              <div className="flex shrink-0 flex-col items-end gap-3 pt-1 print:hidden">
                <PrintButton />
                <Link
                  href="/shop"
                  className="text-[9px] font-bold uppercase tracking-[0.22em] text-content/45 transition-colors hover:text-accent-red"
                >
                  Back to styles
                </Link>
              </div>
            </div>

            {/* Terms strip */}
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line/20 pt-4 text-[9px] font-bold uppercase tracking-[0.22em] text-content/55 print:border-black/20">
              {[
                `Minimum order ${B2B_CONFIG.minimumOrderSets} sets`,
                `1 set = ${B2B_CONFIG.setSize} pcs (${SIZE_RATIO_LABEL})`,
                "GST at invoice",
                `Issue date: ${dateStr}`,
              ].map((item) => (
                <span key={item} className="flex items-center gap-2">
                  <span className="h-1 w-1 shrink-0 bg-accent-red" aria-hidden="true" />
                  {item}
                </span>
              ))}
              {/* Print-only "Sheet 1" via the CSS counter contract. */}
              <span className="ls-sheet-counter" aria-hidden="true" />
            </div>

            {/* Contact row — the footer's public facts */}
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-content/40">
              <span>WhatsApp: {CONTACT.whatsapp}</span>
              <span>{CONTACT.email}</span>
              <span>{CONTACT.address}</span>
            </div>
          </header>

          {/* ── THE LINE — 2-up mobile screen / 3-up print ── */}
          {products.length === 0 ? (
            <p className="border border-line/20 px-6 py-16 text-center text-[10px] font-bold uppercase tracking-[0.24em] text-content/45">
              Catalog temporarily unavailable — WhatsApp {CONTACT.whatsapp} for the current line.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:gap-5 print:grid-cols-3 print:gap-4">
              {products.map((product) => {
                const setPrice = product.salePrice ?? product.price;
                const pcPrice = getPerPiecePrice(setPrice);
                const styleCode = getStyleCode(product);

                return (
                  <article
                    key={product.id}
                    className="ls-card border border-line/20 bg-surface-2 print:border print:border-black/20 print:bg-white"
                  >
                    {/* Product image */}
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-hover print:bg-gray-100">
                      <Image
                        src={product.image}
                        alt={product.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 264px"
                      />
                    </div>

                    {/* Card body */}
                    <div className="p-3 print:p-2">
                      {/* Style code chip */}
                      <p className="mb-1 inline-block border border-line/30 bg-surface px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.22em] text-content/50 print:border-black/20 print:bg-gray-50 print:text-black/50">
                        {styleCode}
                      </p>

                      {/* Title */}
                      <h2 className="mt-1 text-sm font-bold leading-tight tracking-[-0.02em] print:text-xs">
                        {product.title}
                      </h2>

                      {/* Category */}
                      <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-content/40 print:text-black/40">
                        {product.category}
                      </p>

                      {/* Pack ratio — the fixed wholesale set, not the retail
                          size range; must agree with the letterhead terms */}
                      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-content/50 print:text-black/50">
                        Pack {SIZE_RATIO_LABEL} · {B2B_CONFIG.setSize} pc
                      </p>

                      {/* Pricing — tabular nums */}
                      <div className="mt-2 flex items-baseline justify-between border-t border-line/15 pt-2 print:border-black/15">
                        <div>
                          <p className="text-base font-black leading-none tracking-[-0.025em] tabular-nums print:text-sm">
                            {formatPrice(setPrice)}
                          </p>
                          <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-content/45 print:text-black/45">
                            /set
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold leading-none tracking-[-0.02em] text-content/60 tabular-nums print:text-black/60">
                            {formatPrice(pcPrice)}
                          </p>
                          <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-content/40 print:text-black/40">
                            /pc
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* ── DOCUMENT FOOTER — part of the artifact, prints too ── */}
          <footer className="ls-keep mt-10 border-t-2 border-line pt-5 print:border-black">
            <div className="flex flex-col gap-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-content/40 print:text-black/40 sm:flex-row sm:justify-between">
              <span>Rangat Pehnawa · Wholesale Price List · {season}</span>
              <span>All prices per set · GST additional · Subject to availability</span>
            </div>
          </footer>

        </div>
      </div>
    </>
  );
}
