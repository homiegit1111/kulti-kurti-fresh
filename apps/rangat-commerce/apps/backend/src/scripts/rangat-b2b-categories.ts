import { RANGAT_B2B_SEED_PRODUCTS } from "./rangat-b2b-catalog"

export type RangatB2BCategory = {
  name: string
  handle: string
  description: string
  rank: number
  // null for top-level parent categories; the parent handle for children.
  parentHandle: string | null
  // The catalog product `category` value this category owns. null for
  // parent-only categories that hold no products directly.
  productCategory: string | null
}

// One-level hierarchy derived from the distinct product `category` values in
// rangat-b2b-catalog.ts (Kurtis, Sarees, Lehengas, Co-ords). A single
// "Ethnic Wear" parent groups the product-type children so the storefront can
// render a browsable tree while products still map 1:1 to a leaf category.
export const RANGAT_B2B_ETHNIC_WEAR_HANDLE = "ethnic-wear"

export const RANGAT_B2B_CATEGORIES: RangatB2BCategory[] = [
  {
    name: "Ethnic Wear",
    handle: RANGAT_B2B_ETHNIC_WEAR_HANDLE,
    description:
      "Wholesale Indian ethnic wear for boutique and reseller buyers.",
    rank: 0,
    parentHandle: null,
    productCategory: null,
  },
  {
    name: "Kurtis",
    handle: "kurtis",
    description:
      "Wholesale kurta and kurti sets in S/M/L/XL ratio packs.",
    rank: 0,
    parentHandle: RANGAT_B2B_ETHNIC_WEAR_HANDLE,
    productCategory: "Kurtis",
  },
  {
    name: "Sarees",
    handle: "sarees",
    description:
      "Boutique-ready saree lines for ethnic-wear assortments.",
    rank: 1,
    parentHandle: RANGAT_B2B_ETHNIC_WEAR_HANDLE,
    productCategory: "Sarees",
  },
  {
    name: "Lehengas",
    handle: "lehengas",
    description:
      "Festive lehenga ensembles for premium reseller catalogs.",
    rank: 2,
    parentHandle: RANGAT_B2B_ETHNIC_WEAR_HANDLE,
    productCategory: "Lehengas",
  },
  {
    name: "Co-ords",
    handle: "co-ords",
    description:
      "Matching top-and-bottom co-ord sets for effortless styling.",
    rank: 3,
    parentHandle: RANGAT_B2B_ETHNIC_WEAR_HANDLE,
    productCategory: "Co-ords",
  },
]

export function toMedusaCreateCategoryInput(
  category: RangatB2BCategory,
  parentCategoryId?: string,
) {
  return {
    name: category.name,
    handle: category.handle,
    description: category.description,
    is_active: true,
    is_internal: false,
    rank: category.rank,
    ...(parentCategoryId ? { parent_category_id: parentCategoryId } : {}),
    metadata: {
      b2b_catalog: true,
      ...(category.productCategory
        ? { product_category: category.productCategory }
        : {}),
    },
  }
}

// Resolves the expected leaf-category handle for a given product `category`
// value. Returns undefined when no category owns that value.
export function categoryHandleForProductCategory(
  productCategory: string,
  categories = RANGAT_B2B_CATEGORIES,
): string | undefined {
  return categories.find((c) => c.productCategory === productCategory)?.handle
}

export function validateRangatB2BCategories(
  categories = RANGAT_B2B_CATEGORIES,
  products = RANGAT_B2B_SEED_PRODUCTS,
): string[] {
  const errors: string[] = []
  const handles = new Set<string>()
  const productCategories = new Set<string>()

  for (const category of categories) {
    if (!category.name.trim()) errors.push("Category name is required.")
    if (!category.handle.trim()) {
      errors.push(`${category.name}: handle is required.`)
    }
    if (!Number.isFinite(category.rank)) {
      errors.push(`${category.name}: rank must be a finite number.`)
    }

    if (handles.has(category.handle)) {
      errors.push(`${category.name}: duplicate handle ${category.handle}.`)
    }
    handles.add(category.handle)

    if (category.productCategory) {
      if (productCategories.has(category.productCategory)) {
        errors.push(
          `${category.name}: duplicate product category ${category.productCategory}.`,
        )
      }
      productCategories.add(category.productCategory)
    }
  }

  for (const category of categories) {
    if (category.parentHandle === null) continue
    if (!handles.has(category.parentHandle)) {
      errors.push(
        `${category.name}: unknown parent handle ${category.parentHandle}.`,
      )
      continue
    }
    const parent = categories.find((c) => c.handle === category.parentHandle)
    // Enforce the intended single-level hierarchy: parents are top-level.
    if (parent && parent.parentHandle !== null) {
      errors.push(
        `${category.name}: parent ${category.parentHandle} is not a top-level category.`,
      )
    }
  }

  // Every distinct product `category` value must be owned by exactly one
  // category, otherwise those products cannot be linked.
  for (const product of products) {
    if (!productCategories.has(product.category)) {
      errors.push(
        `${product.title}: no category owns product category ${product.category}.`,
      )
    }
  }

  return errors
}
