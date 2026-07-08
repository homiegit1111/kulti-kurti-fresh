"use client";

import { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Plus, X } from "lucide-react";
import { formatPrice, type MockProduct } from "@/lib/commerce/catalog";
import { useCart } from "@/lib/cart-context";
import { B2B_CONFIG, SIZE_RATIO_LABEL } from "@/lib/b2b/config";
import { getPerPiecePrice } from "@/lib/b2b/pricing";
import { getStyleCode } from "@/lib/b2b/style-code";

interface LivingProductCardProps {
  product: MockProduct;
  isWishlisted: boolean;
  onToggleWishlist: () => void;
  videoUrl?: string;
  isLiving?: boolean;
  heightClass?: string;
}

export const LivingProductCard = memo(function LivingProductCard({
  product,
  isWishlisted,
  onToggleWishlist,
  heightClass = "",
}: LivingProductCardProps) {
  const { addItem } = useCart();
  const soldOut = product.availableForSale === false;
  const setPrice = product.salePrice ?? product.price;
  const perPiece = getPerPiecePrice(setPrice);
  const onSale =
    typeof product.salePrice === "number" && product.salePrice < product.price;
  const discountPct = onSale
    ? Math.round(((product.price - (product.salePrice as number)) / product.price) * 100)
    : 0;

  return (
    <article className={`group flex h-full flex-col bg-white ${heightClass}`}>
      <div className="relative overflow-hidden bg-warm-gray">
        <Link href={`/shop/${product.handle}`} className="relative block aspect-[3/4] overflow-hidden">
          <Image
            src={product.image}
            alt={product.title}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
          />
        </Link>

        {(soldOut || onSale || product.isNew) && (
          <span className="absolute left-3 top-3 bg-white px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-charcoal shadow-sm">
            {soldOut ? "Sold out" : onSale ? `${discountPct}% off` : "New"}
          </span>
        )}

        <button
          type="button"
          onClick={onToggleWishlist}
          aria-label={
            isWishlisted
              ? `Remove ${product.title} from wishlist`
              : `Save ${product.title} to wishlist`
          }
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center bg-white text-charcoal shadow-sm transition-colors hover:text-gold-dark"
        >
          <Heart
            className={isWishlisted ? "h-4 w-4 fill-gold text-gold" : "h-4 w-4"}
            strokeWidth={1.7}
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal/42">
            {product.category}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-charcoal/35">
            {getStyleCode(product)}
          </p>
        </div>

        <Link href={`/shop/${product.handle}`} className="mt-2 block">
          <h3 className="min-h-[2.7rem] font-serif text-base leading-snug text-charcoal transition-colors group-hover:text-gold-dark sm:text-lg">
            {product.title}
          </h3>
        </Link>

        <div className="mt-4 border-t border-charcoal/10 pt-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-charcoal">{formatPrice(setPrice)}</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-charcoal/40">
                {SIZE_RATIO_LABEL} set
              </p>
            </div>
            <p className="text-right text-sm font-semibold text-charcoal/70">
              {formatPrice(perPiece)}
              <span className="block text-[10px] uppercase tracking-[0.12em] text-charcoal/35">
                per pc
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (soldOut) return;
            addItem(
              product,
              "Set",
              product.colors[0] ?? "assorted",
              B2B_CONFIG.defaultLineSets,
            );
          }}
          disabled={soldOut}
          aria-label={
            soldOut
              ? `${product.title} is sold out`
              : `Add ${B2B_CONFIG.defaultLineSets} set of ${product.title}`
          }
          className="mt-4 flex h-10 w-full items-center justify-center gap-2 border border-charcoal/15 bg-white text-[10px] font-bold uppercase tracking-[0.16em] text-charcoal transition-colors hover:bg-charcoal hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
        >
          {soldOut ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {soldOut ? "Sold out" : "Add set"}
        </button>
      </div>
    </article>
  );
});