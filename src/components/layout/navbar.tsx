"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/client";
import { MessageCircle, Search, Table2 } from "lucide-react";
import { CartDrawer } from "./cart-drawer";
import { ThemeToggle } from "./theme-toggle";
import { buildCatalogRequestUrl } from "@/lib/b2b/whatsapp";

/* ── Brand icons (removed from lucide-react v1.x) ── */
function InstagramIcon({
  className,
  strokeWidth = 2,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <path d="M17.5 6.5h.01" />
    </svg>
  );
}

function FacebookIcon({
  className,
  strokeWidth = 2,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function TwitterIcon({
  className,
  strokeWidth = 2,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.7 5.5 4.4 9 4.5-.9-4.2 4-6.5 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
  );
}
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { SearchDialog } from "@/components/ui/search-dialog";

const navLinks = [
  { label: "New Drops", href: "/shop" },
  { label: "Kurtis", href: "/shop" },
  { label: "Bulk Deals", href: "/bulk-order" },
  { label: "Wishlist", href: "/wishlist" },
  { label: "Contact", href: "/contact" },
];

/* ── Line-book wordmark ── typographic brand lockup that matches the
   site's oversized editorial type rather than a raster photo logo. ── */
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
      <span className="flex items-baseline gap-[0.12em] text-[1.35rem] font-black uppercase leading-[0.85] tracking-[-0.06em] text-content sm:text-[1.55rem] lg:text-[1.7rem]">
        Rangat
        <span className="inline-block h-[0.32em] w-[0.32em] translate-y-[-0.04em] bg-accent-red" />
      </span>
      <span className="mt-[0.28em] flex items-center gap-[0.4em] text-[7px] font-bold uppercase tracking-[0.42em] text-content/55 sm:text-[8px]">
        <span className="h-px w-3 bg-accent-lime" />
        Pehnawa
        <span className="h-px w-3 bg-accent-lime" />
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

  return (
    <header className="fixed inset-x-0 top-0 z-50 will-change-transform">
      {/* ── Promotional Banner (line-book: ink bar, lime accents) ── */}
      {!isProductPage && (
        <div
          className={cn(
            "flex items-center justify-center overflow-hidden bg-surface-inverse text-content-inverse transition-all duration-300 ease-out",
            bannerHidden ? "h-0 opacity-0" : "h-9 opacity-100",
          )}
          aria-hidden={bannerHidden}
        >
          <div className="px-4 text-center text-[9px] font-bold uppercase tracking-[0.24em] sm:text-[10px]">
            Fresh kurti drops
            <span className="mx-2 text-accent-lime">/</span>
            Price-smart styles
            <span className="mx-2 text-accent-lime">/</span>
            WhatsApp orders open
          </div>
        </div>
      )}

      {/* ── Main Navigation ── */}
      <nav
        className={cn(
          "relative flex h-16 w-full items-center border-b bg-surface/95 px-4 backdrop-blur-[2px] transition-[box-shadow,border-color,background-color] duration-300 ease-out lg:h-[74px] lg:px-8 xl:px-10",
          scrolled
            ? "border-line/20 shadow-[0_20px_50px_-44px_rgba(18,19,16,0.6)]"
            : "border-line/12",
        )}
      >
        {/* ── Left: Desktop Nav Links ── */}
        <div className="hidden flex-1 items-center justify-start gap-7 lg:flex xl:gap-9">
          {navLinks.slice(0, 3).map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.label}
                href={link.href}
                className="group relative py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-content transition-opacity hover:opacity-100"
              >
                <span className={cn("transition-opacity", active ? "opacity-100" : "opacity-70 group-hover:opacity-100")}>
                  {link.label}
                </span>
                <span
                  className={cn(
                    "absolute inset-x-0 -bottom-0.5 h-[2px] origin-left bg-accent-lime transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
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
            aria-label="Rangat Pehnawa — home"
            className="group relative z-10 inline-flex items-center transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[1px] active:translate-y-0"
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
            aria-label="Search catalog"
            className="group flex h-9 items-center gap-2.5 border border-line/20 bg-transparent pl-3 pr-4 text-left transition-colors duration-300 hover:border-line/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime xl:w-44"
          >
            <Search className="h-3.5 w-3.5 shrink-0 text-content/55 transition-colors group-hover:text-accent-red" strokeWidth={2} />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-content/45 transition-colors group-hover:text-content/70">
              Search
            </span>
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
          <Link
            href="/wishlist"
            className="link-luxe text-[10px] font-bold uppercase tracking-[0.2em] text-content"
          >
            Wishlist
          </Link>
          <span className="h-5 w-px bg-line/15" aria-hidden />
          <ThemeToggle variant="icon" />
          <CartDrawer />
        </div>

        {/* ── Right: Mobile Menu (line-book) ── */}
        <div className="flex flex-1 items-center justify-end gap-2.5 lg:hidden">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Open search"
            className="flex h-9 w-9 items-center justify-center border border-line/20 text-content transition-colors hover:border-accent-red hover:bg-accent-red hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime"
          >
            <Search className="h-4 w-4" strokeWidth={1.9} />
          </button>

          <ThemeToggle variant="icon" />
          <CartDrawer />

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
                  <Search className="h-4 w-4 shrink-0 text-content/55 transition-colors group-hover:text-accent-red" strokeWidth={2} />
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-content/45">
                    Search styles
                  </span>
                </button>
              </div>

              <div className="relative z-10 grid gap-3 border-b border-line/12 px-6 py-5">
                <Link
                  href="/bulk-order"
                  className="flex min-h-12 items-center justify-center gap-2 border border-line bg-surface-inverse px-4 py-3 text-[10px] font-bold uppercase tracking-[0.22em] text-content-inverse transition-colors hover:border-accent-red hover:bg-accent-red"
                >
                  <Table2 className="h-3.5 w-3.5" />
                  Open Bulk Deals
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
                {navLinks.map((link, i) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="group flex items-center justify-between border-b border-line/12 py-5 text-3xl font-black uppercase leading-[0.9] tracking-[-0.045em] text-content transition-colors sm:text-4xl"
                    style={{
                      animationDelay: `${i * 100 + 100}ms`,
                    }}
                  >
                    <span className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-2">
                      {link.label}
                    </span>
                    <span className="text-[10px] font-bold tracking-[0.18em] text-content/35 transition-colors group-hover:text-accent-red">
                      {String(i + 1).padStart(2, "0")}
                    </span>
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
                        <span className="h-[2px] w-5 bg-accent-lime"></span> My Account
                      </Link>
                    ) : (
                      <Link
                        href="/login"
                        className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-content/60 transition-colors hover:text-content"
                      >
                        <span className="h-[2px] w-5 bg-accent-lime"></span> Sign In
                      </Link>
                    ))}
                  <Link
                    href="/wishlist"
                    className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-content/60 transition-colors hover:text-content"
                  >
                    <span className="h-[2px] w-5 bg-accent-lime"></span> Wishlist
                  </Link>
                  <Link
                    href="/contact"
                    className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.22em] text-content/60 transition-colors hover:text-content"
                  >
                    <span className="h-[2px] w-5 bg-accent-lime"></span> Style Help
                  </Link>
                </div>

                <div className="flex items-center justify-between border-t border-line/12 pt-8">
                  <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-content/45">
                    Connect
                  </p>
                  <div className="flex items-center gap-6">
                    <a
                      href="https://instagram.com"
                      aria-label="Instagram"
                      className="text-content/60 transition-colors hover:text-accent-red"
                    >
                      <InstagramIcon className="h-4 w-4" />
                    </a>
                    <a
                      href="https://facebook.com"
                      aria-label="Facebook"
                      className="text-content/60 transition-colors hover:text-accent-red"
                    >
                      <FacebookIcon className="h-4 w-4" />
                    </a>
                    <a
                      href="https://twitter.com"
                      aria-label="Twitter"
                      className="text-content/60 transition-colors hover:text-accent-red"
                    >
                      <TwitterIcon className="h-4 w-4" />
                    </a>
                  </div>
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
