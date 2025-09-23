import { NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin status
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get all user data using service role to bypass RLS
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        is_admin,
        created_at,
        subscription_tier,
        monthly_queries,
        queries_used,
        api_keys_count
      `)
      .order('created_at', { ascending: false })

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json({
        error: 'Failed to fetch users',
        details: usersError.message
      }, { status: 500 })
    }

    // Get subscription data for each user
    const { data: subscriptions } = await supabase
      .from('user_subscriptions')
      .select('user_id, tier, status')

    // Get user credits
    const { data: credits } = await supabase
      .from('user_credits')
      .select('user_id, balance, promotional_balance')

    // Combine data
    const enrichedUsers = (users || []).map(user => {
      const subscription = subscriptions?.find(sub => sub.user_id === user.id)
      const credit = credits?.find(cred => cred.user_id === user.id)

      return {
        ...user,
        subscription_status: subscription?.status || 'none',
        subscription_tier: subscription?.tier || user.subscription_tier || 'free',
        credits: credit ? (credit.balance + credit.promotional_balance) : 0,
        last_login: null // Could add this if we track it
      }
    })

    console.log(`📊 Admin Users API: Found ${enrichedUsers.length} users`)

    return NextResponse.json({
      success: true,
      users: enrichedUsers,
      count: enrichedUsers.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Admin users API error:', error)
    return NextResponse.json({
      error: 'Failed to retrieve admin users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin status
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { userId, action, value } = await request.json()

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let updateData: any = {}

    switch (action) {
      case 'toggle_admin':
        updateData = { is_admin: value }
        break
      case 'update_tier':
        updateData = { subscription_tier: value }
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user:', updateError)
      return NextResponse.json({
        error: 'Failed to update user',
        details: updateError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'User updated successfully'
    })

  } catch (error) {
    console.error('Admin users update API error:', error)
    return NextResponse.json({
      error: 'Failed to update user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}