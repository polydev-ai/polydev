# MCP Model Routing Logic - Exploration Summary

## Executive Summary

I've completed a thorough exploration of the Polydev codebase focusing on MCP model routing. The system implements a sophisticated multi-tier approach to model selection that prioritizes CLI tools, falls back to API keys, and uses admin-provided credits as a last resort.

**Key Finding:** There is a gap in pro/non-pro subscription checks when routing models through CLI tools at the per-model selection level.

---

## Files Analyzed

### Primary Files (7 core files)

1. **src/app/api/mcp/route.ts** (3800 lines)
   - Main MCP server implementation
   - Contains the `get_perspectives` tool handler
   - Implements CLI-first routing logic
   - **WHERE THE BUG IS LOCATED**

2. **src/lib/subscriptionManager.ts** (450 lines)
   - Manages user subscriptions and quotas
   - Contains `canUseCLI()` method - the pro/non-pro check
   - Sets `cli_usage_allowed` flag on usage records

3. **src/lib/smartCliCache.ts** (90 lines)
   - Caches CLI availability status from database
   - 2-minute TTL for performance
   - Returns list of available CLI tools per user

4. **src/app/api/models/available/route.ts** (280 lines)
   - Lists all available models for a user
   - Builds sources array with CLI/API/Admin priority
   - Checks exclusions based on client source

5. **src/app/api/models/admin-provided/route.ts** (70 lines)
   - Returns admin-managed models
   - All users (pro and non-pro) can access these
   - Uses OpenRouter credits for routing

6. **src/lib/client-detection.ts** (120 lines)
   - Detects which client made the request
   - Implements provider exclusions (Claude Code excludes Anthropic, Codex excludes OpenAI)

7. **src/lib/model-tiers.ts** (173 lines)
   - Defines model pricing and tier information
   - Contains quota limits by subscription tier

### Secondary Files (consulted for context)

- mcp-tools/mcp-config.json - MCP tool definitions
- src/lib/model-resolver.ts - Model ID resolution
- lib/smartCliCache.ts - Legacy version (not used)
- supabase/migrations/* - Database schema

---

## Model Selection Flow

### Request → Model Selection Sequence

```
1. MCP Request received at /api/mcp (POST)
   ↓
2. Bearer token authentication (OAuth or MCP token)
   ↓
3. handleToolCall() → callPerspectivesAPI()
   ↓
4. isCliRequest check → canUseCLI() at REQUEST level ✓
   ↓
5. Select models from args/apiKeys/fallback
   ↓
6. For each selected model:
   a. Determine provider (openai, anthropic, google, gemini, etc.)
   b. Map provider → CLI tool (codex_cli, claude_code, gemini_cli)
   c. Query database for CLI availability
   d. If CLI available: return CLI response ✗ (NO PRO CHECK HERE)
   e. If no CLI: check API key, try credits, or error
```

---

## Pro/Non-Pro Subscription System

### Two-Tier System
- **Free:** `tier = 'free'`
  - 200 messages/month (configurable)
  - CLI access DISABLED
  - Can use admin models with perspective credits

- **Pro:** `tier = 'pro'`
  - 999999 messages/month (unlimited)
  - CLI access ENABLED
  - Can use own API keys and admin models

### How It's Currently Checked

**Location 1: Request-Level Check** (Line 1179 in route.ts)
```typescript
const isCliRequest = request?.headers.get('user-agent')?.includes('cli') || ...
if (isCliRequest) {
  const cliCheck = await subscriptionManager.canUseCLI(user.id)
  if (!cliCheck.canUse) {
    throw new Error(cliCheck.reason)
  }
}
```

**Location 2: Model-Level Check** ❌ MISSING
```typescript
if (cliConfig) {
  skipApiKey = true
  // Should check canUseCLI() here but doesn't
}
```

---

## CLI Model Routing

### Provider → CLI Tool Mapping

```typescript
const providerToCliMap = {
  'openai': 'codex_cli',      // Codex CLI for OpenAI models
  'anthropic': 'claude_code',  // Claude Code for Anthropic models
  'google': 'gemini_cli',      // Gemini CLI for Google models
  'gemini': 'gemini_cli'       // Alternative mapping for Google
}
```

### CLI-First Decision Logic (Lines 1459-1490)

1. Get provider from model configuration
2. Look up CLI tool name in `providerToCliMap`
3. Query `cli_provider_configurations` table:
   - Where `provider = cliToolName`
   - And `status = 'available'`
   - And `enabled = true`
4. If found: Set `skipApiKey = true` and return CLI response
5. If not found: Continue to API key or credits logic

### Client Exclusions

Claude Code and Codex have built-in conflicts that prevent recursive calls:
- Claude Code request → Anthropic provider is excluded
- Codex CLI request → OpenAI provider is excluded

---

## API Key Fallback Logic

### Fallback Hierarchy

```
1. User has own API key for provider?
   YES → Check budget
         Budget OK? → Use API key ✓
         Budget exceeded? → Try OpenRouter credits
   NO → Check if "Credits Only" (encrypted_key is empty)

2. Is "Credits Only" configuration?
   YES → Use OpenRouter with admin's key
         Check if credits available?
         Deduct from user's balance
   NO → Error (no way to call model)
```

### Key Configuration States

**Normal:** User has their own API key
- `encrypted_key`: [user's key encrypted]
- `key_preview`: "sk-..."
- Uses user's API key directly

**Credits Only:** Admin provides via OpenRouter
- `encrypted_key`: null or empty
- `key_preview`: "Credits Only"
- Uses admin's OpenRouter API key
- Deducts from user's Polydev credits balance

**Budget Exceeded:** User has API key but hit monthly budget
- `monthly_budget`: $100
- `current_usage`: $100+
- Falls back to OpenRouter if credits available

---

## Admin-Provided Models

### How They Work

1. Admin creates models in `model_tiers` table with `active = true`
2. These become available to ALL users (pro and non-pro)
3. When selected, system uses admin's OpenRouter API key
4. Cost is deducted from user's perspective quota (not API budget)

### Model Selection for Admin Models

```
1. Model marked as "Credits Only" (no user API key)
2. System looks up OpenRouter ID for the model
3. Uses admin's OpenRouter key to make request
4. Tracks cost in `openrouter_usage_tracking` table
5. Deducts from user's tier-specific perspective quota
   - Premium: 10/100/1500 perspectives
   - Normal: 100/2000/6000 perspectives
   - Eco: 500/10000/30000 perspectives
```

---

## Client Source Detection

### Detection Methods (Priority Order)

1. X-Client-Source header
2. client_source query parameter
3. User-Agent string pattern matching
4. Referer header
5. Origin header
6. Default to 'unknown'

### Detected Sources

- claude-code (Claude Code)
- codex (Codex CLI)
- cursor (Cursor editor)
- cline (Cline editor)
- continue (Continue editor)
- web (Web browser)
- unknown (couldn't detect)

---

## Data Structures & Key Tables

### user_subscriptions
```
tier: 'free' | 'pro'
status: 'active' | 'canceled' | 'past_due' | 'trialing'
stripe_customer_id: UUID
stripe_subscription_id: string
```

### cli_provider_configurations
```
user_id: UUID
provider: 'claude_code' | 'codex_cli' | 'gemini_cli'
status: 'available' | 'unavailable' | 'error'
enabled: boolean
last_checked_at: timestamp
```

### user_api_keys
```
provider: 'openai' | 'anthropic' | 'google' | 'gemini'
default_model: string (the model to use)
display_order: number (priority for multi-model selection)
encrypted_key: string (null for Credits Only)
key_preview: string ('sk-...' or 'Credits Only')
is_admin_key: boolean
monthly_budget: number
current_usage: number
```

### model_tiers
```
provider: string
tier: 'premium' | 'normal' | 'eco'
model_name: string (e.g., 'claude-sonnet-4')
display_name: string (display in UI)
cost_per_1k_input: number
cost_per_1k_output: number
active: boolean
```

---

## The Bug: Missing Pro Check in Model Routing

### Root Cause
Lines 1459-1490 in `/Users/venkat/Documents/polydev-ai/src/app/api/mcp/route.ts`

When CLI is available for a model provider, the system decides to use it WITHOUT checking if the user is pro.

### Current Behavior
```typescript
if (cliToolName) {
  cliConfig = cliConfigs.find((config: any) =>
    config.provider === cliToolName &&
    config.status === 'available' &&
    config.enabled === true
  )

  if (cliConfig) {
    skipApiKey = true  // ← Uses CLI without pro check!
    return {
      model,
      provider: `${providerName} (CLI Available)`,
      content: `Local CLI tool ${cliToolName} is available...`,
      cli_available: true
    }
  }
}
```

### Impact
- Non-pro users see CLI models as "available via CLI"
- Non-pro users get CLI responses when only pro should
- Pro/non-pro distinction is lost at model routing level

---

## Absolute Paths for All Files

### Core Files
- `/Users/venkat/Documents/polydev-ai/src/app/api/mcp/route.ts`
- `/Users/venkat/Documents/polydev-ai/src/lib/subscriptionManager.ts`
- `/Users/venkat/Documents/polydev-ai/src/lib/smartCliCache.ts`
- `/Users/venkat/Documents/polydev-ai/src/app/api/models/available/route.ts`
- `/Users/venkat/Documents/polydev-ai/src/app/api/models/admin-provided/route.ts`
- `/Users/venkat/Documents/polydev-ai/src/lib/client-detection.ts`
- `/Users/venkat/Documents/polydev-ai/src/lib/model-tiers.ts`

### Documentation Files Created
- `/Users/venkat/Documents/polydev-ai/MODEL_ROUTING_LOGIC_ANALYSIS.md`
- `/Users/venkat/Documents/polydev-ai/KEY_FILES_SUMMARY.md`
- `/Users/venkat/Documents/polydev-ai/EXPLORATION_SUMMARY.md` (this file)

---

## How to Verify the Bug

### Test Case 1: Non-Pro User with Claude Code Installed
1. Create free user account
2. Install Claude Code and authenticate
3. Call `get_perspectives` with Anthropic model
4. Observe: Returns "CLI Available" response
5. Expected: Should use API key or show error

### Test Case 2: Pro User with Claude Code Installed
1. Create pro user account
2. Install Claude Code and authenticate
3. Call `get_perspectives` with Anthropic model
4. Observe: Returns "CLI Available" response
5. Expected: Should return "CLI Available" (correct)

---

## Summary

The Polydev MCP model routing system is sophisticated and well-designed, with proper multi-tier support for:
- CLI-first routing
- API key fallback
- Admin-provided models with credits
- Client source detection
- Provider exclusions

However, there's a gap in subscription tier enforcement when routing through CLI tools at the per-model selection level. The `canUseCLI()` check happens at the request level (good) but not at the model selection level (bug).

The fix is straightforward: add a `canUseCLI()` check inside the CLI availability block before deciding to skip the API key.

