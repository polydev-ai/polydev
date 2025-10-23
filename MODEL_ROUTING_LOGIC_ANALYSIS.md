# Polydev MCP Model Routing Logic - Comprehensive Analysis

## Overview

The Polydev system implements a sophisticated model routing architecture that prioritizes local CLI tools over API keys, respects pro/non-pro subscription restrictions, and manages model availability through a multi-source fallback system.

---

## 1. PRO/NON-PRO USER CHECKS

### 1.1 Core Subscription Logic (`subscriptionManager.ts`)

**File:** `/Users/venkat/Documents/polydev-ai/src/lib/subscriptionManager.ts`

#### Key Method: `canUseCLI()`
```typescript
async canUseCLI(userId: string, useServiceRole: boolean = true): Promise<{ canUse: boolean; reason?: string }> {
  const subscription = await this.getUserSubscription(userId, useServiceRole)
  
  if (!subscription || subscription.tier !== 'pro' || subscription.status !== 'active') {
    return {
      canUse: false,
      reason: 'CLI access requires Polydev Pro subscription ($20/month)'
    }
  }

  return { canUse: true }
}
```

**Key Points:**
- CLI access is RESTRICTED to users with `tier === 'pro'` AND `status === 'active'`
- Non-pro users get explicit error: "CLI access requires Polydev Pro subscription"
- This is checked BEFORE attempting to route through CLI tools

#### How It's Invoked in MCP Route

**File:** `/Users/venkat/Documents/polydev-ai/src/app/api/mcp/route.ts` (lines 1173-1183)

```typescript
// Check CLI usage restrictions (detect if request is from CLI)
const isCliRequest = request?.headers.get('user-agent')?.includes('cli') || 
                    request?.headers.get('x-request-source') === 'cli' ||
                    args.source === 'cli'

if (isCliRequest) {
  const cliCheck = await subscriptionManager.canUseCLI(user.id)
  if (!cliCheck.canUse) {
    throw new Error(cliCheck.reason || 'CLI access requires Pro subscription')
  }
}
```

**ISSUE IDENTIFIED:** The `canUseCLI` check happens at the REQUEST level, not at the MODEL SELECTION level. This is GOOD but incomplete - there's a gap in the model selection logic.

---

## 2. CLI MODEL SELECTION & ROUTING

### 2.1 Model Selection Flow

**File:** `/Users/venkat/Documents/polydev-ai/src/app/api/mcp/route.ts` (lines 1320-1382)

The system uses this priority:

1. **Explicitly provided models** (from `args.models`)
2. **Models from user's API keys** (from database `user_api_keys` table)
3. **Fallback model** (`gpt-5-2025-08-07`)

```typescript
if (args.models && args.models.length > 0) {
  models = args.models
  console.log(`[MCP] Using explicitly specified models:`, models)
} else if (apiKeys && apiKeys.length > 0) {
  // Use models from API keys directly, respecting display_order
  const maxModels = 3
  
  const filteredKeys = apiKeys.filter(key => {
    const hasModel = !!key.default_model
    return hasModel
  })
  
  const sortedKeys = filteredKeys.sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999))
  const sortedKeys = afterSort.slice(0, maxModels)
  models = sortedKeys.map(key => key.default_model)
} else {
  models = ['gpt-5-2025-08-07']
  console.log(`[MCP] No API keys found, using fallback model:`, models)
}
```

### 2.2 CLI-First Routing Decision

**File:** `/Users/venkat/Documents/polydev-ai/src/app/api/mcp/route.ts` (lines 1446-1490)

For EACH selected model, the system performs this check:

```typescript
// CLI-FIRST ROUTING: Skip API keys if local CLI is available for this provider
const providerToCliMap: Record<string, string> = {
  'openai': 'codex_cli',
  'anthropic': 'claude_code', 
  'google': 'gemini_cli',
  'gemini': 'gemini_cli'
}

const cliToolName = providerToCliMap[providerName.toLowerCase()]
let skipApiKey = false
let cliConfig = null

if (cliToolName) {
  // Check if CLI tool is available and authenticated from the database
  cliConfig = cliConfigs.find((config: any) =>
    config.provider === cliToolName &&
    config.status === 'available' &&
    config.enabled === true
  )

  if (cliConfig) {
    skipApiKey = true
    console.log(`[MCP] ✅ CLI tool ${cliToolName} is available and authenticated - SKIPPING API key for ${providerName}`)
    return {
      model,
      provider: `${providerName} (CLI Available)`,
      content: `Local CLI tool ${cliToolName} is available and will be used instead of API keys for ${providerName}.`,
      cli_available: true
    }
  }
}
```

### 2.3 Critical Issue: NO PRO-CHECK BEFORE CLI SELECTION

**PROBLEM FOUND:**

The code checks `canUseCLI()` at the REQUEST level (lines 1173-1183) to detect if a request is FROM a CLI client, but:

1. **It does NOT check pro status when SELECTING which models to use**
2. **If a model's provider has CLI available, it returns CLI response regardless of subscription**
3. **Non-pro users can still see CLI-available indicators in their model list**

The missing check should be:
```typescript
if (cliConfig) {
  // MISSING: Check if user is pro before allowing CLI routing
  const cliCheck = await subscriptionManager.canUseCLI(user.id)
  if (!cliCheck.canUse) {
    console.log(`[MCP] ❌ CLI available but user is non-pro - NOT SKIPPING API key`)
    skipApiKey = false
  } else {
    skipApiKey = true
    // Use CLI...
  }
}
```

---

## 3. ADMIN-PROVIDED MODEL ROUTING

### 3.1 Admin Perspectives Fallback

**File:** `/Users/venkat/Documents/polydev-ai/src/app/api/mcp/route.ts` (lines 1517-1620)

When a model is configured as "Credits Only" (no encrypted API key), the system falls back to OpenRouter with admin-managed credits:

```typescript
if (!apiKeyForModel.encrypted_key || apiKeyForModel.key_preview === 'Credits Only') {
  console.log(`[MCP] Credits-only configuration for ${providerName}, using OpenRouter credits...`)
  
  // Uses admin's OpenRouter key via apiManager
  const strategy = await openRouterManager.determineApiKeyStrategy(
    user.id,
    undefined,
    estimatedCost,
    isCliRequest
  )
}
```

**Admin Model Priority:**
1. User's own API keys (if they have them)
2. Admin-provided credits via OpenRouter
3. Budget checks before allowing the request

### 3.2 Available Models Endpoint

**File:** `/Users/venkat/Documents/polydev-ai/src/app/api/models/available/route.ts`

This endpoint determines which models are available with the following priority:

```typescript
// Build sources array based on priority
const sources = sourcePriority.map((sourceType, index) => {
  if (sourceType === 'cli') {
    const available = !isExcluded && cliAvailable.has(provider)
    return {
      type: 'cli',
      available,
      priority: index + 1,
      cost: 'free',
      reason: !available ? (isExcluded ? 'Provider excluded' : 'CLI not installed') : undefined
    }
  } else if (sourceType === 'api') {
    const available = !isExcluded && userKeysAvailable.has(provider)
    return {
      type: 'api',
      available,
      priority: index + 1,
      cost: 'free',
      reason: !available ? (isExcluded ? 'Provider excluded' : 'No API key configured') : undefined
    }
  } else if (sourceType === 'admin') {
    const hasAdminKey = adminKeysAvailable.has(provider)
    const hasQuota = tierQuota.remaining > 0
    const available = !isExcluded && hasAdminKey && hasQuota
    
    return {
      type: 'admin',
      available,
      priority: index + 1,
      cost: 'perspective',
      reason: !available ? (
        isExcluded ? 'Provider excluded' :
        !hasAdminKey ? 'No admin key available' :
        !hasQuota ? `${tier} quota exhausted` :
        undefined
      ) : undefined
    }
  }
})
```

**Key Points:**
- **CLI source** requires: provider not excluded + CLI available locally
- **API source** requires: provider not excluded + user has API key
- **Admin source** requires: provider not excluded + admin has key + user has quota remaining

---

## 4. SEQUENCE OF PRIORITY

### 4.1 Complete Model Selection Sequence

When a user calls `get_perspectives`:

1. **Authentication Check** → Validate MCP token/OAuth token
2. **Pro/Non-Pro CLI Check** → If marked as CLI request, verify `canUseCLI()` passes
3. **Model Collection** → Get models from args, API keys, or fallback
4. **For Each Model:**
   - Find matching provider
   - Check if CLI available for that provider
   - Check if user is PRO (⚠️ **THIS IS THE BUG** - check is missing)
   - If CLI available AND user is PRO → Use CLI
   - If no CLI OR user is non-PRO → Use API key or fallback
5. **Execute Model Call** → Route through selected provider

### 4.2 Visual Flow Diagram

```
User Request with models[]
        ↓
[Authentication Check]
        ↓
[Is CLI Request?] → YES → [Check canUseCLI()] → FAIL → Throw error
        ↓ NO
[Select Models from API keys / args]
        ↓
For each model:
  ├─ Get provider
  ├─ [Is CLI available for provider?]
  │  ├─ YES → [Check canUseCLI() for this model] ← ⚠️ MISSING CHECK
  │  │       └─ PRO? → YES → Use CLI ✅
  │  │              → NO → Fall through to API key
  │  └─ NO → Use API key
  ├─ [Do we have API key?]
  │  ├─ YES → Call API with key
  │  └─ NO → Try OpenRouter credits (admin-provided)
  └─ Return response
```

---

## 5. HOW THE BUG MANIFESTS

### 5.1 Scenario: Non-Pro User with Claude Code Installed

**User Profile:**
- Subscription: FREE
- Claude Code: Installed and authenticated
- Has OpenAI API key configured

**What SHOULD happen:**
1. User calls `get_perspectives` to use Claude (Anthropic model)
2. System sees: Claude Code is available
3. System checks: Is user PRO? NO
4. System decides: Skip CLI, use API key instead
5. Uses OpenAI API key (different provider) or shows error

**What ACTUALLY happens:**
1. User calls `get_perspectives` 
2. System sees: Claude Code is available
3. System decides: Use Claude Code (WITHOUT checking pro status)
4. System returns: "CLI Available - will be used"
5. Claude Code is used despite user not being pro

### 5.2 Admin Models with Non-Pro Users

**Scenario:** Admin provides GPT-4 via credits for all users

**Should happen:**
- Non-pro users can use admin model with admin's credits
- Pro users use their own API key if available, else admin credits

**What happens:**
- Admin models are available in the list
- Model router uses them via OpenRouter fallback
- Quota is checked (but not pro status for CLI models)

---

## 6. SMART CLI CACHE & DETECTION

### 6.1 CLI Status Caching

**File:** `/Users/venkat/Documents/polydev-ai/src/lib/smartCliCache.ts`

```typescript
export class SmartCliCache {
  private cache: Map<string, { data: CliConfig[]; timestamp: number }> = new Map()
  private readonly TTL = 2 * 60 * 1000 // 2 minutes cache

  async getCliStatusWithCache(userId: string): Promise<CliConfig[]> {
    const cached = this.cache.get(userId)
    const now = Date.now()

    // Return cached data if valid
    if (cached && now - cached.timestamp < this.TTL) {
      return cached.data
    }

    // Fetch from Supabase and cache
    const { data, error } = await this.supabase
      .from('cli_provider_configurations')
      .select('*')
      .eq('user_id', userId)
    
    this.cache.set(userId, { data: configs, timestamp: now })
    return configs
  }

  getClimiStatusSummary(configs: CliConfig[]): CliStatusSummary {
    return {
      hasAnyCli: availableProviders.length > 0,
      availableProviders,
      authenticatedProviders,
      totalAvailable,
      totalAuthenticated
    }
  }
}
```

**How it's used in MCP:**
```typescript
const smartCache = new SmartCliCache(serviceRoleSupabase)
const cliConfigs = await smartCache.getCliStatusWithCache(user.id)
const cliSummary = smartCache.getClimiStatusSummary(cliConfigs)
```

### 6.2 Client Detection

**File:** `/Users/venkat/Documents/polydev-ai/src/lib/client-detection.ts`

The system detects which client is making the request:

```typescript
export type ClientSource = 'web' | 'claude-code' | 'codex' | 'cursor' | 'cline' | 'continue' | 'unknown'

export function detectClientSource(request: NextRequest): ClientSource {
  // Checks: X-Client-Source header, query params, User-Agent
}

export function getExcludedProviders(clientSource: ClientSource): string[] {
  switch (clientSource) {
    case 'claude-code':
      return ['anthropic']  // Claude Code can't access Anthropic
    case 'codex':
      return ['openai']     // Codex CLI can't access OpenAI
    default:
      return []
  }
}
```

**Exclusion Logic:**
- Claude Code → Excludes Anthropic models (they conflict)
- Codex CLI → Excludes OpenAI models (they conflict)
- This prevents model routing back to the same provider

---

## 7. API KEY FALLBACK LOGIC

### 7.1 Routing Decision Matrix

```
Request comes in:
├─ Has encrypted_key? 
│  ├─ YES → Check budget
│  │       ├─ Budget OK? → Use API key ✅
│  │       └─ Budget exceeded? → Try OpenRouter credits
│  └─ NO → It's "Credits Only" → Try OpenRouter credits
├─ Has OpenRouter key?
│  ├─ YES → Use OpenRouter
│  ├─ Can afford credits? → Deduct from balance
│  └─ NO credits → Error
└─ No keys → Error (no way to call model)
```

### 7.2 Credits-Only Configuration

**File:** `/Users/venkat/Documents/polydev-ai/src/app/api/mcp/route.ts` (lines 1517-1620)

```typescript
// Handle Credits Only mode (when encrypted_key is empty)
if (!apiKeyForModel.encrypted_key || apiKeyForModel.key_preview === 'Credits Only') {
  console.log(`[MCP] Credits-only configuration for ${providerName}, using OpenRouter credits...`)
  
  const strategy = await openRouterManager.determineApiKeyStrategy(
    user.id,
    undefined,
    estimatedCost,
    isCliRequest
  )
  
  if (!strategy.canProceed) {
    return {
      model,
      error: strategy.error || 'Cannot proceed with request'
    }
  }
  
  // Use OpenRouter instead of original provider
  const apiOptions = {
    model: openrouterModelId,  // Model ID resolved for OpenRouter
    messages: [...],
    baseUrl: 'https://openrouter.ai/api/v1'
  }
  
  const apiResponse = await apiManager.createMessage('openrouter', apiOptions)
}
```

---

## 8. SUBSCRIPTION TIER SYSTEM

### 8.1 Subscription Table Structure

```typescript
interface UserSubscription {
  tier: 'free' | 'pro'              // Only two tiers!
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}
```

### 8.2 Message Usage Limits

```typescript
interface UserMessageUsage {
  messages_limit: number          // Free users: 200/month (configurable)
  messages_sent: number           // Current usage
  cli_usage_allowed: boolean      // Only true if tier === 'pro'
}
```

**Key Finding:**
- `cli_usage_allowed` is set to `isPro` when creating usage record
- But it's NOT checked when routing models through CLI!

---

## 9. ADMIN PROVIDED MODELS ENDPOINT

### 9.1 Admin Models Retrieval

**File:** `/Users/venkat/Documents/polydev-ai/src/app/api/models/admin-provided/route.ts`

```typescript
// Transform model tiers directly into admin models
const adminModels = (modelTiers || []).map(model => {
  return {
    id: model.model_name,                    // e.g., "claude-sonnet-4"
    provider: model.provider,                // e.g., "anthropic"
    keyId: `admin-${model.id}`,
    keyName: `Admin - ${model.display_name}`,
    isAdminProvided: true,
    active: true,
    tier: model.tier,                        // 'premium', 'normal', 'eco'
    displayName: model.display_name
  }
})
```

**Key Points:**
- Admin models are directly from `model_tiers` table
- They're available to ALL users (pro and non-pro)
- Routed through OpenRouter with admin's API key
- Subject to perspective quota limits

---

## 10. CLIENT SOURCE EXCLUSIONS

### 10.1 How Client Exclusions Work

**File:** `/Users/venkat/Documents/polydev-ai/src/app/api/models/available/route.ts` (lines 149-156)

```typescript
// Step 7: Determine provider exclusions based on client source
const autoExclusions = new Set<string>(
  getExcludedProviders(clientSource).map(p => p.toLowerCase())
)

// Step 8: Build availability for each model
const sources = sourcePriority.map((sourceType, index) => {
  if (sourceType === 'cli') {
    const available = !isExcluded && cliAvailable.has(provider)
    return {
      type: 'cli',
      available,
      priority: index + 1,
      cost: 'free',
      reason: !available ? (isExcluded ? 'Provider excluded' : 'CLI not installed') : undefined
    }
  }
})
```

**Example:**
- Request from Claude Code → Anthropic excluded → Claude models shown as "CLI not available" even if installed
- Request from Codex → OpenAI excluded → GPT models shown as "CLI not available"

---

## Summary: The Bug

### Root Cause
When selecting which model to use for each API call in `get_perspectives`, the system:
1. ✅ Detects if CLI is available for a provider
2. ❌ **FAILS TO CHECK** if the user is PRO before deciding to use CLI
3. ❌ Returns CLI-available response for non-pro users anyway

### Impact
- Non-pro users see models as "available via CLI"
- Non-pro users can get CLI responses when they shouldn't
- Pro check only happens at request level, not model selection level

### Fix Needed
Add `canUseCLI()` check in the per-model routing loop (around line 1467 in route.ts):

```typescript
if (cliConfig) {
  // CHECK PRO STATUS FOR THIS MODEL CHOICE
  const cliCheck = await subscriptionManager.canUseCLI(user.id)
  if (!cliCheck.canUse) {
    console.log(`[MCP] CLI available but user is not pro - falling back to API key`)
    skipApiKey = false
  } else {
    skipApiKey = true
    // ... existing CLI logic
  }
}
```

