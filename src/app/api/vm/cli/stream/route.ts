import { NextRequest } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';

const MASTER_CONTROLLER_URL = process.env.MASTER_CONTROLLER_URL || 'http://192.168.5.82:4000';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Get prompt from request body
    const body = await request.json();
    const { prompt, provider } = body;

    if (!prompt || typeof prompt !== 'string') {
      return new Response('Invalid prompt', { status: 400 });
    }

    if (!provider || !['codex_cli', 'claude_code', 'gemini_cli'].includes(provider)) {
      return new Response('Invalid provider', { status: 400 });
    }

    // Get user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id, monthly_prompts_used, subscription_plan')
      .eq('email', user.email)
      .single();

    if (userError || !userData) {
      return new Response('User not found in VM system', { status: 404 });
    }

    // Check prompt limit
    const limits = {
      free: 100,
      pro: 1000,
      enterprise: 10000
    };
    const limit = limits[userData.subscription_plan as keyof typeof limits] || 100;

    if (userData.monthly_prompts_used >= limit) {
      return new Response(
        JSON.stringify({ error: 'Monthly prompt limit exceeded' }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send prompt to Master Controller
          const response = await fetch(
            `${MASTER_CONTROLLER_URL}/api/prompts/${userData.user_id}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt, provider })
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: errorData.error })}\n\n`)
            );
            controller.close();
            return;
          }

          if (!response.body) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: 'No response body' })}\n\n`)
            );
            controller.close();
            return;
          }

          // Stream the response
          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(encoder.encode(chunk));
          }
        } catch (error) {
          console.error('[CLI Stream] Error:', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`)
          );
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    });

  } catch (error) {
    console.error('[CLI Stream API] Error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
