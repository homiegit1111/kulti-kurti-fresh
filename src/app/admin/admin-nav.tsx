"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/stock", label: "Stock" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/offers", label: "Offers" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/pricing", label: "Pricing" },
  { href: "/admin/team", label: "Team" },
  { href: "/admin/audit", label: "Activity" },
];

/**
 * `/admin` is a prefix of every other section, so it matches exactly; the rest
 * match their own subtree (`/admin/stock` stays lit on `/admin/stock/anything`)
 * without lighting up a sibling that merely shares a prefix.
 */
function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname();
  const stripRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const strip = stripRef.current;
    const active = activeRef.current;
    if (!strip || !active) return;
    // The strip is only a couple of items wide next to the header title on a
    // phone, so centre the current section rather than leaving it off-screen.
    // scrollLeft is set directly — scrollIntoView would also move the page.
    strip.scrollLeft = Math.max(
      0,
      active.offsetLeft - (strip.clientWidth - active.clientWidth) / 2,
    );
  }, [pathname]);

  // The strip is left-aligned on purpose: `justify-end` inside a scroll
  // container can put the first item out of reach.
  return (
    <div className="relative min-w-0 flex-1">
      <nav
        ref={stripRef}
        aria-label="Admin sections"
        className="no-scrollbar relative flex items-center gap-0.5 overflow-x-auto whitespace-nowrap"
      >
        {LINKS.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              ref={active ? activeRef : undefined}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] transition-colors",
                active
                  ? "border-accent-red text-content"
                  : "border-transparent text-content/45 hover:text-content",
              )}
            >
              {link.label}
            </Link>
          );
        })}
        <Link
          href="/"
          className="ml-2 shrink-0 border-b-2 border-transparent px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-content/35 transition-colors hover:text-content"
        >
          View store
        </Link>
      </nav>
      {/* Scroll affordance: the strip overflows on phones and nothing else
          signals that there is more to the right. */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-surface-2 to-transparent" />
    </div>
  );
}
