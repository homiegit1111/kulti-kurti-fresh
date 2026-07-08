import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
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

type PriceDrift = {
  handle: string
  sku: string
  field: string
  expected: unknown
  actual: unknown
}

function findVariant(product: MedusaProductRecord | undefined, sku: string) {
  return product?.variants?.find((variant) => variant.sku === sku)
}

function inrPrices(variant: MedusaVariantRecord | undefined) {
  return (variant?.prices ?? []).filter(
    (price) => price.currency_code?.toLowerCase() === "inr",
  )
}

function auditVariantPrice(
  product: MedusaProductRecord | undefined,
  handle: string,
  sku: string,
  expectedAmount: number,
): PriceDrift[] {
  const variant = findVariant(product, sku)
  if (!variant) {
    return [{ handle, sku, field: "variant", expected: "present", actual: "missing" }]
  }

  const prices = inrPrices(variant)
  if (prices.length !== 1) {
    return [
      {
        handle,
        sku,
        field: "inr_price_count",
        expected: 1,
        actual: prices.length,
      },
    ]
  }

  const amount = Number(prices[0].amount)
  if (amount !== expectedAmount) {
    return [
      {
        handle,
        sku,
        field: "inr_price_amount",
        expected: expectedAmount,
        actual: Number.isFinite(amount) ? amount : null,
      },
    ]
  }

  return []
}

export default async function auditRangatB2BPrices({
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
  const drift = RANGAT_B2B_SEED_PRODUCTS.flatMap((expectedProduct) => {
    const existing = byHandle.get(expectedProduct.handle)
    if (!existing) {
      return [
        {
          handle: expectedProduct.handle,
          sku: expectedProduct.sku,
          field: "product",
          expected: "present",
          actual: "missing",
        },
      ]
    }

    return RANGAT_B2B_SIZE_OPTIONS.flatMap((size) =>
      auditVariantPrice(
        existing,
        expectedProduct.handle,
        `${expectedProduct.sku}-${size}`,
        expectedProduct.price,
      ),
    )
  })

  if (drift.length) {
    logger.error(`Rangat B2B price drift detected: ${drift.length} issue(s).`)
    for (const issue of drift) {
      logger.error(
        `${issue.handle} :: ${issue.sku} :: ${issue.field} expected=${JSON.stringify(
          issue.expected,
        )} actual=${JSON.stringify(issue.actual)}`,
      )
    }
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Rangat B2B price drift detected: ${drift.length} issue(s).`,
    )
  }

  logger.info(
    `Rangat B2B price audit passed for ${RANGAT_B2B_SEED_PRODUCTS.length} product(s) and ${
      RANGAT_B2B_SEED_PRODUCTS.length * RANGAT_B2B_SIZE_OPTIONS.length
    } variant price(s).`,
  )
}