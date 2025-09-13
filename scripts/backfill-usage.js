// One-off backfill for usage_sessions without writing raw SQL.
// Uses Supabase service role and paginated updates.

const fs = require('fs')
const path = require('path')

async function main() {
  const envPath = path.join(__dirname, '..', '.env.local')
  const envStr = fs.readFileSync(envPath, 'utf8')
  const env = Object.fromEntries(envStr.split(/\r?\n/).filter(Boolean).map(line => {
    const i = line.indexOf('=')
    return [line.slice(0, i), line.slice(i + 1)]
  }))

  const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing SUPABASE envs in .env.local')
    process.exit(1)
  }

  const supaPath = path.join(__dirname, '..', 'node_modules', '@supabase', 'supabase-js')
  const { createClient } = require(supaPath)
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const batchSize = 500
  let processed = 0
  let updated = 0
  let offset = 0

  while (true) {
    const { data: rows, error } = await supabase
      .from('usage_sessions')
      .select('id, session_type, provider, model_name, tokens_used, cost, metadata')
      .order('created_at', { ascending: false })
      .range(offset, offset + batchSize - 1)

    if (error) throw error
    if (!rows || rows.length === 0) break

    const updates = []
    for (const row of rows) {
      processed++
      const meta = row.metadata || {}
      let newType = null
      const fm = typeof meta.fallback_method === 'string' ? meta.fallback_method : ''
      if (fm === 'credits') newType = 'credits'
      else if (fm === 'cli') newType = 'cli'
      else if (fm === 'api') newType = 'api'

      if (!newType && typeof row.session_type === 'string') {
        if (row.session_type === 'api_key') newType = 'api'
        else if (row.session_type === 'cli_tool') newType = 'cli'
        else if (['api', 'cli', 'credits'].includes(row.session_type)) newType = row.session_type
      }
      if (!newType) newType = 'api'

      let newCost = row.cost
      if (newCost == null || newCost === 0) {
        const inputCost = Number(meta.input_cost || 0)
        const outputCost = Number(meta.output_cost || 0)
        const creditsUsed = Number(meta.credits_used || 0)
        const sumCost = inputCost + outputCost
        if (sumCost > 0) newCost = sumCost
        else if (creditsUsed > 0) newCost = creditsUsed
        else if (newCost == null) newCost = 0
      }

      if (row.session_type !== newType || row.cost !== newCost) {
        updates.push({ id: row.id, session_type: newType, cost: newCost })
      }
    }

    if (updates.length > 0) {
      const { error: updErr } = await supabase.from('usage_sessions').upsert(updates)
      if (updErr) throw updErr
      updated += updates.length
    }

    if (rows.length < batchSize) break
    offset += batchSize
  }

  console.log(JSON.stringify({ processed, updated }))
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
