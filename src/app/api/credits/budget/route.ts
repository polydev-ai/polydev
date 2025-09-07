import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/utils/supabase/server'
import { createClient as createServerClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's budget settings, create default if missing
    let { data: budget, error: budgetError } = await serviceSupabase
      .from('user_budgets')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    // If no budget exists, create a default one
    if (budgetError && budgetError.code === 'PGRST116') {
      const { data: newBudget, error: createError } = await serviceSupabase
        .from('user_budgets')
        .insert({
          user_id: user.id,
          daily_limit: null,
          weekly_limit: null,
          monthly_limit: null,
          preferred_models: [],
          auto_top_up_enabled: false,
          auto_top_up_threshold: null,
          auto_top_up_amount: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (createError) {
        console.error('[Budget] Failed to create default budget:', createError)
      } else {
        budget = newBudget
      }
    }
    
    // Calculate current spending for different periods
    const now = new Date()
    
    // Daily spending (today)
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)
    const dailySpending = await getSpendingInPeriod(serviceSupabase, user.id, startOfDay, now)
    
    // Weekly spending
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    const weeklySpending = await getSpendingInPeriod(serviceSupabase, user.id, startOfWeek, now)
    
    // Monthly spending
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthlySpending = await getSpendingInPeriod(serviceSupabase, user.id, startOfMonth, now)

    return NextResponse.json({
      budget: budget || {
        daily_limit: null,
        weekly_limit: null,
        monthly_limit: null,
        preferred_models: [],
        auto_top_up_enabled: false,
        auto_top_up_threshold: null,
        auto_top_up_amount: null
      },
      currentSpending: {
        daily: {
          amount: dailySpending,
          limit: budget?.daily_limit,
          percentage: budget?.daily_limit ? Math.round((dailySpending / budget.daily_limit) * 100) : 0
        },
        weekly: {
          amount: weeklySpending,
          limit: budget?.weekly_limit,
          percentage: budget?.weekly_limit ? Math.round((weeklySpending / budget.weekly_limit) * 100) : 0
        },
        monthly: {
          amount: monthlySpending,
          limit: budget?.monthly_limit,
          percentage: budget?.monthly_limit ? Math.round((monthlySpending / budget.monthly_limit) * 100) : 0
        }
      },
      alerts: {
        dailyWarning: budget?.daily_limit && dailySpending >= (budget.daily_limit * 0.8),
        weeklyWarning: budget?.weekly_limit && weeklySpending >= (budget.weekly_limit * 0.8),
        monthlyWarning: budget?.monthly_limit && monthlySpending >= (budget.monthly_limit * 0.8),
        dailyExceeded: budget?.daily_limit && dailySpending >= budget.daily_limit,
        weeklyExceeded: budget?.weekly_limit && weeklySpending >= budget.weekly_limit,
        monthlyExceeded: budget?.monthly_limit && monthlySpending >= budget.monthly_limit
      }
    })

  } catch (error) {
    console.error('[Budget] Error fetching budget:', error)
    return NextResponse.json(
      { error: 'Failed to fetch budget information' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const budgetData = await request.json()
    
    // Validate budget data
    const validatedBudget: any = {}
    
    if (budgetData.daily_limit !== undefined) {
      validatedBudget.daily_limit = budgetData.daily_limit > 0 ? budgetData.daily_limit : null
    }
    
    if (budgetData.weekly_limit !== undefined) {
      validatedBudget.weekly_limit = budgetData.weekly_limit > 0 ? budgetData.weekly_limit : null
    }
    
    if (budgetData.monthly_limit !== undefined) {
      validatedBudget.monthly_limit = budgetData.monthly_limit > 0 ? budgetData.monthly_limit : null
    }
    
    if (budgetData.preferred_models !== undefined) {
      validatedBudget.preferred_models = Array.isArray(budgetData.preferred_models) 
        ? budgetData.preferred_models 
        : []
    }
    
    if (budgetData.auto_top_up_enabled !== undefined) {
      validatedBudget.auto_top_up_enabled = Boolean(budgetData.auto_top_up_enabled)
    }
    
    if (budgetData.auto_top_up_threshold !== undefined) {
      validatedBudget.auto_top_up_threshold = budgetData.auto_top_up_threshold > 0 
        ? budgetData.auto_top_up_threshold 
        : null
    }
    
    if (budgetData.auto_top_up_amount !== undefined) {
      validatedBudget.auto_top_up_amount = budgetData.auto_top_up_amount > 0 
        ? budgetData.auto_top_up_amount 
        : null
    }

    // Update budget
    const { data: updatedBudget, error } = await serviceSupabase
      .from('user_budgets')
      .upsert({
        user_id: user.id,
        ...validatedBudget,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    
    return NextResponse.json({
      success: true,
      budget: updatedBudget,
      message: 'Budget settings updated successfully'
    })

  } catch (error) {
    console.error('[Budget] Error updating budget:', error)
    return NextResponse.json(
      { error: 'Failed to update budget settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, ...data } = await request.json()
    
    switch (action) {
      case 'check_limits':
        const { estimatedCost } = data
        const canMake = await canMakeRequest(serviceSupabase, user.id, estimatedCost)
        
        return NextResponse.json(canMake)
      
      case 'get_spending_trend':
        const { days = 7 } = data
        const analytics = await getSpendingAnalytics(serviceSupabase, user.id, days)
        
        return NextResponse.json({
          totalSpent: analytics.totalSpent,
          dailyAverage: analytics.totalSpent / days,
          requestCount: analytics.totalRequests,
          modelBreakdown: analytics.modelBreakdown
        })
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('[Budget] Error processing budget action:', error)
    return NextResponse.json(
      { error: 'Failed to process budget request' },
      { status: 500 }
    )
  }
}

// Helper functions
async function getSpendingInPeriod(
  supabase: any, 
  userId: string, 
  startDate: Date, 
  endDate: Date
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('model_usage')
      .select('total_cost')
      .eq('user_id', userId)
      .gte('request_timestamp', startDate.toISOString())
      .lte('request_timestamp', endDate.toISOString())

    if (error) throw error

    return (data || []).reduce((sum: number, usage: any) => sum + usage.total_cost, 0)
  } catch (error) {
    console.error('[Budget] Error calculating spending:', error)
    return 0
  }
}

async function canMakeRequest(supabase: any, userId: string, estimatedCost: number): Promise<{
  canMake: boolean
  reason?: string
}> {
  try {
    // Check credit balance
    const { data: credits } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', userId)
      .single()

    if (!credits || credits.balance < estimatedCost) {
      return {
        canMake: false,
        reason: 'Insufficient credits'
      }
    }

    // Check budget limits
    const { data: budget } = await supabase
      .from('user_budgets')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (budget) {
      const now = new Date()
      
      // Check daily limit
      if (budget.daily_limit) {
        const startOfDay = new Date(now.setHours(0, 0, 0, 0))
        const todaySpending = await getSpendingInPeriod(supabase, userId, startOfDay, now)
        
        if (todaySpending + estimatedCost > budget.daily_limit) {
          return {
            canMake: false,
            reason: 'Daily spending limit exceeded'
          }
        }
      }

      // Check weekly limit
      if (budget.weekly_limit) {
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
        const weekSpending = await getSpendingInPeriod(supabase, userId, startOfWeek, now)
        
        if (weekSpending + estimatedCost > budget.weekly_limit) {
          return {
            canMake: false,
            reason: 'Weekly spending limit exceeded'
          }
        }
      }

      // Check monthly limit
      if (budget.monthly_limit) {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthSpending = await getSpendingInPeriod(supabase, userId, startOfMonth, now)
        
        if (monthSpending + estimatedCost > budget.monthly_limit) {
          return {
            canMake: false,
            reason: 'Monthly spending limit exceeded'
          }
        }
      }
    }

    return { canMake: true }
  } catch (error) {
    console.error('[Budget] Error checking request permission:', error)
    return {
      canMake: false,
      reason: 'Unable to verify budget limits'
    }
  }
}

async function getSpendingAnalytics(supabase: any, userId: string, days: number = 30) {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from('model_usage')
      .select(`
        total_cost,
        model_id,
        prompt_tokens,
        completion_tokens,
        request_timestamp
      `)
      .eq('user_id', userId)
      .gte('request_timestamp', startDate.toISOString())
      .order('request_timestamp', { ascending: false })

    if (error) throw error

    const usage = data || []
    
    // Calculate analytics
    const totalSpent = usage.reduce((sum: number, u: any) => sum + u.total_cost, 0)
    const totalRequests = usage.length
    const avgCostPerRequest = totalRequests > 0 ? totalSpent / totalRequests : 0
    
    // Group by model
    const modelBreakdown = usage.reduce((acc: any, u: any) => {
      if (!acc[u.model_id]) {
        acc[u.model_id] = {
          requests: 0,
          cost: 0,
          tokens: 0
        }
      }
      acc[u.model_id].requests += 1
      acc[u.model_id].cost += u.total_cost
      acc[u.model_id].tokens += u.prompt_tokens + u.completion_tokens
      return acc
    }, {})

    return {
      totalSpent,
      totalRequests,
      avgCostPerRequest,
      modelBreakdown,
      usage
    }
  } catch (error) {
    console.error('[Budget] Error fetching analytics:', error)
    throw error
  }
}
