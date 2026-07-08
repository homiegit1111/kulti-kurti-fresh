import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"

export const RANGAT_WHOLESALE_CUSTOMER_GROUP_NAME = "Rangat Wholesale Buyers"

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

function findWholesaleGroups(groups: CustomerGroupRecord[]) {
  return groups.filter((group) => group.name === RANGAT_WHOLESALE_CUSTOMER_GROUP_NAME)
}

export default async function auditRangatB2BCustomerGroup({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as Query

  const { data } = await query.graph({
    entity: "customer_group",
    fields: ["id", "name"],
  })

  const matches = findWholesaleGroups(data as CustomerGroupRecord[])
  if (matches.length !== 1) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Expected exactly one ${RANGAT_WHOLESALE_CUSTOMER_GROUP_NAME} customer group, found ${matches.length}. Run rangat-b2b-customer-group-sync.`,
    )
  }

  logger.info(
    `Rangat B2B customer group audit passed: ${RANGAT_WHOLESALE_CUSTOMER_GROUP_NAME} (${matches[0].id}).`,
  )
}