import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { createCustomerGroupsWorkflow } from "@medusajs/medusa/core-flows"
import { RANGAT_WHOLESALE_CUSTOMER_GROUP_NAME } from "./rangat-b2b-customer-group-audit"

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

export default async function syncRangatB2BCustomerGroup({
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
  if (matches.length > 1) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Found ${matches.length} duplicate ${RANGAT_WHOLESALE_CUSTOMER_GROUP_NAME} customer groups. Resolve duplicates manually before syncing.`,
    )
  }

  if (matches.length === 1) {
    logger.info(
      `Rangat B2B customer group already exists: ${RANGAT_WHOLESALE_CUSTOMER_GROUP_NAME} (${matches[0].id}).`,
    )
    return
  }

  const { result } = await createCustomerGroupsWorkflow(container).run({
    input: {
      customersData: [
        {
          name: RANGAT_WHOLESALE_CUSTOMER_GROUP_NAME,
        },
      ],
    },
  })

  const created = result[0]
  logger.info(
    `Created Rangat B2B customer group: ${created.name} (${created.id}).`,
  )
}