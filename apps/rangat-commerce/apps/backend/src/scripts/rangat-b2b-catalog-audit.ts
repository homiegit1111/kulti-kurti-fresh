import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
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
  metadata?: Record<string, unknown>
}

type MedusaProductRecord = {
  id?: string
  title?: string
  handle?: string
  description?: string
  metadata?: Record<string, unknown>
  variants?: MedusaVariantRecord[]
}

type Drift = {
  handle: string
  field: string
  expected: unknown
  actual: unknown
}

function stableValue(value: unknown): unknown {
  if (value === undefined) return null
  return value
}

function sameValue(expected: unknown, actual: unknown): boolean {
  return stableValue(expected) === stableValue(actual)
}

function pushIfDifferent(
  drift: Drift[],
  handle: string,
  field: string,
  expected: unknown,
  actual: unknown,
) {
  if (!sameValue(expected, actual)) {
    drift.push({ handle, field, expected, actual: stableValue(actual) })
  }
}

function findVariant(product: MedusaProductRecord, sku: string) {
  return product.variants?.find((variant) => variant.sku === sku)
}

function auditProduct(
  existing: MedusaProductRecord | undefined,
  expectedProduct: (typeof RANGAT_B2B_SEED_PRODUCTS)[number],
): Drift[] {
  const drift: Drift[] = []
  const handle = expectedProduct.handle

  if (!existing) {
    return [
      {
        handle,
        field: "product",
        expected: "present",
        actual: "missing",
      },
    ]
  }

  pushIfDifferent(drift, handle, "title", expectedProduct.title, existing.title)
  pushIfDifferent(
    drift,
    handle,
    "description",
    expectedProduct.description,
    existing.description,
  )

  const expectedMetadata = productMetadata(expectedProduct)
  for (const [key, expectedValue] of Object.entries(expectedMetadata)) {
    pushIfDifferent(
      drift,
      handle,
      `metadata.${key}`,
      expectedValue,
      existing.metadata?.[key],
    )
  }

  const expectedVariantMetadata = variantMetadata(expectedProduct)
  for (const size of RANGAT_B2B_SIZE_OPTIONS) {
    const sku = `${expectedProduct.sku}-${size}`
    const variant = findVariant(existing, sku)
    if (!variant) {
      drift.push({
        handle,
        field: `variant.${sku}`,
        expected: "present",
        actual: "missing",
      })
      continue
    }

    pushIfDifferent(drift, handle, `variant.${sku}.title`, size, variant.title)
    for (const [key, expectedValue] of Object.entries(expectedVariantMetadata)) {
      pushIfDifferent(
        drift,
        handle,
        `variant.${sku}.metadata.${key}`,
        expectedValue,
        variant.metadata?.[key],
      )
    }
  }

  return drift
}

export default async function auditRangatB2BCatalog({
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
      "title",
      "handle",
      "description",
      "metadata",
      "variants.id",
      "variants.title",
      "variants.sku",
      "variants.metadata",
    ],
  })

  const products = data as MedusaProductRecord[]
  const byHandle = new Map(products.map((product) => [product.handle, product]))
  const drift = RANGAT_B2B_SEED_PRODUCTS.flatMap((product) =>
    auditProduct(byHandle.get(product.handle), product),
  )

  if (drift.length) {
    logger.error(`Rangat B2B catalog drift detected: ${drift.length} issue(s).`)
    for (const issue of drift) {
      logger.error(
        `${issue.handle} :: ${issue.field} expected=${JSON.stringify(
          issue.expected,
        )} actual=${JSON.stringify(issue.actual)}`,
      )
    }
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Rangat B2B catalog drift detected: ${drift.length} issue(s).`,
    )
  }

  logger.info(
    `Rangat B2B catalog audit passed for ${RANGAT_B2B_SEED_PRODUCTS.length} product(s).`,
  )
}