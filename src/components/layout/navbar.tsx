"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/client";
import { MessageCircle, Search, Table2 } from "lucide-react";
import { TrayButton } from "@/components/line/tray-button";
import { SetBlocks } from "@/components/b2b/set-blocks";
import { TermsRule } from "@/components/document/terms-rule";
import { ThemeToggle } from "./theme-toggle";
import { buildCatalogRequestUrl } from "@/lib/b2b/whatsapp";
import { MOCK_PRODUCTS } from "@/lib/commerce/catalog";
import { getStyleCode } from "@/lib/b2b/style-code";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { SearchDialog, recordRecentCode } from "@/components/ui/search-dialog";

/**
 * Chrome (Chapter 4) — the navbar is quality stationery, not a dashboard.
 *
 * `primary` = the three shown on desktop, in buying order: browse the styles →
 * see them grouped → order in bulk. The rest appear in the mobile sheet only.
 * Every label is a word a wholesale buyer uses.
 */
const navLinks = [
  { label: "Styles", href: "/shop", primary: true },
  { label: "Collections", href: "/collections", primary: true },
  { label: "Bulk Order", href: "/bulk-order", primary: true },
  { label: "Lookbook", href: "/lookbook", primary: false },
  { label: "About", href: "/about", primary: false },
  { label: "Contact", href: "/contact", primary: false },
];

const primaryLinks = navLinks.filter((l) => l.primary);

/** Nested routes keep their parent lit: /collections/x still reads Collections. */
function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/* ── Wordmark ── the sole brand mark in chrome: plain ink type, no devices. ── */
function Wordmark({
  className,
  align = "center",
}: {
  className?: string;
  align?: "center" | "left";
}) {
  return (
    <span
      className={cn(
        "flex flex-col leading-none",
        align === "center" ? "items-center" : "items-start",
        className,
      )}
    >
      <span className="text-[1.3rem] font-black uppercase leading-[0.85] tracking-[-0.05em] text-content sm:text-[1.45rem] lg:text-[1.55rem]">
        Rangat
      </span>
      <span className="mt-[0.3em] text-[7px] font-bold uppercase tracking-[0.42em] text-content/55 sm:text-[8px]">
        Pehnawa
      </span>
    </span>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [bannerHidden, setBannerHidden] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { userId, isLoaded } = useAuth();
  const pathname = usePathname();
  const isProductPage = pathname?.startsWith("/shop/") && pathname.length > 6;

  useEffect(() => {
    let frame = 0;
    let previousScrolled = false;
    let previousBannerHidden = false;

    const updateState = () => {
      frame = 0;
      const nextScrolled = window.scrollY > 50;
      const nextBannerHidden = window.scrollY > 20;

      if (nextScrolled !== previousScrolled) {
        previousScrolled = nextScrolled;
        setScrolled(nextScrolled);
      }

      if (nextBannerHidden !== previousBannerHidden) {
        previousBannerHidden = nextBannerHidden;
        setBannerHidden(nextBannerHidden);
      }
    };

    const handleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateState);
    };

    updateState();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  /* ⌘K / Ctrl+K — open search from anywhere */
  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.altKey &&
        !e.shiftKey &&
        (e.key === "k" || e.key === "K")
      ) {
        e.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  /* Recent style codes — a visited style page records its code so repeat
     buyers can reorder from search ("Recent style codes", max 6). */
  useEffect(() => {
    const match = pathname?.match(/^\/shop\/([^/]+)$/);
    if (!match) return;
    const handle = decodeURIComponent(match[1]);
    const product = MOCK_PRODUCTS.find((p) => p.handle === handle);
    if (product) recordRecentCode(getStyleCode(product));
  }, [pathname]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 will-change-transform">
      {/* ── Running head: the trade facts, static (R7) ── */}
      {!isProductPage && (
        <div
          className={cn(
            "flex items-center justify-center overflow-hidden border-b border-line/25 bg-surface transition-all duration-300 ease-out",
            bannerHidden ? "h-0 border-b-0 opacity-0" : "h-9 opacity-100",
          )}
          aria-hidden={bannerHidden}
        >
          <div className="mx-auto w-full max-w-[1400px] px-4 lg:px-8 xl:px-10">
            <TermsRule className="flex-nowrap justify-center gap-y-0 overflow-hidden border-0 py-0" />
          </div>
        </div>
      )}

      {/* ── Main Navigation ── */}
      <nav
        className={cn(
          "relative flex h-16 w-full items-center border-b bg-surface px-4 transition-[border-color,background-color] duration-300 ease-out lg:h-[74px] lg:px-8 xl:px-10",
          scrolled ? "border-line/25" : "border-line/12",
        )}
      >
        {/* ── Left: Desktop Nav Links ── */}
        <div className="hidden flex-1 items-center justify-start gap-7 lg:flex xl:gap-9">
          {primaryLinks.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.label}
                href={link.href}
                className="group relative py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-content"
              >
                <span
                  className={cn(
                    "transition-opacity",
                    active ? "opacity-100" : "opacity-70 group-hover:opacity-100",
                  )}
                >
                  {link.label}
                </span>
                <span
                  className={cn(
                    "absolute inset-x-0 -bottom-0.5 h-px origin-left bg-content transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                  )}
                />
              </Link>
            );
          })}
        </div>

        {/* ── Center: Wordmark ── */}
        <div className="flex shrink-0 items-center justify-start lg:justify-center">
          <Link
            href="/"
            className="relative z-10 inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime"
            style={{ viewTransitionName: "brand-wordmark" }}
          >
            <Wordmark align="left" className="lg:items-center" />
          </Link>
        </div>

        {/* ── Right: Desktop Search + Links ── */}
        <div className="hidden flex-1 items-center justify-end gap-5 lg:flex xl:gap-6">
          {/* Search bar */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            aria-keyshortcuts="Meta+K Control+K"
            className="group flex h-9 items-center gap-2.5 border border-line/20 bg-transparent pl-3 pr-4 text-left transition-colors duration-300 hover:border-line/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime xl:w-44 xl:pr-2.5"
          >
            <Search
              className="h-3.5 w-3.5 shrink-0 text-content/55 transition-colors group-hover:text-content"
              strokeWidth={2}
            />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-content/45 transition-colors group-hover:text-content/70">
              Search
            </span>
            <kbd className="ml-auto hidden h-[18px] items-center border border-line/20 px-1 font-sans text-[8px] font-bold tracking-[0.12em] text-content/40 transition-colors group-hover:border-line/40 group-hover:text-content/65 xl:inline-flex">
              ⌘K
            </kbd>
          </button>

          {isLoaded &&
            (userId ? (
              <Link
                href="/account"
                className="link-luxe text-[10px] font-bold uppercase tracking-[0.2em] text-content"
              >
                Account
              </Link>
            ) : (
              <Link
                href="/login"
                className="link-luxe text-[10px] font-bold uppercase tracking-[0.2em] text-content"
              >
                Sign In
              </Link>
            ))}
          <span className="h-5 w-px bg-line/15" aria-hidden />
          <ThemeToggle variant="icon" />
          {/* Order gauge + tray — the only live numbers in chrome */}
          <SetBlocks size="sm" />
          <span style={{ viewTransitionName: "tray-button" }}>
            <TrayButton />
          </span>
        </div>

        {/* ── Right: Mobile Menu ── */}
        <div className="flex flex-1 items-center justify-end gap-2.5 lg:hidden">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Open search"
            className="flex h-9 w-9 items-center justify-center border border-line/20 text-content transition-colors hover:border-line hover:bg-surface-inverse hover:text-content-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime"
          >
            <Search className="h-4 w-4" strokeWidth={1.9} />
          </button>

          <ThemeToggle variant="icon" />
          <TrayButton />

          {/* Mobile Menu Sheet */}
          <Sheet>
            <SheetTrigger
              render={
                <button
                  type="button"
                  aria-label="Open menu"
                  className="flex h-9 items-center gap-2 border border-line/20 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-content transition-colors hover:border-line hover:bg-surface-inverse hover:text-content-inverse"
                />
              }
            >
              <span className="flex flex-col gap-[3px]">
                <span className="block h-[1.5px] w-3.5 bg-current" />
                <span className="block h-[1.5px] w-3.5 bg-current" />
              </span>
              Menu
            </SheetTrigger>

            <SheetContent
              side="left"
              className="flex flex-col overflow-y-auto border-none bg-surface text-content !w-full !max-w-none p-0"
            >
              <SheetHeader className="relative z-10 border-b border-line/12 bg-surface px-6 pb-6 pt-6">
                <SheetTitle className="flex items-center text-content">
                  <Wordmark align="left" />
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Site navigation menu
                </SheetDescription>
              </SheetHeader>

              {/* Mobile search bar */}
              <div className="relative z-10 border-b border-line/12 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(true)}
                  className="group flex min-h-11 w-full items-center gap-3 border border-line/20 px-4 text-left transition-colors hover:border-line/45"
                >
                  <Search
                    className="h-4 w-4 shrink-0 text-content/55"
                    strokeWidth={2}
                  />
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-content/45">
                    Search styles
                  </span>
                </button>
              </div>

              <div className="relative z-10 grid gap-3 border-b border-line/12 px-6 py-5">
                <Link
                  href="/bulk-order"
                  className="flex min-h-12 items-center justify-center gap-2 border border-line bg-surface-inverse px-4 py-3 text-[10px] font-bold uppercase tracking-[0.22em] text-content-inverse transition-colors hover:bg-content"
                >
                  <Table2 className="h-3.5 w-3.5" />
                  Bulk Order
                </Link>
                <a
                  href={buildCatalogRequestUrl()}
                  className="flex min-h-12 items-center justify-center gap-2 border border-line/25 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.22em] text-content transition-colors hover:border-line hover:bg-surface-inverse hover:text-content-inverse"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp Catalog
                </a>
              </div>

              <nav className="relative z-10 flex flex-1 flex-col px-6 py-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="group flex items-center justify-between border-b border-line/12 py-5 text-3xl font-black uppercase leading-[0.9] tracking-[-0.045em] text-content sm:text-4xl"
                  >
                    <span>{link.label}</span>
                  </Link>
                ))}
              </nav>

              <div className="relative z-10 mt-auto px-6 pb-8 pt-6">
                <div className="mb-8 flex flex-col gap-5">
                  {isLoaded &&
                    (userId ? (
                      <Link
                        href="/account"
                        className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-content/60 transition-colors hover:text-content"
                      >
                        <span className="h-px w-5 bg-line" /> My Account
                      </Link>
                    ) : (
                      <Link
                        href="/login"
                        className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-content/60 transition-colors hover:text-content"
                      >
                        <span className="h-px w-5 bg-line" /> Sign In
                      </Link>
                    ))}
                  <Link
                    href="/tray"
                    className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-content/60 transition-colors hover:text-content"
                  >
                    <span className="h-px w-5 bg-line" /> Your Order
                  </Link>
                  <Link
                    href="/contact"
                    className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-content/60 transition-colors hover:text-content"
                  >
                    <span className="h-px w-5 bg-line" /> How to Order
                  </Link>
                </div>

                <div className="border-t border-line/12 pt-6">
                  <TermsRule className="border-0 py-0" />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
      {/* ── Search Dialog ── */}
      <SearchDialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </header>
  );
}
