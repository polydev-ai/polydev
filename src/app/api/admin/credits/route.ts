import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/app/utils/supabase/server'

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

    // Get all data using admin client to bypass RLS
    const adminClient = createAdminClient()

    // Get users with their current credits
    const { data: users, error: usersError } = await adminClient
      .from('profiles')
      .select('id, email, credits, created_at')
      .order('email')

    if (usersError) {
      console.error('Error loading users:', usersError)
      return NextResponse.json({
        error: 'Failed to fetch users',
        details: usersError.message
      }, { status: 500 })
    }

    // Get credit adjustments with user info
    const { data: adjustments, error: adjustmentsError } = await adminClient
      .from('admin_credit_adjustments')
      .select(`
        *,
        user:profiles(id, email)
      `)
      .order('created_at', { ascending: false })

    if (adjustmentsError) {
      console.log('Credit adjustments table not available:', adjustmentsError)
    }

    console.log(`📊 Admin Credits API: Found ${users?.length || 0} users and ${adjustments?.length || 0} adjustments`)

    return NextResponse.json({
      success: true,
      users: users || [],
      adjustments: adjustments || [],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Admin credits API error:', error)
    return NextResponse.json({
      error: 'Failed to retrieve admin credits data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
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

    const { userId, amount, reason } = await request.json()

    if (!userId || !amount || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Add credit adjustment record
    const { error: adjustmentError } = await adminClient
      .from('admin_credit_adjustments')
      .insert([{
        user_id: userId,
        amount,
        reason,
        admin_email: user.email
      }])

    if (adjustmentError) {
      console.error('Error adding credit adjustment:', adjustmentError)
      return NextResponse.json({
        error: 'Failed to add credit adjustment',
        details: adjustmentError.message
      }, { status: 500 })
    }

    // Update user credits
    const { data: currentUser } = await adminClient
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single()

    const newCredits = (currentUser?.credits || 0) + amount

    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ credits: newCredits })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user credits:', updateError)
      return NextResponse.json({
        error: 'Failed to update user credits',
        details: updateError.message
      }, { status: 500 })
    }

    // Log activity
    try {
      await adminClient
        .from('admin_activity_log')
        .insert([{
          admin_email: user.email,
          action: 'credit_adjustment',
          details: `Adjusted credits for user ${userId}: ${amount > 0 ? '+' : ''}${amount} (${reason})`
        }])
    } catch (error) {
      console.log('Error logging activity:', error)
    }

    return NextResponse.json({
      success: true,
      message: 'Credits adjusted successfully'
    })

  } catch (error) {
    console.error('Admin credits adjustment API error:', error)
    return NextResponse.json({
      error: 'Failed to adjust credits',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}