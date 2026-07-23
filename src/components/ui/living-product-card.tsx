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
  // View Transitions morph source: the PDP hero plate carries the same name,
  // so the garment visually travels from this card into the product page.
  // Ids are sanitized to a valid CSS custom-ident (alphanumeric/dash only).
  const plateName = `product-plate-${product.id.replace(/[^a-zA-Z0-9-]/g, "-")}`;
  const soldOut = product.availableForSale === false;
  const setPrice = product.salePrice ?? product.price;
  const perPiece = getPerPiecePrice(setPrice);
  const onSale =
    typeof product.salePrice === "number" && product.salePrice < product.price;
  const discountPct = onSale
    ? Math.round(((product.price - (product.salePrice as number)) / product.price) * 100)
    : 0;

  return (
    <article className={`group flex h-full flex-col border border-line/15 bg-surface ${heightClass}`}>
      <div className="relative overflow-hidden bg-surface-hover">
        <Link
          href={`/shop/${product.handle}`}
          className="relative block aspect-square overflow-hidden"
          style={{ viewTransitionName: plateName }}
        >
          <Image
            src={product.image}
            alt={product.title}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
          />
        </Link>

        {(soldOut || onSale || product.isNew) && (
          <span
            className={`absolute left-0 top-0 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] ${
              onSale
                ? "bg-accent-red text-content-inverse"
                : product.isNew && !soldOut
                  ? "bg-accent-lime text-on-accent"
                  : "bg-surface-inverse text-content-inverse"
            }`}
          >
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
          className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center bg-surface text-content transition-colors hover:bg-surface-inverse hover:text-content-inverse"
        >
          <Heart
            className={isWishlisted ? "h-4 w-4 fill-accent-red text-accent-red" : "h-4 w-4"}
            strokeWidth={1.7}
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-content/45">
            {product.category}
          </p>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-content/35">
            {getStyleCode(product)}
          </p>
        </div>

        <Link href={`/shop/${product.handle}`} className="mt-2 block">
          <h3 className="min-h-[2.5rem] text-base font-bold leading-tight tracking-[-0.025em] text-content sm:text-lg">
            {product.title}
          </h3>
        </Link>

        <div className="mt-4 border-t border-line/20 pt-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-base font-bold text-content">{formatPrice(setPrice)}</p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-content/45">
                {SIZE_RATIO_LABEL} set
              </p>
            </div>
            <p className="text-right text-sm font-bold text-content/70">
              {formatPrice(perPiece)}
              <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-content/40">
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
          className="mt-4 flex h-10 w-full items-center justify-center gap-2 border border-line/20 bg-surface text-[10px] font-bold uppercase tracking-[0.18em] text-content transition-colors hover:bg-surface-inverse hover:text-content-inverse disabled:cursor-not-allowed disabled:opacity-45"
        >
          {soldOut ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {soldOut ? "Sold out" : "Add set"}
        </button>
      </div>
    </article>
  );
});