# Chat API Dual-Mode Implementation Guide

## Overview

The chat API needs to support two distinct modes based on API key ownership:

### Mode 1: Standard Mode (Polydev API Keys)
- User uses Polydev's managed API keys
- **MUST save conversations** to database for billing tracking
- Tier limits enforced
- Conversations accessible in history

### Mode 2: BYOK Mode (User's API Keys)
- User provides their own API keys
- **MUST NOT save conversations** to database
- Only save usage metadata (no content)
- No tier limits (user pays per token)

## Key Detection Logic

```typescript
// In /api/chat/completions/route.ts or /api/chat/stream/route.ts

export async function POST(request: NextRequest) {
  const { model, messages, userId } = await request.json()

  const supabase = await createClient()

  // 1. Get user's profile with BYOK status
  const { data: profile } = await supabase
    .from('profiles')
    .select('byok_enabled, ephemeral_conversations, subscription_tier')
    .eq('id', userId)
    .single()

  // 2. Determine mode based on BYOK status
  let mode = 'standard'  // Default to standard
  let apiKey = null
  let provider = extractProvider(model) // openai, anthropic, etc.

  if (profile?.byok_enabled) {
    // Try to get user's own API key for this provider
    const { data: userKey } = await supabase
      .from('user_api_keys')
      .select('encrypted_key')
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('active', true)
      .single()

    if (userKey && userKey.encrypted_key) {
      // User has their own key → BYOK mode
      apiKey = atob(userKey.encrypted_key) // Decrypt (currently using btoa)
      mode = 'byok'
      console.log(`[BYOK] User ${userId} using own API key for ${provider}`)
    }
  }

  // 3. If no user API key, use Polydev's keys
  if (!apiKey) {
    apiKey = process.env[`${provider.toUpperCase()}_API_KEY`]
    mode = 'standard'
    console.log(`[Standard] User ${userId} using Polydev API keys for ${provider}`)
  }

  // 4. Call AI provider with appropriate API key
  const response = await callAIProvider(provider, model, messages, apiKey)

  // 5. Extract token usage
  const usage = extractUsage(response)

  // 6. Save based on mode
  if (mode === 'standard') {
    // Standard Mode: SAVE conversations
    await saveConversationStandard(userId, messages, response, usage, model)
  } else if (mode === 'byok') {
    // BYOK Mode: ONLY save metadata
    await saveUsageMetadataBYOK(userId, usage, model, provider)
  }

  return NextResponse.json(response)
}
```

## Helper Functions

### 1. Extract Provider from Model Name

```typescript
function extractProvider(model: string): string {
  if (model.includes('gpt')) return 'openai'
  if (model.includes('claude')) return 'anthropic'
  if (model.includes('gemini')) return 'google'
  if (model.includes('grok')) return 'xai'
  if (model.includes('qwen')) return 'cerebras'
  return 'openai' // default
}
```

### 2. Save Conversation (Standard Mode)

```typescript
async function saveConversationStandard(
  userId: string,
  messages: any[],
  response: any,
  usage: any,
  model: string
) {
  const supabase = await createClient()

  // Generate conversation title
  const title = await generateTitle(messages[0]?.content)

  // Create conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      title: title,
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (convError) {
    console.error('[Standard] Error creating conversation:', convError)
    return
  }

  // Save user message
  await supabase
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      role: 'user',
      content: messages[messages.length - 1].content,
      tokens: usage.prompt_tokens,
      model: model
    })

  // Save assistant response
  await supabase
    .from('messages')
    .insert({
      conversation_id: conversation.id,
      role: 'assistant',
      content: response.choices[0].message.content,
      tokens: usage.completion_tokens,
      model: model
    })

  console.log(`[Standard] Saved conversation ${conversation.id} for user ${userId}`)
}
```

### 3. Save Usage Metadata (BYOK Mode)

```typescript
async function saveUsageMetadataBYOK(
  userId: string,
  usage: any,
  model: string,
  provider: string
) {
  const supabase = await createClient()

  // Calculate estimated cost for user's own tracking
  const estimatedCost = calculateCost(model, usage.total_tokens)

  // Save ONLY metadata, NO content
  const { error } = await supabase
    .from('ephemeral_usage')
    .insert({
      user_id: userId,
      provider: provider,
      model: model,
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      total_tokens: usage.total_tokens,
      estimated_cost_usd: estimatedCost,
      used_byok: true,
      session_id: generateSessionId(),
      created_at: new Date().toISOString()
    })

  if (error) {
    console.error('[BYOK] Error saving usage metadata:', error)
    return
  }

  console.log(`[BYOK] Saved usage metadata (NO content) for user ${userId}`)
}
```

### 4. Calculate Cost

```typescript
function calculateCost(model: string, totalTokens: number): number {
  // Pricing per 1M tokens (approximate)
  const pricing: Record<string, { input: number, output: number }> = {
    'gpt-4': { input: 30, output: 60 },
    'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
    'claude-3-opus': { input: 15, output: 75 },
    'claude-3-sonnet': { input: 3, output: 15 },
    // Add more models as needed
  }

  const modelPricing = pricing[model] || { input: 1, output: 2 }

  // Simple average (could be more sophisticated)
  const avgPrice = (modelPricing.input + modelPricing.output) / 2
  return (totalTokens / 1000000) * avgPrice
}
```

### 5. Generate Session ID

```typescript
function generateSessionId(): string {
  return crypto.randomUUID()
}
```

## Response Headers

Add mode information to response headers so client knows which mode was used:

```typescript
return NextResponse.json(response, {
  headers: {
    'X-Mode': mode,  // 'standard' or 'byok'
    'X-BYOK-Enabled': mode === 'byok' ? 'true' : 'false',
    'X-Conversation-Saved': mode === 'standard' ? 'true' : 'false'
  }
})
```

## Frontend Integration

The frontend can check the response headers to show appropriate UI:

```typescript
const response = await fetch('/api/chat/completions', {
  method: 'POST',
  body: JSON.stringify({ model, messages, userId })
})

const mode = response.headers.get('X-Mode')
const conversationSaved = response.headers.get('X-Conversation-Saved') === 'true'

// Show indicator to user
if (mode === 'byok') {
  showBanner('Ephemeral Mode: Using your API keys, conversation not saved')
} else {
  showBanner('Conversation saved to history')
}
```

## Testing

### Test Standard Mode

```bash
# User without any API keys → should use Polydev keys
curl -X POST http://localhost:3000/api/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello"}],
    "userId": "user-123"
  }'

# Should see:
# X-Mode: standard
# X-Conversation-Saved: true
# Conversation saved to database
```

### Test BYOK Mode

```bash
# User with their own OpenAI key → should use user's key
curl -X POST http://localhost:3000/api/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello"}],
    "userId": "user-456-with-byok"
  }'

# Should see:
# X-Mode: byok
# X-Conversation-Saved: false
# Only metadata saved, NO conversation content
```

## Database Verification

### Standard Mode Verification

```sql
-- Check conversations were saved
SELECT * FROM conversations WHERE user_id = 'user-123';

-- Check messages were saved
SELECT c.title, m.role, m.content, m.tokens
FROM conversations c
JOIN messages m ON m.conversation_id = c.id
WHERE c.user_id = 'user-123'
ORDER BY m.created_at;
```

### BYOK Mode Verification

```sql
-- Check NO conversations were saved
SELECT * FROM conversations WHERE user_id = 'user-456-with-byok';
-- Should return 0 rows

-- Check ONLY metadata was saved
SELECT
  user_id,
  provider,
  model,
  total_tokens,
  estimated_cost_usd,
  used_byok,
  created_at
FROM ephemeral_usage
WHERE user_id = 'user-456-with-byok';
-- Should show usage record with NO content
```

## Summary

| Aspect | Standard Mode | BYOK Mode |
|--------|--------------|-----------|
| **API Keys** | Polydev's keys | User's keys |
| **Conversation Storage** | ✅ Full conversation saved | ❌ NOT saved |
| **Usage Tracking** | From `messages` table | From `ephemeral_usage` table |
| **Billing** | Through Polydev | Direct with AI provider |
| **Tier Limits** | ✅ Enforced | ❌ No limits |
| **Cost** | Polydev's pricing | User pays per token |

## Next Steps

1. Update `/api/chat/completions/route.ts` with dual-mode logic
2. Update `/api/chat/stream/route.ts` with dual-mode logic
3. Add response headers for mode indication
4. Test both modes thoroughly
5. Update frontend to show mode indicators
