import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/app/utils/supabase/server';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ vmId: string }> }
) {
  try {
    console.log('[DELETE VM] Request received');
    const supabase = await createClient();

    // Verify admin user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('[DELETE VM] Auth check:', { hasUser: !!user, authError: authError?.message });

    if (authError || !user) {
      console.error('[DELETE VM] Unauthorized:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const adminClient = createAdminClient();
    const { data: userData, error: userError } = await adminClient
      .from('users')
      .select('tier')
      .eq('user_id', user.id)
      .single();

    console.log('[DELETE VM] Admin check:', { tier: userData?.tier, userError: userError?.message });

    if (userError || userData?.tier !== 'admin') {
      console.error('[DELETE VM] Forbidden:', { userId: user.id, tier: userData?.tier });
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const params = await context.params;
    const { vmId } = params;

    // Get VM details (using adminClient to bypass RLS)
    console.log('[DELETE VM] Looking up VM:', vmId);
    const { data: vm, error: vmError } = await adminClient
      .from('vms')
      .select('*')
      .eq('vm_id', vmId)
      .single();

    console.log('[DELETE VM] Query result:', { vm, vmError });

    if (vmError || !vm) {
      console.error('[DELETE VM] VM not found:', { vmId, vmError });
      return NextResponse.json(
        { error: 'VM not found', details: vmError?.message },
        { status: 404 }
      );
    }

    // If VM is already destroyed or failed, skip master controller call
    if (vm.status === 'destroyed' || vm.status === 'failed') {
      console.log('[DELETE VM] VM already destroyed or failed, skipping master controller call');
    } else {
      // Call Master Controller to destroy VM
      const masterControllerUrl = process.env.MASTER_CONTROLLER_URL || 'http://135.181.138.102:4000';

      const destroyRes = await fetch(`${masterControllerUrl}/api/vm/${vmId}/destroy`, {
        method: 'POST',
      });

      if (!destroyRes.ok) {
        const error = await destroyRes.text();
        console.error('[DELETE VM] Master controller error:', error);
        throw new Error(error || 'Failed to destroy VM on Master Controller');
      }
    }

    // Delete VM record from database (using adminClient to bypass RLS)
    const { error: deleteError } = await adminClient
      .from('vms')
      .delete()
      .eq('vm_id', vmId);

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
