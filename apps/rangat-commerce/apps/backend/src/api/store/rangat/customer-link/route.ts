import crypto from "node:crypto"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import {
  linkCustomerGroupsToCustomerWorkflow,
  updateCustomersWorkflow,
} from "@medusajs/medusa/core-flows"
import { RANGAT_WHOLESALE_CUSTOMER_GROUP_NAME } from "../../../../scripts/rangat-b2b-customer-group-audit"

type Query = {
  graph(input: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
  }): Promise<{ data: Record<string, unknown>[] }>
}

type CustomerRecord = {
  id?: string
  email?: string
  first_name?: string | null
  last_name?: string | null
  company_name?: string | null
  phone?: string | null
  metadata?: Record<string, unknown> | null
  groups?: { id?: string }[]
}

type CartRecord = {
  id?: string
  email?: string
  customer?: CustomerRecord | null
}

type CustomerGroupRecord = {
  id?: string
  name?: string
}

type BuyerPayload = {
  email?: string
  name?: string
  businessName?: string
  businessType?: string
  city?: string
  phone?: string
  gstin?: string
  buyerReference?: string
  accountSource?: string
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

function stringValue(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : ""
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  }
}

function buyerMetadata(buyer: BuyerPayload) {
  return {
    rangat_customer_link_version: "v1",
    ...(buyer.buyerReference ? { buyer_reference: buyer.buyerReference } : {}),
    ...(buyer.accountSource ? { account_source: buyer.accountSource } : {}),
    ...(buyer.businessType ? { business_type: buyer.businessType } : {}),
    ...(buyer.city ? { city: buyer.city } : {}),
    ...(buyer.gstin ? { gstin: buyer.gstin } : {}),
  }
}

async function loadCart(query: Query, cartId: string) {
  const { data } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "email",
      "customer.id",
      "customer.email",
      "customer.first_name",
      "customer.last_name",
      "customer.company_name",
      "customer.phone",
      "customer.metadata",
      "customer.groups.id",
    ],
    filters: { id: cartId },
  })

  return data[0] as CartRecord | undefined
}

async function loadWholesaleGroup(query: Query) {
  const { data } = await query.graph({
    entity: "customer_group",
    fields: ["id", "name"],
  })

  const groups = (data as CustomerGroupRecord[]).filter(
    (group) => group.name === RANGAT_WHOLESALE_CUSTOMER_GROUP_NAME,
  )

  if (groups.length !== 1 || !groups[0].id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Expected exactly one ${RANGAT_WHOLESALE_CUSTOMER_GROUP_NAME} customer group, found ${groups.length}.`,
    )
  }

  return {
    ...groups[0],
    id: groups[0].id,
  } as CustomerGroupRecord & { id: string }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const secret = configuredSecret()
  if (!secret) {
    res.status(501).json({
      ok: false,
      code: "INTERNAL_SECRET_MISSING",
      message: "Rangat Medusa internal customer linking is not configured.",
    })
    return
  }

  if (!secretsMatch(secret, requestSecret(req))) {
    res.status(401).json({ ok: false, code: "UNAUTHORIZED" })
    return
  }

  const body = (req.body ?? {}) as Record<string, unknown>
  const cartId = stringValue(body.cartId, 120)
  const rawBuyer =
    body.buyer && typeof body.buyer === "object"
      ? (body.buyer as Record<string, unknown>)
      : {}
  const buyer: BuyerPayload = {
    email: stringValue(rawBuyer.email, 160).toLowerCase(),
    name: stringValue(rawBuyer.name, 120),
    businessName: stringValue(rawBuyer.businessName, 120),
    businessType: stringValue(rawBuyer.businessType, 60),
    city: stringValue(rawBuyer.city, 80),
    phone: stringValue(rawBuyer.phone, 40),
    gstin: stringValue(rawBuyer.gstin, 20).toUpperCase(),
    buyerReference: stringValue(rawBuyer.buyerReference, 64),
    accountSource: stringValue(rawBuyer.accountSource, 40),
  }

  if (!cartId) {
    res.status(400).json({ ok: false, code: "CART_ID_REQUIRED" })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as Query
  const cart = await loadCart(query, cartId)
  const customer = cart?.customer ?? null

  if (!cart?.id) {
    res.status(404).json({ ok: false, code: "CART_NOT_FOUND" })
    return
  }

  if (!customer?.id) {
    res.status(422).json({
      ok: false,
      code: "CART_CUSTOMER_MISSING",
      message: "Medusa cart has no customer to enrich. Send buyer email before cart creation.",
    })
    return
  }

  const customerEmail = (customer.email || cart.email || "").toLowerCase()
  if (buyer.email && customerEmail && buyer.email !== customerEmail) {
    res.status(409).json({
      ok: false,
      code: "CUSTOMER_EMAIL_MISMATCH",
      message: "Buyer email does not match the Medusa cart customer email.",
    })
    return
  }

  const displayName = buyer.name || customer.first_name || ""
  const { firstName, lastName } = splitName(displayName)
  const update = {
    ...(buyer.email || customerEmail ? { email: buyer.email || customerEmail } : {}),
    ...(firstName ? { first_name: firstName } : {}),
    ...(lastName ? { last_name: lastName } : {}),
    ...(buyer.businessName ? { company_name: buyer.businessName } : {}),
    ...(buyer.phone ? { phone: buyer.phone } : {}),
    metadata: {
      ...(customer.metadata ?? {}),
      ...buyerMetadata(buyer),
    },
  }

  const { result } = await updateCustomersWorkflow(req.scope).run({
    input: {
      selector: { id: customer.id },
      update,
    },
  })

  const group = await loadWholesaleGroup(query)
  const groupId = group.id
  const isAlreadyLinked = Boolean(
    customer.groups?.some((customerGroup) => customerGroup.id === groupId),
  )

  if (!isAlreadyLinked) {
    await linkCustomerGroupsToCustomerWorkflow(req.scope).run({
      input: {
        id: customer.id,
        add: [groupId],
        remove: [],
      },
    })
  }

  const linkedCustomer = result[0] ?? customer
  res.status(200).json({
    ok: true,
    cartId: cart.id,
    customer: {
      id: linkedCustomer.id,
      email: linkedCustomer.email,
      groupId,
      groupLinked: true,
    },
  })
}
