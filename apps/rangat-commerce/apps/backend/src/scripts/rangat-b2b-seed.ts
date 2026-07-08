import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  Modules,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  RANGAT_B2B_SEED_PRODUCTS,
  toMedusaCreateProductInput,
  validateRangatB2BSeedCatalog,
} from "./rangat-b2b-catalog"

type Query = {
  graph(input: {
    entity: string
    fields: string[]
  }): Promise<{ data: Record<string, unknown>[] }>
}

const SALES_CHANNEL_NAME = "Rangat Wholesale Sales Channel"
const API_KEY_TITLE = "Rangat Wholesale Publishable API Key"
const REGION_NAME = "India Wholesale"
const STOCK_LOCATION_NAME = "Rangat Jaipur Dispatch"
const SHIPPING_OPTION_NAME = "India Standard Wholesale Dispatch"

async function all(query: Query, entity: string, fields: string[]) {
  const { data } = await query.graph({ entity, fields })
  return data
}

function byName<T extends Record<string, unknown>>(items: T[], name: string) {
  return items.find((item) => item.name === name)
}

function byTitle<T extends Record<string, unknown>>(items: T[], title: string) {
  return items.find((item) => item.title === title)
}

function byHandle<T extends Record<string, unknown>>(items: T[], handle: string) {
  return items.find((item) => item.handle === handle)
}


export default async function seedRangatB2B({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as Query
  const fulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT
  )

  logger.info("Seeding Rangat B2B Medusa data...")

  const salesChannels = await all(query, "sales_channel", ["id", "name"])
  let salesChannel = byName(salesChannels, SALES_CHANNEL_NAME)
  if (!salesChannel) {
    const { result } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [
          {
            name: SALES_CHANNEL_NAME,
            description: "Rangat Pehnawa wholesale storefront channel",
          },
        ],
      },
    })
    salesChannel = result[0] as unknown as Record<string, unknown>
    logger.info(`Created sales channel: ${SALES_CHANNEL_NAME}`)
  }

  const apiKeys = await all(query, "api_key", ["id", "title", "type"])
  let apiKey = byTitle(apiKeys, API_KEY_TITLE)
  if (!apiKey) {
    const { result } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: API_KEY_TITLE,
            type: "publishable",
            created_by: "",
          },
        ],
      },
    })
    apiKey = result[0] as unknown as Record<string, unknown>
    logger.info(`Created publishable API key: ${API_KEY_TITLE}`)
  }

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: apiKey.id as string,
      add: [salesChannel.id as string],
    },
  })

  const stores = await all(query, "store", [
    "id",
    "name",
    "supported_currencies.currency_code",
    "supported_currencies.is_default",
  ])
  const store = stores[0]
  if (store) {
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id as string },
        update: {
          name: "Rangat Pehnawa Wholesale",
          default_sales_channel_id: salesChannel.id as string,
          supported_currencies: [
            { currency_code: "inr", is_default: true },
            { currency_code: "eur", is_default: false },
            { currency_code: "usd", is_default: false },
          ],
        },
      },
    })
  }

  const regions = await all(query, "region", ["id", "name", "currency_code"])
  let region = byName(regions, REGION_NAME)
  if (!region) {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: REGION_NAME,
            currency_code: "inr",
            countries: ["in"],
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    })
    region = result[0] as unknown as Record<string, unknown>
    logger.info(`Created region: ${REGION_NAME}`)
  }

  const taxRegions = await all(query, "tax_region", ["id", "country_code"])
  if (!taxRegions.some((taxRegion) => taxRegion.country_code === "in")) {
    await createTaxRegionsWorkflow(container).run({
      input: [{ country_code: "in", provider_id: "tp_system" }],
    })
  }

  const stockLocations = await all(query, "stock_location", ["id", "name"])
  let stockLocation = byName(stockLocations, STOCK_LOCATION_NAME)
  if (!stockLocation) {
    const { result } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: STOCK_LOCATION_NAME,
            address: {
              city: "Jaipur",
              country_code: "IN",
              address_1: "Wholesale dispatch center",
            },
          },
        ],
      },
    })
    stockLocation = result[0] as unknown as Record<string, unknown>

    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id as string,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: "manual_manual",
      },
    })
    logger.info(`Created stock location: ${STOCK_LOCATION_NAME}`)
  }

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id as string,
      add: [salesChannel.id as string],
    },
  })

  const shippingProfiles = await all(query, "shipping_profile", ["id", "name"])
  const shippingProfile = shippingProfiles[0]
  const shippingOptions = await all(query, "shipping_option", ["id", "name"])
  if (shippingProfile && !byName(shippingOptions, SHIPPING_OPTION_NAME)) {
    const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: "Rangat India delivery",
      type: "shipping",
      service_zones: [
        {
          name: "India",
          geo_zones: [{ country_code: "in", type: "country" }],
        },
      ],
    })

    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id as string,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_set_id: fulfillmentSet.id,
      },
    })

    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: SHIPPING_OPTION_NAME,
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: fulfillmentSet.service_zones[0].id,
          shipping_profile_id: shippingProfile.id as string,
          type: {
            label: "Wholesale dispatch",
            description: "Confirmed after WhatsApp stock check.",
            code: "rangat-wholesale-standard",
          },
          prices: [{ region_id: region.id as string, amount: 0 }],
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
      ],
    })
  }

  if (!shippingProfile) {
    logger.warn("No shipping profile found; skipping Rangat product seed.")
    return
  }

  const products = await all(query, "product", ["id", "handle"])
  const catalogErrors = validateRangatB2BSeedCatalog()
  if (catalogErrors.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid Rangat B2B seed catalog: ${catalogErrors.join("; ")}`
    )
  }

  const seedProducts = RANGAT_B2B_SEED_PRODUCTS.filter(
    (product) => !byHandle(products, product.handle)
  )

  if (seedProducts.length) {
    await createProductsWorkflow(container).run({
      input: {
        products: seedProducts.map((product) =>
          toMedusaCreateProductInput(
            product,
            shippingProfile.id as string,
            salesChannel.id as string
          )
        ),
      },
    })
    logger.info(`Created ${seedProducts.length} Rangat wholesale products.`)
  }

  const inventoryItems = await all(query, "inventory_item", ["id"])
  const inventoryLevels = await all(query, "inventory_level", [
    "id",
    "inventory_item_id",
  ])
  const stocked = new Set(
    inventoryLevels.map((level) => level.inventory_item_id as string)
  )
  const missingInventoryLevels = inventoryItems.filter(
    (item) => !stocked.has(item.id as string)
  )

  if (missingInventoryLevels.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: missingInventoryLevels.map((item) => ({
          location_id: stockLocation.id as string,
          stocked_quantity: 1000000,
          inventory_item_id: item.id as string,
        })),
      },
    })
  }

  logger.info("Finished seeding Rangat B2B Medusa data.")
}
