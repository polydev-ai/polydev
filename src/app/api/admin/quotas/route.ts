import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/app/utils/supabase/server'

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

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Check admin access
    const isAdmin = await checkAdminAccess(adminClient, user.id, user.email || '')
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Get all perspective quotas with user emails
    const { data: quotas, error: quotasError } = await adminClient
      .from('perspective_quotas')
      .select('*')
      .order('created_at', { ascending: false })

    if (quotasError) {
      console.error('[Admin Quotas API] Error fetching quotas:', quotasError)
      // Try alternative table name
      const { data: altQuotas, error: altError } = await adminClient
        .from('user_perspective_quotas')
        .select('*')
        .order('created_at', { ascending: false })

      if (altError) {
        console.error('[Admin Quotas API] Alt table error:', altError)
        return NextResponse.json({
          success: true,
          quotas: [],
          message: 'No quota data found'
        })
      }

      // Get user emails for alt quotas
      const userIds = [...new Set(altQuotas?.map(q => q.user_id).filter(Boolean) || [])]
      const { data: profiles } = await adminClient
        .from('profiles')
        .select('id, email')
        .in('id', userIds)

      const emailMap = new Map((profiles || []).map(p => [p.id, p.email]))

      const quotasWithEmail = (altQuotas || []).map(quota => ({
        ...quota,
        email: emailMap.get(quota.user_id) || 'Unknown'
      }))

      return NextResponse.json({
        success: true,
        quotas: quotasWithEmail
      })
    }

    // Get user emails
    const userIds = [...new Set(quotas?.map(q => q.user_id).filter(Boolean) || [])]

    let emailMap = new Map<string, string>()
    if (userIds.length > 0) {
      const { data: profiles } = await adminClient
        .from('profiles')
        .select('id, email')
        .in('id', userIds)

      emailMap = new Map((profiles || []).map(p => [p.id, p.email]))
    }

    const quotasWithEmail = (quotas || []).map(quota => ({
      ...quota,
      email: emailMap.get(quota.user_id) || 'Unknown'
    }))

    return NextResponse.json({
      success: true,
      quotas: quotasWithEmail
    })

  } catch (error) {
    console.error('[Admin Quotas API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', quotas: [] },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Check admin access
    const isAdmin = await checkAdminAccess(adminClient, user.id, user.email || '')
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, action, field, value } = body

    if (!userId) {
      return NextResponse.json({ error: 'Missing user ID' }, { status: 400 })
    }

    // Try perspective_quotas first, fall back to user_perspective_quotas
    const tableName = 'perspective_quotas'
    const altTableName = 'user_perspective_quotas'

    if (action === 'update') {
      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      if (field && value !== undefined) {
        updateData[field] = value
      }

      let { error } = await adminClient
        .from(tableName)
        .update(updateData)
        .eq('user_id', userId)

      if (error) {
        // Try alternative table
        const { error: altError } = await adminClient
          .from(altTableName)
          .update(updateData)
          .eq('user_id', userId)

        if (altError) {
          console.error('[Admin Quotas API] Update error:', altError)
          throw altError
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Quota updated successfully'
      })
    }

    if (action === 'reset') {
      const resetData: any = {
        messages_used: 0,
        premium_perspectives_used: 0,
        normal_perspectives_used: 0,
        eco_perspectives_used: 0,
        current_month_start: new Date().toISOString().slice(0, 10),
        last_reset_date: new Date().toISOString().slice(0, 10),
        updated_at: new Date().toISOString()
      }

      let { error } = await adminClient
        .from(tableName)
        .update(resetData)
        .eq('user_id', userId)

      if (error) {
        // Try alternative table
        const { error: altError } = await adminClient
          .from(altTableName)
          .update(resetData)
          .eq('user_id', userId)

        if (altError) {
          console.error('[Admin Quotas API] Reset error:', altError)
          throw altError
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Quota reset successfully'
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('[Admin Quotas API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
