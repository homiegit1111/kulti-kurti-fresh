import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import {
  RANGAT_B2B_CATEGORIES,
  categoryHandleForProductCategory,
  validateRangatB2BCategories,
} from "./rangat-b2b-categories"
import { RANGAT_B2B_SEED_PRODUCTS } from "./rangat-b2b-catalog"

type Query = {
  graph(input: {
    entity: string
    fields: string[]
  }): Promise<{ data: Record<string, unknown>[] }>
}

type CategoryRecord = {
  id?: string
  name?: string
  handle?: string
  is_active?: boolean
  parent_category_id?: string | null
}

type ProductCategoryLinkRecord = {
  id?: string
}

type ProductRecord = {
  id?: string
  handle?: string
  metadata?: Record<string, unknown> | null
  categories?: ProductCategoryLinkRecord[]
}

export default async function auditRangatB2BCategories({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as Query

  const configErrors = validateRangatB2BCategories()
  if (configErrors.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid Rangat B2B categories: ${configErrors.join("; ")}`,
    )
  }

  const { data: categoryData } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "handle", "is_active", "parent_category_id"],
  })
  const categories = categoryData as CategoryRecord[]

  const drift: string[] = []

  // Count occurrences per expected handle so we can assert exactly-once.
  const byHandle = new Map<string, CategoryRecord[]>()
  for (const category of categories) {
    const handle = category.handle as string
    if (!byHandle.has(handle)) byHandle.set(handle, [])
    byHandle.get(handle)!.push(category)
  }

  const idByHandle = new Map<string, string>()

  for (const expected of RANGAT_B2B_CATEGORIES) {
    const matches = byHandle.get(expected.handle) ?? []
    if (matches.length !== 1) {
      drift.push(
        `Category ${expected.handle}: expected exactly 1, found ${matches.length}.`,
      )
      continue
    }
    const actual = matches[0]
    idByHandle.set(expected.handle, actual.id as string)

    if (actual.is_active !== true) {
      drift.push(`Category ${expected.handle}: is_active is not true.`)
    }
  }

  // Parent linkage: children must point at the resolved parent id; parents must
  // have no parent. Checked in a second pass so all ids are resolved first.
  for (const expected of RANGAT_B2B_CATEGORIES) {
    const matches = byHandle.get(expected.handle) ?? []
    if (matches.length !== 1) continue
    const actual = matches[0]

    if (expected.parentHandle === null) {
      if (actual.parent_category_id) {
        drift.push(
          `Category ${expected.handle}: expected top-level, has parent ${actual.parent_category_id}.`,
        )
      }
      continue
    }

    const expectedParentId = idByHandle.get(expected.parentHandle)
    if (!expectedParentId) {
      drift.push(
        `Category ${expected.handle}: expected parent ${expected.parentHandle} is missing.`,
      )
    } else if (actual.parent_category_id !== expectedParentId) {
      drift.push(
        `Category ${expected.handle}: expected parent ${expected.parentHandle} (${expectedParentId}), found ${actual.parent_category_id ?? "none"}.`,
      )
    }
  }

  // Product links: every seed product must be linked to exactly its expected
  // leaf category.
  const { data: productData } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "metadata", "categories.id"],
  })
  const products = productData as ProductRecord[]
  const productByHandle = new Map(
    products.map((product) => [product.handle, product]),
  )

  for (const expected of RANGAT_B2B_SEED_PRODUCTS) {
    const actual = productByHandle.get(expected.handle)
    if (!actual) {
      drift.push(`Product ${expected.handle}: not found. Run rangat-b2b-seed.`)
      continue
    }

    const categoryHandle = categoryHandleForProductCategory(expected.category)
    if (!categoryHandle) {
      drift.push(
        `Product ${expected.handle}: no category owns product category ${expected.category}.`,
      )
      continue
    }

    const expectedCategoryId = idByHandle.get(categoryHandle)
    if (!expectedCategoryId) {
      drift.push(
        `Product ${expected.handle}: expected category ${categoryHandle} is missing.`,
      )
      continue
    }

    const linkedIds = (actual.categories ?? []).map((link) => link.id)
    if (!linkedIds.includes(expectedCategoryId)) {
      drift.push(
        `Product ${expected.handle}: not linked to expected category ${categoryHandle} (${expectedCategoryId}).`,
      )
    }
  }

  if (drift.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Rangat B2B category audit failed with ${drift.length} drift item(s): ${drift.join("; ")}. Run rangat-b2b-category-sync.`,
    )
  }

  logger.info(
    `Rangat B2B category audit passed: ${RANGAT_B2B_CATEGORIES.length} categories, ${RANGAT_B2B_SEED_PRODUCTS.length} products linked.`,
  )
}
