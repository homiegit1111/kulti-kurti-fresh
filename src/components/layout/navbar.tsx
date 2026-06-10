"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/client";
import { Search } from "lucide-react";
import Image from "next/image";
import { CartDrawer } from "./cart-drawer";

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
  { label: "Shop", href: "/shop" },
  { label: "Collections", href: "/collections" },
  { label: "Lookbook", href: "/lookbook" },
  { label: "About", href: "/about" },
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
            "bg-charcoal text-white flex items-center justify-center transition-all duration-500 ease-out",
            bannerHidden ? "h-0 opacity-0 overflow-hidden" : "h-10 opacity-100",
          )}
          aria-hidden={bannerHidden}
        >
          <div className="text-[10px] sm:text-xs uppercase tracking-widest font-medium">
            Free Shipping on Orders Above ₹2,999{" "}
            <span className="text-gold mx-2">•</span> Use Code RANGAT20
          </div>
        </div>
      )}

      {/* ── Main Navigation ── */}
      <nav
        className={cn(
          "relative flex h-16 w-full items-center px-5 transition-[background-color,box-shadow,border-color] duration-150 ease-out lg:h-20 lg:px-12",
          scrolled
            ? "glass shadow-sm"
            : "bg-warm-white/95 backdrop-blur-md shadow-sm border-b border-charcoal/5",
        )}
      >
        {/* ── Left: Desktop Nav Links ── */}
        <div className="hidden flex-1 items-center justify-start gap-8 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="group relative py-2 text-[11px] uppercase tracking-widest font-semibold text-charcoal transition-colors hover:text-gold"
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
            <div className="relative w-56 h-16 md:w-64 md:h-20 lg:w-72 lg:h-24">
              <Image
                src="/images/RangatPehnawa.png"
                alt="Rangat Pehnawa"
                fill
                className="object-contain object-left lg:object-center drop-shadow-sm"
                priority
              />
            </div>
          </Link>
        </div>

        {/* ── Right: Desktop Text Links (Minimalist Luxury) ── */}
        <div className="hidden flex-1 items-center justify-end gap-6 lg:flex">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Open search"
            className="rounded-full px-2 py-2 text-[10px] uppercase tracking-widest font-semibold text-charcoal hover:text-gold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
          >
            Search
          </button>
          {isLoaded && (
            userId ? (
              <Link
                href="/account"
                className="text-[10px] uppercase tracking-widest font-semibold text-charcoal hover:text-gold transition-colors"
              >
                Account
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-[10px] uppercase tracking-widest font-semibold text-charcoal hover:text-gold transition-colors"
              >
                Sign In
              </Link>
            )
          )}
          <Link
            href="/wishlist"
            className="text-[10px] uppercase tracking-widest font-semibold text-charcoal hover:text-gold transition-colors"
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
            className="rounded-full p-2 text-[10px] uppercase tracking-widest font-semibold text-charcoal hover:text-gold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
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
                  className="text-[10px] uppercase tracking-widest font-semibold text-charcoal hover:text-gold transition-colors"
                />
              }
            >
              Menu
            </SheetTrigger>

            <SheetContent
              side="left"
              className="flex flex-col border-none bg-warm-white text-charcoal !w-full !max-w-none p-0 overflow-hidden"
            >
              {/* Aesthetic Menu Doodles */}
              <div className="absolute inset-0 pointer-events-none z-0">
                <svg
                  className="absolute right-[-10%] top-[10%] w-64 h-64 text-gold/10 -rotate-12"
                  viewBox="0 0 200 200"
                  fill="none"
                >
                  <path
                    d="M50 150 Q 150 180 180 50 T 50 150"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray="5 5"
                    fill="none"
                  />
                  <path
                    d="M40 140 L 50 150 L 65 145"
                    stroke="currentColor"
                    strokeWidth="1"
                    fill="none"
                  />
                </svg>
                <div className="absolute left-[-20%] bottom-[20%] w-[400px] h-[400px] bg-gold/15 rounded-full blur-[100px]" />
                <svg
                  className="absolute left-[10%] top-[40%] w-32 h-32 text-charcoal/5 animate-[spin_120s_linear_infinite]"
                  viewBox="0 0 100 100"
                  fill="none"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    strokeDasharray="4 8"
                  />
                </svg>
              </div>

              <SheetHeader className="px-6 pb-6 pt-6 border-b border-charcoal/10 relative z-10 bg-warm-white/50 backdrop-blur-sm">
                <SheetTitle className="flex items-center gap-2 text-charcoal">
                  <div className="relative w-56 h-16">
                    <Image
                      src="/images/RangatPehnawa.png"
                      alt="Rangat Pehnawa"
                      fill
                      className="object-contain object-left"
                      priority
                    />
                  </div>
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Site navigation menu
                </SheetDescription>
              </SheetHeader>

              {/* Huge Luxury Typography Links */}
              <nav className="flex flex-1 flex-col justify-center gap-6 px-8 py-8 relative z-10">
                {navLinks.map((link, i) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="group relative flex items-center font-serif text-5xl sm:text-6xl text-charcoal transition-colors hover:text-gold animate-slide-in-bottom opacity-0 [animation-fill-mode:forwards]"
                    style={{
                      animationDelay: `${i * 100 + 100}ms`,
                    }}
                  >
                    <span className="italic font-light">{link.label}</span>
                    <span className="absolute left-0 -bottom-2 h-[2px] w-0 bg-gold transition-all duration-300 group-hover:w-full" />
                  </Link>
                ))}
              </nav>

              {/* Minimalist Secondary Links & Socials */}
              <div className="mt-auto px-8 pb-10 relative z-10 bg-gradient-to-t from-warm-white via-warm-white to-transparent pt-12">
                <div className="flex flex-col gap-6 mb-8">
                  {isLoaded && (
                    userId ? (
                      <Link
                        href="/account"
                        className="text-xs font-semibold uppercase tracking-[0.2em] text-charcoal/60 hover:text-charcoal transition-colors flex items-center gap-2"
                      >
                        <span className="h-px w-4 bg-gold"></span> My Account
                      </Link>
                    ) : (
                      <Link
                        href="/login"
                        className="text-xs font-semibold uppercase tracking-[0.2em] text-charcoal/60 hover:text-charcoal transition-colors flex items-center gap-2"
                      >
                        <span className="h-px w-4 bg-gold"></span> Sign In
                      </Link>
                    )
                  )}
                  <Link
                    href="/wishlist"
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-charcoal/60 hover:text-charcoal transition-colors flex items-center gap-2"
                  >
                    <span className="h-px w-4 bg-gold"></span> Wishlist
                  </Link>
                  <Link
                    href="/contact"
                    className="text-xs font-semibold uppercase tracking-[0.2em] text-charcoal/60 hover:text-charcoal transition-colors flex items-center gap-2"
                  >
                    <span className="h-px w-4 bg-gold"></span> Track Order
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
