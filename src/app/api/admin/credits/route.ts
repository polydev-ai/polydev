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

    // Get users with their current credits from user_credits table
    const { data: users, error: usersError } = await adminClient
      .from('profiles')
      .select(`
        id,
        email,
        created_at,
        user_credits (
          balance,
          promotional_balance
        )
      `)
      .order('email')

    if (usersError) {
      console.error('Error loading users:', usersError)
      return NextResponse.json({
        error: 'Failed to fetch users',
        details: usersError.message
      }, { status: 500 })
    }

    // Transform users data to include calculated credits
    const transformedUsers = (users || []).map(user => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      credits: user.user_credits && user.user_credits.length > 0
        ? (parseFloat(user.user_credits[0].balance) + parseFloat(user.user_credits[0].promotional_balance))
        : 0
    }))

    // Get credit adjustments with user info
    const { data: adjustments, error: adjustmentsError } = await adminClient
      .from('admin_credit_adjustments')
      .select(`
        id,
        user_id,
        amount,
        reason,
        created_at,
        admin_id,
        profiles!admin_credit_adjustments_admin_id_fkey(email)
      `)
      .order('created_at', { ascending: false })

    if (adjustmentsError) {
      console.log('Credit adjustments table not available:', adjustmentsError)
    }

    // Transform adjustments to match expected format
    const transformedAdjustments = (adjustments || []).map(adj => {
      const adminEmail = Array.isArray(adj.profiles) ? adj.profiles[0]?.email : adj.profiles?.email || 'Unknown Admin'
      const userEmail = transformedUsers.find(u => u.id === adj.user_id)?.email || 'Unknown User'

      return {
        id: adj.id,
        user_id: adj.user_id,
        amount: parseFloat(adj.amount),
        reason: adj.reason,
        created_at: adj.created_at,
        admin_email: adminEmail,
        user: {
          email: userEmail
        }
      }
    })

    console.log(`📊 Admin Credits API: Found ${transformedUsers?.length || 0} users and ${transformedAdjustments?.length || 0} adjustments`)

    return NextResponse.json({
      success: true,
      users: transformedUsers,
      adjustments: transformedAdjustments,
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

    // Get current user credits
    const { data: currentUserCredits } = await adminClient
      .from('user_credits')
      .select('balance, promotional_balance')
      .eq('user_id', userId)
      .single()

    const currentBalance = parseFloat(currentUserCredits?.balance || '0')
    const currentPromoBalance = parseFloat(currentUserCredits?.promotional_balance || '0')

    // Calculate new balances - add to promotional balance for positive adjustments
    let newBalance = currentBalance
    let newPromoBalance = currentPromoBalance

    if (amount > 0) {
      newPromoBalance = currentPromoBalance + amount
    } else {
      // For negative adjustments, deduct from promotional balance first, then regular balance
      const totalDeduction = Math.abs(amount)
      if (currentPromoBalance >= totalDeduction) {
        newPromoBalance = currentPromoBalance - totalDeduction
      } else {
        newPromoBalance = 0
        newBalance = Math.max(0, currentBalance - (totalDeduction - currentPromoBalance))
      }
    }

    // Add credit adjustment record
    const { error: adjustmentError } = await adminClient
      .from('admin_credit_adjustments')
      .insert([{
        user_id: userId,
        admin_id: user.id,
        adjustment_type: amount > 0 ? 'add' : 'subtract',
        amount: Math.abs(amount),
        reason,
        previous_balance: currentBalance + currentPromoBalance,
        new_balance: newBalance + newPromoBalance
      }])

    if (adjustmentError) {
      console.error('Error adding credit adjustment:', adjustmentError)
      return NextResponse.json({
        error: 'Failed to add credit adjustment',
        details: adjustmentError.message
      }, { status: 500 })
    }

    // Update user credits in user_credits table
    const { error: updateError } = await adminClient
      .from('user_credits')
      .update({
        balance: newBalance.toString(),
        promotional_balance: newPromoBalance.toString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

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
          admin_id: user.id,
          action_type: 'credit_adjustment',
          target_type: 'user',
          target_id: userId,
          details: {
            amount: amount,
            reason: reason,
            admin_email: user.email,
            previous_balance: currentBalance + currentPromoBalance,
            new_balance: newBalance + newPromoBalance
          }
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