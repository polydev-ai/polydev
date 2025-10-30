# MCP Routes Encryption Analysis

**Date**: 2025-10-28
**Status**: Analysis Complete - Design Decisions Needed

---

## Executive Summary

**CRITICAL FINDING**: MCP routes (`/api/mcp/*`) currently have **NO encryption support** for user data. These routes handle the majority of API traffic for Polydev's Model Context Protocol implementation.

**KEY INSIGHT**: MCP routes don't store conversation history - they proxy real-time API calls to external LLMs. Conversation storage happens via `/api/chat/sessions` (already enhanced with encryption).

---

## Current MCP Route Architecture

### 1. `/api/mcp/auth/route.ts` - OAuth Authentication
**Purpose**: OAuth 2.0 authentication flow for MCP clients (Claude Desktop, Cursor, Continue, etc.)

**Data Flow**:
```
Client → OAuth authorize → User login → Authorization code → Access token
```

**Database Tables Used**:
- `mcp_auth_codes` - Temporary authorization codes (expires in minutes)
- `mcp_access_tokens` - Long-lived access tokens (30 days)
- `mcp_user_tokens` - CLI status reporting tokens (1 year)

**Current Encryption**: ❌ None

**Potential Encryption Targets**:
- ❓ Authorization codes (temporary, expire quickly)
- ❓ Access tokens (sensitive, 30-day lifetime)
- ❓ CLI status tokens (long-lived, 1 year)

---

### 2. `/api/mcp/token/route.ts` - Token Exchange
**Purpose**: Exchange authorization code for access token (OAuth 2.0 token endpoint)

**Data Flow**:
```
Client → POST code + client_id → Validate → Return access_token + cli_status_config
```

**Database Tables Used**:
- `mcp_auth_codes` - Read and mark as used
- `mcp_access_tokens` - Create new access token
- `mcp_tokens` - Create/retrieve CLI status token

**Current Encryption**: ❌ None

**Potential Encryption Targets**:
- ❓ Access tokens in database
- ❓ CLI status tokens in database

---

### 3. `/api/mcp/register/route.ts` - Client Registration
**Purpose**: Dynamic client registration for MCP OAuth

**Data Flow**:
```
Client → POST client_name + redirect_uris → Generate client_id + client_secret → Return credentials
```

**Database Tables Used**:
- `mcp_registered_clients` - Store client credentials

**Current Encryption**: ❌ None

**Potential Encryption Targets**:
- ❓ Client secrets (though these are meant for server-side storage)

---

### 4. `/api/mcp/route.ts` - Main MCP Server
**Purpose**: Handle MCP tool calls and proxy LLM API requests

**Data Flow** (Critical - this is the main traffic):
```
MCP Client → POST tool_name + parameters → Call LLM API → Return response
```

**Key Functions**:
- `callLLMAPI()` - Universal LLM API caller (OpenAI, Anthropic, Google, etc.)
- Handles model resolution, API key management, prompt formatting
- Real-time API proxy - NO message storage in database

**Database Tables Used**:
- `provider_configs` - Provider configuration (base URLs, authentication)
- `provider_credentials` - User API keys for providers (CRITICAL: unencrypted!)
- `cli_credentials` - CLI tool credentials (CRITICAL: unencrypted!)

**Current Encryption**: ❌ None

**CRITICAL FINDING**: User API keys for OpenAI, Anthropic, etc. are stored in **PLAINTEXT** in `provider_credentials` table!

**Potential Encryption Targets**:
- 🚨 **CRITICAL**: Provider API keys (`provider_credentials.api_key`)
- 🚨 **CRITICAL**: CLI credentials (`cli_credentials` table)
- ❓ LLM API requests/responses (if we want end-to-end encryption)

---

## Encryption Priority Assessment

### Tier 1 - CRITICAL (High Security Risk)
**Must be encrypted regardless of user preference**:

1. **Provider API Keys** (`provider_credentials.api_key`)
   - **Risk**: OpenAI, Anthropic, Google API keys stored in plaintext
   - **Impact**: Database breach = attacker can use user's LLM credits
   - **Recommendation**: **Always encrypt** (not optional)
   - **Implementation**: Client-side encryption with user's master key

2. **CLI Credentials** (`cli_credentials` table)
   - **Risk**: Credentials for CLI tools stored in plaintext
   - **Impact**: Database breach = compromised CLI access
   - **Recommendation**: **Always encrypt** (not optional)
   - **Implementation**: Client-side encryption with user's master key

### Tier 2 - IMPORTANT (Privacy/Compliance)
**Should be encrypted for enterprise/privacy-conscious users**:

3. **Access Tokens** (`mcp_access_tokens.token`)
   - **Risk**: Long-lived tokens (30 days) in plaintext
   - **Impact**: Token theft = unauthorized API access
   - **Recommendation**: Optional based on account tier
   - **Implementation**: Client-side encryption with user's master key

4. **CLI Status Tokens** (`mcp_tokens.token`, `mcp_user_tokens.token_hash`)
   - **Risk**: Long-lived tokens (1 year) in plaintext
   - **Impact**: Token theft = unauthorized status reporting
   - **Recommendation**: Optional based on account tier
   - **Implementation**: Client-side encryption with user's master key

### Tier 3 - LOW PRIORITY (Temporary/Low Risk)
**Can remain unencrypted**:

5. **Authorization Codes** (`mcp_auth_codes.code`)
   - **Risk**: Low - expires in 10 minutes
   - **Recommendation**: Not worth encrypting
   - **Rationale**: Short-lived, single-use tokens

6. **Client Registration Data** (`mcp_registered_clients`)
   - **Risk**: Low - client secrets are meant for server-side storage
   - **Recommendation**: Not worth encrypting
   - **Rationale**: Standard OAuth 2.0 practice

---

## Proposed Encryption Strategy

### Option A - Universal Encryption (Recommended)
**Encrypt Tier 1 (critical) data for ALL users, Tier 2 (important) optionally**:

```typescript
// Database schema additions
ALTER TABLE provider_credentials ADD COLUMN encrypted_api_key TEXT;
ALTER TABLE provider_credentials ADD COLUMN encryption_metadata JSONB;
ALTER TABLE cli_credentials ADD COLUMN encrypted_credentials TEXT;
ALTER TABLE cli_credentials ADD COLUMN encryption_metadata JSONB;

// Optional for enterprise tier
ALTER TABLE mcp_access_tokens ADD COLUMN encrypted_token TEXT;
ALTER TABLE mcp_access_tokens ADD COLUMN encryption_metadata JSONB;
```

**User Experience**:
- All users: API keys are always encrypted (mandatory)
- Enterprise users: Access tokens also encrypted (optional)
- Server **cannot** decrypt any encrypted data (zero-knowledge)

**Implementation**:
1. Use existing `src/lib/crypto/` encryption library
2. Add new encryption helpers:
   - `encryptProviderApiKey()` / `decryptProviderApiKey()`
   - `encryptCliCredentials()` / `decryptCliCredentials()`
   - `encryptAccessToken()` / `decryptAccessToken()`

3. Update MCP routes to handle encrypted data:
   - `/api/mcp/route.ts` - Decrypt API keys before calling LLM APIs
   - `/api/mcp/token/route.ts` - Encrypt access tokens before storage
   - `/api/mcp/auth/route.ts` - Encrypt access tokens before storage

---

## Optional Encryption Implementation

### User Preference System

**Database Schema**:
```sql
-- Add to existing users table
ALTER TABLE users ADD COLUMN zero_knowledge_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN encryption_tier TEXT DEFAULT 'none'; -- 'none', 'standard', 'enterprise'

-- Account tier mapping
-- 'none' = Free tier (no encryption for Tier 2, but Tier 1 still encrypted for security)
-- 'standard' = Paid tier (Tier 1 + Tier 2 encryption)
-- 'enterprise' = Enterprise tier (Tier 1 + Tier 2 + audit logging)
```

**Frontend Logic**:
```typescript
// Check user's encryption preference
const { data: user } = await supabase
  .from('users')
  .select('zero_knowledge_enabled, encryption_tier')
  .eq('id', userId)
  .single()

if (user.zero_knowledge_enabled) {
  // Encrypt data before sending to API
  const encrypted = await encryptProviderApiKey(apiKey)
  // Send encrypted data
} else {
  // Send plaintext (legacy mode for backward compatibility)
}
```

**API Logic**:
```typescript
// In /api/mcp/route.ts
async function getProviderApiKey(userId: string, providerId: string) {
  const { data: cred } = await supabase
    .from('provider_credentials')
    .select('api_key, encrypted_api_key, encryption_metadata')
    .eq('user_id', userId)
    .eq('provider_id', providerId)
    .single()

  // If encrypted version exists, client must decrypt
  if (cred.encrypted_api_key) {
    // Return encrypted data - frontend will decrypt with master key
    return {
      encrypted: true,
      data: cred.encrypted_api_key,
      metadata: cred.encryption_metadata
    }
  }

  // Legacy plaintext (for users who haven't enabled encryption)
  return {
    encrypted: false,
    data: cred.api_key
  }
}
```

---

## Migration Strategy

### Phase 1 - Add Encryption Support (No Breaking Changes)
1. Add encryption columns to database (dual-column strategy)
2. Update MCP routes to accept both encrypted and plaintext
3. Update frontend to conditionally encrypt based on user preference
4. **NO data migration** - users opt-in by enabling encryption

### Phase 2 - Migrate Existing Users (Optional)
1. Prompt users to enable encryption on next login
2. Frontend fetches plaintext API keys
3. Frontend encrypts with master key
4. Frontend sends encrypted version to API
5. API stores encrypted version, keeps plaintext for rollback

### Phase 3 - Deprecate Plaintext (Future)
1. Eventually require all users to enable encryption
2. Remove plaintext columns
3. Full zero-knowledge architecture

---

## Implementation Checklist

### Database Changes
- [ ] Add `encrypted_api_key` + `encryption_metadata` to `provider_credentials`
- [ ] Add `encrypted_credentials` + `encryption_metadata` to `cli_credentials`
- [ ] Add `encrypted_token` + `encryption_metadata` to `mcp_access_tokens` (optional tier)
- [ ] Add `zero_knowledge_enabled` + `encryption_tier` to `users`

### Backend API Changes
- [ ] Update `/api/mcp/route.ts` to handle encrypted API keys
- [ ] Update `/api/mcp/token/route.ts` to handle encrypted access tokens
- [ ] Update `/api/mcp/auth/route.ts` to handle encrypted access tokens
- [ ] Add encryption helpers to `src/lib/crypto/database-crypto.ts`

### Frontend Changes
- [ ] Update MCP client hooks to encrypt API keys before storage
- [ ] Update MCP client hooks to decrypt API keys before use
- [ ] Add user preference toggle for encryption
- [ ] Add encryption tier selector (none/standard/enterprise)

### Testing
- [ ] Test MCP routes with encrypted API keys
- [ ] Test MCP routes with plaintext API keys (backward compatibility)
- [ ] Test encryption preference toggle
- [ ] Test migration flow (plaintext → encrypted)

---

## Security Guarantees

### With Zero-Knowledge Encryption Enabled:
- ✅ Server **CANNOT** decrypt provider API keys
- ✅ Server **CANNOT** decrypt CLI credentials
- ✅ Server **CANNOT** decrypt access tokens (enterprise tier)
- ✅ Database breach exposes only encrypted blobs
- ✅ Server compromise exposes only encrypted blobs
- ✅ Only user's browser with correct password can decrypt

### Without Zero-Knowledge Encryption (Legacy):
- ⚠️ Server CAN read provider API keys (plaintext)
- ⚠️ Server CAN read CLI credentials (plaintext)
- ⚠️ Database breach exposes all user API keys
- ⚠️ Server compromise exposes all user API keys

---

## Recommendations

### Immediate Actions (Before Next Release):
1. **CRITICAL**: Add encryption support for provider API keys (Tier 1)
   - This is a security issue, not optional
   - Database breach currently exposes all user LLM API keys

2. **IMPORTANT**: Add encryption support for CLI credentials (Tier 1)
   - Similar security risk as API keys

3. **DESIGN DECISION NEEDED**: Define encryption tiers
   - What features are available in free vs. paid vs. enterprise?
   - Should Tier 1 encryption be mandatory for all users?
   - Should Tier 2 encryption be opt-in or account-based?

### Long-Term Strategy:
1. Make zero-knowledge encryption the default for all new users
2. Provide migration flow for existing users
3. Eventually deprecate plaintext storage (6-12 months notice)
4. Achieve full zero-knowledge architecture

---

## Open Questions

1. **Account Tiers**: How do we define free vs. paid vs. enterprise tiers?
2. **Mandatory Encryption**: Should Tier 1 (API keys) be encrypted for ALL users regardless of preference?
3. **Migration Timeline**: How long do we maintain backward compatibility with plaintext?
4. **Performance Impact**: Does client-side decryption of API keys on every MCP call cause latency?
5. **Key Rotation**: How do users rotate their master key if compromised?

---

## Next Steps

**Awaiting User Decision**:
- Define encryption tiers and account types
- Decide if Tier 1 encryption should be mandatory
- Approve proposed implementation strategy

**Once Approved**:
1. Update database schema with encryption columns
2. Implement encryption helpers for provider credentials
3. Update MCP routes to handle encrypted data
4. Build frontend UI for encryption preference
5. Test end-to-end MCP flow with encryption
