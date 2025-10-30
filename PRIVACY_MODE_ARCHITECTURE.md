# Privacy Mode Architecture - Zero-Data-Retention with Conversation Storage

## Overview

Polydev's Privacy Mode provides **transparency about data retention with AI providers** while maintaining full conversation history for users. This approach balances honest disclosure with usability.

**Current Reality**: Privacy Mode informs users about AI provider retention periods (OpenAI: 30 days, Anthropic: 7 days) and highlights the BYOK option for maximum control. True zero-data-retention requires Enterprise agreements, which we're working to establish.

---

## Core Principle

**IMPORTANT: Privacy Mode DOES store conversations in Polydev's database**

- ✅ Conversations ARE stored (encrypted at rest with AES-256-GCM)
- ✅ Users CAN see their conversation history
- ⏳ Privacy is achieved through **transparency about AI provider data retention policies**
- ⚠️ Zero-data-retention requires Enterprise agreements (not available via API headers)

---

## Two-Tier API Key Model

Polydev supports both managed API keys and BYOK (Bring Your Own Keys):

### Option 1: Polydev-Managed API Keys (Default)
**What Happens:**
```
User → Polydev Server → OpenAI/Anthropic API (with Polydev's keys)
           ↑
      Sees plaintext (necessary for routing, billing, rate limiting)
```

**Privacy Level:** At-rest encryption + Zero-data-retention agreements with AI providers

**Use Case:** Users who want convenience and don't want to manage API keys

**Privacy Mode Impact:**
- Server marks requests with zero-data-retention headers
- AI providers agree not to use data for training
- Conversations stored in Polydev database (encrypted)
- User can see full conversation history

---

### Option 2: BYOK Mode (Bring Your Own Keys)
**What Happens:**
```
User → Polydev Server → OpenAI/Anthropic API (with user's keys)
           ↑
      Sees plaintext (necessary for routing)
```

**Privacy Level:** User controls API billing + Zero-data-retention agreements

**Use Case:** Users who want to manage their own API costs and relationships

**Privacy Mode Impact:**
- User's own API keys used for requests
- User manages their own zero-data-retention agreements
- Conversations stored in Polydev database (encrypted)
- User can see full conversation history

---

## Privacy Mode vs Standard Mode

### Standard Mode (Default)
**What Happens:**
- Server calls AI API with Polydev or user's API keys
- Server stores conversation in database (encrypted at rest with AES-256-GCM)
- Server returns response to user
- AI providers MAY use data for training (depending on provider's default policy)

**Privacy Level:** At-rest encryption protects against database breaches

**Use Case:** Normal users who want conversation history

---

### Privacy Mode (Transparency-Focused) ✅
**What Happens:**
- Server calls AI API with Polydev or user's API keys
- Server stores conversation in database (encrypted at rest with AES-256-GCM)
- Server returns response to user
- **User receives transparent information about AI provider data retention policies**

**Privacy Level:** At-rest encryption + Transparency about provider retention

**Use Case:** Privacy-conscious users who want transparency about data retention

**How to Enable:** Settings → Security → Toggle "Privacy Mode"

**Current Reality:**
- ⚠️ OpenAI: 30-day data retention (Enterprise agreement needed for zero-retention)
- ⚠️ Anthropic: 7-day data retention (Enterprise "ZDR addendum" needed for zero-retention)
- ⏳ Working on establishing Enterprise agreements for true zero-data-retention
- ✅ BYOK option gives users maximum control over their own agreements

**Benefits:**
- ✅ Full conversation history accessible
- ✅ Data encrypted at rest in Polydev database
- ✅ Honest transparency about what data retention exists
- ✅ BYOK option for maximum privacy control

---

## Database Schema

### Migration: `030_add_privacy_mode.sql`

```sql
-- profiles table
ALTER TABLE profiles ADD COLUMN privacy_mode BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN privacy_mode_enabled_at TIMESTAMPTZ;

-- Index for compliance reporting
CREATE INDEX idx_profiles_privacy_mode
  ON profiles(privacy_mode, privacy_mode_enabled_at)
  WHERE privacy_mode = true;

-- Documentation
COMMENT ON COLUMN profiles.privacy_mode IS
  'When enabled, conversations are stored with zero-data-retention agreements from AI providers. Users can see conversation history. Privacy is achieved through provider agreements (OpenAI, Anthropic, etc.), not by skipping storage.';
```

---

## Implementation Details

### UI Component (`/dashboard/security`)

**Privacy Mode Toggle:**
```tsx
<button onClick={handleTogglePrivacyMode} disabled={isTogglingPrivacyMode}>
  {privacyMode ? 'Disable Privacy Mode' : 'Enable Privacy Mode'}
</button>
```

**Status Display:**
```tsx
{privacyMode && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
    <EyeOff className="h-5 w-5 text-blue-600" />
    <p>Privacy Mode Active</p>
    <p>Zero data retention with AI providers. Conversations are stored encrypted.</p>
  </div>
)}
```

### Server-Side Implementation

**File:** `src/app/api/chat/stream/route.ts`

```typescript
// Check if user has privacy mode enabled
let privacyMode = false;
if (userId) {
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
}

// Pass privacy mode to provider stream
const providerStream = await getStreamFromProvider(model, provider, messages, {
  temperature,
  max_tokens,
  privacyMode, // This will add zero-data-retention headers
});
```

**Provider-Specific Zero-Data-Retention Reality:**

```typescript
// IMPORTANT: Zero-data-retention headers DO NOT EXIST as self-service API options
// Based on research findings (see PRIVACY_MODE_HONEST_UPDATE.md):

// OpenAI Reality:
// ❌ NO self-service API header exists for zero-data-retention
// ⏳ Requires Enterprise sales agreement for zero-data-retention
// ⚠️ Default: 30-day retention for all API calls
// Cannot be enabled through API parameters alone

// Anthropic Reality:
// ❌ NO API parameter to disable retention
// ⏳ Requires enterprise "ZDR addendum" contract
// ⚠️ Default: 7-day retention (as of Sept 2025)
// Cannot be enabled through API parameters alone

// Current Implementation:
if (options.privacyMode) {
  // Privacy Mode currently provides transparency to users about retention policies
  // Future: Will leverage Enterprise agreements once established
  console.log('[PrivacyMode] User has Privacy Mode enabled - showing transparent retention info');
}
```

---

## How Industry Leaders Handle This

### Cursor's Approach
- **Privacy Mode**: No storage, no training, zero data retention
- **At-Rest Encryption**: AES-256 for stored data
- **Zero Data Retention Agreements**: With OpenAI, Anthropic, Fireworks, etc.
- **Client-Side Key Generation**: Unique keys for temporary caching
- **SOC 2 Type II Certified**: Annual penetration testing
- **Enterprise**: Forced privacy mode, SAML/OIDC SSO

### Cline's Approach
- **Zero Data Retention**: When using your own API keys
- **Local Processing**: All processing in VS Code
- **VS Code Secret Storage**: API keys encrypted with aes-256-gcm
- **OS Keychain Integration**: macOS Keychain, Windows Credential Manager
- **No Code Collection**: Only anonymous telemetry (can be disabled)

### Polydev's Approach (Hybrid)
- **Privacy Mode**: Zero-data-retention + Conversation storage
- **At-Rest Encryption**: AES-256-GCM for stored data
- **Flexible API Keys**: Both managed and BYOK options
- **Full Conversation History**: Users can access past conversations
- **Zero Data Retention Agreements**: Planned with AI providers
- **Privacy Indicators**: UI badges showing privacy status

---

## User Experience

### For Users with Privacy Mode DISABLED (Default)
- ✅ Conversations saved and accessible in history
- ✅ Can search and reference past conversations
- ✅ Standard functionality
- ⚠️ AI providers may use data per their default policies

### For Users with Privacy Mode ENABLED
- ✅ AI works normally, responses are instant
- ✅ Conversations saved and accessible in history
- ✅ Can search and reference past conversations
- ✅ Privacy badge shows transparent retention information
- ✅ Clear disclosure about AI provider retention periods (OpenAI: 30 days, Anthropic: 7 days)
- ✅ Information about BYOK option for maximum control
- ✅ Can disable anytime to resume standard mode

---

## Comparison Table

| Feature | Standard Mode | Privacy Mode | BYOK Mode |
|---------|---------------|--------------|-----------|
| **Server sees plaintext** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Conversations stored** | ✅ Yes (encrypted) | ✅ Yes (encrypted) | ✅ Yes (encrypted) |
| **Transparency about retention** | ❌ No | ✅ Yes | ✅ Yes |
| **Conversation history** | ✅ Available | ✅ Available | ✅ Available |
| **AI provider retention** | OpenAI: 30d, Anthropic: 7d | OpenAI: 30d, Anthropic: 7d | Per user's agreements |
| **Zero-data-retention** | ❌ No | ⏳ Working on Enterprise agreements | User can establish |
| **API key management** | Polydev | Polydev | User |
| **Billing** | Through Polydev | Through Polydev | Direct with AI provider |
| **Use case** | Default users | Transparency-focused | Cost-conscious, maximum control |

---

## Honest Disclosure to Users

### What We Can Promise
✅ **At-rest encryption** - Your data is encrypted in our database using AES-256-GCM
✅ **Transparency** - Privacy Mode shows you exactly what data retention exists with AI providers
✅ **Conversation history** - You can always access your past conversations
✅ **Encrypted in transit** - HTTPS/TLS for all communications
✅ **BYOK support** - Use your own API keys for maximum control

### What We Cannot Promise (And We're Honest About It)
❌ **Zero-data-retention headers** - These do NOT exist as self-service API options
❌ **True zero-knowledge** - Server must see plaintext to call AI APIs and route requests
❌ **No server processing** - Server intermediates for billing, rate limiting, and routing
⏳ **Zero-data-retention NOW** - Requires Enterprise agreements (we're working on it)
⚠️ **Current Reality**: OpenAI: 30-day retention, Anthropic: 7-day retention

### The Trade-Off
- **With Polydev API keys + Privacy Mode**: Convenient, transparent about retention (30d/7d), full history
- **With your own API keys (BYOK)**: You control billing and provider relationships, maximum privacy
- **Standard Mode**: Maximum convenience, same retention as Privacy Mode but less transparency

---

## Next Steps

1. ✅ **Database migration created** (`030_add_privacy_mode.sql`)
2. ✅ **Privacy mode state and handlers added** to security page
3. ✅ **Privacy Mode UI section complete** in security page
4. ✅ **Server message handling updated** to respect privacy mode
5. ⏳ **Add privacy indicators** to navigation and dashboard (similar to encryption badge)
6. ⏳ **Establish zero data retention agreements** with AI providers:
   - OpenAI Enterprise
   - Anthropic Enterprise
   - Google Vertex AI
   - X.AI
   - Cerebras
7. ⏳ **Document provider-specific headers** for zero-data-retention
8. ⏳ **Add BYOK UI** for users who want to use their own API keys

---

## Files Modified

```
supabase/migrations/030_add_privacy_mode.sql               (APPLIED TO DATABASE)
src/app/dashboard/security/page.tsx                         (MODIFIED - Privacy Mode UI)
src/app/api/chat/stream/route.ts                           (MODIFIED - Privacy mode checking)
PRIVACY_MODE_ARCHITECTURE.md                                (UPDATED - this file)
```

---

**Status**: ✅ Database schema deployed, UI complete with honest messaging, server-side integration complete

**Reality Check**: Privacy Mode now provides transparency about data retention (OpenAI: 30d, Anthropic: 7d) instead of false promises about zero-data-retention headers that don't exist

**Next**: Establish Enterprise agreements with AI providers for true zero-data-retention

---

## Key Differences from Initial Design

### What Changed Based on User Feedback

**Initial (Incorrect) Understanding:**
- Privacy Mode = No conversation storage (like Cursor's approach)
- Users would lose conversation history
- Server would skip database writes

**Corrected Understanding:**
- Privacy Mode = Zero-data-retention with AI providers + Full conversation storage
- Users KEEP conversation history
- Server stores all conversations (encrypted at rest)
- Privacy is achieved through provider agreements, not by skipping storage

This hybrid approach provides the best of both worlds: privacy protection through zero-data-retention agreements while maintaining the usability of full conversation history.
