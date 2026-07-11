"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { B2B_CONFIG, SIZE_RATIO_LABEL } from "@/lib/b2b/config";
import { getPerPiecePrice } from "@/lib/b2b/pricing";
import { getStyleCode } from "@/lib/b2b/style-code";
import { formatPrice, type CommerceProduct } from "@/lib/commerce/catalog";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { cn } from "@/lib/utils";

interface NewStylesProps {
  products: CommerceProduct[];
  excludeProductIds?: string[];
}

function StyleCard({ product }: { product: CommerceProduct }) {
  const setPrice = product.salePrice ?? product.price;
  const perPiece = getPerPiecePrice(setPrice);
  const styleCode = getStyleCode(product);
  const soldOut = product.availableForSale === false;
  const onSale =
    product.salePrice != null && product.salePrice < product.price;

  return (
    <article className="group relative flex h-full flex-col transform-gpu">
      <Link
        href={`/shop/${product.handle}`}
        className="absolute inset-0 z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo"
        aria-label={`View ${product.title}`}
      />

      <div className="relative aspect-[3/4] overflow-hidden bg-[var(--surface-void)]">
        <Image
          src={product.image}
          alt={product.title}
          fill
          decoding="async"
          className="object-cover object-[center_18%] transform-gpu transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          quality={85}
        />

        {/* Light scrim mobile · cleaner desktop */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-90 lg:from-black/20 lg:opacity-60" />

        {/* Mobile chips — style code in trade-voice mono */}
        <span className="absolute left-2 top-2 z-10 font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-white/90 drop-shadow-sm lg:hidden">
          {styleCode}
        </span>
        {(soldOut || product.isNew || onSale) && (
          <span
            className={cn(
              "absolute right-2 top-2 z-10 px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-white lg:hidden",
              soldOut
                ? "bg-charcoal/80"
                : onSale
                  ? "bg-gold"
                  : "bg-white/20 backdrop-blur-sm",
            )}
          >
            {soldOut ? "Sold out" : onSale ? "Sale" : "New"}
          </span>
        )}

        {/* Desktop badges — indigo ink for structure, turmeric reserved for the one commercial note */}
        <div className="absolute left-3 top-3 z-10 hidden flex-col gap-1 lg:flex">
          {onSale && !soldOut && (
            <span className="w-fit bg-gold px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--on-gold)]">
              Sale
            </span>
          )}
          {product.isNew && !soldOut && (
            <span className="w-fit bg-charcoal px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-white">
              New
            </span>
          )}
          {soldOut && (
            <span className="w-fit bg-charcoal/85 px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-white">
              Sold out
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col pt-2 lg:pt-4">
        {/* Trade-voice eyebrow: category label + reorder style code */}
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-indigo/55 dark:text-white/40 lg:text-[10px] lg:tracking-[0.16em]">
            {product.category || "Kurti"}
          </p>
          <p className="hidden font-mono text-[9px] uppercase tracking-[0.12em] text-indigo/45 dark:text-white/30 lg:block">
            {styleCode}
          </p>
        </div>
        <h3 className="mt-0 line-clamp-2 font-serif text-[1.05rem] leading-snug tracking-tight text-charcoal transition-colors group-hover:text-indigo dark:text-white dark:group-hover:text-indigo lg:mt-1 lg:text-[1.2rem]">
          {product.title}
        </h3>
        <div className="mt-1 flex items-baseline gap-2 font-mono sm:mt-1.5 lg:mt-2 lg:justify-between">
          <p className="text-[14px] font-medium tabular-nums text-charcoal dark:text-white/90 lg:text-[15px]">
            {formatPrice(setPrice)}
            <span className="text-[11px] text-indigo/45 dark:text-white/35">
              /set
            </span>
          </p>
          <p className="text-[11px] tabular-nums text-indigo/50 dark:text-white/40 sm:text-[12px]">
            {formatPrice(perPiece)}
            <span className="text-[10px]">/pc</span>
          </p>
        </div>
        {/* Indigo carries the structural hover underline — madder stays reserved for the section rule */}
        <span
          aria-hidden
          className="mt-2 block h-px w-0 bg-indigo transition-[width] duration-500 ease-out group-hover:w-full sm:mt-2.5"
        />
      </div>
    </article>
  );
}

/**
 * Homepage products — mobile compact · desktop “Seasonal Must-Haves” editorial
 * (matches old kurti-rho centered layout).
 */
export function NewStyles({ products, excludeProductIds = [] }: NewStylesProps) {
  const [activeCat, setActiveCat] = useState("All");

  const displayProducts = useMemo(() => {
    if (excludeProductIds.length === 0) return products;
    const excluded = new Set(excludeProductIds);
    const filtered = products.filter((product) => !excluded.has(product.id));
    // Keep small catalogs useful while avoiding hero repetition when possible.
    return filtered.length > 0 ? filtered : products;
  }, [products, excludeProductIds]);

  const categories = useMemo(() => {
    const cats = [
      ...new Set(displayProducts.map((p) => p.category).filter(Boolean)),
    ] as string[];
    return ["All", ...cats];
  }, [displayProducts]);

  const filtered = useMemo(() => {
    const list =
      activeCat === "All"
        ? displayProducts
        : displayProducts.filter((p) => p.category === activeCat);
    return list.slice(0, 16);
  }, [displayProducts, activeCat]);

  if (products.length === 0) return null;

  return (
    <section className="content-auto relative overflow-hidden bg-transparent pt-10 pb-10 sm:pt-12 sm:pb-12 lg:pt-20 lg:pb-16">
      {/* Soft editorial wash (desktop light only) */}
      <div className="pointer-events-none absolute inset-0 dark:hidden lg:block">
        <div className="absolute inset-0 hidden bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(255,255,255,0.55),transparent_55%)] lg:block" />
      </div>

      {/* Desktop ornaments — old-site “Must Haves” spirit */}
      <div className="relative mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-12">
        {/* ── Mobile header ── */}
        <ScrollReveal as="header" className="mb-5 lg:hidden" y={14}>
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="mb-1.5 inline-flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-indigo dark:text-gold">
                <span className="h-px w-4 bg-indigo/45 dark:bg-gold" />
                Wholesale styles
              </p>
              <h2 className="font-serif text-[clamp(1.85rem,8vw,2.4rem)] font-light leading-[1.02] tracking-tight text-charcoal dark:text-white">
                Stock your rail
                <span className="mt-0.5 block text-[0.68em] italic text-[var(--madder)]">
                  ready to reorder
                </span>
              </h2>
              <p className="text-caption-sm mt-1.5">
                MOQ {B2B_CONFIG.minimumOrderSets}
              </p>
            </div>
            <div className="mb-0.5 flex shrink-0 flex-col items-end text-right">
              <span className="font-serif text-[2.35rem] leading-none tabular-nums text-charcoal dark:text-white">
                {String(filtered.length).padStart(2, "0")}
              </span>
              <span className="mt-1 text-[8px] font-bold uppercase tracking-[0.18em] text-charcoal/40 dark:text-white/35">
                styles
              </span>
              <span
                aria-hidden
                className="mt-1.5 block h-px w-8 bg-indigo/50 dark:bg-gold/70"
              />
            </div>
          </div>
        </ScrollReveal>

        {/* ── Desktop centered editorial (old site) ── */}
        <ScrollReveal
          as="header"
          className="relative mb-10 hidden text-center lg:mb-12 lg:block"
          y={18}
        >
          <p className="mb-4 inline-flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.32em] text-indigo dark:text-gold">
            <span className="h-px w-8 bg-indigo/40 dark:bg-gold/70" />
            Wholesale assortment
            <span className="h-px w-8 bg-indigo/40 dark:bg-gold/70" />
          </p>
          <h2 className="font-serif text-[clamp(2.5rem,4.5vw,3.75rem)] font-normal leading-[1.08] tracking-[-0.02em] text-charcoal dark:text-white">
            Styles for your rail{" "}
            <span className="italic text-[var(--madder)] dark:text-gold">
              ready to reorder
            </span>
          </h2>
          <p className="text-caption mx-auto mt-4 max-w-xl">
            Clear set pricing, {SIZE_RATIO_LABEL} ratio packs, and styles selected
            for boutique rails.
          </p>

          {/* Category tabs */}
          <div className="mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            {categories.map((cat) => {
              const active = activeCat === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCat(cat)}
                  className={cn(
                    "relative pb-2 text-[11px] font-bold uppercase tracking-[0.18em] transition-colors duration-300 ease-out",
                    active
                      ? "text-indigo dark:text-gold"
                      : "text-charcoal/40 hover:text-charcoal dark:text-white/35 dark:hover:text-white/70",
                  )}
                >
                  {cat}
                  <span
                    className={cn(
                      "absolute inset-x-0 bottom-0 h-[2px] origin-center bg-indigo transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] dark:bg-gold",
                      active ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                </button>
              );
            })}
          </div>
        </ScrollReveal>

        <div
          key={activeCat}
          className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-4 sm:gap-y-8 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-12"
        >
          {filtered.map((product) => (
            <StyleCard key={product.id} product={product} />
          ))}
        </div>

        {/* Empty filter state */}
        {filtered.length === 0 && (
          <p className="py-16 text-center font-serif text-lg text-charcoal/40 dark:text-white/35">
            No styles in this category yet.
          </p>
        )}

        <ScrollReveal className="mt-10 flex justify-center sm:mt-12" y={10} delay={0.05}>
          <Link
            href="/shop"
            className="group inline-flex items-center gap-2 border-b border-charcoal/20 pb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-charcoal transition-colors duration-300 hover:border-indigo hover:text-indigo dark:border-white/20 dark:text-white dark:hover:border-gold dark:hover:text-gold"
          >
            View all styles
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 ease-out group-hover:translate-x-0.5" />
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}
