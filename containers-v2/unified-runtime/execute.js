#!/usr/bin/env node
/**
 * Unified Runtime Executor
 * Executes prompts via OpenAI, Anthropic, or Google APIs
 * Uses minimal SDK clients instead of full CLI tools
 */

const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const provider = process.env.PROVIDER || 'openai';
const prompt = process.env.PROMPT || process.argv[2];

if (!prompt) {
  console.error('ERROR: No prompt provided');
  console.error('Usage: node execute.js "your prompt here"');
  console.error('Or set PROMPT environment variable');
  process.exit(1);
}

async function executeOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not provided');
  }

  const openai = new OpenAI({ apiKey });

  const stream = await openai.chat.completions.create({
    model: process.env.MODEL || 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) {
      process.stdout.write(content);
    }
  }

  process.stdout.write('\n');
}

async function executeAnthropic() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not provided');
  }

  const anthropic = new Anthropic({ apiKey });

  const stream = await anthropic.messages.stream({
    model: process.env.MODEL || 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
      process.stdout.write(chunk.delta.text);
    }
  }

  process.stdout.write('\n');
}

async function executeGoogle() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY not provided');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.MODEL || 'gemini-2.0-flash-exp'
  });

  const result = await model.generateContentStream(prompt);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      process.stdout.write(text);
    }
  }

  process.stdout.write('\n');
}

async function main() {
  console.error(`[${new Date().toISOString()}] Provider: ${provider}`);
  console.error(`[${new Date().toISOString()}] User: ${process.env.USER_ID || 'unknown'}`);
  console.error(`[${new Date().toISOString()}] Executing prompt...`);

  try {
    switch (provider) {
      case 'openai':
        await executeOpenAI();
        break;
      case 'anthropic':
        await executeAnthropic();
        break;
      case 'google':
        await executeGoogle();
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    console.error(`[${new Date().toISOString()}] Execution completed`);
    process.exit(0);

  } catch (error) {
    console.error(`[${new Date().toISOString()}] ERROR: ${error.message}`);
    process.exit(1);
  }
}

main();
