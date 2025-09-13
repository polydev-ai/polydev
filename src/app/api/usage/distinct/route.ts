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

    const url = new URL(request.url)
    const fromDate = url.searchParams.get('from')
    const toDate = url.searchParams.get('to')
    const onlyCredits = url.searchParams.get('onlyCredits') === 'true'
    const source = url.searchParams.get('source') || undefined // 'api' | 'cli' | 'credits'
    const providerFilter = url.searchParams.get('provider') || undefined
    const modelFilter = url.searchParams.get('model') || undefined

    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let query = service
      .from('usage_sessions')
      .select('provider, model_name, session_type')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5000)

    if (fromDate) query = query.gte('created_at', fromDate)
    if (toDate) query = query.lte('created_at', toDate)
    if (source) {
      const mapping: Record<string, string> = { api: 'api_key', cli: 'cli_tool', credits: 'credits' }
      const mapped = mapping[source]
      if (mapped) query = query.eq('session_type', mapped)
    }
    if (onlyCredits) query = query.filter('cost_credits', 'gt', '0')
    if (providerFilter) query = query.eq('provider', providerFilter)
    if (modelFilter) query = query.eq('model_name', modelFilter)

    const { data, error } = await query
    if (error) throw error

    type SourceKey = 'api' | 'cli' | 'credits'
    const sourceMap: Record<string, SourceKey> = { 'api_key': 'api', 'cli_tool': 'cli', 'credits': 'credits' }

    const providerCounts = new Map<string, { name: string, count: number, bySource: Record<SourceKey, number> }>()
    const modelCounts = new Map<string, { name: string, count: number, bySource: Record<SourceKey, number> }>()

    for (const row of data || []) {
      const p = (row as any).provider as string | null
      const m = (row as any).model_name as string | null
      const st = sourceMap[(row as any).session_type] || 'api'
      if (p) {
        if (!providerCounts.has(p)) providerCounts.set(p, { name: p, count: 0, bySource: { api: 0, cli: 0, credits: 0 } })
        const entry = providerCounts.get(p)!
        entry.count += 1
        entry.bySource[st] += 1
      }
      if (m) {
        if (!modelCounts.has(m)) modelCounts.set(m, { name: m, count: 0, bySource: { api: 0, cli: 0, credits: 0 } })
        const entry = modelCounts.get(m)!
        entry.count += 1
        entry.bySource[st] += 1
      }
    }

    const providers = Array.from(providerCounts.values()).sort((a, b) => a.name.localeCompare(b.name))
    const models = Array.from(modelCounts.values()).sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({ providers, models })
  } catch (e: any) {
    console.error('[usage/distinct] error:', e)
    return NextResponse.json({ error: 'Failed to fetch distinct values' }, { status: 500 })
  }
}
