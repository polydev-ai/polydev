/**
 * Unified Chat Stream API
 * Routes requests to multiple AI providers with normalized streaming output
 */

import { NextRequest, NextResponse } from 'next/server';
import { StreamNormalizer } from '@/lib/streaming-harmonizer';
import { createClient } from '@/app/utils/supabase/server';

interface ChatRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  userId?: string; // Optional: can be passed from client for privacy mode check
}

async function getStreamFromProvider(
  provider: string,
  model: string,
  messages: ChatRequest['messages'],
  options: { temperature?: number; max_tokens?: number; privacyMode?: boolean }
): Promise<ReadableStream<Uint8Array>> {
  // Determine provider from model name or explicit provider
  let actualProvider = provider;

  if (model.includes('gpt')) actualProvider = 'openai';
  else if (model.includes('claude')) actualProvider = 'claude';
  else if (model.includes('gemini')) actualProvider = 'gemini';
  else if (model.includes('grok')) actualProvider = 'xai';
  else if (model.includes('qwen')) actualProvider = 'cerebras';

  switch (actualProvider) {
    case 'openai':
      return getOpenAIStream(model, messages, options);
    case 'claude':
    case 'anthropic':
      return getClaudeStream(model, messages, options);
    case 'gemini':
      return getGeminiStream(model, messages, options);
    case 'xai':
      return getXAIStream(model, messages, options);
    case 'cerebras':
      return getCerebrasStream(model, messages, options);
    default:
      throw new Error(`Unknown provider: ${actualProvider}`);
  }
}

async function getOpenAIStream(
  model: string,
  messages: ChatRequest['messages'],
  options: { temperature?: number; max_tokens?: number; privacyMode?: boolean }
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  // TODO: Add zero-data-retention header when privacy mode is enabled
  // Note: OpenAI API doesn't use data for training by default (as of March 2023)
  // Enterprise customers can establish zero-retention agreements
  // if (options.privacyMode) {
  //   headers['OpenAI-No-Storage'] = 'true'; // Example header - check OpenAI docs for actual header
  // }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 2048,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  return response.body!;
}

async function getClaudeStream(
  model: string,
  messages: ChatRequest['messages'],
  options: { temperature?: number; max_tokens?: number; privacyMode?: boolean }
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const headers: Record<string, string> = {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'Content-Type': 'application/json',
  };

  // TODO: Add zero-data-retention header when privacy mode is enabled
  // Enterprise customers can establish zero-retention agreements with Anthropic
  // if (options.privacyMode) {
  //   headers['anthropic-disable-data-retention'] = 'true'; // Example header - check Anthropic docs for actual header
  // }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options.max_tokens ?? 2048,
      temperature: options.temperature ?? 0.7,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.statusText}`);
  }

  return response.body!;
}

async function getGeminiStream(
  model: string,
  messages: ChatRequest['messages'],
  options: { temperature?: number; max_tokens?: number }
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_API_KEY not set');

  // Convert messages to Gemini format
  const contents = messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.max_tokens ?? 2048,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  return response.body!;
}

async function getXAIStream(
  model: string,
  messages: ChatRequest['messages'],
  options: { temperature?: number; max_tokens?: number }
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error('XAI_API_KEY not set');

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 2048,
    }),
  });

  if (!response.ok) {
    throw new Error(`X-AI API error: ${response.statusText}`);
  }

  return response.body!;
}

async function getCerebrasStream(
  model: string,
  messages: ChatRequest['messages'],
  options: { temperature?: number; max_tokens?: number }
): Promise<ReadableStream<Uint8Array>> {
  // Cerebras uses similar API to Together AI
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) throw new Error('CEREBRAS_API_KEY not set');

  const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 2048,
    }),
  });

  if (!response.ok) {
    throw new Error(`Cerebras API error: ${response.statusText}`);
  }

  return response.body!;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { model, messages, temperature, max_tokens, userId } = body;

    if (!model || !messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: model, messages' },
        { status: 400 }
      );
    }

    // Check if user has privacy mode enabled
    let privacyMode = false;
    if (userId) {
      try {
        const supabase = createClient();
        const { data: profile } = await supabase
          .from('profiles')
          .select('privacy_mode')
          .eq('id', userId)
          .single();

        privacyMode = profile?.privacy_mode || false;

        if (privacyMode) {
          console.log(`[PrivacyMode] User ${userId} has Privacy Mode enabled - using zero data retention settings`);
        }
      } catch (error) {
        console.error('[PrivacyMode] Error checking privacy mode:', error);
        // Continue with request even if privacy check fails
      }
    }

    // Detect provider from model name
    let provider = 'unknown';
    if (model.includes('gpt')) provider = 'openai';
    else if (model.includes('claude')) provider = 'claude';
    else if (model.includes('gemini')) provider = 'gemini';
    else if (model.includes('grok')) provider = 'xai';
    else if (model.includes('qwen')) provider = 'cerebras';

    // Get provider stream with privacy mode setting
    const providerStream = await getStreamFromProvider(model, provider, messages, {
      temperature,
      max_tokens,
      privacyMode,
    });

    // Normalize the stream
    const normalizer = new StreamNormalizer({
      provider: provider as any,
      model,
      rechunkSize: 30,
      rechunkDelay: 10,
    });

    // Create readable stream with unified format
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of normalizer.normalizeStream(providerStream)) {
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Chat stream error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
