import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { createClient as createServerClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service role to get user credits
    const serviceSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if user_credits table exists and get balance
    const { data: credits, error: creditsError } = await serviceSupabase
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .single()

    let userCredits = {
      balance: 0,
      total_purchased: 0,
      total_spent: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (creditsError && creditsError.code === 'PGRST116') {
      // No credits record exists, create one
      const { data: newCredits, error: insertError } = await serviceSupabase
        .from('user_credits')
        .insert({
          user_id: user.id,
          balance: 0,
          total_purchased: 0,
          total_spent: 0
        })
        .select()
        .single()

      if (insertError) {
        console.error('[Credits Balance] Failed to create credits record:', insertError)
        // Return default values if table doesn't exist
        userCredits = {
          balance: 0,
          total_purchased: 0,
          total_spent: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      } else {
        userCredits = newCredits
      }
    } else if (!creditsError && credits) {
      userCredits = credits
    }
    
    return NextResponse.json({
      balance: userCredits.balance || 0,
      totalPurchased: userCredits.total_purchased || 0,
      totalSpent: userCredits.total_spent || 0,
      hasOpenRouterKey: false,
      openRouterKeyActive: false,
      purchaseHistory: [],
      recentUsage: [],
      analytics: {
        totalSpent: 0,
        totalRequests: 0,
        avgCostPerRequest: 0,
        topModels: []
      },
      createdAt: userCredits.created_at,
      updatedAt: userCredits.updated_at
    })

  } catch (error) {
    console.error('[Credits Balance] Error fetching balance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credit balance' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const creditManager = new CreditManager()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, amount, description } = await request.json()
    
    switch (action) {
      case 'check_sufficient':
        const credits = await creditManager.getUserCredits(user.id)
        const canAfford = credits && credits.balance >= amount
        
        return NextResponse.json({
          sufficient: canAfford,
          currentBalance: credits?.balance || 0,
          required: amount
        })
      
      case 'estimate_cost':
        const { modelId, promptTokens, completionTokens = 100 } = await request.json()
        
        // This would integrate with OpenRouter pricing API
        // For now, return a simple estimate
        const estimatedCost = (promptTokens * 0.00001) + (completionTokens * 0.00003)
        
        return NextResponse.json({
          estimatedCost,
          promptCost: promptTokens * 0.00001,
          completionCost: completionTokens * 0.00003,
          modelId
        })
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('[Credits Balance] Error processing request:', error)
    return NextResponse.json(
      { error: 'Failed to process credit request' },
      { status: 500 }
    )
  }
}