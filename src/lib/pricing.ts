// Unified pricing resolution utilities
// - Lists and discovery: model_pricing_resolved view
// - Per-model enrichment: get_model_pricing_per_1k RPC
// Notes:
// - Always treat values as USD per 1K tokens
// - Do not split OpenRouter vendor/model when querying

import { supabaseServer } from './supabaseServer'

export type Per1KPricing = {
  input_cost_per_1k: number
  output_cost_per_1k: number
  source?: string
}

export async function getModelPricingPer1K(provider: string, model: string): Promise<Per1KPricing | null> {
  // provider: e.g., 'openrouter' | 'x-ai' | 'groq' ...
  // model: for openrouter pass vendor/model (e.g., 'x-ai/grok-4')
  const { data, error } = await supabaseServer.rpc('get_model_pricing_per_1k', {
    in_provider: provider,
    in_model: model,
  })
  if (error) throw error
  if (!data) return null

  // RPC returns a single row or null; coerce to numbers defensively
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null
  return {
    input_cost_per_1k: Number(row.input_cost_per_1k ?? 0),
    output_cost_per_1k: Number(row.output_cost_per_1k ?? 0),
    source: row.source ?? undefined,
  }
}

export async function getModelPricingByFriendlyPer1K(provider: string, friendlyId: string): Promise<Per1KPricing | null> {
  const { data, error } = await supabaseServer.rpc('get_model_pricing_by_friendly_per_1k', {
    in_provider: provider,
    in_friendly_id: friendlyId,
  })
  if (error) throw error
  if (!data) return null
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return null
  return {
    input_cost_per_1k: Number(row.input_cost_per_1k ?? 0),
    output_cost_per_1k: Number(row.output_cost_per_1k ?? 0),
    source: row.source ?? undefined,
  }
}

export type ResolvedPricingRow = {
  provider_id: string
  model_id: string
  friendly_id: string | null
  name: string | null
  display_name: string | null
  input_cost_per_1k: number
  output_cost_per_1k: number
  max_tokens: number | null
  context_length: number | null
  supports_streaming: boolean | null
  supports_tools: boolean | null
  supports_reasoning: boolean | null
  supports_vision: boolean | null
  model_family: string | null
  model_version: string | null
  is_active: boolean | null
  updated_at: string | null
}

export async function listResolvedPricing(params?: { providerId?: string; limit?: number }): Promise<ResolvedPricingRow[]> {
  let query = supabaseServer.from('model_pricing_resolved').select('*')
  if (params?.providerId) query = query.eq('provider_id', params.providerId)
  if (params?.limit) query = query.limit(params.limit)

  const { data, error } = await query
  if (error) throw error
  const rows = (data ?? []) as any[]
  // Coerce numeric fields
  return rows.map((r) => ({
    ...r,
    input_cost_per_1k: Number(r.input_cost_per_1k ?? 0),
    output_cost_per_1k: Number(r.output_cost_per_1k ?? 0),
  })) as ResolvedPricingRow[]
}

// Central cost computation (USD) using per-1K pricing
export function computeCostUSD(args: {
  promptTokens: number
  completionTokens: number
  pricing: Per1KPricing
}): number {
  const pt = Math.max(0, Math.floor(args.promptTokens || 0))
  const ct = Math.max(0, Math.floor(args.completionTokens || 0))
  const inCost = (pt / 1000) * (args.pricing.input_cost_per_1k || 0)
  const outCost = (ct / 1000) * (args.pricing.output_cost_per_1k || 0)
  const total = inCost + outCost
  // round to 6 decimals for display/math stability
  return Math.round(total * 1e6) / 1e6
}

