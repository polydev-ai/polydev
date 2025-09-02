import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's promotional credits
    const { data: promotionalCredits, error } = await supabase
      .from('promotional_credits')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('granted_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get current balance
    const { data: credits } = await supabase
      .from('user_credits')
      .select('promotional_balance, promotional_total')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({ 
      promotional_credits: promotionalCredits || [],
      current_balance: credits?.promotional_balance || 0,
      total_granted: credits?.promotional_total || 0
    })

  } catch (error) {
    console.error('Promotional credits fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // This endpoint requires admin access - check for service role or admin user
    const authHeader = request.headers.get('authorization')
    const isServiceRole = authHeader?.startsWith('Bearer ') && 
      authHeader.includes(process.env.SUPABASE_SERVICE_ROLE_KEY || '')

    if (!isServiceRole) {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Check if user is admin (you'd implement this based on your user roles system)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }
    }

    const { 
      user_id, 
      amount, 
      reason, 
      expires_at, 
      granted_by 
    } = await request.json()

    if (!user_id || !amount || !reason) {
      return NextResponse.json({ 
        error: 'user_id, amount, and reason are required' 
      }, { status: 400 })
    }

    if (amount <= 0) {
      return NextResponse.json({ 
        error: 'Amount must be positive' 
      }, { status: 400 })
    }

    // Use service role client for admin operations
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    )

    // Grant promotional credits using the stored procedure
    const { data, error } = await serviceClient.rpc('grant_promotional_credits', {
      p_user_id: user_id,
      p_amount: amount,
      p_reason: reason,
      p_expires_at: expires_at || null,
      p_granted_by: granted_by || null
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      promotional_credit_id: data,
      message: `Granted ${amount} promotional credits to user for: ${reason}`
    })

  } catch (error) {
    console.error('Promotional credits grant error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Automatic promotional credit granting for new users
export async function grantWelcomeCredits(userId: string): Promise<boolean> {
  try {
    const welcomeCreditsAmount = 10 // $10 worth of credits for new users
    
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) return false

    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    )

    await serviceClient.rpc('grant_promotional_credits', {
      p_user_id: userId,
      p_amount: welcomeCreditsAmount,
      p_reason: 'welcome_bonus',
      p_expires_at: null, // No expiration for welcome credits
      p_granted_by: null
    })

    return true
  } catch (error) {
    console.error('Welcome credits grant error:', error)
    return false
  }
}

// Bulk promotional credit campaigns
export async function POST_BULK(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin access
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { 
      user_ids, 
      amount, 
      reason, 
      expires_at 
    } = await request.json()

    if (!user_ids || !Array.isArray(user_ids) || !amount || !reason) {
      return NextResponse.json({ 
        error: 'user_ids (array), amount, and reason are required' 
      }, { status: 400 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    )

    const results = await Promise.allSettled(
      user_ids.map(userId => 
        serviceClient.rpc('grant_promotional_credits', {
          p_user_id: userId,
          p_amount: amount,
          p_reason: reason,
          p_expires_at: expires_at || null,
          p_granted_by: user.id
        })
      )
    )

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    return NextResponse.json({ 
      success: true,
      total: user_ids.length,
      successful,
      failed,
      message: `Granted ${amount} promotional credits to ${successful} users for: ${reason}`
    })

  } catch (error) {
    console.error('Bulk promotional credits error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}