import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

const supabaseService = createServiceClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Provider {
  id: string;
  name: string;
  description: string;
  logo_url: string | null;
  color: string;
  available: boolean;
  connected: boolean;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Logo URLs from models.dev
    const logoMap: Record<string, string> = {
      'Anthropic': 'https://models.dev/logos/anthropic.svg',
      'OpenAI': 'https://models.dev/logos/openai.svg',
      'Google': 'https://models.dev/logos/google.svg'
    };

    // Fetch connected providers for this user using service client
    const { data: credentials, error: credError } = await supabaseService
      .from('provider_credentials')
      .select('provider')
      .eq('user_id', user.id);

    if (credError) {
      console.error('Error fetching credentials:', credError);
    }

    const connectedProviders = new Set(
      credentials?.map(c => c.provider) || []
    );

    // Build providers list with connection status
    const providers: Provider[] = [
      {
        id: 'claude_code',
        name: 'Claude Code',
        description: 'Anthropic\'s Claude AI with code understanding',
        logo_url: logoMap['Anthropic'] || null,
        color: 'from-purple-500 to-pink-500',
        available: true,
        connected: connectedProviders.has('claude_code'),
      },
      {
        id: 'codex',
        name: 'OpenAI Codex',
        description: 'OpenAI\'s powerful code generation model',
        logo_url: logoMap['OpenAI'] || null,
        color: 'from-green-500 to-emerald-500',
        available: true,
        connected: connectedProviders.has('codex'),
      },
      {
        id: 'gemini_cli',
        name: 'Google Gemini',
        description: 'Google\'s multimodal AI assistant',
        logo_url: logoMap['Google'] || null,
        color: 'from-blue-500 to-cyan-500',
        available: true,
        connected: connectedProviders.has('gemini_cli'),
      },
    ];

    return NextResponse.json({ providers });
  } catch (error: any) {
    console.error('Error in /api/vm/providers:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
