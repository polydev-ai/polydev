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

    // Get user's budget settings
    const budget = await creditManager.getUserBudget(user.id)
    
    // Calculate current spending for different periods
    const now = new Date()
    
    // Daily spending (today)
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)
    const dailySpending = await creditManager['getSpendingInPeriod'](user.id, startOfDay, now)
    
    // Weekly spending
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    const weeklySpending = await creditManager['getSpendingInPeriod'](user.id, startOfWeek, now)
    
    // Monthly spending
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthlySpending = await creditManager['getSpendingInPeriod'](user.id, startOfMonth, now)

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
    const supabase = createClient()
    const creditManager = new CreditManager()
    
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
    const updatedBudget = await creditManager.updateUserBudget(user.id, validatedBudget)
    
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
    const supabase = createClient()
    const creditManager = new CreditManager()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, ...data } = await request.json()
    
    switch (action) {
      case 'check_limits':
        const { estimatedCost } = data
        const canMake = await creditManager.canMakeRequest(user.id, estimatedCost)
        
        return NextResponse.json(canMake)
      
      case 'get_spending_trend':
        const { days = 7 } = data
        const analytics = await creditManager.getSpendingAnalytics(user.id, days)
        
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