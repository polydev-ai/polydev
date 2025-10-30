# Ephemeral Mode Architecture - True Privacy with BYOK

## Overview

Ephemeral Mode provides **truly private conversations** when combined with BYOK (Bring Your Own Keys). When enabled, **NO conversation content** is saved to the Polydev database - the server acts as a transparent proxy only.

---

## Core Architecture Principle

**Standard Mode**: User → Polydev Server → AI Provider
- Server sees plaintext (for routing, billing, rate limiting)
- Conversations saved to Supabase database
- Full conversation history available

**Ephemeral Mode + BYOK**: User → Polydev Server (transparent proxy) → AI Provider (user's keys)
- Server sees plaintext (for routing MCP tool calls)
- **ZERO conversation content saved** to database
- Only usage metadata tracked (tokens, costs, session_id)
- User pays API costs directly
- MCP tool calls executed but NOT saved

---

## Key Benefits of BYOK + Ephemeral Mode

### Why This Changes Everything

**Without BYOK** (Polydev-managed API keys):
- Server needs to track usage for billing
- Tier limits apply (free: 100 msgs/day, etc.)
- Conversations might be saved for tier enforcement
- Privacy depends on trusting Polydev

**With BYOK** (User's own API keys):
- **User pays API costs directly** → No need for server to track billing
- **No tier limits** → User can send unlimited messages (they pay per token)
- **Server doesn't need to save conversations** → User explicitly asking for no storage
- **Maximum privacy** → Only metadata tracked (no content)

### The User's Perspective

When a user enables BYOK + Ephemeral Mode, they're saying:
> "I'll pay for my own API usage. I don't want Polydev to save my conversations. Just route my requests and execute MCP tools."

This is the **maximum privacy option** while still getting:
- ✅ Multi-provider comparison (OpenAI, Claude, Gemini, etc.)
- ✅ MCP tool calls (filesystem, terminal, etc.)
- ✅ Streaming responses
- ❌ No server-side conversation storage
- ❌ No tier limits (user pays per token)

---

## Answer to MCP Question

### User's Question:
> "how do we handle it in MCP and how do we handle what is being sent and received? maybe we don't save as user is explicitly asking not to save?"

### Answer:

**When user has `ephemeral_conversations = true` + `byok_enabled = true`:**

#### What DOES Happen:
1. **MCP tool calls ARE executed normally**
   - Filesystem operations (read, write, edit files)
   - Terminal commands (bash, git, etc.)
   - All MCP tools work exactly as in Standard Mode

2. **AI responses stream back to user in real-time**
   - User sees responses immediately
   - Client can store in localStorage if user enables `client_side_storage`

3. **Usage metadata IS tracked** (for analytics only):
   ```sql
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
   ) VALUES (...)
   -- NO message content
   -- NO conversation_id
   ```

#### What DOES NOT Happen:
1. **Conversation messages NOT saved** to `conversations` table
2. **Message content NOT saved** to `messages` table
3. **MCP tool call results NOT saved** to database
4. **No persistent conversation history** in server database

#### Client-Side Storage Option:
If user enables `client_side_storage = true`:
- Conversations saved to browser localStorage
- User controls their own data locally
- Can export/backup their own conversations
- Survives browser refreshes
- Not accessible to Polydev server

---

## Implementation Flow

### User Setup (Security Settings Page):

```tsx
// User toggles:
1. Enable BYOK
   - Upload OpenAI API key (encrypted)
   - Upload Anthropic API key (encrypted)
   - Upload other provider keys as needed

2. Enable Ephemeral Mode
   - Checkbox: "Don't save my conversations to Polydev database"
   - Note: "Conversations will NOT be saved. Only usage metadata tracked."

3. (Optional) Enable Client-Side Storage
   - Checkbox: "Save conversations to my browser (local only)"
   - Note: "Conversations stored in your browser's localStorage, not on Polydev servers."
```

### Server-Side Flow:

```typescript
// src/app/api/chat/stream/route.ts (or completions/route.ts)

export async function POST(request: NextRequest) {
  const { userId, model, messages } = await request.json();

  // 1. Check user's ephemeral mode and BYOK status
  const { data: profile } = await supabase
    .from('profiles')
    .select('ephemeral_conversations, byok_enabled, subscription_tier')
    .eq('id', userId)
    .single();

  const isEphemeral = profile?.ephemeral_conversations || false;
  const hasByok = profile?.byok_enabled || false;

  // 2. Get API key (user's own if BYOK, otherwise Polydev's)
  let apiKey;
  let usedByok = false;

  if (hasByok && isEphemeral) {
    // Use user's own API key
    const { data: userKey } = await supabase
      .from('user_api_keys')
      .select('encrypted_api_key')
      .eq('user_id', userId)
      .eq('provider', getProviderFromModel(model))
      .eq('is_active', true)
      .single();

    if (userKey) {
      apiKey = await decrypt(userKey.encrypted_api_key);
      usedByok = true;
      console.log(`[Ephemeral] User ${userId} using BYOK for ${model}`);
    }
  }

  if (!apiKey) {
    // Fall back to Polydev's API keys
    apiKey = process.env[`${provider.toUpperCase()}_API_KEY`];
    usedByok = false;
  }

  // 3. Call AI provider and stream response
  const providerStream = await callProvider(model, messages, apiKey);

  // 4. Track tokens for usage metadata (NOT saving content)
  let totalTokens = 0;
  let promptTokens = 0;
  let completionTokens = 0;

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of providerStream) {
        controller.enqueue(chunk);

        // Extract token counts from streaming chunks
        if (chunk.usage) {
          totalTokens = chunk.usage.total_tokens;
          promptTokens = chunk.usage.prompt_tokens;
          completionTokens = chunk.usage.completion_tokens;
        }
      }

      // 5. Save ONLY usage metadata (NO content)
      if (isEphemeral) {
        await supabase
          .from('ephemeral_usage')
          .insert({
            user_id: userId,
            provider: getProviderFromModel(model),
            model,
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: totalTokens,
            estimated_cost_usd: calculateCost(model, totalTokens),
            used_byok: usedByok,
            session_id: generateSessionId(), // Ephemeral session ID
          });

        console.log(`[Ephemeral] Saved usage metadata (no content) for user ${userId}`);
      } else {
        // Standard mode: save conversation to database
        await saveConversationToDatabase(userId, messages, response);
        console.log(`[Standard] Saved conversation for user ${userId}`);
      }

      controller.close();
    },
  });

  return new NextResponse(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Ephemeral-Mode': isEphemeral ? 'true' : 'false',
      'X-BYOK-Enabled': usedByok ? 'true' : 'false',
    },
  });
}
```

---

## MCP Tool Calls in Ephemeral Mode

### Example: User Asks to Edit a File

**User Message**: "Can you update the README to include installation instructions?"

**What Happens** (Ephemeral Mode + BYOK):

1. **AI processes request** using user's API key
2. **AI calls MCP tool**: `mcp__filesystem__edit_file`
   - Edits the file on filesystem
   - Returns success/failure
3. **AI responds to user**: "I've updated the README with installation instructions."
4. **Server tracks usage**:
   ```sql
   INSERT INTO ephemeral_usage (
     user_id: 'user-123',
     provider: 'anthropic',
     model: 'claude-sonnet-4',
     prompt_tokens: 150,
     completion_tokens: 80,
     total_tokens: 230,
     estimated_cost_usd: 0.0012,
     used_byok: true,
     session_id: 'ephemeral-session-abc123'
   )
   -- NO content saved
   ```

5. **What is NOT saved**:
   - ❌ User's question
   - ❌ AI's response
   - ❌ MCP tool call details
   - ❌ File content that was edited

6. **Client-side** (if `client_side_storage = true`):
   - User's browser localStorage saves the conversation
   - User can see their conversation history in their browser
   - Data never leaves user's machine

---

## Tier-Based Defaults

### Free Tier
- **Ephemeral Mode**: NOT available
- **BYOK**: NOT available
- **Why**: Server needs to track usage for tier limits
- **Conversation Storage**: Required (server-side)

### Plus Tier
- **Ephemeral Mode**: Opt-in available
- **BYOK**: Available
- **Why**: Users can choose privacy over convenience
- **Conversation Storage**: Optional (if ephemeral enabled)

### Pro Tier
- **Ephemeral Mode**: **Default enabled** (can opt-out)
- **BYOK**: Available and encouraged
- **Why**: Privacy by default for professional users
- **Conversation Storage**: Opt-in only

### Enterprise Tier
- **Ephemeral Mode**: **Forced enabled** (cannot disable)
- **BYOK**: Required
- **Why**: Maximum privacy for sensitive enterprise data
- **Conversation Storage**: Never (client-side only)

---

## Database Schema

### Existing Tables (NOT used in Ephemeral Mode)
```sql
-- Standard Mode ONLY
conversations (id, user_id, title, created_at, ...)
messages (id, conversation_id, role, content, ...)
```

### New Tables (Ephemeral Mode)
```sql
-- User's own API keys (encrypted)
user_api_keys (
  id,
  user_id,
  provider,  -- 'openai', 'anthropic', 'google', etc.
  encrypted_api_key,  -- Encrypted with server key
  key_name,  -- User-friendly name
  is_active,
  created_at,
  updated_at,
  last_used_at
)

-- Usage metadata ONLY (NO content)
ephemeral_usage (
  id,
  user_id,
  provider,
  model,
  prompt_tokens,
  completion_tokens,
  total_tokens,
  estimated_cost_usd,
  used_byok,  -- Whether user's API key was used
  session_id,  -- Ephemeral session ID (not linked to conversations table)
  created_at
  -- NO message content
  -- NO conversation_id
)

-- Audit trail for compliance
ephemeral_mode_audit (
  id,
  user_id,
  action,  -- 'enabled', 'disabled', 'byok_added', 'byok_removed'
  previous_state,
  new_state,
  created_at,
  ip_address,
  user_agent
)
```

### Profile Columns
```sql
ALTER TABLE profiles ADD COLUMN ephemeral_conversations BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN byok_enabled BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN ephemeral_enabled_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN client_side_storage BOOLEAN DEFAULT false;
```

---

## Comparison Table

| Feature | Standard Mode | Privacy Mode | Ephemeral + BYOK |
|---------|--------------|--------------|-------------------|
| **Server sees plaintext** | ✅ Yes | ✅ Yes | ✅ Yes (for routing) |
| **Conversations saved** | ✅ Yes | ✅ Yes | ❌ NO |
| **Messages saved** | ✅ Yes | ✅ Yes | ❌ NO |
| **MCP tool calls work** | ✅ Yes | ✅ Yes | ✅ Yes |
| **MCP results saved** | ✅ Yes | ✅ Yes | ❌ NO |
| **Usage metadata tracked** | ✅ Yes | ✅ Yes | ✅ Yes (only) |
| **Conversation history** | ✅ Server | ✅ Server | ❌ Client-side only |
| **API key** | Polydev | Polydev | User's own |
| **Who pays** | Polydev | Polydev | User |
| **Tier limits** | ✅ Enforced | ✅ Enforced | ❌ No limits |
| **Privacy level** | Low | Medium | **Highest** |

---

## User Flow Examples

### Example 1: Pro User Upgrades

**Scenario**: User upgrades from Plus to Pro

**What Happens**:
1. Trigger fires: `auto_enable_ephemeral_for_tier()`
2. Profile updated:
   ```sql
   UPDATE profiles
   SET ephemeral_conversations = true,
       ephemeral_enabled_at = NOW()
   WHERE id = 'user-123';
   ```
3. User receives notification:
   > "🎉 You've upgraded to Pro! Ephemeral Mode is now enabled by default. Your conversations will NOT be saved to our database. Add your API keys for maximum privacy."

4. User can:
   - Add their own API keys (BYOK)
   - Enable client-side storage
   - Or opt-out of ephemeral mode (back to standard)

### Example 2: Free User Tries to Enable Ephemeral

**Scenario**: Free tier user tries to enable ephemeral mode

**What Happens**:
1. UI shows toggle disabled with message:
   > "❌ Ephemeral Mode requires Plus or higher. Upgrade to enable privacy mode."

2. If user tries to enable via API:
   ```typescript
   if (profile.subscription_tier === 'free' && wantsEphemeral) {
     return NextResponse.json({
       error: 'Ephemeral Mode requires Plus tier or higher'
     }, { status: 403 });
   }
   ```

### Example 3: Enterprise User

**Scenario**: Enterprise user signs up

**What Happens**:
1. Profile created with:
   ```sql
   INSERT INTO profiles (
     id,
     subscription_tier,
     ephemeral_conversations,
     ephemeral_enabled_at,
     byok_enabled
   ) VALUES (
     'enterprise-user-123',
     'enterprise',
     true,  -- Forced enabled
     NOW(),
     false  -- Will require BYOK setup
   );
   ```

2. User receives onboarding:
   > "Welcome to Polydev Enterprise! Your account has maximum privacy enabled:
   > - ✅ Ephemeral Mode: Conversations NOT saved
   > - ⚠️ BYOK Required: Add your API keys to start"

3. User MUST add API keys before using:
   ```typescript
   if (profile.subscription_tier === 'enterprise' && !profile.byok_enabled) {
     return NextResponse.json({
       error: 'Enterprise tier requires BYOK. Please add your API keys in Security settings.'
     }, { status: 403 });
   }
   ```

---

## Security Considerations

### API Key Encryption

**Storage**:
```typescript
import { encrypt, decrypt } from '@/lib/crypto/server-crypto';

// When user adds API key
const encryptedKey = await encrypt(userProvidedApiKey);
await supabase
  .from('user_api_keys')
  .insert({
    user_id: userId,
    provider: 'openai',
    encrypted_api_key: encryptedKey,
    key_name: 'My OpenAI Key',
  });

// When using API key
const { data } = await supabase
  .from('user_api_keys')
  .select('encrypted_api_key')
  .eq('user_id', userId)
  .eq('provider', 'openai')
  .single();

const apiKey = await decrypt(data.encrypted_api_key);
```

**Encryption Method**: AES-256-GCM with server-managed encryption keys

### Trust Model

**Ephemeral + BYOK**:
- ✅ User controls: API costs, provider relationships
- ⚠️ User still trusts: Polydev server to not save content (we don't)
- ✅ Verifiable: User can check their own API usage directly with providers
- ✅ Auditable: Compliance logs track when ephemeral mode changes

**For Zero Server Trust**: Use Cline or other local-only solutions

---

## Testing Plan

### Unit Tests

1. **Ephemeral Mode Detection**:
   ```typescript
   test('should detect ephemeral mode from profile', async () => {
     const profile = { ephemeral_conversations: true };
     expect(isEphemeral(profile)).toBe(true);
   });
   ```

2. **BYOK Key Retrieval**:
   ```typescript
   test('should retrieve user API key when BYOK enabled', async () => {
     const apiKey = await getUserApiKey(userId, 'openai');
     expect(apiKey).toBeDefined();
   });
   ```

3. **Usage Tracking (No Content)**:
   ```typescript
   test('should save ONLY metadata in ephemeral mode', async () => {
     await trackEphemeralUsage({ userId, tokens, model });

     const usage = await getUsage(userId);
     expect(usage.total_tokens).toBeDefined();
     expect(usage.message_content).toBeUndefined();
   });
   ```

### Integration Tests

1. **End-to-End Ephemeral Flow**:
   - User enables ephemeral + BYOK
   - User sends message
   - AI responds
   - Verify NO conversation saved
   - Verify usage metadata saved

2. **MCP Tool Calls**:
   - User asks to edit file (ephemeral mode)
   - Verify file edited
   - Verify NO tool call saved
   - Verify usage metadata saved

3. **Tier-Based Defaults**:
   - User upgrades to Pro
   - Verify ephemeral auto-enabled
   - User downgrades to Plus
   - Verify ephemeral disabled

---

## Migration Path

### Phase 1: Database Schema ✅
- ✅ `031_ephemeral_conversations_byok.sql` applied
- Tables created: `user_api_keys`, `ephemeral_usage`, `ephemeral_mode_audit`
- Columns added to `profiles`

### Phase 2: BYOK API Endpoints
- `POST /api/byok/keys` - Add user API key
- `GET /api/byok/keys` - List user's keys
- `DELETE /api/byok/keys/:id` - Remove key
- `PUT /api/byok/keys/:id` - Update key

### Phase 3: Chat API Updates
- Update `/api/chat/stream/route.ts` to check ephemeral mode
- Implement conditional conversation saving
- Add usage metadata tracking
- Support user API keys

### Phase 4: UI Updates
- Security Settings page: Ephemeral toggle, BYOK management
- Dashboard: Privacy indicators
- Conversation history: "Ephemeral mode active" notice

### Phase 5: Tier Configuration
- Update subscription tier defaults
- Implement tier-based restrictions
- Add upgrade prompts for free users

---

## Monitoring and Analytics

### What We Track in Ephemeral Mode:

```sql
SELECT
  DATE(created_at) as date,
  provider,
  model,
  COUNT(*) as request_count,
  SUM(total_tokens) as total_tokens,
  SUM(estimated_cost_usd) as estimated_cost,
  SUM(CASE WHEN used_byok THEN 1 ELSE 0 END) as byok_requests
FROM ephemeral_usage
WHERE user_id = 'user-123'
GROUP BY DATE(created_at), provider, model
ORDER BY date DESC;
```

**We can see**:
- ✅ How many requests per day
- ✅ Which models being used
- ✅ Token usage trends
- ✅ BYOK vs Polydev keys ratio

**We CANNOT see**:
- ❌ What user asked
- ❌ What AI responded
- ❌ What files were edited
- ❌ Conversation content

---

## Frequently Asked Questions

### Q: Does ephemeral mode work without BYOK?

**A**: Technically yes, but we strongly encourage BYOK for maximum privacy:
- **With Polydev keys + Ephemeral**: Conversations not saved, but you're still using our API allocation
- **With BYOK + Ephemeral**: Conversations not saved, AND you pay your own costs = maximum privacy

### Q: Can I switch between ephemeral and standard mode?

**A**: Yes, for Plus and Pro tiers:
- Toggle in Security Settings
- Takes effect immediately
- Past conversations (if any) remain accessible

**No**, for Enterprise tier:
- Ephemeral mode forced enabled
- Cannot be disabled

### Q: What happens to my conversation history if I enable ephemeral mode?

**A**:
- **Past conversations**: Remain accessible (they were already saved)
- **New conversations**: NOT saved to server
- **Client-side storage**: If enabled, saved to your browser only

### Q: Do MCP tools still work in ephemeral mode?

**A**: **YES!** All MCP tools work exactly the same:
- ✅ Filesystem operations
- ✅ Terminal commands
- ✅ Code edits
- ✅ All other MCP tools

The only difference: results are NOT saved to database.

### Q: How much does it cost to use BYOK?

**A**: You pay the AI provider directly:
- OpenAI: ~$0.02-0.10 per 1K tokens (depending on model)
- Anthropic: ~$0.003-0.015 per 1K tokens
- Google: ~$0.00025-0.0025 per 1K characters

Example: 100 messages with Claude Sonnet ≈ $0.50-2.00 in API costs

---

## Summary: The Big Picture

**Ephemeral Mode + BYOK** transforms Polydev from a "managed AI service" into a **"privacy-focused AI router"**:

**Before** (Standard Mode):
- Polydev pays for AI
- Polydev saves conversations
- Tier limits enforced
- Privacy = trust Polydev

**After** (Ephemeral + BYOK):
- **You pay for AI** (your own keys)
- **Nothing saved to server** (ephemeral)
- **No tier limits** (you pay per token)
- **Maximum privacy** (only metadata)

You get:
- ✅ Multi-provider comparison
- ✅ MCP tool execution
- ✅ Streaming responses
- ✅ Your data stays private
- ✅ Unlimited usage (you pay)

We get:
- ✅ Usage analytics (no content)
- ✅ Happy users with privacy
- ✅ Lower API costs
- ✅ Enterprise trust

---

**Status**: Architecture documented, ready for implementation

**Next Steps**:
1. ✅ Database migration (completed)
2. Create BYOK API endpoints
3. Update chat stream API
4. Update Security Settings UI
5. Add tier-based restrictions
6. Write comprehensive tests

**Files**:
- `EPHEMERAL_MODE_ARCHITECTURE.md` (this file)
- `supabase/migrations/031_ephemeral_conversations_byok.sql`
- `PRIVACY_AND_SECURITY_TRUST_MODEL.md`
- `PRIVACY_MODE_ARCHITECTURE.md`
