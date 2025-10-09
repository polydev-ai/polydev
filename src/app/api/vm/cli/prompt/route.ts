import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { provider, prompt } = await request.json();

    if (!provider || !prompt) {
      return NextResponse.json(
        { error: 'Provider and prompt are required' },
        { status: 400 }
      );
    }

    // Get user's VM
    const { data: vm, error: vmError } = await supabase
      .from('vms')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .single();

    if (vmError || !vm) {
      return NextResponse.json(
        { error: 'No active VM found for this provider' },
        { status: 404 }
      );
    }

    // Send prompt to Master Controller for streaming response
    const masterControllerUrl = process.env.MASTER_CONTROLLER_URL || 'http://192.168.5.82:4000';

    const response = await fetch(`${masterControllerUrl}/api/vm/${vm.id}/cli/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to send prompt to VM');
    }

    // Return streaming response
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Failed to send CLI prompt:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send prompt' },
      { status: 500 }
    );
  }
}
