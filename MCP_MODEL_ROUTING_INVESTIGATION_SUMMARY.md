# MCP Model Routing Investigation: Complete Summary

**Investigation Date**: October 19, 2025
**Issue**: Non-pro users getting CLI access when they shouldn't
**Status**: ✅ ROOT CAUSE IDENTIFIED & SOLUTION PROVIDED

---

## Executive Summary

Your hypothesis was **100% correct**. Non-pro users ARE bypassing the Pro paywall for CLI access.

### The Problem
- Non-pro users can access CLI models (claude_code, codex_cli, gemini_cli) if they have them installed
- The system has a request-level Pro check but NO model-level Pro check
- This creates a gap where CLI routing can be triggered without Pro verification

### The Root Cause
**Single point of failure**: Line 1467 in `/src/app/api/mcp/route.ts`

```typescript
if (cliConfig) {
  skipApiKey = true  // ❌ NO SUBSCRIPTION CHECK
  return { /* CLI response */ }
}
```

### The Solution
Add subscription verification before returning CLI response:

```typescript
if (cliConfig) {
  const cliAccessCheck = await subscriptionManager.canUseCLI(user.id)
  if (!cliAccessCheck.canUse) {
    // Fall through to API key handling
  } else {
    skipApiKey = true
    return { /* CLI response */ }
  }
}
```

---

## How Non-Pro Users Bypass Pro

### Current Flow (Broken)

```
User (Free Plan)
  ↓
Calls MCP Endpoint
  "I want perspectives on X"
  ↓
Request-level check
  "Did user mark this as CLI request?"
  No markers in headers → NO
  Check is SKIPPED ✓
  ↓
Model Selection
  Picks models from API keys
  E.g., "claude-3-5-sonnet-20241022"
  ↓
For Each Model:
  Find API key config
  Get provider: "anthropic"
  Map to CLI: "claude_code"
  ↓
  Check: Is claude_code available?
  YES, installed locally
  ✓ Status: available
  ✓ Enabled: true
  ❌ Pro tier? NO CHECK
  ↓
  Return CLI Response
  ↓
FREE USER GETS CLI ❌
```

### Why This Happens

The request-level check (line 1179) only runs if:
- User-Agent header includes 'cli' OR
- X-Request-Source header is 'cli' OR
- args.source === 'cli'

But regular API calls don't have these markers! So the request-level check is bypassed.

Then at the model routing level (line 1467), there's NO pro check at all.

### The Security Gap

```
Request-level check:
  Only blocks if request is marked as CLI
  (depends on headers - can be bypassed if not marked)

Model-level check:
  ❌ DOESN'T EXIST
  Allows CLI routing for anyone
```

---

## Technical Analysis

### Code Location
- **File**: `/src/app/api/mcp/route.ts`
- **Broken section**: Lines 1459-1490
- **Exact problem**: Line 1467-1477

### The Database Queries

**Current check** (at line 1461-1465):
```typescript
cliConfig = cliConfigs.find((config: any) =>
  config.provider === cliToolName &&     // ✓ Check provider
  config.status === 'available' &&       // ✓ Check available
  config.enabled === true                // ✓ Check enabled
  // ❌ NO SUBSCRIPTION CHECK
)
```

**What's missing**:
```typescript
// Should check:
const cliAccessCheck = await subscriptionManager.canUseCLI(user.id)
// Which verifies:
// - User has 'pro' tier
// - Subscription is 'active'
```

### Available Subscription Check Function

From `/src/lib/subscriptionManager.ts` (lines 310-326):

```typescript
async canUseCLI(userId: string, useServiceRole: boolean = true):
  Promise<{ canUse: boolean; reason?: string }> {
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

This function already exists and is used correctly at line 1179. It just needs to be called here too.

---

## Model Routing Architecture

### Provider → CLI Tool Mapping

```typescript
{
  'openai': 'codex_cli',      // OpenAI models use Codex CLI
  'anthropic': 'claude_code',  // Claude models use Claude Code
  'google': 'gemini_cli',      // Google models use Gemini CLI
  'gemini': 'gemini_cli'       // Gemini models use Gemini CLI
}
```

### All Models That Can Leak
- Claude 3.5 Sonnet / Claude 3 Opus via `claude_code`
- All OpenAI models via `codex_cli`
- All Google models via `gemini_cli`

### Model Selection Process

```
1. User specifies models in request OR
2. System picks top 3 from user's API keys (ordered by display_order)

For each selected model:
  Get API key config
  Determine provider
  Check if CLI available
  ❌ NO PRO CHECK HERE (BUG)
  Route to CLI or API
```

---

## Two-Layer Protection That Should Exist

### Layer 1: Request-Level (Exists ✓)
**Location**: Line 1178-1183

```typescript
if (isCliRequest) {  // If request is marked as CLI request
  const cliCheck = await subscriptionManager.canUseCLI(user.id)
  if (!cliCheck.canUse) {
    throw new Error('CLI access requires Pro subscription')
  }
}
```

**Status**: ✓ Works correctly
**Problem**: Only blocks if request is marked as CLI

### Layer 2: Model-Level (Missing ❌)
**Location**: Line 1467 (where it should be)

```typescript
if (cliConfig) {
  // ❌ MISSING: Check subscription here
  const cliAccessCheck = await subscriptionManager.canUseCLI(user.id)
  if (!cliAccessCheck.canUse) {
    // Don't use CLI, fall through to API key
  } else {
    // Use CLI
  }
}
```

**Status**: ❌ Doesn't exist
**Problem**: Allows CLI routing for non-pro users

---

## The Fix (Ready to Implement)

### What to Change

**File**: `/src/app/api/mcp/route.ts`
**Lines**: 1467-1477

**Before** (11 lines):
```typescript
if (cliConfig) {
  skipApiKey = true
  console.log(`[MCP] ✅ CLI tool ${cliToolName} is available and authenticated - SKIPPING API key for ${providerName}`)
  return {
    model,
    provider: `${providerName} (CLI Available)`,
    content: `Local CLI tool ${cliToolName} is available and will be used instead of API keys for ${providerName}. This model will be handled by the CLI tool.`,
    tokens_used: 0,
    latency_ms: 0,
    cli_available: true
  }
}
```

**After** (20+ lines with subscription check):
```typescript
if (cliConfig) {
  // ✅ NEW: Check if user has Pro subscription
  const cliAccessCheck = await subscriptionManager.canUseCLI(user.id)

  if (!cliAccessCheck.canUse) {
    // ✅ Non-pro user attempting CLI - fallback to API keys
    console.log(`[MCP] ⛔ User ${user.id} attempted to use CLI (${cliToolName}) without Pro subscription - falling back to API key`)
    console.log(`[MCP] CLI access blocked. Reason: ${cliAccessCheck.reason}`)
    // Continue to API key handling (don't return here, don't set skipApiKey)
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
}
```

---

## Testing Plan

### Test Suite

#### Test 1: Free User with CLI Installed
```
Pre-conditions:
  - Free account created
  - Claude Code installed locally
  - API key configured

Request:
  POST /api/mcp
  {
    "prompt": "test",
    "models": ["claude-3-5-sonnet-20241022"]
  }

Expected After Fix:
  ✓ Response uses API key (not CLI)
  ✓ Logs show: "⛔ User attempted to use CLI without Pro"
  ✓ Model shows as API-routed, not CLI-routed
```

#### Test 2: Pro User with CLI Installed
```
Pre-conditions:
  - Pro account created
  - Claude Code installed locally
  - API key configured

Request:
  POST /api/mcp
  {
    "prompt": "test",
    "models": ["claude-3-5-sonnet-20241022"]
  }

Expected After Fix:
  ✓ Response uses CLI (local tool)
  ✓ Logs show: "✅ Pro user - CLI tool available"
  ✓ Model shows as CLI-routed
  (No regression from before)
```

#### Test 3: Free User without CLI
```
Pre-conditions:
  - Free account created
  - Claude Code NOT installed
  - API key configured

Request:
  POST /api/mcp
  {
    "prompt": "test",
    "models": ["claude-3-5-sonnet-20241022"]
  }

Expected After Fix:
  ✓ Response uses API key
  ✓ No "attempted CLI" log
  (No change from before)
```

---

## Deployment Checklist

- [ ] Apply fix to line 1467 in `/src/app/api/mcp/route.ts`
- [ ] Test with free user + CLI installed (should fallback to API)
- [ ] Test with pro user + CLI installed (should use CLI)
- [ ] Review console logs for "⛔ User attempted" messages
- [ ] Deploy to staging
- [ ] Run 48-hour monitoring for issues
- [ ] Deploy to production
- [ ] Monitor logs for authorization bypass attempts

---

## FAQ

### Q: Why is the request-level check not enough?
**A**: The request-level check (line 1179) only runs if the request is marked as a CLI request. But a regular API call that then routes to CLI won't have these markers, so it bypasses the check.

### Q: Why didn't this get caught earlier?
**A**: Good question. The request-level check exists, so it seems protected. But there's a gap: if CLI is available at the model level, it gets routed to without checking Pro. This is a logic error where two independent checks should have been coordinated.

### Q: Will this fix break Pro users?
**A**: No. Pro users will still get CLI when available. This fix only adds a subscription check that Pro users will pass.

### Q: What's the performance impact?
**A**: One additional `canUseCLI()` call per model. This does 1 DB query, which is ~5-10ms. Acceptable since MCP calls already involve multiple API calls.

### Q: Can free users still use CLI from elsewhere?
**A**: This only affects the MCP endpoint routing. If free users have their own CLI tools and call them directly, that's not the MCP endpoint's concern. But when they try to route through MCP, they'll be blocked.

---

## Documentation Files Created

1. **MCP_MODEL_ROUTING_BUG_ANALYSIS.md** - Deep technical analysis
2. **MCP_BUG_FIX_BEFORE_AFTER.md** - Visual comparison of code changes
3. **MCP_BUG_QUICK_FIX.md** - Quick reference guide
4. **MCP_MODEL_ROUTING_INVESTIGATION_SUMMARY.md** - This file

---

## Next Steps

1. **Review the fix** with your team
2. **Implement** the subscription check at line 1467
3. **Test** with the test suite above
4. **Deploy** following the deployment checklist
5. **Monitor** logs for unauthorized access patterns

---

## Key Takeaways

| Point | Details |
|-------|---------|
| **The Bug** | Non-pro users bypass Pro paywall via CLI models |
| **Root Cause** | Missing subscription check at model routing level |
| **Location** | `/src/app/api/mcp/route.ts:1467` |
| **The Fix** | Add `canUseCLI()` check before CLI routing |
| **Lines Changed** | ~1 section, ~15 lines added |
| **Risk Level** | Very low (adds safety) |
| **Benefit** | Closes security gap, enables audit trail |
| **Testing** | 3 simple test cases |

---

## Questions?

If you need any clarification on:
- Why this happens
- How to implement the fix
- How to test it
- What the expected behavior should be

Feel free to ask! The analysis is complete and ready for implementation.
