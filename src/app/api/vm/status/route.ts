import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';

const MASTER_CONTROLLER_URL = process.env.MASTER_CONTROLLER_URL || 'http://192.168.5.82:4000';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get VM status via Master Controller
    const response = await fetch(`${MASTER_CONTROLLER_URL}/api/users/${user.id}/vm`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ vm: null });
      }
      const error = await response.json();
      return NextResponse.json(
        { error: error.message || 'Failed to get VM status' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Log VM details for debugging
    if (data.vm) {
      console.log('[VM Status]', {
        vmId: data.vm.vm_id?.substring(0, 8),
        internalIP: data.vm.ip_address,
        status: data.vm.status
      });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('VM status error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
