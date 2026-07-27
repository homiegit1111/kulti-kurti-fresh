"use client";

/**
 * Running footer (R7, Chapter 4.1) — the desktop base rail.
 *
 * At rest it carries the trade facts (TermsRule, the letterhead grammar).
 * Once the tray holds a committed order (`committedCount > 0`) it becomes a
 * live readout of TrayTotals — the numbers a buyer reports to their partner —
 * with the saffron tell reserved for `moqMet` (R10: buyer-caused state only).
 *
 * Tailwind `fixed` keeps it inside the print contract's class-substring
 * suppression, so no printed sheet ever carries it. Suppressed on the
 * checkout funnel routes like the mobile CTA; z-index sits below the navbar.
 * Desktop only — below `lg` the StickyMobileB2BCta is the running chrome.
 */

import { usePathname } from "next/navigation";
import { TermsRule } from "@/components/document/terms-rule";
import { useTray } from "@/lib/line/tray-context";
import { formatPrice } from "@/lib/commerce/catalog";

const hiddenPrefixes = ["/checkout", "/cart", "/bulk-order"];

export function RunningFooter() {
  const pathname = usePathname();
  const { totals, hydrated } = useTray();

  if (hiddenPrefixes.some((prefix) => pathname?.startsWith(prefix))) return null;

  const onOrder = hydrated && totals.committedCount > 0;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 hidden border-t border-line/25 bg-surface lg:block">
      <div className="mx-auto flex h-9 max-w-[1400px] items-center px-6 lg:px-10">
        {onOrder ? (
          <p className="ledger flex w-full items-center gap-x-3 truncate text-[9px] font-extrabold uppercase tracking-[0.2em] text-content">
            <span>
              {totals.committedCount}{" "}
              {totals.committedCount === 1 ? "style" : "styles"}
            </span>
            <span aria-hidden="true" className="text-content/40">
              ·
            </span>
            <span>
              {totals.totalSets} {totals.totalSets === 1 ? "set" : "sets"}
            </span>
            <span aria-hidden="true" className="text-content/40">
              ·
            </span>
            <span>{formatPrice(totals.subtotal)}</span>
            <span aria-hidden="true" className="text-content/40">
              ·
            </span>
            {totals.moqMet ? (
              <span className="text-accent-lime">Minimum met</span>
            ) : (
              <span>
                {totals.setsToMoq} {totals.setsToMoq === 1 ? "set" : "sets"} to
                minimum
              </span>
            )}
          </p>
        ) : (
          <TermsRule className="flex-nowrap gap-y-0 overflow-hidden border-0 py-0" />
        )}
      </div>
    </div>
  );
}
