import { NextResponse } from 'next/server'
import { supabaseServer } from '../../../../lib/supabaseServer'
import { getUserIdFromRequest } from '../../../../lib/auth'

type UsageRow = {
  id: string
  user_id: string
  session_id: string | null
  model_name: string | null
  provider: string | null
  tokens_used: number | null
  cost: number | null
  session_type: 'api' | 'credits' | 'cli' | string
  metadata: any
  created_at: string
}

function parseDate(s?: string | null): Date | null {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = (await getUserIdFromRequest()) || undefined
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    const range = searchParams.get('range') || '30d'
    const filterType = (searchParams.get('type') || '').toLowerCase() // 'api' | 'credits' | 'cli'
    const filterProvider = (searchParams.get('provider') || '').toLowerCase()
    const filterFamily = (searchParams.get('family') || '').toLowerCase()
    const compare = (searchParams.get('compare') || '0') === '1'
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? Math.min(20000, Math.max(100, Number(limitParam))) : 10000

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Compute date range
    const now = new Date()
    const to = parseDate(toParam) || now
    const from = parseDate(fromParam) || new Date(to.getTime() - (range === '7d' ? 7 : range === '90d' ? 90 : 30) * 24 * 3600 * 1000)

    // Pull usage_sessions primary data
    const { data: usageRows, error: usageErr } = await supabaseServer
      .from('usage_sessions')
      .select('id,user_id,session_id,model_name,provider,tokens_used,cost,session_type,metadata,created_at')
      .eq('user_id', userId)
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit)

    if (usageErr) throw usageErr
    let rows = (usageRows ?? []) as UsageRow[]
    if (filterType) rows = rows.filter((r) => (r.session_type || '').toLowerCase() === filterType)
    if (filterProvider) rows = rows.filter((r) => (r.provider || '').toLowerCase() === filterProvider)

    // Optional: augment CLI from mcp_usage_logs if needed
    let cliRows: UsageRow[] = []
    if (rows.length < 1000) {
      const { data: mcpRows, error: mcpErr } = await supabaseServer
        .from('mcp_usage_logs')
        .select('id,user_id,total_tokens as tokens_used,total_cost as cost,created_at,client_id,models_used,status')
        .eq('user_id', userId)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
        .order('created_at', { ascending: false })
        .limit(500)
      if (!mcpErr && mcpRows) {
        cliRows = (mcpRows as any[]).map((r) => ({
          id: r.id,
          user_id: userId,
          session_id: null,
          model_name: Array.isArray(r.models_used) && r.models_used.length ? r.models_used[0] : null,
          provider: 'cli',
          tokens_used: Number(r.tokens_used || 0),
          cost: Number(r.cost || 0),
          session_type: 'cli',
          metadata: { client_id: r.client_id, status: r.status },
          created_at: r.created_at,
        }))
      }
    }

    let allRows: UsageRow[] = [...rows, ...cliRows]
    if (filterType) allRows = allRows.filter((r) => (r.session_type || '').toLowerCase() === filterType)
    if (filterProvider) allRows = allRows.filter((r) => (r.provider || '').toLowerCase() === filterProvider)

    // Enrich model family via models_registry for additional filters and breakdowns
    try {
      const modelSet = new Set<string>()
      const providerSet = new Set<string>()
      for (const r of allRows) {
        if (r.model_name) modelSet.add(r.model_name)
        if (r.provider) providerSet.add((r.provider || '').toLowerCase())
      }
      const models = Array.from(modelSet)
      const providers = Array.from(providerSet)
      let familyMap: Record<string, string> = {}
      if (models.length) {
        // Try OpenRouter vendor/model exact
        const { data: mrOr } = await supabaseServer
          .from('models_registry')
          .select('provider_id,provider_model_id,model_family,friendly_id,name')
          .eq('provider_id', 'openrouter')
          .in('provider_model_id', models)
          .limit(10000)
        for (const r of (mrOr || []) as any[]) {
          familyMap[`openrouter|${r.provider_model_id}`] = (r.model_family || '').toLowerCase()
        }
        // Try direct providers
        if (providers.length) {
          const { data: mrDir } = await supabaseServer
            .from('models_registry')
            .select('provider_id,provider_model_id,model_family,friendly_id,name')
            .in('provider_id', providers)
            .in('provider_model_id', models)
            .limit(10000)
          for (const r of (mrDir || []) as any[]) {
            familyMap[`${(r.provider_id || '').toLowerCase()}|${r.provider_model_id}`] = (r.model_family || '').toLowerCase()
          }
          // Friendly-id fallback
          const { data: mrFriendly } = await supabaseServer
            .from('models_registry')
            .select('provider_id,friendly_id,model_family')
            .in('provider_id', providers)
            .in('friendly_id', models)
            .limit(10000)
          for (const r of (mrFriendly || []) as any[]) {
            familyMap[`${(r.provider_id || '').toLowerCase()}|${r.friendly_id}`] = (r.model_family || '').toLowerCase()
          }
        }
      }
      ;(allRows as any[]).forEach((r: any) => {
        const key = `${(r.provider || '').toLowerCase()}|${r.model_name || ''}`
        r.model_family = familyMap[key] || null
      })
    } catch {}

    if (filterFamily) allRows = (allRows as any[]).filter((r: any) => (r.model_family || '') === filterFamily)

    // Aggregations
    const totals = { tokens: 0, cost: 0, count: 0 }
    const byType: Record<string, { tokens: number; cost: number; count: number }> = {}
    const byProvider: Record<string, { tokens: number; cost: number; count: number }> = {}
    const byModel: Record<string, { model: string; provider: string; tokens: number; cost: number; count: number }> = {}
    const byDay: Record<string, { date: string; tokens: number; cost: number; count: number; api: number; credits: number; cli: number }> = {}
    const byFamily: Record<string, { family: string; tokens: number; cost: number; count: number }> = {}

    for (const r of allRows) {
      const tokens = Number(r.tokens_used || 0)
      const cost = Number(r.cost || 0)
      totals.tokens += tokens
      totals.cost += cost
      totals.count += 1

      const t = r.session_type || 'api'
      if (!byType[t]) byType[t] = { tokens: 0, cost: 0, count: 0 }
      byType[t].tokens += tokens
      byType[t].cost += cost
      byType[t].count += 1

      const p = (r.provider || 'unknown').toLowerCase()
      if (!byProvider[p]) byProvider[p] = { tokens: 0, cost: 0, count: 0 }
      byProvider[p].tokens += tokens
      byProvider[p].cost += cost
      byProvider[p].count += 1

      const mk = `${p}|${r.model_name || 'unknown'}`
      if (!byModel[mk]) byModel[mk] = { model: r.model_name || 'unknown', provider: p, tokens: 0, cost: 0, count: 0 }
      byModel[mk].tokens += tokens
      byModel[mk].cost += cost
      byModel[mk].count += 1

      const d = parseDate(r.created_at) || new Date()
      const dayKey = startOfDay(d).toISOString().slice(0, 10)
      if (!byDay[dayKey]) byDay[dayKey] = { date: dayKey, tokens: 0, cost: 0, count: 0, api: 0, credits: 0, cli: 0 }
      byDay[dayKey].tokens += tokens
      byDay[dayKey].cost += cost
      byDay[dayKey].count += 1
      if (t === 'api') byDay[dayKey].api += cost
      else if (t === 'credits') byDay[dayKey].credits += cost
      else if (t === 'cli') byDay[dayKey].cli += cost

      const fam = (r as any).model_family || 'unknown'
      if (!byFamily[fam]) byFamily[fam] = { family: fam, tokens: 0, cost: 0, count: 0 }
      byFamily[fam].tokens += tokens
      byFamily[fam].cost += cost
      byFamily[fam].count += 1
    }

    // Top lists
    const topModels = Object.values(byModel)
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10)

    const topProviders = Object.entries(byProvider)
      .map(([provider, v]) => ({ provider, ...v }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10)

    const topFamilies = Object.values(byFamily)
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10)

    // Linkable recent activity (latest 25)
    const chatBase = process.env.NEXT_PUBLIC_CHAT_BASE_PATH || '/chat'

    const recent = allRows
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 25)
      .map((r) => ({
        id: r.id,
        when: r.created_at,
        type: r.session_type,
        provider: r.provider,
        model: r.model_name,
        tokens: Number(r.tokens_used || 0),
        cost: Number(r.cost || 0),
        sessionId: r.session_id,
        sessionUrl: r.session_id ? `${chatBase}/${r.session_id}` : null,
      }))

    const series = Object.values(byDay)
      .sort((a, b) => (a.date < b.date ? -1 : 1))

    // Comparison period (previous window of equal length)
    let compareSummary: any = null
    let seriesPrev: number[] | null = null
    if (compare) {
      const windowMs = to.getTime() - from.getTime()
      const prevTo = new Date(from.getTime())
      const prevFrom = new Date(from.getTime() - windowMs)

      const { data: prevUsage, error: prevErr } = await supabaseServer
        .from('usage_sessions')
        .select('id,user_id,session_id,model_name,provider,tokens_used,cost,session_type,metadata,created_at')
        .eq('user_id', userId)
        .gte('created_at', prevFrom.toISOString())
        .lte('created_at', prevTo.toISOString())
        .order('created_at', { ascending: false })
        .limit(limit)
      if (!prevErr) {
        let prevRows = (prevUsage ?? []) as UsageRow[]
        if (filterType) prevRows = prevRows.filter((r) => (r.session_type || '').toLowerCase() === filterType)
        if (filterProvider) prevRows = prevRows.filter((r) => (r.provider || '').toLowerCase() === filterProvider)
        // Family filter is best-effort; omitted for prev range to avoid heavy joins, acceptable for comparison signal
        const prevByDay: Record<string, number> = {}
        for (const r of prevRows) {
          const d = parseDate(r.created_at) || new Date()
          const k = startOfDay(d).toISOString().slice(0, 10)
          prevByDay[k] = (prevByDay[k] || 0) + Number(r.cost || 0)
        }
        // Align to current series dates
        seriesPrev = series.map((s) => prevByDay[s.date] || 0)
        const prevCost = Object.values(prevByDay).reduce((a, b) => a + b, 0)
        compareSummary = {
          prev: { from: prevFrom.toISOString(), to: prevTo.toISOString(), cost: Math.round(prevCost * 1e6) / 1e6 },
          deltaCostPct: totals.cost ? Math.round(((totals.cost - prevCost) / totals.cost) * 1000) / 10 : null,
        }
      }
    }

    const response = {
      userId,
      range: { from: from.toISOString(), to: to.toISOString() },
      totals: {
        tokens: totals.tokens,
        cost: Math.round(totals.cost * 1e6) / 1e6,
        count: totals.count,
        byType: Object.fromEntries(
          Object.entries(byType).map(([k, v]) => [k, { tokens: v.tokens, cost: Math.round(v.cost * 1e6) / 1e6, count: v.count }])
        ),
      },
      timeseries: series,
      timeseriesPrev: seriesPrev,
      compare: compareSummary,
      topModels,
      topProviders,
      topFamilies,
      recent,
    }

    // CSV export if requested
    const format = searchParams.get('format')
    if (format === 'csv') {
      const rowsCsv = ['when,type,provider,model,tokens,cost,session_id']
      for (const r of allRows) {
        rowsCsv.push(
          [
            JSON.stringify(r.created_at),
            JSON.stringify(r.session_type),
            JSON.stringify(r.provider),
            JSON.stringify(r.model_name),
            String(Number(r.tokens_used || 0)),
            String(Math.round(Number(r.cost || 0) * 1e6) / 1e6),
            JSON.stringify(r.session_id || ''),
          ].join(',')
        )
      }
      const csv = rowsCsv.join('\n')
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="activity_${from.toISOString().slice(0, 10)}_${to
            .toISOString()
            .slice(0, 10)}.csv"`,
        },
      })
    }

    return NextResponse.json(response)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'unknown error' }, { status: 500 })
  }
}
