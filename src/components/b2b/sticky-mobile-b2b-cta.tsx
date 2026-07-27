"use client";

import Link from "next/link";
import { MessageCircle, Table2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTray } from "@/lib/line/tray-context";
import { buildCatalogRequestUrl } from "@/lib/b2b/whatsapp";

const hiddenPrefixes = ["/checkout", "/cart", "/bulk-order"];

/**
 * Mobile running chrome (R7) — route-awareness and the 76px content clearance
 * are contract (§1.1). The primary button reads the tray: before an order it
 * names the desk; once sets are committed it reports the distance to the
 * order minimum in a buyer's words.
 */
export function StickyMobileB2BCta() {
  const pathname = usePathname();
  const { totals, hydrated } = useTray();

  if (hiddenPrefixes.some((prefix) => pathname?.startsWith(prefix))) return null;

  const onOrder = hydrated && totals.committedCount > 0;
  const label = !onOrder
    ? "Bulk order"
    : totals.moqMet
      ? "Minimum met — send order"
      : `${totals.setsToMoq} ${totals.setsToMoq === 1 ? "set" : "sets"} to minimum`;

  return (
    <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line/20 bg-surface/95 backdrop-blur-md lg:hidden">
      <div className="grid grid-cols-2 gap-2 p-3">
        <Link
          href="/bulk-order"
          aria-label={
            onOrder
              ? `Open bulk order — ${totals.totalSets} ${
                  totals.totalSets === 1 ? "set" : "sets"
                } in your order, ${label.toLowerCase()}`
              : "Open bulk order"
          }
          className="ledger flex h-12 items-center justify-center gap-2 bg-surface-inverse px-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-content-inverse"
        >
          <Table2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{label}</span>
        </Link>
        <a
          href={buildCatalogRequestUrl()}
          aria-label="Get the kurti catalog on WhatsApp"
          className="flex h-12 items-center justify-center gap-2 border border-line/20 text-[10px] font-bold uppercase tracking-[0.2em] text-content transition-colors hover:bg-surface-inverse hover:text-content-inverse"
        >
          <MessageCircle aria-hidden="true" className="h-3.5 w-3.5" />
          WhatsApp
        </a>
      </div>
    </div>
  );
}
