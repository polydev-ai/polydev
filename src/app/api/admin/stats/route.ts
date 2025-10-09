import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';

const MASTER_CONTROLLER_URL = process.env.MASTER_CONTROLLER_URL || 'http://192.168.5.82:4000';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch stats from Master Controller
    const response = await fetch(`${MASTER_CONTROLLER_URL}/api/admin/stats`);
    if (!response.ok) {
      throw new Error('Failed to fetch stats from Master Controller');
    }

    const masterStats = await response.json();

    // Get additional stats from database
    const [
      { count: totalUsers },
      { count: activeUsers },
      { count: totalVMs },
      { count: runningVMs },
      { count: activeAuthSessions },
      { data: recentEvents }
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('vms').select('*', { count: 'exact', head: true }),
      supabase.from('vms').select('*', { count: 'exact', head: true }).eq('status', 'running'),
      supabase.from('auth_sessions').select('*', { count: 'exact', head: true }).in('status', ['pending', 'in_progress']),
      supabase.from('events').select('*').order('created_at', { ascending: false }).limit(10)
    ]);

    // Get VPS host stats
    const { data: vpsHosts } = await supabase
      .from('vps_hosts')
      .select('*');

    // Calculate usage by subscription plan
    const { data: usersByPlan } = await supabase
      .from('users')
      .select('subscription_plan')
      .eq('status', 'active');

    const planCounts = usersByPlan?.reduce((acc, u) => {
      acc[u.subscription_plan] = (acc[u.subscription_plan] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return NextResponse.json({
      users: {
        total: totalUsers || 0,
        active: activeUsers || 0,
        byPlan: planCounts
      },
      vms: {
        total: totalVMs || 0,
        running: runningVMs || 0,
        stopped: (totalVMs || 0) - (runningVMs || 0)
      },
      authSessions: {
        active: activeAuthSessions || 0
      },
      vpsHosts: vpsHosts?.map(host => ({
        hostname: host.hostname,
        ipAddress: host.ip_address,
        status: host.status,
        totalVMs: host.total_vms,
        activeVMs: host.active_vms,
        cpuUsage: host.cpu_usage_percent,
        memoryUsage: host.memory_usage_percent
      })) || [],
      recentEvents: recentEvents || [],
      masterController: masterStats
    });

  } catch (error) {
    console.error('[Admin Stats API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
