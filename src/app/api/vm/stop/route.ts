import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';

const MASTER_CONTROLLER_URL = process.env.MASTER_CONTROLLER_URL || 'http://192.168.5.82:4000';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's VM
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id, vm_id')
      .eq('email', user.email)
      .single();

    if (userError || !userData || !userData.vm_id) {
      return NextResponse.json({ error: 'No VM found for user' }, { status: 404 });
    }

    // Stop VM via Master Controller
    const stopResponse = await fetch(
      `${MASTER_CONTROLLER_URL}/api/vms/${userData.vm_id}/stop`,
      { method: 'POST' }
    );

    if (!stopResponse.ok) {
      const errorData = await stopResponse.json();
      return NextResponse.json(
        { error: errorData.error || 'Failed to stop VM' },
        { status: 500 }
      );
    }

    const result = await stopResponse.json();

    // Get updated VM status
    const { data: vm } = await supabase
      .from('vms')
      .select('*')
      .eq('vm_id', userData.vm_id)
      .single();

    return NextResponse.json({
      message: 'VM stopped successfully',
      vm
    });

  } catch (error) {
    console.error('[VM Stop API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
