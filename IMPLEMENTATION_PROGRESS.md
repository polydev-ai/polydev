# Dual-Mode Implementation Progress

## ✅ Completed

### 1. Database Migration (DONE)
**Migration:** `031_ephemeral_conversations_byok.sql`

**Tables Created:**
- `ephemeral_usage` - Tracks BYOK usage metadata (NO conversation content)
- `ephemeral_mode_audit` - Audit trail for mode changes

**Columns Added to `profiles`:**
- `ephemeral_conversations` - Whether user is in ephemeral mode
- `byok_enabled` - Whether user has BYOK enabled
- `ephemeral_enabled_at` - Timestamp when enabled
- `client_side_storage` - Whether user chose client-side storage

**Existing Table:** `user_api_keys` already exists with comprehensive schema

---

## ⏳ Remaining Implementation Tasks

### 2. BYOK API Key Management Endpoints
**Status:** IN PROGRESS

**Files to Create:**
1. `src/app/api/byok/keys/route.ts` - List and add BYOK API keys
2. `src/app/api/byok/keys/[id]/route.ts` - Update and delete specific keys

**GET /api/byok/keys** - List user's BYOK API keys
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { mcp__supabase__execute_sql } from '@/mcp/supabase';
import { getCurrentUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    const result = await mcp__supabase__execute_sql({
      query: `
        SELECT
          id,
          provider,
          key_name,
          key_preview,
          active,
          created_at,
          last_used_at
        FROM user_api_keys
        WHERE user_id = '${userId}'
          AND active = true
        ORDER BY created_at DESC
      `
    });

    return NextResponse.json({ keys: result });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
  }
}
```

**POST /api/byok/keys** - Add new BYOK API key
```typescript
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const { provider, keyName, apiKey } = await request.json();

    // Encrypt the API key (implement encryption)
    const encryptedKey = await encryptApiKey(apiKey);
    const keyPreview = apiKey.substring(0, 10) + '...';

    const result = await mcp__supabase__execute_sql({
      query: `
        INSERT INTO user_api_keys (
          user_id, provider, key_name, encrypted_key, key_preview, active
        ) VALUES (
          '${userId}',
          '${provider}',
          '${keyName}',
          '${encryptedKey}',
          '${keyPreview}',
          true
        )
        RETURNING id, provider, key_name, key_preview, created_at
      `
    });

    // Auto-enable BYOK mode
    await mcp__supabase__execute_sql({
      query: `
        UPDATE profiles
        SET byok_enabled = true
        WHERE id = '${userId}'
      `
    });

    return NextResponse.json({ key: result[0] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add API key' }, { status: 500 });
  }
}
```

**DELETE /api/byok/keys/[id]** - Delete BYOK API key
```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();

    await mcp__supabase__execute_sql({
      query: `
        UPDATE user_api_keys
        SET active = false
        WHERE id = '${params.id}'
          AND user_id = '${userId}'
      `
    });

    // Check if user has any remaining active keys
    const remaining = await mcp__supabase__execute_sql({
      query: `
        SELECT COUNT(*) as count
        FROM user_api_keys
        WHERE user_id = '${userId}'
          AND active = true
      `
    });

    // If no keys remain, disable BYOK mode
    if (remaining[0].count === 0) {
      await mcp__supabase__execute_sql({
        query: `
          UPDATE profiles
          SET byok_enabled = false, ephemeral_conversations = false
          WHERE id = '${userId}'
        `
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 });
  }
}
```

---

### 3. Update Chat API with Dual-Mode Logic
**Status:** PENDING

**File to Modify:** `src/app/api/chat/stream/route.ts`

**Key Changes:**
```typescript
export async function POST(request: NextRequest) {
  const { userId, model, messages } = await request.json();

  // 1. Check if user has BYOK enabled and has API keys
  const profile = await mcp__supabase__execute_sql({
    query: `
      SELECT byok_enabled, subscription_tier
      FROM profiles
      WHERE id = '${userId}'
    `
  });

  let apiKey = null;
  let mode = 'standard'; // Default to standard mode

  // 2. Try to get user's own API key for this model's provider
  if (profile[0].byok_enabled) {
    const provider = getProviderFromModel(model); // 'openai', 'anthropic', etc.

    const userKey = await mcp__supabase__execute_sql({
      query: `
        SELECT encrypted_key
        FROM user_api_keys
        WHERE user_id = '${userId}'
          AND provider = '${provider}'
          AND active = true
        LIMIT 1
      `
    });

    if (userKey && userKey[0]?.encrypted_key) {
      apiKey = await decryptApiKey(userKey[0].encrypted_key);
      mode = 'byok';
      console.log(`[BYOK Mode] User ${userId} using own API key for ${model}`);
    }
  }

  // 3. If no user API key, use Polydev's keys
  if (!apiKey) {
    apiKey = process.env[`${provider.toUpperCase()}_API_KEY`];
    mode = 'standard';
    console.log(`[Standard Mode] User ${userId} using Polydev API keys for ${model}`);
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

        console.log(`[Standard Mode] Saved conversation for user ${userId}`);

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

        console.log(`[BYOK Mode] Saved ONLY metadata (no content) for user ${userId}`);
      }

      controller.close();
    },
  });

  return new NextResponse(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Mode': mode, // Tell client which mode was used
      'X-BYOK-Enabled': mode === 'byok' ? 'true' : 'false',
    },
  });
}
```

---

### 4. Create Unified Dashboard Stats API
**Status:** PENDING

**File to Create:** `src/app/api/dashboard/stats/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { mcp__supabase__execute_sql } from '@/mcp/supabase';
import { getCurrentUserId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    // 1. Standard Mode Stats (from conversations/messages)
    const standardStats = await mcp__supabase__execute_sql({
      query: `
        SELECT
          COUNT(DISTINCT c.id) as conversation_count,
          COUNT(m.id) as message_count,
          SUM(m.tokens) as total_tokens,
          array_agg(DISTINCT m.model) FILTER (WHERE m.model IS NOT NULL) as models_used
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
      totalMessages: (standardStats[0].message_count || 0) + (byokStats[0].request_count || 0),
      totalTokens: (standardStats[0].total_tokens || 0) + (byokStats[0].total_tokens || 0),
      modelsUsed: [
        ...new Set([
          ...(standardStats[0].models_used || []),
          ...(byokStats[0].models_used || [])
        ])
      ],
      breakdown: {
        standard: {
          conversations: standardStats[0].conversation_count || 0,
          messages: standardStats[0].message_count || 0,
          tokens: standardStats[0].total_tokens || 0,
          mode: 'Polydev API Keys (conversations saved)'
        },
        byok: {
          sessions: byokStats[0].session_count || 0,
          requests: byokStats[0].request_count || 0,
          tokens: byokStats[0].total_tokens || 0,
          estimatedCost: byokStats[0].estimated_cost || 0,
          mode: 'Your API Keys (ephemeral, not saved)'
        }
      }
    });
  } catch (error) {
    console.error('[Dashboard Stats] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
```

---

### 5. Update Security Settings UI
**Status:** PENDING

**File to Modify:** `src/app/dashboard/security/page.tsx`

**Sections to Add:**

1. **BYOK Status Section:**
```tsx
<div className="bg-white rounded-lg shadow p-6">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold">Bring Your Own Keys (BYOK)</h3>
    <Badge variant={byokEnabled ? 'success' : 'secondary'}>
      {byokEnabled ? 'Enabled' : 'Disabled'}
    </Badge>
  </div>

  <p className="text-sm text-gray-600 mb-4">
    Use your own API keys for maximum control. Conversations won't be saved to our database.
  </p>

  {byokEnabled && (
    <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
      <p className="text-sm text-blue-800">
        <strong>Ephemeral Mode Active:</strong> Conversations are NOT saved. Only usage metadata is tracked.
      </p>
    </div>
  )}

  <Button onClick={() => router.push('/dashboard/byok')}>
    Manage API Keys
  </Button>
</div>
```

2. **API Keys Management Page** (`src/app/dashboard/byok/page.tsx`):
```tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function BYOKPage() {
  const [keys, setKeys] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    const res = await fetch('/api/byok/keys');
    const data = await res.json();
    setKeys(data.keys);
  };

  const handleAddKey = async (provider, keyName, apiKey) => {
    await fetch('/api/byok/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, keyName, apiKey })
    });
    fetchKeys();
  };

  const handleDeleteKey = async (keyId) => {
    await fetch(`/api/byok/keys/${keyId}`, { method: 'DELETE' });
    fetchKeys();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Manage API Keys (BYOK)</h1>

      <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
        <p className="text-sm text-yellow-800">
          <strong>Privacy Mode:</strong> When using your own API keys, conversations are NOT saved to our database. Only usage metadata (tokens, costs) is tracked for your dashboard stats.
        </p>
      </div>

      {/* List existing keys */}
      <div className="space-y-4 mb-6">
        {keys.map(key => (
          <div key={key.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold">{key.key_name}</p>
              <p className="text-sm text-gray-600">{key.provider}</p>
              <p className="text-xs text-gray-400">{key.key_preview}</p>
            </div>
            <Button variant="destructive" onClick={() => handleDeleteKey(key.id)}>
              Delete
            </Button>
          </div>
        ))}
      </div>

      {/* Add new key form */}
      <Button onClick={() => setShowAddForm(true)}>
        + Add API Key
      </Button>

      {showAddForm && (
        <AddKeyForm onAdd={handleAddKey} onCancel={() => setShowAddForm(false)} />
      )}
    </div>
  );
}
```

---

### 6. Update Pricing Page
**Status:** PARTIALLY COMPLETE (FAQ added, tier comparison needs update)

**File to Modify:** `src/app/pricing/page.tsx`

**Update Tier Comparison Table:**
```tsx
<div className="grid md:grid-cols-4 gap-8">
  {/* Free Tier */}
  <div className="rounded-2xl border-2 border-slate-200 p-8">
    <h3 className="text-2xl font-bold">Free</h3>
    <ul className="space-y-4 mt-6">
      <li>100 messages/day</li>
      <li>Basic models</li>
      <li className="text-gray-400">❌ BYOK Not Available</li>
      <li>Conversations saved</li>
    </ul>
  </div>

  {/* Plus Tier */}
  <div className="rounded-2xl border-2 border-slate-200 p-8">
    <h3 className="text-2xl font-bold">Plus</h3>
    <ul className="space-y-4 mt-6">
      <li>500 messages/day</li>
      <li>All models</li>
      <li>✅ BYOK Available (opt-in)</li>
      <li>Choose: Save or Ephemeral</li>
    </ul>
  </div>

  {/* Pro Tier */}
  <div className="rounded-2xl border-2 border-blue-500 p-8">
    <h3 className="text-2xl font-bold">Pro</h3>
    <ul className="space-y-4 mt-6">
      <li>Unlimited messages</li>
      <li>All models + priority</li>
      <li>✅ BYOK Enabled by default</li>
      <li>Ephemeral mode (opt-out)</li>
    </ul>
  </div>

  {/* Enterprise Tier */}
  <div className="rounded-2xl border-2 border-slate-200 p-8">
    <h3 className="text-2xl font-bold">Enterprise</h3>
    <ul className="space-y-4 mt-6">
      <li>Unlimited everything</li>
      <li>Custom models</li>
      <li>✅ BYOK Required</li>
      <li>Forced ephemeral mode</li>
    </ul>
  </div>
</div>
```

---

## Utility Functions Needed

### Encryption/Decryption
**File to Create:** `src/lib/encryption.ts`

```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_KEY!;
const ALGORITHM = 'aes-256-gcm';

export async function encryptApiKey(apiKey: string): Promise<string> {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    authTag: authTag.toString('hex')
  });
}

export async function decryptApiKey(encryptedData: string): Promise<string> {
  const { iv, encryptedData: data, authTag } = JSON.parse(encryptedData);

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

### Provider Detection
**File to Create:** `src/lib/providers.ts`

```typescript
export function getProviderFromModel(model: string): string {
  if (model.startsWith('gpt-') || model.startsWith('o1-')) return 'openai';
  if (model.startsWith('claude-')) return 'anthropic';
  if (model.startsWith('gemini-')) return 'google';
  if (model.startsWith('grok-')) return 'xai';
  return 'unknown';
}

export function calculateCost(model: string, totalTokens: number): number {
  // Simplified cost calculation - adjust based on actual pricing
  const costPerMToken = {
    'gpt-4': 30,
    'gpt-3.5-turbo': 2,
    'claude-3-opus': 15,
    'claude-3-sonnet': 3,
    'gemini-pro': 0.5,
  };

  const baseCost = costPerMToken[model] || 5;
  return (totalTokens / 1_000_000) * baseCost;
}
```

---

## Environment Variables Required

Add to `.env.local`:
```bash
# API Key Encryption
API_KEY_ENCRYPTION_KEY=your-32-byte-hex-key-here

# Polydev Managed API Keys (for Standard Mode)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
```

---

## Testing Checklist

### Standard Mode (Polydev API Keys)
- [ ] User sends message without BYOK key
- [ ] Conversation saved to `conversations` and `messages` tables
- [ ] Dashboard shows stats from `messages` table
- [ ] User can view conversation history

### BYOK Mode (User's API Keys)
- [ ] User adds BYOK API key
- [ ] `byok_enabled` set to `true` in profiles
- [ ] User sends message with BYOK key
- [ ] NO conversation saved (check `conversations` table)
- [ ] ONLY metadata saved to `ephemeral_usage`
- [ ] Dashboard shows combined stats from both tables
- [ ] Mode indicator shows "BYOK Mode" in UI

### Mode Switching
- [ ] User removes last BYOK key
- [ ] `byok_enabled` automatically set to `false`
- [ ] Next message uses Standard Mode
- [ ] Conversation saved normally

---

## Next Steps

1. **Create BYOK API endpoints** - In progress
2. **Update chat API** with dual-mode logic
3. **Create unified dashboard stats** API
4. **Update security settings UI** with BYOK management
5. **Update pricing page** tier comparison
6. **Add encryption utilities** for API keys
7. **Test end-to-end** flow for both modes
