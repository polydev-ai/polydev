import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';

/**
 * Get Remote CLI OAuth completion status for all providers.
 *
 * Returns which providers the user has successfully completed OAuth for
 * via the browser-in-browser flow.
 *
 * This is DIFFERENT from local CLI status (cli_provider_configurations).
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all completed auth sessions for this user, grouped by provider
    // We want the most recent completed session for each provider
    const { data: completedSessions, error } = await supabase
      .from('auth_sessions')
      .select('provider, completed_at, session_id')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });

    if (error) {
      console.error('Error fetching auth sessions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch OAuth status' },
        { status: 500 }
      );
    }

    // Group by provider and take the most recent completion for each
    const providerStatus: Record<string, { completed: boolean; completedAt: string | null }> = {
      claude_code: { completed: false, completedAt: null },
      codex: { completed: false, completedAt: null },
      gemini_cli: { completed: false, completedAt: null }
    };

    if (completedSessions && completedSessions.length > 0) {
      // Track which providers we've seen to only use the first (most recent) completion
      const seenProviders = new Set<string>();

      for (const session of completedSessions) {
        if (!seenProviders.has(session.provider)) {
          providerStatus[session.provider] = {
            completed: true,
            completedAt: session.completed_at
          };
          seenProviders.add(session.provider);
        }
      }
    }

    return NextResponse.json(providerStatus);

  } catch (error: any) {
    console.error('OAuth status error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
