"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { useRef } from "react";
import { getStyleCode } from "@/lib/b2b/style-code";
import { getPerPiecePrice } from "@/lib/b2b/pricing";
import { formatPrice } from "@/lib/commerce/catalog";
import type { CommerceProduct } from "@/lib/commerce/types";

/**
 * HORIZONTAL RACK — the collection moves sideways as you scroll down.
 *
 * A tall sticky stage: vertical scroll is converted into lateral travel, so
 * the styles pass like garments on a rail. Each plate carries its code, rate
 * and pack — the line-book facts, not marketing copy. Mobile falls back to a
 * native snap carousel (sticky pin + transform is hostile on touch).
 *
 * Desktop-only behaviour; reduced motion renders a static grid.
 */
export function HorizontalRack({ products }: { products: CommerceProduct[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const items = products.slice(0, 8);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  // Travel the full width of the rack minus one viewport.
  const x = useTransform(scrollYProgress, [0, 1], ["2%", "-72%"]);

  if (reduce) {
    return (
      <section className="bg-surface-inverse px-5 py-20 text-content-inverse sm:px-8 lg:px-12">
        <RackHeader />
        <div className="mt-12 grid gap-px border border-content-inverse/20 bg-content-inverse/20 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((p, i) => (
            <RackCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <>
      {/* ── Desktop: sticky scroll-driven rail ── */}
      <section ref={ref} className="relative hidden bg-surface-inverse lg:block" style={{ height: "320vh" }}>
        <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden text-content-inverse">
          <div className="px-12 pt-24">
            <RackHeader />
          </div>

          <motion.div style={{ x }} className="mt-10 flex gap-6 pl-12 will-change-transform">
            {items.map((p, i) => (
              <RackCard key={p.id} product={p} index={i} large />
            ))}

            {/* terminal card */}
            <Link
              href="/line"
              className="group flex w-[26rem] shrink-0 flex-col items-start justify-between border border-content-inverse/25 p-8 transition-colors hover:border-accent-lime"
            >
              <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-content-inverse/50">
                End of rack
              </span>
              <div>
                <p className="text-4xl font-black uppercase leading-[0.9] tracking-[-0.03em]">
                  The full
                  <br />
                  line awaits.
                </p>
                <span className="mt-6 inline-flex items-center gap-2 border-b-2 border-accent-lime pb-1 text-[10px] font-black uppercase tracking-[0.24em] text-accent-lime">
                  Open the line
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          </motion.div>

          {/* progress hairline */}
          <div className="mx-12 mt-12 h-px bg-content-inverse/15">
            <motion.div
              style={{ scaleX: scrollYProgress }}
              className="h-full origin-left bg-accent-lime"
            />
          </div>
        </div>
      </section>

      {/* ── Mobile / tablet: snap carousel ── */}
      <section className="bg-surface-inverse py-16 text-content-inverse lg:hidden">
        <div className="px-5 sm:px-8">
          <RackHeader />
        </div>
        <div className="no-scrollbar mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 sm:px-8">
          {items.map((p, i) => (
            <div key={p.id} className="w-[72vw] max-w-[300px] shrink-0 snap-start">
              <RackCard product={p} index={i} />
            </div>
          ))}
          <div className="w-4 shrink-0" aria-hidden />
        </div>
        <div className="px-5 pt-8 sm:px-8">
          <Link
            href="/line"
            className="group inline-flex items-center gap-2 border-b-2 border-accent-lime pb-1 text-[10px] font-black uppercase tracking-[0.24em] text-accent-lime"
          >
            Open the full line
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    </>
  );
}

function RackHeader() {
  return (
    <div className="flex items-end justify-between gap-6">
      <div>
        <p className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-[0.32em] text-accent-lime">
          <span className="h-px w-8 bg-accent-lime" aria-hidden />
          The rack
        </p>
        <h2 className="mt-4 text-[clamp(2.2rem,5vw,4.5rem)] font-black uppercase leading-[0.88] tracking-[-0.04em]">
          Scroll down,
          <br />
          walk the rail.
        </h2>
      </div>
      <p className="hidden max-w-[26ch] text-right text-[11px] leading-5 text-content-inverse/50 lg:block">
        Every plate priced per set and per piece. Pack contents vary by style.
      </p>
    </div>
  );
}

function RackCard({
  product,
  index,
  large = false,
}: {
  product: CommerceProduct;
  index: number;
  large?: boolean;
}) {
  const setPrice = product.salePrice ?? product.price;
  const perPiece = getPerPiecePrice(setPrice);

  return (
    <Link
      href={`/shop/${product.handle}`}
      className={`group relative block shrink-0 ${
        large ? "w-[22rem]" : "w-full"
      }`}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-surface-hover">
        <Image
          src={product.image}
          alt={product.title}
          fill
          className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
          sizes={large ? "22rem" : "72vw"}
          loading={index < 2 ? "eager" : "lazy"}
        />
        <span className="absolute left-3 top-3 bg-accent-lime px-2 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-on-accent">
          {getStyleCode(product)}
        </span>
        <span className="absolute right-3 top-3 text-[9px] font-black tabular-nums tracking-[0.1em] text-white/60">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[3px] origin-left scale-x-0 bg-accent-lime transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"
        />
      </div>
      <div className="flex items-start justify-between gap-3 pt-3">
        <div className="min-w-0">
          <h3 className="truncate text-[13px] font-black uppercase leading-tight tracking-[-0.01em]">
            {product.title}
          </h3>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-content-inverse/45">
            {product.category} · {product.sizes.join("/")}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[15px] font-black leading-none tracking-[-0.02em] text-accent-lime">
            {formatPrice(setPrice)}
          </p>
          <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.14em] text-content-inverse/45">
            {formatPrice(perPiece)}/pc
          </p>
        </div>
      </div>
    </Link>
  );
}
