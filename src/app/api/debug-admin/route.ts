import { NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Check what tables exist and their counts
    const tablesToCheck = [
      'profiles',
      'user_subscriptions',
      'models_registry',
      'mcp_request_logs',
      'chat_sessions',
      'chat_messages',
      'usage_sessions',
      'purchase_history',
      'admin_credit_adjustments',
      'admin_activity_log',
      'mcp_user_tokens',
      'user_preferences'
    ]

    const results: Record<string, any> = {}

    for (const table of tablesToCheck) {
      try {
        // Try to get count
        const { count, error, data } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })

        if (error) {
          results[table] = {
            exists: false,
            error: error.message,
            count: 0
          }
        } else {
          results[table] = {
            exists: true,
            count: count || 0,
            error: null
          }
        }
      } catch (err) {
        results[table] = {
          exists: false,
          error: err instanceof Error ? err.message : 'Unknown error',
          count: 0
        }
      }
    }

    // Also try to get actual data samples from profiles
    let profilesSample = null
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, created_at')
        .limit(5)
      profilesSample = profiles
    } catch (err) {
      profilesSample = { error: err instanceof Error ? err.message : 'Unknown error' }
    }

    return NextResponse.json({
      tables: results,
      profilesSample,
      summary: {
        totalTables: Object.keys(results).length,
        existingTables: Object.values(results).filter((r: any) => r.exists).length,
        totalUsers: results.profiles?.count || 0,
        totalModels: results.models_registry?.count || 0
      }
    })
  } catch (error) {
    console.error('Debug admin error:', error)
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}