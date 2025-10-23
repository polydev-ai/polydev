import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

const MASTER_CONTROLLER_URL = process.env.MASTER_CONTROLLER_URL || 'http://localhost:4000';

/**
 * Helper function to proxy admin health requests to master-controller
 * Handles authentication and authorization automatically
 */
export async function proxyAdminHealthRequest(endpoint: string): Promise<NextResponse> {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin tier using admin client to bypass RLS
    const adminClient = createAdminClient();
    const { data: profile } = await adminClient
      .from('users')
      .select('tier')
      .eq('user_id', user.id)
      .single();

    if (profile?.tier !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Fetch from master-controller
    const response = await fetch(`${MASTER_CONTROLLER_URL}/api/admin/health/${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Disable caching for real-time metrics
    });

    if (!response.ok) {
      throw new Error(`Master controller returned ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error(`Get health/${endpoint} failed:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
