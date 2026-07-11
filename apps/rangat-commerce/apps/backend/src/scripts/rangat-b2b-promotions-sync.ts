import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { createPromotionsWorkflow } from "@medusajs/medusa/core-flows"
import { RANGAT_WHOLESALE_CUSTOMER_GROUP_NAME } from "./rangat-b2b-customer-group-audit"

export const RANGAT_WHOLESALE_PROMOTIONS = [
  { code: "WHOLESALE5", percent: 5 },
  { code: "WHOLESALE10", percent: 10 },
] as const

type Query = {
  graph(input: {
    entity: string
    fields: string[]
  }): Promise<{ data: Record<string, unknown>[] }>
}

type CustomerGroupRecord = {
  id?: string
  name?: string
}

type PromotionRecord = {
  id?: string
  code?: string
}

function findWholesaleGroups(groups: CustomerGroupRecord[]) {
  return groups.filter((group) => group.name === RANGAT_WHOLESALE_CUSTOMER_GROUP_NAME)
}

export default async function syncRangatB2BPromotions({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as Query

  const { data: groups } = await query.graph({
    entity: "customer_group",
    fields: ["id", "name"],
  })

  const wholesaleGroups = findWholesaleGroups(groups as CustomerGroupRecord[])
  if (wholesaleGroups.length !== 1) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Expected exactly one ${RANGAT_WHOLESALE_CUSTOMER_GROUP_NAME} customer group, found ${wholesaleGroups.length}. Run rangat-b2b-customer-group-sync first.`,
    )
  }

  const wholesaleGroupId = wholesaleGroups[0].id as string

  const { data: promotions } = await query.graph({
    entity: "promotion",
    fields: ["id", "code"],
  })
  const existingByCode = new Map(
    (promotions as PromotionRecord[])
      .filter((promotion) => typeof promotion.code === "string")
      .map((promotion) => [promotion.code as string, promotion]),
  )

  for (const tier of RANGAT_WHOLESALE_PROMOTIONS) {
    const existing = existingByCode.get(tier.code)
    if (existing) {
      logger.info(
        `Rangat B2B promotion already exists: ${tier.code} (${existing.id}).`,
      )
      continue
    }

    const { result } = await createPromotionsWorkflow(container).run({
      input: {
        promotionsData: [
          {
            code: tier.code,
            type: "standard",
            status: "active",
            is_automatic: false,
            application_method: {
              type: "percentage",
              target_type: "order",
              allocation: "across",
              value: tier.percent,
              currency_code: "inr",
            },
            rules: [
              {
                attribute: "customer.group.id",
                operator: "in",
                values: [wholesaleGroupId],
              },
            ],
          },
        ],
      },
    })

    const created = result[0]
    logger.info(
      `Created Rangat B2B promotion: ${tier.code} (${created.id}) at ${tier.percent}% for ${RANGAT_WHOLESALE_CUSTOMER_GROUP_NAME}.`,
    )
  }
}
