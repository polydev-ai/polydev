import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get current month start date
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // Get all API keys for the user
    const { data: apiKeys, error: apiKeysError } = await service
      .from('api_keys')
      .select('id, provider')
      .eq('user_id', user.id)

    if (apiKeysError) throw apiKeysError

    const apiKeyUsage: Record<string, any> = {}

    // For each API key, get usage data
    for (const apiKey of apiKeys || []) {
      // Get total usage for this API key
      const { data: totalUsage, error: totalError } = await service
        .from('usage_sessions')
        .select('cost, tokens_used')
        .eq('user_id', user.id)
        .eq('session_type', 'api_key')
        .eq('metadata->api_key_id', apiKey.id)

      // Get monthly usage for this API key
      const { data: monthlyUsage, error: monthlyError } = await service
        .from('usage_sessions')
        .select('cost, tokens_used, created_at')
        .eq('user_id', user.id)
        .eq('session_type', 'api_key')
        .eq('metadata->api_key_id', apiKey.id)
        .gte('created_at', monthStart)

      const totalCost = totalUsage?.reduce((sum, session) => sum + (Number(session.cost) || 0), 0) || 0
      const monthlyCost = monthlyUsage?.reduce((sum, session) => sum + (Number(session.cost) || 0), 0) || 0
      const totalTokens = totalUsage?.reduce((sum, session) => sum + (Number(session.tokens_used) || 0), 0) || 0
      const requestCount = totalUsage?.length || 0
      const lastUsed = monthlyUsage?.[0]?.created_at || null

      apiKeyUsage[apiKey.id] = {
        api_key_id: apiKey.id,
        total_cost: totalCost,
        monthly_cost: monthlyCost,
        token_count: totalTokens,
        request_count: requestCount,
        last_used: lastUsed
      }
    }

    return NextResponse.json({ usage: apiKeyUsage })
  } catch (error) {
    console.error('[usage/api-keys] error:', error)
    return NextResponse.json({ error: 'Failed to fetch API key usage' }, { status: 500 })
  }
}