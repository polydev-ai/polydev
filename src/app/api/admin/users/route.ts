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

    // Check if user is admin (you should implement proper admin check)
    // For now, checking if email matches admin domain or role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get pagination params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '50');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    // Build query
    let query = supabase
      .from('users')
      .select(`
        *,
        vms(vm_id, status, ip_address, vps_host, created_at)
      `, { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.ilike('email', `%${search}%`);
    }
    if (status) {
      query = query.eq('status', status);
    }

    // Apply pagination
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    query = query.range(from, to);

    // Execute query
    const { data: users, error: usersError, count } = await query;

    if (usersError) {
      throw usersError;
    }

    return NextResponse.json({
      users,
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
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
