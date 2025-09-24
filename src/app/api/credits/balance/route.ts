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
      promotional_balance: 0,
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
          promotional_balance: 0,
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
          promotional_balance: 0,
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

    // Get comprehensive spending data from multiple sources (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // Get MCP request logs
    const { data: mcpRequestLogs } = await serviceSupabase
      .from('mcp_request_logs')
      .select('id, total_cost, total_tokens, created_at, models_requested, status')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo)

    // Get chat logs
    const { data: chatLogs } = await serviceSupabase
      .from('chat_logs')
      .select('id, total_cost, total_tokens, created_at, models_used')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo)

    // Fallback to usage sessions
    const { data: analyticsData } = await serviceSupabase
      .from('usage_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo)

    // Combine all spending data
    const allSpendingData = [
      ...(mcpRequestLogs || []).map(log => ({ ...log, source: 'mcp' })),
      ...(chatLogs || []).map(log => ({ ...log, source: 'chat' })),
      ...(analyticsData || []).map(log => ({ ...log, source: 'usage' }))
    ]

    // Process analytics from comprehensive data
    const analytics = {
      totalSpent: 0,
      totalRequests: 0,
      avgCostPerRequest: 0,
      topModels: [] as Array<{model: string, usage: number, cost: number}>
    }

    const modelStats = new Map<string, {usage: number, cost: number}>()

    if (allSpendingData && allSpendingData.length > 0) {
      allSpendingData.forEach(log => {
        const cost = parseFloat(log.total_cost) || 0
        const requests = 1
        analytics.totalSpent += cost
        analytics.totalRequests += requests

        // Extract models from different sources
        let models: string[] = []
        if (log.source === 'mcp' && log.models_requested) {
          models = Array.isArray(log.models_requested) ? log.models_requested : [log.models_requested]
        } else if (log.source === 'chat' && log.models_used) {
          models = Array.isArray(log.models_used) ? log.models_used : [log.models_used]
        } else if (log.source === 'usage' && log.model_name) {
          models = [log.model_name]
        }

        // Track model usage
        models.forEach(model => {
          if (model) {
            const existing = modelStats.get(model) || { usage: 0, cost: 0 }
            existing.usage += requests / models.length
            existing.cost += cost / models.length
            modelStats.set(model, existing)
          }
        })
      })

      analytics.avgCostPerRequest = analytics.totalRequests > 0 ?
        analytics.totalSpent / analytics.totalRequests : 0

      // Get top 5 models by usage
      analytics.topModels = Array.from(modelStats.entries())
        .sort((a, b) => b[1].usage - a[1].usage)
        .slice(0, 5)
        .map(([model, stats]) => ({
          model,
          usage: Math.round(stats.usage),
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

    // Format recent usage from all sources, sorted by date
    const allRecentUsage = [
      ...(recentUsage || []).map(session => ({
        id: session.id,
        date: session.created_at,
        provider: session.provider || 'Unknown',
        model: session.model_name || 'Unknown',
        app: session.metadata?.app || 'Polydev Multi-LLM Platform',
        tokens: session.tokens_used || session.total_tokens || 0,
        cost: Number(session.cost || 0),
        tps: session.metadata?.tps || null,
        finish: session.metadata?.finish || 'stop',
        source: session.metadata?.fallback_method === 'credits' ? 'Credits' : (session.metadata?.fallback_method === 'cli' ? 'CLI' : 'API')
      })),
      ...(mcpRequestLogs || []).slice(0, 10).map(log => ({
        id: log.id || `mcp-${Date.now()}`,
        date: log.created_at,
        provider: log.models_requested?.[0]?.split('/')[0] || 'Multiple',
        model: log.models_requested?.[0] || 'Multiple Models',
        app: 'MCP Client',
        tokens: log.total_tokens || 0,
        cost: parseFloat(log.total_cost) || 0,
        tps: null,
        finish: log.status || 'completed',
        source: 'MCP'
      })),
      ...(chatLogs || []).slice(0, 10).map(log => ({
        id: log.id || `chat-${Date.now()}`,
        date: log.created_at,
        provider: log.models_used?.[0]?.split('/')[0] || 'Multiple',
        model: log.models_used?.[0] || 'Multiple Models',
        app: 'Web Chat',
        tokens: log.total_tokens || 0,
        cost: parseFloat(log.total_cost) || 0,
        tps: null,
        finish: 'completed',
        source: 'Chat'
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20)

    const formattedRecentUsage = allRecentUsage

    // Update user credits with calculated spending (if different)
    const calculatedTotalSpent = parseFloat(analytics.totalSpent.toFixed(4))
    if (Math.abs(calculatedTotalSpent - (userCredits.total_spent || 0)) > 0.01) {
      // Only update if there's a significant difference
      await serviceSupabase
        .from('user_credits')
        .update({
          total_spent: calculatedTotalSpent,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
    }

    const totalAvailableBalance = (userCredits.balance || 0) + (userCredits.promotional_balance || 0)

    return NextResponse.json({
      balance: userCredits.balance || 0,
      promotionalBalance: userCredits.promotional_balance || 0,
      totalAvailableBalance: totalAvailableBalance,
      totalPurchased: userCredits.total_purchased || 0,
      totalSpent: calculatedTotalSpent, // Use calculated value
      hasOpenRouterKey: false,
      openRouterKeyActive: false,
      purchaseHistory: formattedPurchaseHistory,
      recentUsage: formattedRecentUsage,
      analytics: {
        totalSpent: calculatedTotalSpent,
        totalRequests: analytics.totalRequests,
        avgCostPerRequest: parseFloat(analytics.avgCostPerRequest.toFixed(4)),
        topModels: analytics.topModels
      },
      createdAt: userCredits.created_at,
      updatedAt: new Date().toISOString() // Use current timestamp
    })

  } catch (error) {
    // Force deployment refresh to clear caches - v1.1
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
