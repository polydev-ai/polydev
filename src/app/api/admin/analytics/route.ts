import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// Helper function to check admin access
async function checkAdminAccess(adminClient: any, userId: string, userEmail: string): Promise<boolean> {
  const legacyAdminEmails = new Set(['admin@polydev.ai', 'venkat@polydev.ai', 'gvsfans@gmail.com']);
  if (legacyAdminEmails.has(userEmail)) return true;

  try {
    const { data: profile } = await adminClient
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();
    return profile?.is_admin || false;
  } catch (error) {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const adminClient = createAdminClient()
    const isAdmin = await checkAdminAccess(adminClient, user.id, user.email || '')

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') || 'system'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Route to appropriate analytics query
    switch (type) {
      case 'system':
        return await getSystemStats(supabase)

      case 'daily-trends':
        return await getDailyTrends(supabase, startDate, endDate)

      case 'providers':
        return await getProviderAnalytics(supabase, startDate, endDate)

      case 'models':
        return await getModelAnalytics(supabase, startDate, endDate)

      case 'admin-keys':
        return await getAdminKeysAnalytics(supabase, startDate, endDate)

      case 'user-keys':
        return await getUserKeysAnalytics(supabase)

      case 'bonuses':
        return await getBonusAnalytics(supabase)

      case 'cost-by-tier':
        return await getCostByTier(supabase, startDate, endDate)

      case 'top-users':
        return await getTopUsers(supabase)

      case 'user-activity':
        return await getUserActivity(supabase)

      default:
        return NextResponse.json(
          { error: 'Invalid analytics type' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error in analytics API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getSystemStats(supabase: any) {
  const { data, error } = await supabase
    .from('admin_system_stats')
    .select('*')
    .single()

  if (error) {
    console.error('Error fetching system stats:', error)
    return NextResponse.json({ error: 'Failed to fetch system stats' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

async function getDailyTrends(supabase: any, startDate?: string | null, endDate?: string | null) {
  let query = supabase
    .from('admin_daily_trends')
    .select('*')
    .order('date', { ascending: true })

  if (startDate) {
    query = query.gte('date', startDate)
  }
  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data, error } = await query.limit(90)

  if (error) {
    console.error('Error fetching daily trends:', error)
    return NextResponse.json({ error: 'Failed to fetch daily trends' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

async function getProviderAnalytics(supabase: any, startDate?: string | null, endDate?: string | null) {
  // Use the function for aggregated data
  const { data, error } = await supabase.rpc('get_provider_usage', {
    start_date: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: endDate || new Date().toISOString()
  })

  if (error) {
    console.error('Error fetching provider analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch provider analytics' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

async function getModelAnalytics(supabase: any, startDate?: string | null, endDate?: string | null) {
  // Use the function for aggregated data
  const { data, error } = await supabase.rpc('get_model_usage', {
    start_date: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: endDate || new Date().toISOString()
  })

  if (error) {
    console.error('Error fetching model analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch model analytics' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

async function getAdminKeysAnalytics(supabase: any, startDate?: string | null, endDate?: string | null) {
  let query = supabase
    .from('admin_api_keys_usage')
    .select('*')
    .order('total_requests', { ascending: false })

  if (startDate) {
    query = query.gte('date', startDate)
  }
  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching admin keys analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch admin keys analytics' }, { status: 500 })
  }

  // Aggregate by key
  const aggregated = data.reduce((acc: any, row: any) => {
    const key = row.provider_source_id
    if (!acc[key]) {
      acc[key] = {
        provider_source_id: row.provider_source_id,
        key_name: row.key_name,
        key_provider: row.key_provider,
        total_requests: 0,
        unique_users: new Set(),
        total_cost: 0,
        total_input_tokens: 0,
        total_output_tokens: 0
      }
    }
    acc[key].total_requests += row.total_requests
    acc[key].total_cost += parseFloat(row.total_cost)
    acc[key].total_input_tokens += row.total_input_tokens
    acc[key].total_output_tokens += row.total_output_tokens
    // Note: unique_users is approximate due to aggregation
    return acc
  }, {})

  const result = Object.values(aggregated).map((item: any) => ({
    ...item,
    unique_users: null // Can't accurately aggregate this
  }))

  return NextResponse.json({ data: result })
}

async function getUserKeysAnalytics(supabase: any) {
  const { data, error } = await supabase
    .from('admin_user_keys_analytics')
    .select('*')

  if (error) {
    console.error('Error fetching user keys analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch user keys analytics' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

async function getBonusAnalytics(supabase: any) {
  const { data, error } = await supabase
    .from('admin_bonus_analytics')
    .select('*')

  if (error) {
    console.error('Error fetching bonus analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch bonus analytics' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

async function getCostByTier(supabase: any, startDate?: string | null, endDate?: string | null) {
  let query = supabase
    .from('admin_cost_by_tier')
    .select('*')
    .order('date', { ascending: true })

  if (startDate) {
    query = query.gte('date', startDate)
  }
  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data, error } = await query.limit(90)

  if (error) {
    console.error('Error fetching cost by tier:', error)
    return NextResponse.json({ error: 'Failed to fetch cost by tier' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

async function getTopUsers(supabase: any) {
  const { data, error } = await supabase
    .from('admin_top_users')
    .select('*')
    .limit(50)

  if (error) {
    console.error('Error fetching top users:', error)
    return NextResponse.json({ error: 'Failed to fetch top users' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

async function getUserActivity(supabase: any) {
  const { data, error } = await supabase
    .from('admin_user_activity')
    .select('*')
    .order('requests_this_month', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Error fetching user activity:', error)
    return NextResponse.json({ error: 'Failed to fetch user activity' }, { status: 500 })
  }

  return NextResponse.json({ data })
}