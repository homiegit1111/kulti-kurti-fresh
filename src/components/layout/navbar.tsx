"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/client";
import { MessageCircle, Search, Table2 } from "lucide-react";
import Image from "next/image";
import { CartDrawer } from "./cart-drawer";
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
      {/* ── Promotional Banner (Modern Static/Fading) ── */}
      {!isProductPage && (
        <div
          className={cn(
            "bg-charcoal text-white flex items-center justify-center transition-all duration-300 ease-out",
            bannerHidden ? "h-0 opacity-0 overflow-hidden" : "h-10 opacity-100",
          )}
          aria-hidden={bannerHidden}
        >
          <div className="px-4 text-center text-[10px] font-semibold uppercase tracking-[0.18em] sm:text-xs">
            Fresh kurti drops <span className="mx-2 text-gold-light">|</span> modern price-smart styles
            <span className="mx-2 text-gold-light">|</span> WhatsApp orders open
          </div>
        </div>
      )}

      {/* ── Main Navigation ── */}
      <nav
        className={cn(
          "relative flex h-16 w-full items-center overflow-hidden border-b border-white/40 bg-white/18 px-4 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.5)] backdrop-blur-[42px] backdrop-saturate-[1.45] transition-[background-color,box-shadow,border-color] duration-200 ease-out before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(112deg,rgba(255,255,255,0.82),rgba(250,246,238,0.28)_42%,rgba(255,255,255,0.06)_72%)] before:opacity-90 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/80 after:to-transparent supports-[backdrop-filter]:bg-white/12 lg:h-[72px] lg:px-10",
          scrolled
            ? "border-white/55 bg-white/26 shadow-[0_24px_70px_-42px_rgba(0,0,0,0.55)] supports-[backdrop-filter]:bg-white/18"
            : "border-white/40",
        )}
      >
        {/* ── Left: Desktop Nav Links ── */}
        <div className="hidden flex-1 items-center justify-start gap-8 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
            className="group relative py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-charcoal transition-colors hover:text-gold"
            >
              {link.label}
              {/* Underline animation */}
              <span className="absolute inset-x-0 -bottom-0.5 h-[1.5px] origin-left scale-x-0 bg-gold transition-transform duration-300 ease-out group-hover:scale-x-100" />
            </Link>
          ))}
        </div>

        {/* ── Center: Logo ── */}
        <div className="flex shrink-0 items-center justify-start lg:justify-center">
          <Link
            href="/"
            className="group relative z-10 flex items-center justify-center transition-transform hover:scale-[1.02] active:scale-95"
          >
            <div className="relative h-14 w-44 md:h-16 md:w-52 lg:h-[72px] lg:w-60">
              <Image
                src="/images/RangatPehnawa.png"
                alt="Rangat Pehnawa"
                fill
                sizes="(max-width: 768px) 176px, (max-width: 1024px) 208px, 240px"
                className="object-contain object-left lg:object-center drop-shadow-sm"
                priority
              />
            </div>
          </Link>
        </div>

        {/* ── Right: Desktop Text Links (Minimalist Luxury) ── */}
        <div className="hidden flex-1 items-center justify-end gap-5 lg:flex">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Open search"
            title="Search catalog"
            className="flex h-9 w-9 items-center justify-center border border-white/80 bg-white/38 text-charcoal shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_16px_42px_-34px_rgba(35,25,20,0.55)] backdrop-blur-2xl backdrop-saturate-150 transition-colors hover:border-gold/45 hover:bg-white/56 hover:text-gold"
          >
            <Search className="h-4 w-4" strokeWidth={1.7} />
          </button>
          {isLoaded && (
            userId ? (
              <Link
                href="/account"
                className="text-[10px] font-semibold uppercase tracking-[0.16em] text-charcoal transition-colors hover:text-gold"
              >
                Account
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-[10px] font-semibold uppercase tracking-[0.16em] text-charcoal transition-colors hover:text-gold"
              >
                Sign In
              </Link>
            )
          )}
          <Link
            href="/wishlist"
            className="text-[10px] font-semibold uppercase tracking-[0.16em] text-charcoal transition-colors hover:text-gold"
          >
            Wishlist
          </Link>
          <CartDrawer />
        </div>

        {/* ── Right: Mobile Menu (Minimalist Luxury) ── */}
        <div className="flex flex-1 items-center justify-end gap-5 lg:hidden">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Open search"
            className="p-2 text-charcoal transition-colors hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
          >
            <Search className="h-4 w-4" />
          </button>

          <CartDrawer />

          {/* Mobile Menu Sheet */}
          <Sheet>
            <SheetTrigger
              render={
                <button
                  type="button"
                  aria-label="Open menu"
                  className="text-[10px] font-semibold uppercase tracking-[0.18em] text-charcoal transition-colors hover:text-gold"
                />
              }
            >
              Menu
            </SheetTrigger>

            <SheetContent
              side="left"
              className="flex flex-col overflow-y-auto border-none bg-warm-white text-charcoal !w-full !max-w-none p-0"
            >
              <SheetHeader className="relative z-10 border-b border-charcoal/10 bg-warm-white px-6 pb-5 pt-5">
                <SheetTitle className="flex items-center gap-2 text-charcoal">
                  <div className="relative h-14 w-48">
                    <Image
                      src="/images/RangatPehnawa.png"
                      alt="Rangat Pehnawa"
                      fill
                      sizes="(max-width: 768px) 192px, 192px"
                      className="object-contain object-left"
                      priority
                    />
                  </div>
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Site navigation menu
                </SheetDescription>
              </SheetHeader>

              <div className="relative z-10 grid gap-3 border-b border-charcoal/10 px-6 py-5">
                <Link
                  href="/bulk-order"
                  className="flex min-h-12 items-center justify-center gap-2 bg-charcoal px-4 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white"
                >
                  <Table2 className="h-3.5 w-3.5" />
                  Open Bulk Deals
                </Link>
                <a
                  href={buildCatalogRequestUrl()}
                  className="flex min-h-12 items-center justify-center gap-2 border border-charcoal/15 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-charcoal"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp Catalog
                </a>
              </div>

              <nav className="relative z-10 flex flex-1 flex-col gap-1 px-6 py-6">
                {navLinks.map((link, i) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="group flex items-center justify-between border-b border-charcoal/10 py-5 text-sm font-semibold uppercase tracking-[0.16em] text-charcoal transition-colors hover:text-gold"
                    style={{
                      animationDelay: `${i * 100 + 100}ms`,
                    }}
                  >
                    <span>{link.label}</span>
                    <span className="text-[10px] text-charcoal/35">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </Link>
                ))}
              </nav>

              <div className="relative z-10 mt-auto px-6 pb-8 pt-6">
                <div className="mb-8 flex flex-col gap-5">
                  {isLoaded && (
                    userId ? (
                      <Link
                        href="/account"
                        className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-charcoal/60 transition-colors hover:text-charcoal"
                      >
                        <span className="h-px w-4 bg-gold"></span> My Account
                      </Link>
                    ) : (
                      <Link
                        href="/login"
                        className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-charcoal/60 transition-colors hover:text-charcoal"
                      >
                        <span className="h-px w-4 bg-gold"></span> Sign In
                      </Link>
                    )
                  )}
                  <Link
                    href="/wishlist"
                    className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-charcoal/60 transition-colors hover:text-charcoal"
                  >
                    <span className="h-px w-4 bg-gold"></span> Wishlist
                  </Link>
                  <Link
                    href="/contact"
                    className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-charcoal/60 transition-colors hover:text-charcoal"
                  >
                    <span className="h-px w-4 bg-gold"></span> Style Help
                  </Link>
                </div>

                <div className="flex items-center justify-between border-t border-charcoal/10 pt-8">
                  <p className="text-[9px] uppercase tracking-[0.3em] text-charcoal/40 font-semibold">
                    Connect
                  </p>
                  <div className="flex items-center gap-6">
                    <a
                      href="https://instagram.com"
                      aria-label="Instagram"
                      className="text-charcoal/60 hover:text-gold transition-colors"
                    >
                      <InstagramIcon className="h-4 w-4" />
                    </a>
                    <a
                      href="https://facebook.com"
                      aria-label="Facebook"
                      className="text-charcoal/60 hover:text-gold transition-colors"
                    >
                      <FacebookIcon className="h-4 w-4" />
                    </a>
                    <a
                      href="https://twitter.com"
                      aria-label="Twitter"
                      className="text-charcoal/60 hover:text-gold transition-colors"
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
      <SearchDialog
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </header>
  );
}
