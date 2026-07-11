import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import {
  updateInventoryLevelsWorkflow,
  updateProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows"
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

type MedusaInventoryItemLink = {
  inventory_item_id?: string
}
type MedusaVariantRecord = {
  id?: string
  sku?: string
  manage_inventory?: boolean
  inventory_items?: MedusaInventoryItemLink[]
}
type MedusaProductRecord = {
  id?: string
  handle?: string
  variants?: MedusaVariantRecord[]
}
type StockLocationRecord = { id?: string; name?: string }
type InventoryLevelRecord = {
  id?: string
  inventory_item_id?: string
  location_id?: string
  stocked_quantity?: number
}

const STOCK_LOCATION_NAME = "Rangat Jaipur Dispatch"
// Realistic wholesale-dispatch default. Replaces the seed's placeholder
// stocked_quantity of 1,000,000 (which made availability meaningless).
const DEFAULT_STOCKED_QUANTITY = 500

function findVariant(product: MedusaProductRecord, sku: string) {
  return product.variants?.find((variant) => variant.sku === sku)
}

export default async function syncRangatB2BStock({
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
          "variants.id",
          "variants.sku",
          "variants.manage_inventory",
          "variants.inventory_items.inventory_item_id",
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
      `Missing stock location ${STOCK_LOCATION_NAME}. Run the Rangat B2B seed first.`,
    )
  }

  const byHandle = new Map(
    (productData as MedusaProductRecord[]).map((product) => [product.handle, product]),
  )

  // Level lookup keyed by inventory item at the dispatch location.
  const levelByInventoryItem = new Map<string, InventoryLevelRecord>()
  for (const level of inventoryLevels as InventoryLevelRecord[]) {
    if (!level.inventory_item_id) continue
    if (level.location_id !== location.id) continue
    levelByInventoryItem.set(level.inventory_item_id, level)
  }

  const variantsToTrack: string[] = []
  const levelUpdates: {
    inventory_item_id: string
    location_id: string
    stocked_quantity: number
  }[] = []

  for (const expectedProduct of RANGAT_B2B_SEED_PRODUCTS) {
    const product = byHandle.get(expectedProduct.handle)
    if (!product) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Missing product ${expectedProduct.handle}. Run the Rangat B2B seed first.`,
      )
    }

    for (const size of RANGAT_B2B_SIZE_OPTIONS) {
      const sku = `${expectedProduct.sku}-${size}`
      const variant = findVariant(product, sku)
      if (!variant?.id) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Missing variant ${sku} on ${expectedProduct.handle}. Run the Rangat B2B seed first.`,
        )
      }

      // Availability is only meaningful when inventory is tracked. Flip any
      // untracked variant on so inventory_quantity gates the storefront.
      if (variant.manage_inventory !== true) {
        variantsToTrack.push(variant.id)
      }

      const inventoryLinks = variant.inventory_items ?? []
      if (inventoryLinks.length !== 1) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Variant ${sku} has ${inventoryLinks.length} inventory item link(s); expected exactly 1. Run the Rangat B2B seed first.`,
        )
      }

      const inventoryItemId = inventoryLinks[0].inventory_item_id
      if (!inventoryItemId) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Variant ${sku} is missing an inventory item id. Run the Rangat B2B seed first.`,
        )
      }

      const level = levelByInventoryItem.get(inventoryItemId)
      if (!level) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Variant ${sku} has no inventory level at ${STOCK_LOCATION_NAME}. Run the Rangat B2B seed first.`,
        )
      }

      // Idempotent: only queue an update when the level differs from target.
      if (Number(level.stocked_quantity) !== DEFAULT_STOCKED_QUANTITY) {
        levelUpdates.push({
          inventory_item_id: inventoryItemId,
          location_id: location.id,
          stocked_quantity: DEFAULT_STOCKED_QUANTITY,
        })
      }
    }
  }

  if (variantsToTrack.length) {
    await updateProductVariantsWorkflow(container).run({
      input: {
        product_variants: variantsToTrack.map((id) => ({
          id,
          manage_inventory: true,
        })),
      },
    })
    logger.info(
      `Enabled inventory tracking (manage_inventory=true) on ${variantsToTrack.length} Rangat variant(s).`,
    )
  }

  if (levelUpdates.length) {
    await updateInventoryLevelsWorkflow(container).run({
      input: {
        updates: levelUpdates,
      },
    })
    logger.info(
      `Set stocked_quantity=${DEFAULT_STOCKED_QUANTITY} on ${levelUpdates.length} Rangat inventory level(s) at ${STOCK_LOCATION_NAME}.`,
    )
  }

  if (!variantsToTrack.length && !levelUpdates.length) {
    logger.info(
      `Rangat B2B stock already in sync: all variants tracked and stocked at ${DEFAULT_STOCKED_QUANTITY} at ${STOCK_LOCATION_NAME}.`,
    )
    return
  }

  logger.info(
    `Rangat B2B stock sync complete for ${RANGAT_B2B_SEED_PRODUCTS.length} product(s) and ${
      RANGAT_B2B_SEED_PRODUCTS.length * RANGAT_B2B_SIZE_OPTIONS.length
    } variant(s).`,
  )
}
