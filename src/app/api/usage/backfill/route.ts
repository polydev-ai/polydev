import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// Admin-only backfill to normalize historical usage_sessions rows
// - session_type: map from metadata.fallback_method or legacy values -> 'api' | 'cli' | 'credits'
// - cost: if null, derive from metadata.input_cost + metadata.output_cost or metadata.credits_used
// - provider: left as-is (analytics rely primarily on session_type)

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const authz = request.headers.get('authorization') || ''
    // Accept service role Bearer or optional Basic auth (env-configured)
    const isServiceRole = authz.startsWith('Bearer ') && authz.includes(process.env.SUPABASE_SERVICE_ROLE_KEY || '')
    let isBasicAdmin = false
    if (authz.startsWith('Basic ')) {
      try {
        const decoded = Buffer.from(authz.replace('Basic ', ''), 'base64').toString('utf8')
        const [u, p] = decoded.split(':')
        if (u && p && process.env.ADMIN_BASIC_USER && process.env.ADMIN_BASIC_PASS) {
          isBasicAdmin = (u === process.env.ADMIN_BASIC_USER && p === process.env.ADMIN_BASIC_PASS)
        }
      } catch {}
    }
    let isAdmin = false
    if (isServiceRole || isBasicAdmin) {
      isAdmin = true
    } else {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      // Simple admin gate – restrict to known admin emails
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single()
      isAdmin = !!(profile?.email && ['admin@polydev.ai', 'venkat@polydev.ai'].includes(profile.email))
    }
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Process in batches
    const batchSize = 500
    let processed = 0
    let updated = 0

    while (true) {
      const { data: rows, error } = await service
        .from('usage_sessions')
        .select('id, session_type, provider, model_name, tokens_used, cost, metadata')
        .or('session_type.is.null,session_type.in.(api_key,cli_tool),cost.is.null')
        .limit(batchSize)

      if (error) throw error
      if (!rows || rows.length === 0) break

      const updates = [] as any[]
      for (const row of rows) {
        processed++
        const meta = row.metadata || {}
        let newType: 'api' | 'cli' | 'credits' | null = null
        // 1) from metadata.fallback_method if available
        const fm = typeof meta.fallback_method === 'string' ? meta.fallback_method : ''
        if (fm === 'credits') newType = 'credits'
        else if (fm === 'cli') newType = 'cli'
        else if (fm === 'api') newType = 'api'

        // 2) map legacy values
        if (!newType && typeof row.session_type === 'string') {
          if (row.session_type === 'api_key') newType = 'api'
          else if (row.session_type === 'cli_tool') newType = 'cli'
          else if ((['api', 'cli', 'credits'] as const).includes(row.session_type as any)) newType = row.session_type as 'api' | 'cli' | 'credits'
        }

        // Default if still null
        if (!newType) newType = 'api'

        // Normalize cost
        let newCost = row.cost
        if (newCost == null) {
          const inputCost = Number(meta.input_cost || 0)
          const outputCost = Number(meta.output_cost || 0)
          const creditsUsed = Number(meta.credits_used || 0)
          const sumCost = inputCost + outputCost
          if (sumCost > 0) newCost = sumCost
          else if (creditsUsed > 0) newCost = creditsUsed
          else newCost = 0
        }

        // Only push update when needed
        const needsUpdate = (row.session_type !== newType) || (row.cost !== newCost)
        if (needsUpdate) {
          updates.push({ id: row.id, session_type: newType, cost: newCost })
        }
      }

      if (updates.length > 0) {
        const { error: updErr } = await service
          .from('usage_sessions')
          .upsert(updates)
        if (updErr) throw updErr
        updated += updates.length
      }

      if (rows.length < batchSize) break
    }

    return NextResponse.json({ processed, updated })
  } catch (e: any) {
    console.error('[usage/backfill] error:', e)
    return NextResponse.json({ error: 'Failed to backfill usage sessions' }, { status: 500 })
  }
}
