import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id, subscription_plan, monthly_prompts_used, total_prompts, total_tokens_used, billing_cycle_start')
      .eq('email', user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get prompt history for this month
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);

    const { data: monthlyPrompts, error: promptsError } = await supabase
      .from('prompts')
      .select('created_at, provider, tokens_used, response_time_ms')
      .eq('user_id', userData.user_id)
      .gte('created_at', firstOfMonth.toISOString())
      .order('created_at', { ascending: false });

    // Calculate usage by provider
    const usageByProvider = (monthlyPrompts || []).reduce((acc, prompt) => {
      const provider = prompt.provider;
      if (!acc[provider]) {
        acc[provider] = {
          count: 0,
          tokens: 0,
          avgResponseTime: 0
        };
      }
      acc[provider].count++;
      acc[provider].tokens += prompt.tokens_used || 0;
      return acc;
    }, {} as Record<string, { count: number; tokens: number; avgResponseTime: number }>);

    // Calculate average response times
    Object.keys(usageByProvider).forEach(provider => {
      const providerPrompts = monthlyPrompts?.filter(p => p.provider === provider) || [];
      const totalTime = providerPrompts.reduce((sum, p) => sum + (p.response_time_ms || 0), 0);
      usageByProvider[provider].avgResponseTime = providerPrompts.length > 0
        ? Math.round(totalTime / providerPrompts.length)
        : 0;
    });

    // Get limits based on subscription
    const limits = {
      free: { prompts: 100, tokens: 50000 },
      pro: { prompts: 1000, tokens: 500000 },
      enterprise: { prompts: 10000, tokens: 5000000 }
    };
    const userLimits = limits[userData.subscription_plan as keyof typeof limits] || limits.free;

    // Calculate days remaining in billing cycle
    const billingStart = userData.billing_cycle_start
      ? new Date(userData.billing_cycle_start)
      : firstOfMonth;
    const nextBilling = new Date(billingStart);
    nextBilling.setMonth(nextBilling.getMonth() + 1);
    const daysRemaining = Math.ceil((nextBilling.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    return NextResponse.json({
      subscription: {
        plan: userData.subscription_plan,
        billingCycleStart: billingStart,
        daysRemaining
      },
      usage: {
        monthlyPrompts: userData.monthly_prompts_used,
        monthlyPromptsLimit: userLimits.prompts,
        totalPrompts: userData.total_prompts,
        totalTokens: userData.total_tokens_used,
        byProvider: usageByProvider
      },
      limits: userLimits,
      recentPrompts: monthlyPrompts?.slice(0, 10) || []
    });

  } catch (error) {
    console.error('[VM Usage API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
