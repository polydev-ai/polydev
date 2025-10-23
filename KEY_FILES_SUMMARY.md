# Key Files Summary - MCP Model Routing

## Core Files for Model Routing

### 1. **MCP Route Handler** (PRIMARY)
- **Path:** `/Users/venkat/Documents/polydev-ai/src/app/api/mcp/route.ts`
- **Size:** ~3800 lines
- **Key Sections:**
  - `POST()` handler (line 514) - Main entry point
  - `handleToolCall()` (line 911) - Routes tool calls to handlers
  - `callPerspectivesAPI()` (line 1157) - Main perspectives logic
  - CLI check (line 1173-1183) - **WHERE FIRST PRO CHECK HAPPENS**
  - Model selection (line 1320-1382)
  - **CLI-first routing loop (line 1446-1490) - WHERE BUG IS**
  - Admin/Credits fallback (line 1517-1620)

**Critical Lines:**
- 1173: `const isCliRequest = ...` - Detect if request from CLI
- 1179: `const cliCheck = await subscriptionManager.canUseCLI(user.id)` - REQUEST-level check
- 1328: `else if (apiKeys && apiKeys.length > 0)` - Model selection from API keys
- 1461: `cliConfig = cliConfigs.find(...)` - Find available CLI
- 1467: `if (cliConfig) { skipApiKey = true ... }` - **MISSING PRO CHECK HERE**

### 2. **Subscription Manager** (PRO/NON-PRO LOGIC)
- **Path:** `/Users/venkat/Documents/polydev-ai/src/lib/subscriptionManager.ts`
- **Size:** ~450 lines
- **Key Methods:**
  - `getUserSubscription()` (line 78) - Get user's subscription tier
  - `canUseCLI()` (line 310) - **THE CORE PRO CHECK**
  - `getUserMessageUsage()` (line 163) - Get usage with `cli_usage_allowed` flag

**The `canUseCLI()` Method (lines 310-326):**
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

### 3. **Smart CLI Cache** (CLI STATUS DETECTION)
- **Path:** `/Users/venkat/Documents/polydev-ai/src/lib/smartCliCache.ts`
- **Size:** ~90 lines
- **Key Methods:**
  - `getCliStatusWithCache()` (line 32) - Get cached CLI configs
  - `getClimiStatusSummary()` (line 60) - Summary of available CLIs

**How it's used in MCP:**
```typescript
const smartCache = new SmartCliCache(serviceRoleSupabase)
const cliConfigs = await smartCache.getCliStatusWithCache(user.id)
```

### 4. **Available Models Endpoint** (MODEL LISTING)
- **Path:** `/Users/venkat/Documents/polydev-ai/src/app/api/models/available/route.ts`
- **Size:** ~280 lines
- **Purpose:** Determine which models are available with sources (CLI, API, Admin)
- **Key Logic:**
  - Line 114-124: Get CLI availability
  - Line 127-136: Get user API keys
  - Line 139-147: Get admin keys
  - Line 168-213: Build sources array with priority

**Source Priority Logic (lines 168-213):**
```typescript
const sources = sourcePriority.map((sourceType, index) => {
  if (sourceType === 'cli') {
    const available = !isExcluded && cliAvailable.has(provider)
    // CLI requires: provider not excluded + CLI available
  } else if (sourceType === 'api') {
    const available = !isExcluded && userKeysAvailable.has(provider)
    // API requires: provider not excluded + user has key
  } else if (sourceType === 'admin') {
    const hasAdminKey = adminKeysAvailable.has(provider)
    const hasQuota = tierQuota.remaining > 0
    const available = !isExcluded && hasAdminKey && hasQuota
    // Admin requires: provider not excluded + admin key + quota
  }
})
```

### 5. **Admin Provided Models Endpoint**
- **Path:** `/Users/venkat/Documents/polydev-ai/src/app/api/models/admin-provided/route.ts`
- **Size:** ~70 lines
- **Purpose:** Return admin-managed models available to all users
- **Key Logic:** Maps `model_tiers` table to admin models

### 6. **Client Detection** (SOURCE EXCLUSIONS)
- **Path:** `/Users/venkat/Documents/polydev-ai/src/lib/client-detection.ts`
- **Size:** ~120 lines
- **Key Functions:**
  - `detectClientSource()` (line 9) - Detect request source
  - `getExcludedProviders()` (line 88) - Get excluded providers for source

**Exclusions:**
```typescript
case 'claude-code':
  return ['anthropic']  // Claude Code can't access Anthropic
case 'codex':
  return ['openai']     // Codex CLI can't access OpenAI
```

### 7. **Model Tiers Configuration**
- **Path:** `/Users/venkat/Documents/polydev-ai/src/lib/model-tiers.ts`
- **Size:** ~173 lines
- **Purpose:** Define model pricing and tier information
- **Key Data:**
  - MODEL_TIERS object - Defines all models (premium, normal, eco)
  - USER_QUOTA_LIMITS object - Defines quota by subscription tier

---

## Data Flow Patterns

### Pattern 1: Model Selection Flow
```
GET request to /api/mcp (tools/call) with prompt
  ↓
authenticateBearerToken() → Get user ID
  ↓
callPerspectivesAPI(args, user)
  ↓
[1] Check if CLI request → canUseCLI() at REQUEST level
  ↓
[2] Get models from args/apiKeys/fallback
  ↓
[3] For each model in models[]:
      ├─ Get provider
      ├─ Check CLI availability for provider ← **BUG: No pro check**
      ├─ If CLI available → Return CLI response
      └─ Else → Use API key or credits
```

### Pattern 2: Pro/Non-Pro Verification
```
User has subscription record:
  tier: 'free' | 'pro'
  status: 'active' | ...

When checking CLI access:
  1. Get subscription
  2. Check: tier === 'pro' AND status === 'active'
  3. Return: { canUse: true/false }

Current usage:
  ✓ Line 1179 in route.ts - REQUEST level (catches CLI requests)
  ✗ Line 1467 in route.ts - MODEL selection level (MISSING)
```

### Pattern 3: CLI-First Routing
```
For each model:
  1. Determine provider (openai, anthropic, google, etc.)
  2. Map provider → CLI tool (openai→codex_cli, anthropic→claude_code, etc.)
  3. Check if CLI available in database:
     SELECT * FROM cli_provider_configurations
     WHERE provider = 'claude_code' AND status = 'available'
  4. If found → USE CLI (skip API key)
  5. If not found → USE API key
```

---

## Critical Code Patterns

### Pattern: Pro Check
```typescript
// CORRECT - checks pro status
async canUseCLI(userId: string): Promise<{ canUse: boolean; reason?: string }> {
  const subscription = await this.getUserSubscription(userId)
  if (!subscription || subscription.tier !== 'pro' || subscription.status !== 'active') {
    return { canUse: false, reason: '...' }
  }
  return { canUse: true }
}

// USED IN route.ts LINE 1179
if (isCliRequest) {
  const cliCheck = await subscriptionManager.canUseCLI(user.id)
  if (!cliCheck.canUse) {
    throw new Error(cliCheck.reason)
  }
}

// MISSING IN route.ts LINE 1467
if (cliConfig) {
  // NO CHECK HERE - SHOULD ADD:
  // const cliCheck = await subscriptionManager.canUseCLI(user.id)
  // if (!cliCheck.canUse) {
  //   skipApiKey = false
  // } else {
  skipApiKey = true
  // }
}
```

### Pattern: Model Selection
```typescript
// Get models in priority order
if (args.models && args.models.length > 0) {
  models = args.models  // Explicit selection
} else if (apiKeys && apiKeys.length > 0) {
  // Get from API keys, respecting display_order
  models = apiKeys
    .filter(k => k.default_model)
    .sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999))
    .slice(0, 3)
    .map(k => k.default_model)
} else {
  models = ['gpt-5-2025-08-07']  // Fallback
}
```

### Pattern: CLI Availability Check
```typescript
const providerToCliMap = {
  'openai': 'codex_cli',
  'anthropic': 'claude_code',
  'google': 'gemini_cli'
}

const cliToolName = providerToCliMap[providerName.toLowerCase()]
const cliConfig = cliConfigs.find(config =>
  config.provider === cliToolName &&
  config.status === 'available' &&
  config.enabled === true
)

if (cliConfig) {
  // Found available CLI
}
```

---

## Key Tables/Data Structures

### user_subscriptions
```typescript
{
  user_id: string
  tier: 'free' | 'pro'
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
  updated_at: string
}
```

### user_message_usage
```typescript
{
  user_id: string
  month_year: string           // YYYY-MM
  messages_sent: number
  messages_limit: number       // Pro: 999999, Free: 1000
  cli_usage_allowed: boolean   // Only true if tier === 'pro'
  created_at: string
  updated_at: string
}
```

### cli_provider_configurations
```typescript
{
  user_id: string
  provider: string             // 'claude_code', 'codex_cli', 'gemini_cli'
  status: string               // 'available', 'unavailable', etc.
  enabled: boolean
  version?: string
  default_model?: string
  available_models?: string[]
  last_checked_at: string
  custom_path?: string
}
```

### user_api_keys
```typescript
{
  user_id: string
  provider: string             // 'openai', 'anthropic', 'google'
  encrypted_key: string        // null for "Credits Only"
  key_preview: string          // 'sk-*' or 'Credits Only'
  default_model: string        // The model to use for this provider
  active: boolean
  is_admin_key: boolean        // true = admin-provided
  display_order: number        // Priority for selection
  monthly_budget?: number
  current_usage?: number
}
```

### model_tiers
```typescript
{
  id: string
  provider: string             // 'openai', 'anthropic', 'google'
  tier: string                 // 'premium', 'normal', 'eco'
  model_name: string           // e.g., 'claude-sonnet-4'
  display_name: string
  cost_per_1k_input: number
  cost_per_1k_output: number
  active: boolean
}
```

---

## Summary of File Relationships

```
MCP Request
    ↓
src/app/api/mcp/route.ts (POST handler)
    ├─→ src/lib/subscriptionManager.ts (canUseCLI check)
    ├─→ src/lib/smartCliCache.ts (get available CLIs)
    ├─→ src/app/api/models/available/route.ts (model listing)
    └─→ src/lib/model-tiers.ts (model definitions)

Model Selection
    ↓
src/app/api/mcp/route.ts (callPerspectivesAPI)
    ├─→ Get models from args/apiKeys
    ├─→ For each model:
    │   ├─→ src/lib/client-detection.ts (check exclusions)
    │   ├─→ Check CLI available (no file - just DB query)
    │   └─→ Route to CLI or API
    └─→ src/lib/api.ts (call actual LLM API)
```

---

## The Bug Location

**File:** `/Users/venkat/Documents/polydev-ai/src/app/api/mcp/route.ts`
**Lines:** 1446-1490
**Specific Line:** 1467

**Current Code:**
```typescript
if (cliConfig) {
  skipApiKey = true
  // Returns CLI response without checking if user is pro
}
```

**Should Be:**
```typescript
if (cliConfig) {
  // CHECK PRO STATUS FOR THIS SPECIFIC MODEL
  const cliCheck = await subscriptionManager.canUseCLI(user.id)
  if (cliCheck.canUse) {
    skipApiKey = true
    // Return CLI response
  } else {
    skipApiKey = false
    // Fall through to API key logic
  }
}
```

