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

type MedusaImageRecord = { url?: string }
type MedusaInventoryItemLink = {
  inventory_item_id?: string
  required_quantity?: number
}
type MedusaVariantRecord = {
  id?: string
  sku?: string
  inventory_items?: MedusaInventoryItemLink[]
}
type MedusaProductRecord = {
  id?: string
  handle?: string
  thumbnail?: string | null
  images?: MedusaImageRecord[]
  variants?: MedusaVariantRecord[]
}
type StockLocationRecord = { id?: string; name?: string }
type InventoryLevelRecord = {
  id?: string
  inventory_item_id?: string
  location_id?: string
  stocked_quantity?: number
}
type AuditIssue = {
  handle: string
  field: string
  expected: unknown
  actual: unknown
}

const STOCK_LOCATION_NAME = "Rangat Jaipur Dispatch"
const MIN_STOCKED_QUANTITY = 1000000

function normalizeUrl(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function findVariant(product: MedusaProductRecord, sku: string) {
  return product.variants?.find((variant) => variant.sku === sku)
}

function issue(
  handle: string,
  field: string,
  expected: unknown,
  actual: unknown,
): AuditIssue {
  return { handle, field, expected, actual }
}

export default async function auditRangatB2BImageInventory({
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

  const [{ data: productData }, { data: stockLocations }, { data: inventoryLevels }] =
    await Promise.all([
      query.graph({
        entity: "product",
        fields: [
          "id",
          "handle",
          "thumbnail",
          "images.url",
          "variants.id",
          "variants.sku",
          "variants.inventory_items.inventory_item_id",
          "variants.inventory_items.required_quantity",
        ],
      }),
      query.graph({ entity: "stock_location", fields: ["id", "name"] }),
      query.graph({
        entity: "inventory_level",
        fields: ["id", "inventory_item_id", "location_id", "stocked_quantity"],
      }),
    ])

  const location = (stockLocations as StockLocationRecord[]).find(
    (stockLocation) => stockLocation.name === STOCK_LOCATION_NAME,
  )
  if (!location?.id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Missing stock location ${STOCK_LOCATION_NAME}.`,
    )
  }

  const byHandle = new Map(
    (productData as MedusaProductRecord[]).map((product) => [product.handle, product]),
  )
  const levelsByInventoryItem = new Map<string, InventoryLevelRecord[]>()
  for (const level of inventoryLevels as InventoryLevelRecord[]) {
    if (!level.inventory_item_id) continue
    const existing = levelsByInventoryItem.get(level.inventory_item_id) ?? []
    existing.push(level)
    levelsByInventoryItem.set(level.inventory_item_id, existing)
  }

  const issues: AuditIssue[] = []

  for (const expectedProduct of RANGAT_B2B_SEED_PRODUCTS) {
    const product = byHandle.get(expectedProduct.handle)
    if (!product) {
      issues.push(issue(expectedProduct.handle, "product", "present", "missing"))
      continue
    }

    const expectedImage = normalizeUrl(expectedProduct.image)
    const thumbnail = normalizeUrl(product.thumbnail)
    const imageUrls = (product.images ?? []).map((image) => normalizeUrl(image.url))
    if (thumbnail !== expectedImage) {
      issues.push(issue(expectedProduct.handle, "thumbnail", expectedImage, thumbnail))
    }
    if (!imageUrls.includes(expectedImage)) {
      issues.push(issue(expectedProduct.handle, "images", expectedImage, imageUrls))
    }

    for (const size of RANGAT_B2B_SIZE_OPTIONS) {
      const sku = `${expectedProduct.sku}-${size}`
      const variant = findVariant(product, sku)
      if (!variant) {
        issues.push(issue(expectedProduct.handle, `variant.${sku}`, "present", "missing"))
        continue
      }

      const inventoryLinks = variant.inventory_items ?? []
      if (inventoryLinks.length !== 1) {
        issues.push(
          issue(expectedProduct.handle, `variant.${sku}.inventory_item_count`, 1, inventoryLinks.length),
        )
        continue
      }

      const inventoryLink = inventoryLinks[0]
      if (Number(inventoryLink.required_quantity) !== 1) {
        issues.push(
          issue(
            expectedProduct.handle,
            `variant.${sku}.required_quantity`,
            1,
            inventoryLink.required_quantity ?? null,
          ),
        )
      }

      const inventoryItemId = inventoryLink.inventory_item_id
      const levels = inventoryItemId ? levelsByInventoryItem.get(inventoryItemId) ?? [] : []
      const stockLevel = levels.find((level) => level.location_id === location.id)
      if (!stockLevel) {
        issues.push(
          issue(expectedProduct.handle, `variant.${sku}.stock_level`, STOCK_LOCATION_NAME, "missing"),
        )
        continue
      }

      const stockedQuantity = Number(stockLevel.stocked_quantity)
      if (!Number.isFinite(stockedQuantity) || stockedQuantity < MIN_STOCKED_QUANTITY) {
        issues.push(
          issue(
            expectedProduct.handle,
            `variant.${sku}.stocked_quantity`,
            `>=${MIN_STOCKED_QUANTITY}`,
            stockLevel.stocked_quantity ?? null,
          ),
        )
      }
    }
  }

  if (issues.length) {
    logger.error(`Rangat B2B image/inventory audit failed: ${issues.length} issue(s).`)
    for (const item of issues) {
      logger.error(
        `${item.handle} :: ${item.field} expected=${JSON.stringify(
          item.expected,
        )} actual=${JSON.stringify(item.actual)}`,
      )
    }
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Rangat B2B image/inventory audit failed: ${issues.length} issue(s).`,
    )
  }

  logger.info(
    `Rangat B2B image/inventory audit passed for ${RANGAT_B2B_SEED_PRODUCTS.length} product(s) and ${
      RANGAT_B2B_SEED_PRODUCTS.length * RANGAT_B2B_SIZE_OPTIONS.length
    } variant inventory link(s).`,
  )
}