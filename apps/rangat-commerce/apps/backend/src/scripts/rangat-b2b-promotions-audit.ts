import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { RANGAT_WHOLESALE_PROMOTIONS } from "./rangat-b2b-promotions-sync"

type Query = {
  graph(input: {
    entity: string
    fields: string[]
  }): Promise<{ data: Record<string, unknown>[] }>
}

type PromotionRecord = {
  id?: string
  code?: string
  status?: string
  application_method?: {
    type?: string
    value?: number
  }
}

export default async function auditRangatB2BPromotions({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as Query

  const { data } = await query.graph({
    entity: "promotion",
    fields: [
      "id",
      "code",
      "status",
      "application_method.type",
      "application_method.value",
    ],
  })

  const promotions = data as PromotionRecord[]
  const drift: string[] = []

  for (const tier of RANGAT_WHOLESALE_PROMOTIONS) {
    const matches = promotions.filter((promotion) => promotion.code === tier.code)

    if (matches.length !== 1) {
      drift.push(
        `${tier.code}: expected exactly one promotion, found ${matches.length}`,
      )
      continue
    }

    const promotion = matches[0]

    if (promotion.status !== "active") {
      drift.push(
        `${tier.code}: expected status "active", found "${promotion.status}"`,
      )
    }

    const value = promotion.application_method?.value
    if (Number(value) !== tier.percent) {
      drift.push(
        `${tier.code}: expected percentage value ${tier.percent}, found ${value}`,
      )
    }
  }

  if (drift.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Rangat B2B promotion audit failed: ${drift.join("; ")}. Run rangat-b2b-promotions-sync.`,
    )
  }

  logger.info(
    `Rangat B2B promotion audit passed: ${RANGAT_WHOLESALE_PROMOTIONS.map(
      (tier) => `${tier.code} (${tier.percent}%)`,
    ).join(", ")}.`,
  )
}
