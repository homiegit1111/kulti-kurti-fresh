import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { RANGAT_WHOLESALE_CUSTOMER_GROUP_NAME } from "./rangat-b2b-customer-group-audit"

type Query = {
  graph(input: {
    entity: string
    fields: string[]
  }): Promise<{ data: Record<string, unknown>[] }>
}

type CartItemRecord = {
  quantity?: number
  metadata?: Record<string, unknown> | null
}

type CustomerGroupRecord = {
  id?: string
  name?: string
}

type CustomerRecord = {
  id?: string
  email?: string
  company_name?: string | null
  phone?: string | null
  metadata?: Record<string, unknown> | null
  groups?: CustomerGroupRecord[]
}

type CartRecord = {
  id?: string
  email?: string | null
  created_at?: string
  updated_at?: string
  completed_at?: string | null
  total?: number | null
  subtotal?: number | null
  currency_code?: string | null
  metadata?: Record<string, unknown> | null
  items?: CartItemRecord[]
  customer?: CustomerRecord | null
}

type OpsIssue = {
  cartId: string
  field: string
  expected: unknown
  actual: unknown
}

const STRICT_ENV = "RANGAT_OPS_REPORT_STRICT"
const RECENT_PENDING_LIMIT = 20

function metadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
): string {
  const value = metadata?.[key]
  return typeof value === "string" ? value.trim() : ""
}

function metadataNumber(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
): number {
  const value = metadata?.[key]
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function isRangatCart(cart: CartRecord): boolean {
  const source = metadataString(cart.metadata, "source")
  return source === "medusa" || source.startsWith("rangat_phase_2_")
}

function isWholesaleCustomer(customer: CustomerRecord | null | undefined): boolean {
  return Boolean(
    customer?.groups?.some(
      (group) => group.name === RANGAT_WHOLESALE_CUSTOMER_GROUP_NAME,
    ),
  )
}

function itemQuantity(cart: CartRecord): number {
  return (cart.items ?? []).reduce(
    (sum, item) => sum + Math.max(0, Number(item.quantity) || 0),
    0,
  )
}

// Medusa 2 returns cart/order totals in the MAJOR currency unit (2400 = ₹2400),
// same convention the storefront adapter relies on. The old `>10000 → /100`
// heuristic silently divided any legitimate large wholesale total by 100, so it
// is gone — just round.
function rupees(amount: number | null | undefined): number {
  const value = Number(amount)
  if (!Number.isFinite(value)) return 0
  return Math.round(value)
}

function issue(
  cart: CartRecord,
  field: string,
  expected: unknown,
  actual: unknown,
): OpsIssue {
  return {
    cartId: cart.id ?? "unknown-cart",
    field,
    expected,
    actual,
  }
}

function auditCart(cart: CartRecord): OpsIssue[] {
  const issues: OpsIssue[] = []
  const expectedSets = metadataNumber(cart.metadata, "expected_total_sets")
  const actualSets = itemQuantity(cart)

  if (!cart.id) {
    issues.push(issue(cart, "id", "present", "missing"))
  }

  if (expectedSets <= 0) {
    issues.push(
      issue(cart, "metadata.expected_total_sets", ">0", expectedSets || "missing"),
    )
  } else if (actualSets !== expectedSets) {
    issues.push(issue(cart, "items.quantity", expectedSets, actualSets))
  }

  if (!cart.customer?.id) {
    issues.push(issue(cart, "customer.id", "present", "missing"))
  }

  if (cart.customer?.id && !isWholesaleCustomer(cart.customer)) {
    issues.push(
      issue(
        cart,
        "customer.groups",
        RANGAT_WHOLESALE_CUSTOMER_GROUP_NAME,
        cart.customer.groups?.map((group) => group.name ?? group.id) ?? [],
      ),
    )
  }

  const buyerReference =
    metadataString(cart.metadata, "buyer_reference") ||
    metadataString(cart.customer?.metadata, "buyer_reference")
  if (!buyerReference) {
    issues.push(issue(cart, "buyer_reference", "present", "missing"))
  }

  return issues
}

function byUpdatedDesc(left: CartRecord, right: CartRecord): number {
  return Date.parse(right.updated_at ?? right.created_at ?? "0") -
    Date.parse(left.updated_at ?? left.created_at ?? "0")
}

export default async function reportRangatB2BOps({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as Query

  const { data } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "email",
      "created_at",
      "updated_at",
      "completed_at",
      "total",
      "subtotal",
      "currency_code",
      "metadata",
      "items.quantity",
      "items.metadata",
      "customer.id",
      "customer.email",
      "customer.company_name",
      "customer.phone",
      "customer.metadata",
      "customer.groups.id",
      "customer.groups.name",
    ],
  })

  const carts = (data as CartRecord[]).filter(isRangatCart)
  const pending = carts.filter((cart) => !cart.completed_at)
  const completed = carts.length - pending.length
  const pendingIssues = pending.flatMap(auditCart)
  const linkedCustomers = pending.filter((cart) => isWholesaleCustomer(cart.customer)).length
  const strict = process.env[STRICT_ENV] === "true"

  logger.info(`Rangat B2B ops report: ${carts.length} Rangat cart(s).`)
  logger.info(
    `Pending carts=${pending.length}, completed carts=${completed}, pending linked wholesale customers=${linkedCustomers}.`,
  )

  for (const cart of pending.sort(byUpdatedDesc).slice(0, RECENT_PENDING_LIMIT)) {
    const expectedSets = metadataNumber(cart.metadata, "expected_total_sets")
    const buyerReference =
      metadataString(cart.metadata, "buyer_reference") ||
      metadataString(cart.customer?.metadata, "buyer_reference") ||
      "missing"
    logger.info(
      [
        `cart=${cart.id ?? "missing"}`,
        `updated=${cart.updated_at ?? "unknown"}`,
        `email=${cart.email ?? cart.customer?.email ?? "missing"}`,
        `customer=${cart.customer?.id ?? "missing"}`,
        `wholesale_group=${isWholesaleCustomer(cart.customer) ? "yes" : "no"}`,
        `sets=${itemQuantity(cart)}/${expectedSets || "missing"}`,
        `total_inr=${rupees(cart.total ?? cart.subtotal)}`,
        `buyer_reference=${buyerReference}`,
      ].join(" "),
    )
  }

  if (pendingIssues.length) {
    logger.warn(
      `Rangat B2B ops report found ${pendingIssues.length} pending-cart issue(s). Set ${STRICT_ENV}=true to fail on these.`,
    )
    for (const item of pendingIssues) {
      logger.warn(
        `${item.cartId} :: ${item.field} expected=${JSON.stringify(
          item.expected,
        )} actual=${JSON.stringify(item.actual)}`,
      )
    }

    if (strict) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Rangat B2B ops report failed in strict mode: ${pendingIssues.length} issue(s).`,
      )
    }
  }

  logger.info("Rangat B2B ops report completed.")
}
