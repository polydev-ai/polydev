import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Query user credits
    const { data: credits, error } = await supabase
      .from('user_credits')
      .select('balance, promotional_balance, monthly_allocation, total_spent, last_monthly_reset')
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching user credits:', error)
      return NextResponse.json({ error: 'Failed to fetch user credits' }, { status: 500 })
    }

    const creditsData = credits ? {
      balance: parseFloat(credits.balance) || 0,
      promotional_balance: parseFloat(credits.promotional_balance) || 0,
      monthly_allocation: parseFloat(credits.monthly_allocation) || 0,
      total_spent: parseFloat(credits.total_spent) || 0,
      last_monthly_reset: credits.last_monthly_reset
    } : {
      balance: 0,
      promotional_balance: 0,
      monthly_allocation: 0,
      total_spent: 0,
      last_monthly_reset: null
    }

    return NextResponse.json({ 
      credits: creditsData,
      meta: {
        generatedAt: new Date().toISOString(),
        userId: user.id
      }
    })

  } catch (error) {
    console.error('User credits error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}