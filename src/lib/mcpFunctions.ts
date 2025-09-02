// MCP function wrappers for Stripe integration
import { mcp__stripe__create_customer, mcp__stripe__create_payment_link } from '@/lib/mcpToolWrapper'

export async function createCustomer(name: string, email: string) {
  return await mcp__stripe__create_customer({
    name,
    email
  })
}

export async function createPaymentLink(priceId: string, quantity: number) {
  return await mcp__stripe__create_payment_link({
    price: priceId,
    quantity
  })
}