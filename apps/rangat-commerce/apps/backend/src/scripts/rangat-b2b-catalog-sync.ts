import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import {
  RANGAT_B2B_SEED_PRODUCTS,
  RANGAT_B2B_SIZE_OPTIONS,
  productMetadata,
  validateRangatB2BSeedCatalog,
  variantMetadata,
} from "./rangat-b2b-catalog"

type Query = {
  graph(input: {
    entity: string
    fields: string[]
  }): Promise<{ data: Record<string, unknown>[] }>
}

type MedusaVariantRecord = {
  id?: string
  title?: string
  sku?: string
}

type MedusaProductRecord = {
  id?: string
  handle?: string
  variants?: MedusaVariantRecord[]
}

function requireString(value: unknown, message: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, message)
  }
  return value
}

function findVariant(product: MedusaProductRecord, sku: string) {
  return product.variants?.find((variant) => variant.sku === sku)
}

export default async function syncRangatB2BCatalog({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as Query

  const catalogErrors = validateRangatB2BSeedCatalog()
  if (catalogErrors.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid Rangat B2B seed catalog: ${catalogErrors.join("; ")}`,
    )
  }

  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "variants.id", "variants.sku"],
  })

  const products = data as MedusaProductRecord[]
  const byHandle = new Map(products.map((product) => [product.handle, product]))

  const updates = RANGAT_B2B_SEED_PRODUCTS.map((expectedProduct) => {
    const existing = byHandle.get(expectedProduct.handle)
    if (!existing) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot sync missing Rangat product ${expectedProduct.handle}. Run rangat-b2b-seed first.`,
      )
    }

    const productId = requireString(
      existing.id,
      `Rangat product ${expectedProduct.handle} has no Medusa id.`,
    )

    return {
      id: productId,
      title: expectedProduct.title,
      description: expectedProduct.description,
      metadata: productMetadata(expectedProduct),
      variants: RANGAT_B2B_SIZE_OPTIONS.map((size) => {
        const sku = `${expectedProduct.sku}-${size}`
        const variant = findVariant(existing, sku)
        return {
          id: requireString(
            variant?.id,
            `Cannot sync missing Rangat variant ${sku}. Recreate or repair the product before syncing.`,
          ),
          title: size,
          sku,
          metadata: variantMetadata(expectedProduct),
        }
      }),
    }
  })

  await updateProductsWorkflow(container).run({
    input: { products: updates },
  })

  logger.info(`Synced ${updates.length} Rangat B2B product(s) from catalog source.`)
}