import { ProductStatus } from "@medusajs/framework/utils"

export type RangatB2BSeedProduct = {
  title: string
  handle: string
  description: string
  image: string
  price: number
  color: string
  category: string
  sku: string
  collectionHandle: string
}

export type RangatB2BSeedCollection = {
  title: string
  handle: string
  image: string
  description: string
}

export type RangatB2BMetadata = Record<
  string,
  string | number | boolean
>

export const RANGAT_B2B_COLLECTIONS: RangatB2BSeedCollection[] = [
  {
    title: "Co-ords",
    handle: "co-ords",
    image: "/images/product-2.png",
    description:
      "Matching top-and-bottom co-ord sets, styled for effortless, put-together looks.",
  },
  {
    title: "2 Pcs Set",
    handle: "2-pcs-set",
    image: "/images/collection-minimal.png",
    description:
      "Kurta paired with a coordinated bottom — the boutique reseller's everyday bestseller.",
  },
  {
    title: "Dupatta Set",
    handle: "dupatta-set",
    image: "/images/premium_dupatta.png",
    description:
      "Complete three-piece ensembles finished with a flowing dupatta for festive racks.",
  },
]

export const RANGAT_B2B_SIZE_OPTIONS = ["S", "M", "L", "XL"] as const
export const RANGAT_B2B_SET_SIZE = 4
export const RANGAT_B2B_SIZE_RATIO = "S/M/L/XL"
export const RANGAT_B2B_MINIMUM_ORDER_SETS = 4
export const RANGAT_B2B_MINIMUM_STYLE_SETS = 1

function wholesaleSetPrice(value: string): number {
  return Number(value)
}

export const RANGAT_B2B_SEED_PRODUCTS: RangatB2BSeedProduct[] = [
  {
    title: "Sage Chanderi Kurta Set",
    handle: "rangat-sage-chanderi-kurta-set",
    description:
      "Wholesale kurti set in S/M/L/XL ratio for boutique and reseller buyers.",
    image: "/images/product-1.png",
    price: wholesaleSetPrice("2400"),
    color: "Sage",
    category: "Kurtis",
    sku: "RP-KURTI-001",
    collectionHandle: "2-pcs-set",
  },
  {
    title: "Ivory Cotton Straight Kurta Set",
    handle: "rangat-ivory-cotton-straight-kurta-set",
    description:
      "Soft cotton wholesale kurta set with repeat-order friendly styling.",
    image: "/kurti-ivory.png",
    price: wholesaleSetPrice("2200"),
    color: "Ivory",
    category: "Kurtis",
    sku: "RP-COTTON-002",
    collectionHandle: "2-pcs-set",
  },
  {
    title: "Navy Mirror Work Kurta Set",
    handle: "rangat-navy-mirror-work-kurta-set",
    description:
      "Statement navy wholesale kurta set with mirror-work detailing for festive reseller drops.",
    image: "/images/product-3.png",
    price: wholesaleSetPrice("2600"),
    color: "Navy",
    category: "Kurtis",
    sku: "RP-KURTI-003",
    collectionHandle: "dupatta-set",
  },
  {
    title: "Terracotta Block Print Saree",
    handle: "rangat-terracotta-block-print-saree",
    description:
      "Warm terracotta block-print saree line for boutique ethnic-wear assortments.",
    image: "/images/product-4.png",
    price: wholesaleSetPrice("2100"),
    color: "Terracotta",
    category: "Sarees",
    sku: "RP-SAREE-004",
    collectionHandle: "dupatta-set",
  },
  {
    title: "Blush Silk Lehenga Ensemble",
    handle: "rangat-blush-silk-lehenga-ensemble",
    description:
      "Blush festive lehenga ensemble for premium reseller catalog expansion.",
    image: "/images/product-1.png",
    price: wholesaleSetPrice("5200"),
    color: "Blush",
    category: "Lehengas",
    sku: "RP-LEHENGA-005",
    collectionHandle: "dupatta-set",
  },
  {
    title: "Forest Embroidered Co-ord Set",
    handle: "rangat-forest-embroidered-coord-set",
    description:
      "Forest green embroidered co-ord set with repeat-order friendly styling.",
    image: "/images/product-2.png",
    price: wholesaleSetPrice("2700"),
    color: "Forest",
    category: "Co-ords",
    sku: "RP-COORD-006",
    collectionHandle: "co-ords",
  },
  {
    title: "Pearl Georgette Kurta Set",
    handle: "rangat-pearl-georgette-kurta-set",
    description:
      "Pearl georgette kurta set for elegant day-to-evening boutique racks.",
    image: "/images/product-3.png",
    price: wholesaleSetPrice("2450"),
    color: "Pearl",
    category: "Kurtis",
    sku: "RP-KURTI-007",
    collectionHandle: "co-ords",
  },
  {
    title: "Mustard Cotton Anarkali Suit",
    handle: "rangat-mustard-cotton-anarkali-suit",
    description:
      "Mustard cotton Anarkali suit with handloom-inspired wholesale appeal.",
    image: "/images/product-4.png",
    price: wholesaleSetPrice("2050"),
    color: "Mustard",
    category: "Kurtis",
    sku: "RP-KURTI-008",
    collectionHandle: "2-pcs-set",
  },
]

export function productMetadata(product: RangatB2BSeedProduct): RangatB2BMetadata {
  return {
    style_code: product.sku,
    b2b_catalog: true,
    wholesale_set_price: product.price,
    wholesale_set_price_paise: product.price * 100,
    set_size: RANGAT_B2B_SET_SIZE,
    size_ratio: RANGAT_B2B_SIZE_RATIO,
    minimum_order_sets: RANGAT_B2B_MINIMUM_ORDER_SETS,
    category: product.category,
    color_family: product.color,
    collection_handle: product.collectionHandle,
  }
}

export function variantMetadata(product: RangatB2BSeedProduct): RangatB2BMetadata {
  return {
    style_code: product.sku,
    wholesale_set_price: product.price,
    wholesale_set_price_paise: product.price * 100,
    set_size: RANGAT_B2B_SET_SIZE,
    size_ratio: RANGAT_B2B_SIZE_RATIO,
    minimum_order_sets: RANGAT_B2B_MINIMUM_ORDER_SETS,
    minimum_style_sets: RANGAT_B2B_MINIMUM_STYLE_SETS,
    color: product.color,
    category: product.category,
  }
}

export function toMedusaCreateProductInput(
  product: RangatB2BSeedProduct,
  shippingProfileId: string,
  salesChannelId: string,
  collectionId?: string,
) {
  return {
    title: product.title,
    handle: product.handle,
    description: product.description,
    status: ProductStatus.PUBLISHED,
    shipping_profile_id: shippingProfileId,
    ...(collectionId ? { collection_id: collectionId } : {}),
    images: [{ url: product.image }],
    options: [{ title: "Size", values: [...RANGAT_B2B_SIZE_OPTIONS] }],
    variants: RANGAT_B2B_SIZE_OPTIONS.map((size) => ({
      title: size,
      sku: `${product.sku}-${size}`,
      options: { Size: size },
      prices: [{ currency_code: "inr", amount: product.price }],
      metadata: variantMetadata(product),
    })),
    metadata: productMetadata(product),
    sales_channels: [{ id: salesChannelId }],
  }
}

export function validateRangatB2BSeedCatalog(
  products = RANGAT_B2B_SEED_PRODUCTS,
  collections = RANGAT_B2B_COLLECTIONS,
): string[] {
  const errors: string[] = []
  const handles = new Set<string>()
  const skus = new Set<string>()
  const collectionHandles = new Set(collections.map((c) => c.handle))

  for (const product of products) {
    if (!product.title.trim()) errors.push("Product title is required.")
    if (!product.handle.trim()) errors.push(`${product.title}: handle is required.`)
    if (!product.sku.trim()) errors.push(`${product.title}: SKU is required.`)
    if (!Number.isFinite(product.price) || product.price <= 0) {
      errors.push(`${product.title}: wholesale set price must be positive.`)
    }

    if (handles.has(product.handle)) {
      errors.push(`${product.title}: duplicate handle ${product.handle}.`)
    }
    handles.add(product.handle)

    if (skus.has(product.sku)) {
      errors.push(`${product.title}: duplicate style code ${product.sku}.`)
    }
    skus.add(product.sku)

    if (!collectionHandles.has(product.collectionHandle)) {
      errors.push(
        `${product.title}: unknown collection handle ${product.collectionHandle}.`
      )
    }
  }

  return errors
}