import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/app/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access - check both profiles table and legacy admin emails
    const adminClient = createAdminClient();
    const legacyAdminEmails = new Set(['admin@polydev.ai', 'venkat@polydev.ai', 'gvsfans@gmail.com']);
    const isLegacyAdmin = legacyAdminEmails.has(user.email || '');

    let isNewAdmin = false;
    try {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      isNewAdmin = profile?.is_admin || false;
    } catch (error) {
      console.log('[Admin Stats] Profile check failed, using legacy admin check');
    }

    if (!isNewAdmin && !isLegacyAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Fetch real stats from polydev tables
    const [
      profilesResult,
      subscriptionsResult,
      proSubscriptionsResult,
      modelsResult,
      providersResult,
      usageSessionsResult,
      chatSessionsResult,
      chatMessagesResult,
      creditsResult,
      apiKeysResult,
      perspectiveQuotasResult
    ] = await Promise.all([
      // Total users from profiles
      adminClient.from('profiles').select('*', { count: 'exact', head: true }),
      // All subscriptions
      adminClient.from('user_subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      // Pro subscriptions
      adminClient.from('user_subscriptions').select('*', { count: 'exact', head: true }).eq('tier', 'pro').eq('status', 'active'),
      // Active models from registry
      adminClient.from('models_dev_mappings').select('*', { count: 'exact', head: true }),
      // Providers count
      adminClient.from('models_dev_providers').select('*', { count: 'exact', head: true }),
      // API usage sessions
      adminClient.from('usage_sessions').select('*', { count: 'exact', head: true }),
      // Chat sessions
      adminClient.from('chat_sessions').select('*', { count: 'exact', head: true }),
      // Chat messages
      adminClient.from('chat_messages').select('*', { count: 'exact', head: true }),
      // Sum of all credits
      adminClient.from('user_credits').select('balance, total_purchased, total_spent'),
      // API keys count
      adminClient.from('api_keys').select('*', { count: 'exact', head: true }),
      // Perspective quotas
      adminClient.from('perspective_quotas').select('messages_used, premium_perspectives_used, normal_perspectives_used, eco_perspectives_used')
    ]);

    // Calculate credits totals
    const creditsData = creditsResult.data || [];
    const totalCreditsIssued = creditsData.reduce((sum, c) => sum + (c.total_purchased || 0), 0);
    const totalCreditsSpent = creditsData.reduce((sum, c) => sum + (c.total_spent || 0), 0);
    const totalCreditsBalance = creditsData.reduce((sum, c) => sum + (c.balance || 0), 0);

    // Calculate perspective usage
    const quotasData = perspectiveQuotasResult.data || [];
    const totalMessagesUsed = quotasData.reduce((sum, q) => sum + (q.messages_used || 0), 0);
    const totalPremiumUsed = quotasData.reduce((sum, q) => sum + (q.premium_perspectives_used || 0), 0);
    const totalNormalUsed = quotasData.reduce((sum, q) => sum + (q.normal_perspectives_used || 0), 0);
    const totalEcoUsed = quotasData.reduce((sum, q) => sum + (q.eco_perspectives_used || 0), 0);

    // Get subscription breakdown by tier
    const { data: subscriptionsByTier } = await adminClient
      .from('user_subscriptions')
      .select('tier')
      .eq('status', 'active');

    const tierCounts = (subscriptionsByTier || []).reduce((acc, sub) => {
      acc[sub.tier] = (acc[sub.tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate estimated revenue (Pro subscriptions * $9.99/month)
    const estimatedMonthlyRevenue = (proSubscriptionsResult.count || 0) * 9.99;

    return NextResponse.json({
      success: true,
      stats: {
        // User stats - these are what the admin page expects
        totalUsers: profilesResult.count || 0,
        activeSubscriptions: subscriptionsResult.count || 0,
        proSubscriptions: proSubscriptionsResult.count || 0,

        // Model stats
        activeModels: modelsResult.count || 0,
        totalProviders: providersResult.count || 0,

        // Usage stats
        totalApiCalls: usageSessionsResult.count || 0,
        chatSessions: chatSessionsResult.count || 0,
        chatMessages: chatMessagesResult.count || 0,

        // Credits stats
        totalCreditsIssued: totalCreditsIssued,
        totalCreditsSpent: totalCreditsSpent,
        totalCreditsBalance: totalCreditsBalance,

        // Perspective usage
        totalMessagesUsed: totalMessagesUsed,
        premiumPerspectivesUsed: totalPremiumUsed,
        normalPerspectivesUsed: totalNormalUsed,
        ecoPerspectivesUsed: totalEcoUsed,

        // API keys
        totalApiKeys: apiKeysResult.count || 0,

        // Revenue estimate
        revenue: estimatedMonthlyRevenue,

        // Subscription breakdown
        byTier: tierCounts
      }
    });

  } catch (error) {
    console.error('[Admin Stats API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', stats: {
        totalUsers: 0,
        activeSubscriptions: 0,
        activeModels: 0,
        totalApiCalls: 0,
        totalCreditsIssued: 0,
        revenue: 0
      }},
      { status: 500 }
    );
  }
}
