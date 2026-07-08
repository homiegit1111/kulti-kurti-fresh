import { B2B_CONFIG, SIZE_RATIO_LABEL } from "@/lib/b2b/config";
import { getStyleCode } from "@/lib/b2b/style-code";
import type { CommerceProduct } from "./types";

export type MedusaProductStatus = "draft" | "proposed" | "published" | "rejected";

export interface MedusaProductSeedPrice {
  currency_code: "inr";
  amount: number;
}

export interface MedusaProductSeedVariant {
  title: string;
  sku: string;
  options: Record<string, string>;
  prices: MedusaProductSeedPrice[];
  metadata: Record<string, string | number | boolean>;
}

export interface MedusaProductSeedDraft {
  title: string;
  handle: string;
  description: string;
  status: MedusaProductStatus;
  thumbnail?: string;
  images: { url: string }[];
  options: { title: string; values: string[] }[];
  variants: MedusaProductSeedVariant[];
  metadata: Record<string, string | number | boolean>;
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function skuPart(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function getWholesaleSetPrice(product: CommerceProduct): number {
  return Math.round(product.salePrice ?? product.price);
}

export function toMedusaProductSeedDraft(
  product: CommerceProduct,
): MedusaProductSeedDraft {
  const styleCode = getStyleCode(product);
  const setPrice = getWholesaleSetPrice(product);
  const sizes = uniq(product.sizes?.length ? product.sizes : [...B2B_CONFIG.sizeRatio]);
  const colors = uniq(product.colors ?? []);
  const images = uniq(product.images?.length ? product.images : [product.image]);

  return {
    title: product.title,
    handle: product.handle,
    description: product.description,
    status: "published",
    thumbnail: product.image,
    images: images.map((url) => ({ url })),
    options: [{ title: "Size", values: sizes }],
    variants: sizes.map((size) => ({
      title: size,
      sku: `${styleCode}-${skuPart(size)}`,
      options: { Size: size },
      prices: [{ currency_code: "inr", amount: setPrice }],
      metadata: {
        source_product_id: product.id,
        source_variant_id: product.variantIds?.[size] ?? product.variantId ?? "",
        style_code: styleCode,
        wholesale_set_price: setPrice,
        wholesale_set_price_paise: setPrice * 100,
        set_size: B2B_CONFIG.setSize,
        size_ratio: SIZE_RATIO_LABEL,
        minimum_order_sets: B2B_CONFIG.minimumOrderSets,
        minimum_style_sets: B2B_CONFIG.minimumStyleSets,
      },
    })),
    metadata: {
      source_product_id: product.id,
      style_code: styleCode,
      category: product.category,
      collection_handle: product.collectionHandle ?? "",
      color_family: colors.join(", "),
      wholesale_set_price: setPrice,
      wholesale_set_price_paise: setPrice * 100,
      set_size: B2B_CONFIG.setSize,
      size_ratio: SIZE_RATIO_LABEL,
      minimum_order_sets: B2B_CONFIG.minimumOrderSets,
      minimum_style_sets: B2B_CONFIG.minimumStyleSets,
      b2b_catalog: true,
    },
  };
}

export function toMedusaProductSeedDrafts(
  products: CommerceProduct[],
): MedusaProductSeedDraft[] {
  return products.map(toMedusaProductSeedDraft);
}
