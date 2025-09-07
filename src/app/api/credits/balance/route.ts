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
    
    // Fetch purchase history
    const { data: purchaseHistory } = await serviceSupabase
      .from('purchase_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Fetch recent usage sessions
    const { data: recentUsage } = await serviceSupabase
      .from('usage_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    // Calculate analytics from usage sessions (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: analyticsData } = await serviceSupabase
      .from('usage_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo)

    // Process analytics
    const analytics = {
      totalSpent: 0,
      totalRequests: 0,
      avgCostPerRequest: 0,
      topModels: [] as Array<{model: string, usage: number, cost: number}>
    }

    const modelStats = new Map<string, {usage: number, cost: number}>()

    if (analyticsData) {
      analyticsData.forEach(session => {
        const cost = parseFloat(session.cost_credits || '0')
        const requests = session.message_count || 0
        
        analytics.totalSpent += cost
        analytics.totalRequests += requests

        // Track model usage
        if (session.model_name) {
          const existing = modelStats.get(session.model_name) || { usage: 0, cost: 0 }
          existing.usage += requests
          existing.cost += cost
          modelStats.set(session.model_name, existing)
        }
      })

      analytics.avgCostPerRequest = analytics.totalRequests > 0 ? 
        analytics.totalSpent / analytics.totalRequests : 0

      // Get top 5 models by usage
      analytics.topModels = Array.from(modelStats.entries())
        .sort((a, b) => b[1].usage - a[1].usage)
        .slice(0, 5)
        .map(([model, stats]) => ({
          model,
          usage: stats.usage,
          cost: stats.cost
        }))
    }

    // Format purchase history
    const formattedPurchaseHistory = (purchaseHistory || []).map(purchase => ({
      id: purchase.id,
      date: purchase.created_at,
      amount: purchase.amount_paid / 100, // Convert cents to dollars
      credits: purchase.credits_purchased,
      package: purchase.metadata?.package_name || 'Credit Purchase',
      status: purchase.status
    }))

    // Format recent usage
    const formattedRecentUsage = (recentUsage || []).map(session => ({
      id: session.id,
      date: session.created_at,
      tool: session.tool_name || session.provider || 'Unknown',
      model: session.model_name,
      requests: session.message_count,
      tokens: session.total_tokens,
      cost: parseFloat(session.cost_credits || '0'),
      type: session.session_type
    }))

    return NextResponse.json({
      balance: userCredits.balance || 0,
      totalPurchased: userCredits.total_purchased || 0,
      totalSpent: userCredits.total_spent || 0,
      hasOpenRouterKey: false,
      openRouterKeyActive: false,
      purchaseHistory: formattedPurchaseHistory,
      recentUsage: formattedRecentUsage,
      analytics: {
        totalSpent: parseFloat(analytics.totalSpent.toFixed(4)),
        totalRequests: analytics.totalRequests,
        avgCostPerRequest: parseFloat(analytics.avgCostPerRequest.toFixed(4)),
        topModels: analytics.topModels
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
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, amount, description } = await request.json()
    
    switch (action) {
      case 'check_sufficient':
        // Use service role to get user credits
        const serviceSupabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: credits } = await serviceSupabase
          .from('user_credits')
          .select('*')
          .eq('user_id', user.id)
          .single()
          
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