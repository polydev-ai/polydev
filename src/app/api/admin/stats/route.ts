import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/app/utils/supabase/server';

const MASTER_CONTROLLER_URL = process.env.MASTER_CONTROLLER_URL || 'http://135.181.138.102:4000';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access using admin client to bypass RLS
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from('users')
      .select('tier')
      .eq('user_id', user.id)
      .single();

    if (profile?.tier !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Fetch stats from Master Controller
    const response = await fetch(`${MASTER_CONTROLLER_URL}/api/admin/system/stats`);
    if (!response.ok) {
      throw new Error('Failed to fetch stats from Master Controller');
    }

    const masterStats = await response.json();

    // Get additional stats from database with VM type breakdown
    const [
      { count: totalUsers },
      { count: activeUsers },
      { count: totalVMs },
      { count: runningVMs },
      { count: cliVMs },
      { count: browserVMs },
      { count: activeAuthSessions },
      { count: completedAuthSessions },
      { data: recentEvents }
    ] = await Promise.all([
      adminClient.from('users').select('*', { count: 'exact', head: true }),
      adminClient.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      adminClient.from('vms').select('*', { count: 'exact', head: true }),
      adminClient.from('vms').select('*', { count: 'exact', head: true }).eq('status', 'running'),
      adminClient.from('vms').select('*', { count: 'exact', head: true }).eq('type', 'cli'),
      adminClient.from('vms').select('*', { count: 'exact', head: true }).eq('type', 'browser'),
      adminClient.from('auth_sessions').select('*', { count: 'exact', head: true }).in('status', ['pending', 'in_progress']),
      adminClient.from('auth_sessions').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      adminClient.from('events').select('*').order('created_at', { ascending: false }).limit(10)
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

    // Get IP pool stats from master controller
    const ipPoolAvailable = masterStats?.statistics?.availableIPs || 0;
    const ipPoolTotal = masterStats?.statistics?.totalIPs || 255;

    // Calculate IP pool expansion capability
    const currentSubnet = '192.168.100.0/24';
    const maxPossibleIPs = 65536; // Using /16 subnet (192.168.0.0/16)

    // External IP info (VPS public IP for Dedoco)
    const externalIP = process.env.VPS_PUBLIC_IP || '135.181.138.102';

    return NextResponse.json({
      success: true,
      stats: {
        // User stats
        total_users: totalUsers || 0,
        active_users: activeUsers || 0,

        // VM stats with type breakdown
        total_vms: totalVMs || 0,
        active_vms: runningVMs || 0,
        cli_vms: cliVMs || 0,
        browser_vms: browserVMs || 0,

        // Session stats
        active_sessions: activeAuthSessions || 0,
        completed_sessions: completedAuthSessions || 0,
        total_sessions: (activeAuthSessions || 0) + (completedAuthSessions || 0),

        // IP pool stats
        ip_pool_available: ipPoolAvailable,
        ip_pool_total: ipPoolTotal,
        ip_pool_current_subnet: currentSubnet,
        ip_pool_max_possible: maxPossibleIPs,

        // External access
        external_ip: externalIP,
        dedoco_enabled: false, // TODO: Implement Dedoco IP assignment

        // Plan breakdown
        byPlan: planCounts
      },
      users: {
        total: totalUsers || 0,
        active: activeUsers || 0,
        byPlan: planCounts
      },
      vms: {
        total: totalVMs || 0,
        running: runningVMs || 0,
        stopped: (totalVMs || 0) - (runningVMs || 0),
        cli: cliVMs || 0,
        browser: browserVMs || 0
      },
      authSessions: {
        active: activeAuthSessions || 0,
        completed: completedAuthSessions || 0,
        total: (activeAuthSessions || 0) + (completedAuthSessions || 0)
      },
      ipPool: {
        available: ipPoolAvailable,
        total: ipPoolTotal,
        used: ipPoolTotal - ipPoolAvailable,
        currentSubnet: currentSubnet,
        expansionCapability: {
          current: ipPoolTotal,
          maxWith16Subnet: maxPossibleIPs,
          maxWith8Subnet: 16777216,
          recommendation: 'Expand to /16 subnet for 65,536 IPs'
        }
      },
      externalAccess: {
        vpsPublicIP: externalIP,
        deodocoStatus: 'Not Implemented',
        portForwarding: 'NAT via iptables',
        recommendation: 'Implement Dedoco IP assignment for direct external VM access'
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
