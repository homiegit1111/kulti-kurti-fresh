import crypto from "node:crypto"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type Query = {
  graph(input: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
  }): Promise<{ data: Record<string, unknown>[] }>
}

type InventoryItemLink = {
  inventory_item_id?: string
}

type VariantOption = {
  value?: string
  option?: { title?: string } | null
}

type VariantRecord = {
  id?: string
  sku?: string | null
  title?: string | null
  options?: VariantOption[]
  inventory_items?: InventoryItemLink[]
}

type ProductRecord = {
  handle?: string | null
  variants?: VariantRecord[]
}

type InventoryLevelRecord = {
  inventory_item_id?: string
  stocked_quantity?: number | null
  reserved_quantity?: number | null
}

type InventoryStatusItem = {
  product_handle: string
  size: string | null
  sku: string | null
  available: boolean
  quantity: number
}

const INTERNAL_SECRET_HEADER = "x-rangat-internal-secret"

function configuredSecret() {
  return (
    process.env.RANGAT_MEDUSA_INTERNAL_SECRET ||
    process.env.MEDUSA_INTERNAL_API_SECRET ||
    ""
  ).trim()
}

function requestSecret(req: MedusaRequest) {
  const raw = req.headers[INTERNAL_SECRET_HEADER]
  return (Array.isArray(raw) ? raw[0] : raw ?? "").trim()
}

function secretsMatch(expected: string, received: string) {
  const a = Buffer.from(expected, "utf8")
  const b = Buffer.from(received, "utf8")
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

function variantSize(variant: VariantRecord): string | null {
  const sizeOption = variant.options?.find((option) =>
    option.option?.title?.toLowerCase().includes("size"),
  )
  const value = sizeOption?.value ?? variant.title ?? ""
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

/**
 * Medusa v2 emits NO native inventory events, so the storefront back-in-stock
 * cron cannot be pushed a 0 → in-stock transition. This read endpoint lets the
 * cron PULL current availability and diff it against its own pending alerts.
 *
 * Availability is computed as stocked_quantity - reserved_quantity summed over
 * every inventory level for the variant's inventory item(s). `available` is
 * simply quantity > 0.
 *
 * Protected by the same x-rangat-internal-secret timing-safe check as the
 * sibling customer-link route: 501 when unconfigured, 401 on mismatch.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const secret = configuredSecret()
  if (!secret) {
    res.status(501).json({
      ok: false,
      code: "INTERNAL_SECRET_MISSING",
      message: "Rangat Medusa internal inventory status is not configured.",
    })
    return
  }

  if (!secretsMatch(secret, requestSecret(req))) {
    res.status(401).json({ ok: false, code: "UNAUTHORIZED" })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as Query

  const { data: productData } = await query.graph({
    entity: "product",
    fields: [
      "handle",
      "variants.id",
      "variants.sku",
      "variants.title",
      "variants.options.value",
      "variants.options.option.title",
      "variants.inventory_items.inventory_item_id",
    ],
  })

  const { data: levelData } = await query.graph({
    entity: "inventory_level",
    fields: ["inventory_item_id", "stocked_quantity", "reserved_quantity"],
  })

  // available quantity per inventory item = stocked - reserved, summed across
  // every location level for that item.
  const availableByInventoryItem = new Map<string, number>()
  for (const level of levelData as InventoryLevelRecord[]) {
    if (!level.inventory_item_id) continue
    const stocked = Number(level.stocked_quantity)
    const reserved = Number(level.reserved_quantity)
    const net =
      (Number.isFinite(stocked) ? stocked : 0) -
      (Number.isFinite(reserved) ? reserved : 0)
    const prev = availableByInventoryItem.get(level.inventory_item_id) ?? 0
    availableByInventoryItem.set(level.inventory_item_id, prev + net)
  }

  const items: InventoryStatusItem[] = []
  for (const product of productData as ProductRecord[]) {
    const handle = (product.handle ?? "").trim()
    if (!handle) continue

    for (const variant of product.variants ?? []) {
      let quantity = 0
      for (const link of variant.inventory_items ?? []) {
        if (!link.inventory_item_id) continue
        quantity += availableByInventoryItem.get(link.inventory_item_id) ?? 0
      }

      items.push({
        product_handle: handle,
        size: variantSize(variant),
        sku: variant.sku ?? null,
        available: quantity > 0,
        quantity,
      })
    }
  }

  res.status(200).json({ items })
}
