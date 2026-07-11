"use client";

import Link from "next/link";
import { MessageCircle, Table2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { buildCatalogRequestUrl } from "@/lib/b2b/whatsapp";

const hiddenPrefixes = ["/checkout", "/cart", "/bulk-order"];

export function StickyMobileB2BCta() {
  const pathname = usePathname();
  const { itemCount } = useCart();

  if (hiddenPrefixes.some((prefix) => pathname?.startsWith(prefix))) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line/20 bg-surface p-3 lg:hidden">
      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/bulk-order"
          className="flex h-12 items-center justify-center gap-2 bg-surface-inverse text-[10px] font-bold uppercase tracking-[0.2em] text-content-inverse"
        >
          <Table2 className="h-3.5 w-3.5" />
          Bulk Deals{itemCount ? ` (${itemCount})` : ""}
        </Link>
        <a
          href={buildCatalogRequestUrl()}
          className="flex h-12 items-center justify-center gap-2 border border-line/20 text-[10px] font-bold uppercase tracking-[0.2em] text-content transition-colors hover:bg-surface-inverse hover:text-content-inverse"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          WhatsApp
        </a>
      </div>
    </div>
  );
}
