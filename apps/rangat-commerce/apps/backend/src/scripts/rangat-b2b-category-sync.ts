import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import {
  batchLinkProductsToCategoryWorkflow,
  createProductCategoriesWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  RANGAT_B2B_CATEGORIES,
  categoryHandleForProductCategory,
  toMedusaCreateCategoryInput,
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
  handle?: string
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

function requireString(value: unknown, message: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, message)
  }
  return value
}

export default async function syncRangatB2BCategories({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as Query

  const categoryErrors = validateRangatB2BCategories()
  if (categoryErrors.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid Rangat B2B categories: ${categoryErrors.join("; ")}`,
    )
  }

  // Create categories that don't yet exist, parents before children so that
  // parent_category_id can be resolved for the child inserts.
  const readCategories = async () => {
    const { data } = await query.graph({
      entity: "product_category",
      fields: ["id", "handle", "parent_category_id"],
    })
    return data as CategoryRecord[]
  }

  const parents = RANGAT_B2B_CATEGORIES.filter((c) => c.parentHandle === null)
  const children = RANGAT_B2B_CATEGORIES.filter((c) => c.parentHandle !== null)

  let existing = await readCategories()
  let existingByHandle = new Map(
    existing.map((category) => [category.handle as string, category]),
  )

  const missingParents = parents.filter(
    (category) => !existingByHandle.has(category.handle),
  )
  if (missingParents.length) {
    await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: missingParents.map((category) =>
          toMedusaCreateCategoryInput(category),
        ),
      },
    })
    logger.info(
      `Created ${missingParents.length} Rangat parent categor(y/ies).`,
    )
    existing = await readCategories()
    existingByHandle = new Map(
      existing.map((category) => [category.handle as string, category]),
    )
  }

  const missingChildren = children.filter(
    (category) => !existingByHandle.has(category.handle),
  )
  if (missingChildren.length) {
    await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: missingChildren.map((category) => {
          const parentId = requireString(
            existingByHandle.get(category.parentHandle as string)?.id,
            `Cannot resolve parent category ${category.parentHandle} for ${category.name}.`,
          )
          return toMedusaCreateCategoryInput(category, parentId)
        }),
      },
    })
    logger.info(
      `Created ${missingChildren.length} Rangat child categor(y/ies).`,
    )
    existing = await readCategories()
    existingByHandle = new Map(
      existing.map((category) => [category.handle as string, category]),
    )
  }

  if (!missingParents.length && !missingChildren.length) {
    logger.info("All Rangat B2B categories already exist.")
  }

  // Resolve products and link each to its leaf category. Match by the product's
  // metadata `category` value, falling back to the catalog definition keyed by
  // handle so seeded-but-unsynced products still resolve.
  const { data: productData } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "metadata", "categories.id"],
  })
  const products = productData as ProductRecord[]
  const productByHandle = new Map(
    products.map((product) => [product.handle, product]),
  )

  // productId -> categoryId that it should be linked to.
  const desiredByCategoryId = new Map<string, Set<string>>()

  for (const expected of RANGAT_B2B_SEED_PRODUCTS) {
    const existingProduct = productByHandle.get(expected.handle)
    if (!existingProduct) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot link missing Rangat product ${expected.handle}. Run rangat-b2b-seed first.`,
      )
    }

    const productId = requireString(
      existingProduct.id,
      `Rangat product ${expected.handle} has no Medusa id.`,
    )

    const metadataCategory =
      typeof existingProduct.metadata?.category === "string"
        ? (existingProduct.metadata.category as string)
        : expected.category

    const categoryHandle = categoryHandleForProductCategory(metadataCategory)
    if (!categoryHandle) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `No Rangat category owns product category ${metadataCategory} for ${expected.handle}.`,
      )
    }

    const categoryId = requireString(
      existingByHandle.get(categoryHandle)?.id,
      `Rangat category ${categoryHandle} was not created.`,
    )

    if (!desiredByCategoryId.has(categoryId)) {
      desiredByCategoryId.set(categoryId, new Set<string>())
    }
    desiredByCategoryId.get(categoryId)!.add(productId)
  }

  // batchLinkProductsToCategoryWorkflow is add/remove and idempotent: linking a
  // product already in the category is a no-op, so we can add the full set.
  let linkedCount = 0
  for (const [categoryId, productIds] of desiredByCategoryId) {
    await batchLinkProductsToCategoryWorkflow(container).run({
      input: {
        id: categoryId,
        add: [...productIds],
        remove: [],
      },
    })
    linkedCount += productIds.size
  }

  logger.info(
    `Linked ${linkedCount} Rangat product(s) across ${desiredByCategoryId.size} categor(y/ies).`,
  )
}
