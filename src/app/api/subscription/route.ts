import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { subscriptionManager } from '@/lib/subscriptionManager'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get subscription data
    const subscription = await subscriptionManager.getUserSubscription(user.id)
    const messageUsage = await subscriptionManager.getUserMessageUsage(user.id)
    const credits = await subscriptionManager.getUserCredits(user.id)

    return NextResponse.json({
      subscription,
      messageUsage,
      credits: credits || {
        balance: 0,
        promotional_balance: 0,
        monthly_allocation: 0,
        total_spent: 0
      }
    })

  } catch (error) {
    console.error('[Subscription API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}