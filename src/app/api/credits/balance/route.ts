import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import CreditManager from '@/lib/creditManager'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const creditManager = new CreditManager()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's credit balance
    const credits = await creditManager.getUserCredits(user.id)
    if (!credits) {
      return NextResponse.json({ error: 'Credits not found' }, { status: 404 })
    }

    // Get purchase history
    const purchaseHistory = await creditManager.getPurchaseHistory(user.id)
    
    // Get usage history
    const usageHistory = await creditManager.getUserUsageHistory(user.id, 10)
    
    // Get spending analytics
    const analytics = await creditManager.getSpendingAnalytics(user.id, 30)
    
    // Get user's OpenRouter key info
    const openRouterKey = await creditManager.getUserOpenRouterKey(user.id)
    
    return NextResponse.json({
      balance: credits.balance,
      totalPurchased: credits.total_purchased,
      totalSpent: credits.total_spent,
      hasOpenRouterKey: !!openRouterKey,
      openRouterKeyActive: openRouterKey?.is_active || false,
      purchaseHistory: purchaseHistory.slice(0, 5), // Latest 5 purchases
      recentUsage: usageHistory,
      analytics: {
        totalSpent: analytics.totalSpent,
        totalRequests: analytics.totalRequests,
        avgCostPerRequest: analytics.avgCostPerRequest,
        topModels: Object.entries(analytics.modelBreakdown)
          .sort(([,a], [,b]) => (b as any).cost - (a as any).cost)
          .slice(0, 3)
          .map(([model, stats]) => ({ model, ...(stats as any) }))
      },
      createdAt: credits.created_at,
      updatedAt: credits.updated_at
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
    const supabase = createClient()
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