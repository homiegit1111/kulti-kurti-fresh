"use client";

/**
 * Saved styles — a simple ruled list of everything the buyer saved from the
 * line. One row per style: thumb, mono code, title, ₹set · ₹/pc, an "Add sets"
 * action into the tray (existing commit contract, MOQ default), and a remove
 * control. No entrance animation (§1.6); role tokens only.
 */

import { useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Plus, X } from "lucide-react";
import { TermsRule } from "@/components/document/terms-rule";
import { B2B_CONFIG } from "@/lib/b2b/config";
import { getBaseSetPrice, getPerPiecePrice } from "@/lib/b2b/pricing";
import { getStyleCode } from "@/lib/b2b/style-code";
import { formatPrice, type MockProduct } from "@/lib/commerce/catalog";
import { useTray } from "@/lib/line/tray-context";
import { useWishlist } from "@/lib/wishlist-context";
import { cn } from "@/lib/utils";

/* One grid for the head row and every style row, so the columns rule true. */
const ROW_COLS =
  "md:grid-cols-[3.25rem_minmax(0,1fr)_9rem_9.5rem_2.25rem]";

function SavedRow({ product }: { product: MockProduct }) {
  const tray = useTray();
  const { removeFromWishlist } = useWishlist();

  const soldOut = product.availableForSale === false;
  const inOrder = tray.isCommitted(product.id);
  const setPrice = getBaseSetPrice(product);
  const perPiece = getPerPiecePrice(setPrice);
  const code = getStyleCode(product);

  return (
    <div
      className={cn(
        "grid grid-cols-[3.25rem_minmax(0,1fr)_2.25rem] items-center gap-x-4 gap-y-3 border-b border-line/15 py-3",
        ROW_COLS,
        soldOut && "opacity-55",
      )}
    >
      {/* Thumb — links to the style */}
      <Link
        href={`/shop/${product.handle}`}
        className="relative block aspect-[4/5] w-full overflow-hidden bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime"
      >
        <Image
          src={product.image}
          alt={product.title}
          fill
          sizes="52px"
          className="object-cover"
        />
      </Link>

      {/* Code + title */}
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-content/55">
          {code}
        </p>
        <Link
          href={`/shop/${product.handle}`}
          className="truncate text-[13px] font-bold leading-tight text-content underline-offset-2 hover:underline"
        >
          {product.title}
        </Link>
      </div>

      {/* Rate — ₹set · ₹/pc */}
      <div className="ledger col-span-2 col-start-2 flex items-baseline gap-2 md:col-span-1 md:col-start-auto md:flex-col md:items-end md:gap-0.5">
        <span className="text-sm font-black tracking-[-0.03em] text-content">
          {formatPrice(setPrice)}
          <span className="ml-1 text-[9px] font-bold uppercase tracking-[0.16em] text-content/45">
            /set
          </span>
        </span>
        <span className="text-[10px] font-semibold text-content/50">
          {formatPrice(perPiece)}/pc
        </span>
      </div>

      {/* Add sets — into the tray via the existing commit contract */}
      <div className="col-span-2 col-start-2 md:col-span-1 md:col-start-auto">
        {soldOut ? (
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-accent-red">
            Sold out
          </span>
        ) : inOrder ? (
          <Link
            href="/tray"
            className="text-[9px] font-bold uppercase tracking-[0.16em] text-content underline decoration-accent-lime decoration-2 underline-offset-4 hover:decoration-content"
          >
            In your order
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => tray.commit(product)}
            className="flex h-7 items-center gap-1.5 border border-line px-2.5 text-[9px] font-bold uppercase tracking-[0.16em] text-content transition-colors hover:bg-surface-inverse hover:text-content-inverse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime"
          >
            <Plus className="h-3 w-3" strokeWidth={2.5} />
            Add {B2B_CONFIG.minimumOrderSets} sets
          </button>
        )}
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={() => removeFromWishlist(product.id)}
        aria-label={`Remove ${product.title} from saved styles`}
        className="col-start-3 row-start-1 flex h-7 w-7 items-center justify-center justify-self-end text-content/35 transition-colors hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-lime md:col-start-auto md:row-start-auto"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}

/** Stable no-op subscribe for the one-time hydration read below. */
const subscribeNever = () => () => {};

export function WishlistClient() {
  const { items, count } = useWishlist();

  // wishlist-context hydrates from localStorage just after mount; hold the
  // empty state back one tick so a full list never flashes "nothing saved".
  const mounted = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 pb-24 pt-24 sm:px-10 lg:px-16 lg:pt-28">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b-2 border-line pb-6">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[0.3em] text-content/55">
            Saved for later
          </p>
          <h1 className="mt-4 text-[clamp(2.75rem,6vw,5.5rem)] font-black uppercase leading-[0.95] tracking-[-0.04em]">
            Saved styles
          </h1>
        </div>
        {count > 0 && (
          <p className="ledger pb-1.5 text-[10px] font-extrabold uppercase tracking-[0.22em] text-content/55">
            {count} {count === 1 ? "style" : "styles"}
          </p>
        )}
      </header>

      {!mounted ? (
        <div className="py-16">
          <div className="h-2 w-32 bg-line/15" />
        </div>
      ) : count === 0 ? (
        <div className="py-16">
          <p className="max-w-[52ch] text-sm leading-6 text-content/60">
            Nothing saved yet. Tap Save on any style and it will wait here.
          </p>
          <Link
            href="/shop"
            className="mt-6 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-content underline-offset-4 hover:underline"
          >
            Browse styles <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <>
          <TermsRule className="mt-6 border-t-0" />

          {/* Column heads — plain words, ruled */}
          <div
            className={cn(
              "hidden border-b border-line/20 pb-2 pt-8 md:grid md:items-end md:gap-4",
              ROW_COLS,
            )}
          >
            {["", "Style", "Rate", "Sets", ""].map((label, index) => (
              <span
                key={index}
                className={cn(
                  "text-[8px] font-bold uppercase tracking-[0.24em] text-content/40",
                  index === 2 && "text-right",
                )}
              >
                {label}
              </span>
            ))}
          </div>

          <div className="max-md:mt-4">
            {items.map((product) => (
              <SavedRow key={product.id} product={product} />
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-content/55 transition-colors hover:text-content"
            >
              Browse styles <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/tray"
              className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-content underline-offset-4 hover:underline"
            >
              Go to your order <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
