import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ vmId: string }> }
) {
  try {
    const supabase = await createClient();

    // Verify admin user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.is_admin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const params = await context.params;
    const { vmId } = params;

    // Get VM details
    const { data: vm, error: vmError } = await supabase
      .from('vms')
      .select('*')
      .eq('id', vmId)
      .single();

    if (vmError || !vm) {
      return NextResponse.json(
        { error: 'VM not found' },
        { status: 404 }
      );
    }

    // Call Master Controller to destroy VM
    const masterControllerUrl = process.env.MASTER_CONTROLLER_URL || 'http://192.168.5.82:4000';

    const destroyRes = await fetch(`${masterControllerUrl}/api/vm/${vmId}/destroy`, {
      method: 'POST',
    });

    if (!destroyRes.ok) {
      const error = await destroyRes.text();
      throw new Error(error || 'Failed to destroy VM on Master Controller');
    }

    // Delete VM record from database
    const { error: deleteError } = await supabase
      .from('vms')
      .delete()
      .eq('id', vmId);

    if (deleteError) {
      throw new Error('Failed to delete VM record from database');
    }

    return NextResponse.json({
      success: true,
      message: 'VM destroyed successfully'
    });
  } catch (error: any) {
    console.error('Failed to destroy VM:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to destroy VM' },
      { status: 500 }
    );
  }
}
