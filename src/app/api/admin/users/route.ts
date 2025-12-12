import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/app/utils/supabase/server';

// Helper function to check admin access
async function checkAdminAccess(supabase: any, adminClient: any, user: any): Promise<boolean> {
  const legacyAdminEmails = new Set(['admin@polydev.ai', 'venkat@polydev.ai', 'gvsfans@gmail.com']);
  const isLegacyAdmin = legacyAdminEmails.has(user.email || '');

  if (isLegacyAdmin) return true;

  try {
    const { data: profile } = await adminClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    return profile?.is_admin || false;
  } catch (error) {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient();

    // Check admin access
    const isAdmin = await checkAdminAccess(supabase, adminClient, user);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get pagination params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '50');
    const search = searchParams.get('search') || '';

    // Fetch users from profiles table with subscription info
    let query = adminClient
      .from('profiles')
      .select(`
        id,
        email,
        is_admin,
        subscription_tier,
        created_at,
        updated_at
      `, { count: 'exact' });

    // Apply search filter
    if (search) {
      query = query.ilike('email', `%${search}%`);
    }

    // Apply pagination
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    query = query.range(from, to).order('created_at', { ascending: false });

    const { data: profiles, error: profilesError, count } = await query;

    if (profilesError) {
      console.error('[Admin Users API] Error fetching profiles:', profilesError);
      throw profilesError;
    }

    // Get subscription status for each user
    const userIds = (profiles || []).map(p => p.id);
    const { data: subscriptions } = await adminClient
      .from('user_subscriptions')
      .select('user_id, tier, status')
      .in('user_id', userIds);

    // Get credits for each user
    const { data: credits } = await adminClient
      .from('user_credits')
      .select('user_id, balance, total_purchased, total_spent')
      .in('user_id', userIds);

    // Map subscriptions and credits by user_id
    const subscriptionMap = new Map();
    (subscriptions || []).forEach(sub => {
      subscriptionMap.set(sub.user_id, sub);
    });

    const creditsMap = new Map();
    (credits || []).forEach(credit => {
      creditsMap.set(credit.user_id, credit);
    });

    // Combine the data
    const users = (profiles || []).map(profile => {
      const subscription = subscriptionMap.get(profile.id);
      const userCredits = creditsMap.get(profile.id);

      return {
        id: profile.id,
        email: profile.email,
        credits: userCredits?.balance || 0,
        total_credits_purchased: userCredits?.total_purchased || 0,
        total_credits_spent: userCredits?.total_spent || 0,
        is_admin: profile.is_admin || false,
        created_at: profile.created_at,
        subscription_status: subscription?.status || 'none',
        subscription_tier: subscription?.tier || profile.subscription_tier || 'free'
      };
    });

    return NextResponse.json({
      success: true,
      users,
      count: count || 0,
      pagination: {
        page,
        perPage,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / perPage)
      }
    });

  } catch (error) {
    console.error('[Admin Users API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', users: [] },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient();

    // Check admin access
    const isAdmin = await checkAdminAccess(supabase, adminClient, user);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, action, value } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (action === 'toggle_admin') {
      // Update is_admin status in profiles table
      const { data: updatedProfile, error: updateError } = await adminClient
        .from('profiles')
        .update({ is_admin: value, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        console.error('[Admin Users API] Error updating admin status:', updateError);
        throw updateError;
      }

      return NextResponse.json({
        success: true,
        message: `Admin status ${value ? 'granted' : 'revoked'} successfully`,
        user: updatedProfile
      });
    }

    if (action === 'update_credits') {
      // Update or insert credits for user
      const { data: existingCredits } = await adminClient
        .from('user_credits')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existingCredits) {
        const { error: updateError } = await adminClient
          .from('user_credits')
          .update({
            balance: value,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await adminClient
          .from('user_credits')
          .insert({
            user_id: userId,
            balance: value,
            promotional_balance: 0,
            monthly_allocation: 0,
            total_purchased: 0,
            total_spent: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) throw insertError;
      }

      return NextResponse.json({
        success: true,
        message: 'Credits updated successfully'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('[Admin Users API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
