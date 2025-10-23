# MCP Model Routing Bug: Before & After Comparison

## The Problem in One Picture

```
FREE USER with Claude Code installed locally
         ↓
    [MCP Request]
         ↓
    Request-level check
    "Is this marked as CLI request?"
    NO (regular API call)
    ✓ Check is SKIPPED
         ↓
    Model Selection
    "What models should I use?"
    Claude 3.5 Sonnet (from API keys)
         ↓
    Model Routing
    "How should I handle this model?"
    Check: Is CLI available?
    YES, claude_code is installed
    ❌ NO PRO CHECK HERE!
         ↓
    [RETURN CLI RESPONSE]
    ✓ Free user gets access!
         ↓
    BUG CONFIRMED ❌
```

---

## Current Code (BROKEN) ❌

**Location**: `/src/app/api/mcp/route.ts` Lines 1459-1490

```typescript
// Line 1455
const cliToolName = providerToCliMap[providerName.toLowerCase()]
let skipApiKey = false
let cliConfig = null

// Line 1459 - CLI AVAILABILITY CHECK (NO SUBSCRIPTION CHECK)
if (cliToolName) {
  // Check if CLI tool is available and authenticated from the database
  cliConfig = cliConfigs.find((config: any) =>
    config.provider === cliToolName &&
    config.status === 'available' &&
    config.enabled === true
  )

  // Line 1467 - THIS IS WHERE THE BUG IS
  if (cliConfig) {
    skipApiKey = true
    console.log(`[MCP] ✅ CLI tool ${cliToolName} is available and authenticated - SKIPPING API key for ${providerName}`)

    // ❌ BUG: No check for subscription tier!
    // Non-pro users reach this point and get CLI access

    return {
      model,
      provider: `${providerName} (CLI Available)`,
      content: `Local CLI tool ${cliToolName} is available and will be used instead of API keys for ${providerName}. This model will be handled by the CLI tool.`,
      tokens_used: 0,
      latency_ms: 0,
      cli_available: true
    }
  } else {
    // Check if CLI exists but is not available or authenticated
    const cliExists = cliConfigs.find((config: any) => config.provider === cliToolName)
    if (cliExists) {
      console.log(`[MCP] ⚠️  CLI tool ${cliToolName} found in database but not available/authenticated - using API keys`)
      console.log(`[MCP] CLI Status - Status: ${cliExists.status}, Enabled: ${cliExists.enabled}`)
    } else {
      console.log(`[MCP] ❌ CLI tool ${cliToolName} not found in database - using API keys`)
    }
  }
} else {
  console.log(`[MCP] ❓ No CLI tool mapping for provider ${providerName} - using API keys`)
}
```

**Problems**:
- ❌ Only checks if CLI is available in database
- ❌ Never calls `subscriptionManager.canUseCLI(user.id)`
- ❌ Non-pro users bypass the Pro paywall
- ❌ No audit trail of unauthorized access attempts

---

## Fixed Code (CORRECTED) ✅

**Location**: `/src/app/api/mcp/route.ts` Lines 1459-1500 (with fix)

```typescript
// Line 1455
const cliToolName = providerToCliMap[providerName.toLowerCase()]
let skipApiKey = false
let cliConfig = null

// Line 1459 - CLI AVAILABILITY CHECK
if (cliToolName) {
  // Check if CLI tool is available and authenticated from the database
  cliConfig = cliConfigs.find((config: any) =>
    config.provider === cliToolName &&
    config.status === 'available' &&
    config.enabled === true
  )

  // Line 1467 - FIX: ADD SUBSCRIPTION CHECK HERE
  if (cliConfig) {
    // ✅ NEW: Check if user has Pro subscription
    const cliAccessCheck = await subscriptionManager.canUseCLI(user.id)

    if (!cliAccessCheck.canUse) {
      // ✅ NEW: Non-pro user attempting to use CLI
      console.log(`[MCP] ⛔ User ${user.id} attempted to use CLI (${cliToolName}) without Pro subscription - falling back to API key`)
      console.log(`[MCP] CLI access blocked. Reason: ${cliAccessCheck.reason}`)
      // Do NOT set skipApiKey = true
      // Fall through to API key handling below
    } else {
      // ✅ Pro user - allow CLI access
      skipApiKey = true
      console.log(`[MCP] ✅ Pro user ${user.id} - CLI tool ${cliToolName} is available and authenticated - SKIPPING API key for ${providerName}`)

      return {
        model,
        provider: `${providerName} (CLI Available)`,
        content: `Local CLI tool ${cliToolName} is available and will be used instead of API keys for ${providerName}. This model will be handled by the CLI tool.`,
        tokens_used: 0,
        latency_ms: 0,
        cli_available: true
      }
    }
  } else {
    // Check if CLI exists but is not available or authenticated
    const cliExists = cliConfigs.find((config: any) => config.provider === cliToolName)
    if (cliExists) {
      console.log(`[MCP] ⚠️  CLI tool ${cliToolName} found in database but not available/authenticated - using API keys`)
      console.log(`[MCP] CLI Status - Status: ${cliExists.status}, Enabled: ${cliExists.enabled}`)
    } else {
      console.log(`[MCP] ❌ CLI tool ${cliToolName} not found in database - using API keys`)
    }
  }
} else {
  console.log(`[MCP] ❓ No CLI tool mapping for provider ${providerName} - using API keys`)
}

// Line 1492 - Continue with API key handling (will be reached if CLI not available or user not Pro)
// Create a provider object with necessary fields (similar to what we had from provider_configurations)
const provider = {
  provider_name: providerName,
  display_name: getProviderDisplayName(providerName),
  base_url: getProviderBaseUrl(providerName)
}
```

**Improvements**:
- ✅ Calls `subscriptionManager.canUseCLI(user.id)` at model routing level
- ✅ Checks subscription tier before allowing CLI
- ✅ Non-pro users automatically fallback to API keys
- ✅ Pro users still get CLI when available
- ✅ Better logging for audit trail

---

## What Changes

### Line 1467: Before
```typescript
if (cliConfig) {
  skipApiKey = true
  console.log(`[MCP] ✅ CLI tool ${cliToolName} is available and authenticated - SKIPPING API key for ${providerName}`)
  return { /* CLI response */ }
}
```

### Line 1467: After
```typescript
if (cliConfig) {
  // ✅ NEW: Check subscription tier
  const cliAccessCheck = await subscriptionManager.canUseCLI(user.id)

  if (!cliAccessCheck.canUse) {
    console.log(`[MCP] ⛔ User ${user.id} attempted to use CLI (${cliToolName}) without Pro subscription - falling back to API key`)
  } else {
    skipApiKey = true
    console.log(`[MCP] ✅ Pro user - CLI tool ${cliToolName} is available and authenticated - SKIPPING API key for ${providerName}`)
    return { /* CLI response */ }
  }
}
```

---

## Behavior Comparison

### Scenario: Free User with Claude Code Installed

#### Before Fix (BUG) ❌
```
Request: { prompt: "hello", models: ["claude-3-5-sonnet-20241022"] }
User: free@example.com (free plan, CLI installed locally)

Response:
{
  "model": "claude-3-5-sonnet-20241022",
  "provider": "Anthropic (CLI Available)",
  "cli_available": true,
  "tokens_used": 0,
  "latency_ms": 0
}

Problem: Free user got access to CLI!
```

#### After Fix (CORRECT) ✅
```
Request: { prompt: "hello", models: ["claude-3-5-sonnet-20241022"] }
User: free@example.com (free plan, CLI installed locally)

Response:
{
  "model": "claude-3-5-sonnet-20241022",
  "provider": "Anthropic",
  "content": "Response from API using provided OpenRouter API key...",
  "tokens_used": 150,
  "latency_ms": 1200
}

Expected: Free user uses API key fallback, respects Pro limitation
```

### Scenario: Pro User with Claude Code Installed

#### Before Fix ✅
```
Request: { prompt: "hello", models: ["claude-3-5-sonnet-20241022"] }
User: pro@example.com (pro plan, CLI installed locally)

Response:
{
  "model": "claude-3-5-sonnet-20241022",
  "provider": "Anthropic (CLI Available)",
  "cli_available": true,
  "tokens_used": 0,
  "latency_ms": 0
}

Correct: Pro user gets CLI access
```

#### After Fix ✅
```
Request: { prompt: "hello", models: ["claude-3-5-sonnet-20241022"] }
User: pro@example.com (pro plan, CLI installed locally)

Response:
{
  "model": "claude-3-5-sonnet-20241022",
  "provider": "Anthropic (CLI Available)",
  "cli_available": true,
  "tokens_used": 0,
  "latency_ms": 0
}

Still Correct: Pro user still gets CLI access (no regression)
```

---

## Console Log Comparison

### Before Fix: Free User Attempts CLI Model

```
[MCP] Getting perspectives for user user123: "Hello"
[MCP] Using explicitly specified models: ["claude-3-5-sonnet-20241022"]
[MCP] Found model claude-3-5-sonnet-20241022 configured for provider anthropic
[MCP] ✅ CLI tool claude_code is available and authenticated - SKIPPING API key for anthropic
[MCP] Processed model "claude-3-5-sonnet-20241022" in 0.5ms
[MCP] Sent response with 1 perspective

❌ BUG: No indication that free user should be blocked!
```

### After Fix: Free User Attempts CLI Model

```
[MCP] Getting perspectives for user user123: "Hello"
[MCP] Using explicitly specified models: ["claude-3-5-sonnet-20241022"]
[MCP] Found model claude-3-5-sonnet-20241022 configured for provider anthropic
[MCP] ⛔ User user123 attempted to use CLI (claude_code) without Pro subscription - falling back to API key
[MCP] CLI access blocked. Reason: CLI access requires Polydev Pro subscription ($20/month)
[MCP] Processed model "claude-3-5-sonnet-20241022" using API keys in 1234ms
[MCP] Sent response with 1 perspective

✅ CORRECT: Clear audit trail, fallback to API keys
```

---

## Impact Analysis

| Aspect | Before Fix | After Fix |
|--------|-----------|-----------|
| **Free user with CLI installed** | ❌ Gets CLI access | ✅ Uses API keys |
| **Pro user with CLI installed** | ✅ Gets CLI access | ✅ Gets CLI access (no change) |
| **Free user without CLI** | ✅ Uses API keys | ✅ Uses API keys |
| **Pro user without CLI** | ✅ Uses API keys | ✅ Uses API keys |
| **Audit trail** | ❌ No logging of bypass | ✅ Logs access attempts |
| **Subscription enforcement** | ⚠️ Only at request level | ✅ At both request AND model level |
| **Security** | ❌ Paywall bypass possible | ✅ Paywall enforced |

---

## Performance Impact

**Before Fix**:
- No additional DB call for CLI routing (fast, but insecure)

**After Fix**:
- One additional `subscriptionManager.canUseCLI()` call per model
- This call checks: 1 DB query (get subscription), 1 comparison
- ~5-10ms per model (acceptable since already doing API calls)
- Pro users don't notice the delay (already cached)

---

## Rollout Plan

1. **Apply the fix** to `/src/app/api/mcp/route.ts` lines 1467-1478
2. **Deploy to staging** and test:
   - Free user attempting CLI → falls back to API key ✓
   - Pro user with CLI → gets CLI access ✓
3. **Run logs analysis** for unauthorized access patterns
4. **Deploy to production**
5. **Monitor logs** for new "⛔ User attempted to use CLI without Pro" entries

---

## Summary

| Aspect | Details |
|--------|---------|
| **Bug** | Non-pro users access CLI models when they have them installed locally |
| **Root Cause** | Missing subscription check in model routing (line 1467) |
| **Fix** | Add `canUseCLI()` call before returning CLI response |
| **Lines Changed** | 1 section (lines 1467-1478), ~15 lines added |
| **Risk** | Very low - only affects CLI routing, adds safety check |
| **Benefit** | Closes paywall bypass, enables audit trail |
| **Testing** | Need free + pro test accounts with CLI installed |
