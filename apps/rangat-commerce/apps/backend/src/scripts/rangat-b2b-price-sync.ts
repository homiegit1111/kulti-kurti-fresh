import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { upsertVariantPricesWorkflow } from "@medusajs/medusa/core-flows"
import {
  RANGAT_B2B_SEED_PRODUCTS,
  RANGAT_B2B_SIZE_OPTIONS,
  validateRangatB2BSeedCatalog,
} from "./rangat-b2b-catalog"

type Query = {
  graph(input: {
    entity: string
    fields: string[]
  }): Promise<{ data: Record<string, unknown>[] }>
}

type MedusaPriceRecord = {
  id?: string
  amount?: number
  currency_code?: string
}

type MedusaVariantRecord = {
  id?: string
  sku?: string
  prices?: MedusaPriceRecord[]
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

function inrPrices(variant: MedusaVariantRecord) {
  return (variant.prices ?? []).filter(
    (price) => price.currency_code?.toLowerCase() === "inr",
  )
}

export default async function syncRangatB2BPrices({
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
    fields: [
      "id",
      "handle",
      "variants.id",
      "variants.sku",
      "variants.prices.id",
      "variants.prices.amount",
      "variants.prices.currency_code",
    ],
  })

  const byHandle = new Map(
    (data as MedusaProductRecord[]).map((product) => [product.handle, product]),
  )
  const variantPrices = RANGAT_B2B_SEED_PRODUCTS.flatMap((expectedProduct) => {
    const existing = byHandle.get(expectedProduct.handle)
    if (!existing) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot sync prices for missing Rangat product ${expectedProduct.handle}. Run rangat-b2b-seed first.`,
      )
    }

    const productId = requireString(
      existing.id,
      `Rangat product ${expectedProduct.handle} has no Medusa id.`,
    )

    return RANGAT_B2B_SIZE_OPTIONS.map((size) => {
      const sku = `${expectedProduct.sku}-${size}`
      const variant = findVariant(existing, sku)
      if (!variant) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Cannot sync price for missing Rangat variant ${sku}. Recreate or repair the product before syncing.`,
        )
      }

      const variantId = requireString(variant.id, `Rangat variant ${sku} has no Medusa id.`)
      const prices = inrPrices(variant)
      if (prices.length > 1) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Cannot safely sync ${sku}: expected at most one INR price but found ${prices.length}.`,
        )
      }

      const currentPrice = prices[0]
      const price = currentPrice?.id
        ? { id: currentPrice.id, currency_code: "inr", amount: expectedProduct.price }
        : { currency_code: "inr", amount: expectedProduct.price }

      return {
        variant_id: variantId,
        product_id: productId,
        prices: [price],
      }
    })
  })

  await upsertVariantPricesWorkflow(container).run({
    input: {
      variantPrices,
      previousVariantIds: variantPrices.map((variantPrice) => variantPrice.variant_id),
    },
  })

  logger.info(`Synced ${variantPrices.length} Rangat B2B INR variant price(s).`)
}