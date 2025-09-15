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
    const limit = Math.min(Number(url.searchParams.get('limit') || '100'), 500)
    const offset = Math.max(Number(url.searchParams.get('offset') || '0'), 0)
    const fromDate = url.searchParams.get('from')
    const toDate = url.searchParams.get('to')
    const onlyCredits = url.searchParams.get('onlyCredits') === 'true'
    const provider = url.searchParams.get('provider') || undefined
    const model = url.searchParams.get('model') || undefined
    const source = url.searchParams.get('source') || undefined // 'api' | 'cli' | 'credits'
    const includeCount = url.searchParams.get('includeCount') === 'true'

    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const selectOptions = includeCount ? { count: 'exact' as const } : undefined
    let query = service
      .from('usage_sessions')
      .select('*', selectOptions)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (fromDate) query = query.gte('created_at', fromDate)
    if (toDate) query = query.lte('created_at', toDate)
    if (provider) query = query.eq('provider', provider)
    if (model) query = query.eq('model_name', model)
    if (source) {
      const mapping: Record<string, string> = {
        api: 'api_key',
        cli: 'cli_tool',
        credits: 'credits',
      }
      const mapped = mapping[source]
      if (mapped) query = query.eq('session_type', mapped)
    }
    if (onlyCredits) {
      query = query.eq('session_type', 'credits')
    }

    const { data, error, count } = await query
    if (error) throw error

    const rows = (data || []).map((s: any) => {
      const source = s.metadata?.fallback_method === 'credits'
        ? 'Credits'
        : (s.metadata?.fallback_method === 'cli' ? 'CLI' : 'API')
      return {
        id: s.id,
        createdAt: s.created_at,
        provider: s.provider,
        model: s.model_name,
        app: s.metadata?.app || 'Polydev Multi-LLM Platform',
        tokens: s.tokens_used || s.total_tokens || 0,
        prompt_tokens: s.metadata?.prompt_tokens || null,
        completion_tokens: s.metadata?.completion_tokens || null,
        cost: Number(s.cost || 0),
        tps: s.metadata?.tps || null,
        finish: s.metadata?.finish || 'stop',
        source,
        credits_used: s.metadata?.credits_used || 0,
      }
    })

    // Rows are already server-side filtered when onlyCredits is true.
    return NextResponse.json({ items: rows, total: includeCount ? count ?? null : null, limit, offset })
  } catch (e: any) {
    console.error('[usage/sessions] error:', e)
    return NextResponse.json({ error: 'Failed to fetch usage sessions' }, { status: 500 })
  }
}
