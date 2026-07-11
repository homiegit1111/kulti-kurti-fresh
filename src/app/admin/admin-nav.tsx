"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {LINKS.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors",
              active
                ? "border-b-2 border-gold text-charcoal"
                : "border-b-2 border-transparent text-charcoal/45 hover:text-charcoal",
            )}
          >
            {link.label}
          </Link>
        );
      })}
      <Link
        href="/"
        className="ml-3 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-charcoal/40 hover:text-charcoal"
      >
        View store
      </Link>
    </nav>
  );
}
