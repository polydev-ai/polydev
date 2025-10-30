# Dual-Mode Architecture Clarification

## Critical Distinction: TWO Modes, Different Storage Rules

### Mode 1: Polydev API Keys (Standard Mode)
**When**: User is using Polydev's managed API keys and credits

**Storage**: ✅ **MUST save conversations to database**

**Why**:
- Need to track usage for billing
- Need to enforce tier limits (free: 100 msgs/day, plus: 500/day, etc.)
- Can't trust client-side tracking for billing

**What Gets Saved**:
```sql
-- Conversations table
INSERT INTO conversations (user_id, title, created_at) VALUES (...);

-- Messages table
INSERT INTO messages (conversation_id, role, content, tokens, model) VALUES (...);
```

**Dashboard Stats Source**: Query from `conversations` and `messages` tables

---

### Mode 2: User's Own API Keys (BYOK = Ephemeral Mode)
**When**: User provides their own OpenAI/Anthropic/etc. API keys

**Storage**: ❌ **DO NOT save conversations to database**

**Why**:
- User pays their own API costs directly
- No need to track for billing (they get billed by OpenAI/Anthropic)
- No tier limits apply (user pays per token, unlimited usage)
- **User is explicitly choosing privacy** - they don't want content saved

**What Gets Saved**:
```sql
-- ONLY usage metadata (NO content)
INSERT INTO ephemeral_usage (
  user_id,
  provider,
  model,
  prompt_tokens,
  completion_tokens,
  total_tokens,
  estimated_cost_usd,  -- For user's own tracking
  used_byok,
  session_id
) VALUES (...);

-- NO conversation_id
-- NO message content
-- NO conversation history
```

**Dashboard Stats Source**: Query from `ephemeral_usage` table

---

## Dashboard Stats: Unified View

The dashboard at `http://localhost:3000/dashboard` must show stats from **BOTH modes combined**.

### Current Problem:
If user switches between modes, stats would be incomplete if we only query one table.

### Solution: Unified Stats Query

```typescript
// src/app/api/dashboard/stats/route.ts

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();

  // Query BOTH sources using Supabase MCP

  // 1. Standard Mode Stats (from conversations/messages)
  const standardStats = await mcp__supabase__execute_sql({
    query: `
      SELECT
        COUNT(DISTINCT c.id) as conversation_count,
        COUNT(m.id) as message_count,
        SUM(m.tokens) as total_tokens,
        array_agg(DISTINCT m.model) as models_used
      FROM conversations c
      LEFT JOIN messages m ON m.conversation_id = c.id
      WHERE c.user_id = '${userId}'
    `
  });

  // 2. BYOK Mode Stats (from ephemeral_usage)
  const byokStats = await mcp__supabase__execute_sql({
    query: `
      SELECT
        COUNT(DISTINCT session_id) as session_count,
        COUNT(*) as request_count,
        SUM(total_tokens) as total_tokens,
        SUM(estimated_cost_usd) as estimated_cost,
        array_agg(DISTINCT model) as models_used
      FROM ephemeral_usage
      WHERE user_id = '${userId}'
        AND used_byok = true
    `
  });

  // 3. Combine and return
  return NextResponse.json({
    totalMessages: standardStats.message_count + byokStats.request_count,
    totalTokens: standardStats.total_tokens + byokStats.total_tokens,
    modelsUsed: [...new Set([
      ...standardStats.models_used,
      ...byokStats.models_used
    ])],
    breakdown: {
      standard: {
        conversations: standardStats.conversation_count,
        messages: standardStats.message_count,
        tokens: standardStats.total_tokens,
        mode: 'Polydev API Keys (conversations saved)'
      },
      byok: {
        sessions: byokStats.session_count,
        requests: byokStats.request_count,
        tokens: byokStats.total_tokens,
        estimatedCost: byokStats.estimated_cost,
        mode: 'Your API Keys (ephemeral, not saved)'
      }
    }
  });
}
```

---

## Chat API Implementation: Mode Detection

```typescript
// src/app/api/chat/stream/route.ts (or completions/route.ts)

export async function POST(request: NextRequest) {
  const { userId, model, messages } = await request.json();

  // 1. Check user's BYOK status using Supabase MCP
  const profile = await mcp__supabase__execute_sql({
    query: `
      SELECT byok_enabled, subscription_tier
      FROM profiles
      WHERE id = '${userId}'
    `
  });

  // 2. Try to get user's own API key
  let apiKey = null;
  let mode = 'standard';  // Default to standard mode

  if (profile.byok_enabled) {
    const userKey = await mcp__supabase__execute_sql({
      query: `
        SELECT encrypted_api_key
        FROM user_api_keys
        WHERE user_id = '${userId}'
          AND provider = '${getProviderFromModel(model)}'
          AND is_active = true
        LIMIT 1
      `
    });

    if (userKey && userKey.encrypted_api_key) {
      // User has their own API key → BYOK mode
      apiKey = await decrypt(userKey.encrypted_api_key);
      mode = 'byok';
      console.log(`[BYOK] User ${userId} using own API key for ${model}`);
    }
  }

  // 3. If no user API key, use Polydev's keys
  if (!apiKey) {
    apiKey = process.env[`${provider.toUpperCase()}_API_KEY`];
    mode = 'standard';
    console.log(`[Standard] User ${userId} using Polydev API keys for ${model}`);
  }

  // 4. Call AI provider
  const providerStream = await callProvider(model, messages, apiKey);

  // 5. Track tokens
  let totalTokens = 0;
  let promptTokens = 0;
  let completionTokens = 0;

  const readable = new ReadableStream({
    async start(controller) {
      let fullResponse = '';

      for await (const chunk of providerStream) {
        controller.enqueue(chunk);
        fullResponse += chunk.text || '';

        if (chunk.usage) {
          totalTokens = chunk.usage.total_tokens;
          promptTokens = chunk.usage.prompt_tokens;
          completionTokens = chunk.usage.completion_tokens;
        }
      }

      // 6. Save based on mode
      if (mode === 'standard') {
        // Standard Mode: SAVE conversations
        await mcp__supabase__execute_sql({
          query: `
            WITH new_conv AS (
              INSERT INTO conversations (user_id, title, created_at)
              VALUES ('${userId}', 'New Chat', NOW())
              RETURNING id
            )
            INSERT INTO messages (conversation_id, role, content, tokens, model)
            SELECT
              new_conv.id,
              unnest(ARRAY['user', 'assistant']),
              unnest(ARRAY['${escapeSQL(messages[0].content)}', '${escapeSQL(fullResponse)}']),
              unnest(ARRAY[${promptTokens}, ${completionTokens}]),
              '${model}'
            FROM new_conv
          `
        });

        console.log(`[Standard] Saved conversation for user ${userId}`);

      } else if (mode === 'byok') {
        // BYOK Mode: ONLY save metadata (NO content)
        await mcp__supabase__execute_sql({
          query: `
            INSERT INTO ephemeral_usage (
              user_id,
              provider,
              model,
              prompt_tokens,
              completion_tokens,
              total_tokens,
              estimated_cost_usd,
              used_byok,
              session_id
            ) VALUES (
              '${userId}',
              '${getProviderFromModel(model)}',
              '${model}',
              ${promptTokens},
              ${completionTokens},
              ${totalTokens},
              ${calculateCost(model, totalTokens)},
              true,
              '${generateSessionId()}'
            )
          `
        });

        console.log(`[BYOK] Saved ONLY metadata (no content) for user ${userId}`);
      }

      controller.close();
    },
  });

  return new NextResponse(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Mode': mode,  // Tell client which mode was used
      'X-BYOK-Enabled': mode === 'byok' ? 'true' : 'false',
    },
  });
}
```

---

## Key Decision Points

### When User Adds BYOK API Key:

**Question**: Should we automatically switch to ephemeral mode?

**Answer**: Depends on tier:
- **Free**: Cannot use BYOK (not available)
- **Plus**: User can choose (opt-in to ephemeral)
- **Pro**: Ephemeral enabled by default (can opt-out)
- **Enterprise**: Forced ephemeral (cannot disable)

### When User Removes BYOK API Key:

**Question**: What happens to their account?

**Answer**: Automatically fall back to Standard Mode
- Use Polydev API keys
- Start saving conversations again
- Tier limits apply again

### When User Has Both BYOK and Polydev Credits:

**Question**: Which takes precedence?

**Answer**: BYOK always takes precedence if available
```typescript
const mode = userHasByokKey ? 'byok' : 'standard';
```

This way:
- User can test BYOK without losing Polydev credits
- User controls when to use their own keys
- Falls back gracefully if their API key is invalid

---

## Comparison Table: What Gets Saved?

| Item | Standard Mode (Polydev Keys) | BYOK Mode (User Keys) |
|------|------------------------------|----------------------|
| **Conversation Title** | ✅ Saved | ❌ Not saved |
| **User Message Content** | ✅ Saved | ❌ Not saved |
| **AI Response Content** | ✅ Saved | ❌ Not saved |
| **Tokens Used** | ✅ Saved | ✅ Saved (metadata) |
| **Model Used** | ✅ Saved | ✅ Saved (metadata) |
| **Estimated Cost** | ✅ Calculated | ✅ Saved (for user) |
| **MCP Tool Calls** | ✅ Saved | ❌ Not saved |
| **MCP Tool Results** | ✅ Saved | ❌ Not saved |
| **Conversation History** | ✅ Accessible | ❌ Not accessible (unless client-side) |
| **Dashboard Stats** | ✅ From `messages` table | ✅ From `ephemeral_usage` table |

---

## UI Indicators

### Dashboard Stats Card

```tsx
<Card>
  <h3>Usage Statistics</h3>

  {/* Combined stats */}
  <div>
    <p>Total Messages: {stats.totalMessages}</p>
    <p>Total Tokens: {stats.totalTokens.toLocaleString()}</p>
    <p>Models Used: {stats.modelsUsed.join(', ')}</p>
  </div>

  {/* Breakdown by mode */}
  <div className="mt-4 border-t pt-4">
    <h4>Breakdown</h4>

    {stats.breakdown.standard.messages > 0 && (
      <div className="bg-blue-50 p-3 rounded mb-2">
        <p className="font-semibold">Standard Mode (Polydev API Keys)</p>
        <p>Conversations: {stats.breakdown.standard.conversations}</p>
        <p>Messages: {stats.breakdown.standard.messages}</p>
        <p>Tokens: {stats.breakdown.standard.tokens.toLocaleString()}</p>
        <span className="text-sm text-gray-600">
          💾 Conversations saved for history
        </span>
      </div>
    )}

    {stats.breakdown.byok.requests > 0 && (
      <div className="bg-green-50 p-3 rounded">
        <p className="font-semibold">BYOK Mode (Your API Keys)</p>
        <p>Sessions: {stats.breakdown.byok.sessions}</p>
        <p>Requests: {stats.breakdown.byok.requests}</p>
        <p>Tokens: {stats.breakdown.byok.tokens.toLocaleString()}</p>
        <p>Estimated Cost: ${stats.breakdown.byok.estimatedCost.toFixed(2)}</p>
        <span className="text-sm text-gray-600">
          🔒 Ephemeral mode - conversations not saved
        </span>
      </div>
    )}
  </div>
</Card>
```

### Chat Interface Indicator

```tsx
<div className="chat-header">
  {mode === 'byok' ? (
    <div className="bg-green-100 border border-green-300 rounded px-3 py-1">
      <Lock className="inline w-4 h-4" />
      <span className="ml-2 text-sm">
        Ephemeral Mode: Using your API keys, not saving conversation
      </span>
    </div>
  ) : (
    <div className="bg-blue-100 border border-blue-300 rounded px-3 py-1">
      <Database className="inline w-4 h-4" />
      <span className="ml-2 text-sm">
        Standard Mode: Conversation saved for history
      </span>
    </div>
  )}
</div>
```

---

## Summary

**Two completely different modes**:

1. **Standard Mode** (Polydev API Keys)
   - Conversations SAVED
   - Stats from `messages` table
   - Tier limits apply
   - Full conversation history

2. **BYOK Mode** (User's API Keys)
   - Conversations NOT SAVED
   - Stats from `ephemeral_usage` table (metadata only)
   - No tier limits (user pays per token)
   - No server-side history

**Dashboard shows BOTH**:
- Combined total stats
- Breakdown by mode
- Clear indicators which mode was used

**User always knows**:
- Which mode they're in
- What's being saved
- How much they're spending

---

**Files to Create/Update**:
1. `src/app/api/dashboard/stats/route.ts` - Unified stats API
2. `src/app/dashboard/page.tsx` - Update to show both modes
3. `src/app/api/chat/stream/route.ts` - Dual-mode logic
4. `src/components/chat/ModeIndicator.tsx` - Visual mode indicator

**Using Supabase MCP**:
- `mcp__supabase__execute_sql` for all database queries
- No direct Supabase client imports
- Cleaner, more maintainable code
