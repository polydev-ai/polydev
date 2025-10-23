# MCP Model Routing Bug: Quick Fix Guide

## TL;DR

**Problem**: Non-pro users can access CLI models if they have them installed locally

**Cause**: Missing subscription check at line 1467 in `/src/app/api/mcp/route.ts`

**Fix**: Add one subscription check before allowing CLI routing

---

## One-Line Summary

Line 1467 checks "Is CLI available?" but never checks "Is user Pro?" → Non-pro users get CLI access

---

## The Exact Fix

**File**: `/src/app/api/mcp/route.ts`

**Location**: Line 1467 (inside the `if (cliConfig)` block)

**Current Code** (BROKEN):
```typescript
if (cliConfig) {
  skipApiKey = true
  console.log(`...`)
  return { /* CLI response */ }
}
```

**Fixed Code**:
```typescript
if (cliConfig) {
  // ADD THIS CHECK
  const cliAccessCheck = await subscriptionManager.canUseCLI(user.id)

  if (!cliAccessCheck.canUse) {
    console.log(`[MCP] ⛔ User ${user.id} attempted to use CLI (${cliToolName}) without Pro subscription - falling back to API key`)
  } else {
    skipApiKey = true
    console.log(`[MCP] ✅ Pro user - CLI tool available...`)
    return { /* CLI response */ }
  }
}
```

---

## Why This Works

- **Before**: Checks CLI available → Returns CLI response (anyone can use!)
- **After**: Checks CLI available → Checks Pro status → Returns CLI or falls back to API

```
Flow:
1. Is CLI available? YES
   ↓
2. Is user Pro? NO
   ↓
3. Fall through to API key handling (don't return CLI response)

vs.

1. Is CLI available? YES
   ↓
2. Is user Pro? YES
   ↓
3. Return CLI response
```

---

## What You Need to Add

Exactly this code block at line 1467, inside the `if (cliConfig) {` condition:

```typescript
const cliAccessCheck = await subscriptionManager.canUseCLI(user.id)

if (!cliAccessCheck.canUse) {
  console.log(`[MCP] ⛔ User ${user.id} attempted to use CLI (${cliToolName}) without Pro subscription - falling back to API key`)
  console.log(`[MCP] CLI access blocked. Reason: ${cliAccessCheck.reason}`)
  // Do NOT set skipApiKey = true
  // Fall through to API key handling below
} else {
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
```

---

## Test After Fix

### Test 1: Free User with CLI
```
1. Create free account
2. Install Claude Code locally
3. Call MCP endpoint
4. Expected: Response uses API key (not CLI)
5. Console shows: "⛔ User attempted to use CLI without Pro"
```

### Test 2: Pro User with CLI
```
1. Create pro account
2. Install Claude Code locally
3. Call MCP endpoint
4. Expected: Response shows "CLI Available"
5. Console shows: "✅ Pro user - CLI tool available"
```

### Test 3: Free User without CLI
```
1. Create free account
2. Don't install CLI
3. Call MCP endpoint
4. Expected: Response uses API key
5. No change in behavior
```

---

## Related Code

- **Subscription check function**: `/src/lib/subscriptionManager.ts:310`
- **Current broken code**: `/src/app/api/mcp/route.ts:1467`
- **Request-level check**: `/src/app/api/mcp/route.ts:1179` (this already works)

---

## Why Non-Pro Leak Happens

```
Scenario: Free user, Claude Code installed

Normal request (not marked as CLI request)
  ↓
Request-level check (line 1179)
  "Is this marked as CLI request?"
  NO → check is skipped
  ↓
Model selection
  Claude 3.5 Sonnet
  ↓
Check: Is CLI available?
  YES, claude_code installed
  ❌ NO PRO CHECK
  ↓
Return CLI response to free user
```

---

## Impact

- **Before**: Free users can use CLI
- **After**: Free users use API keys, Pro users use CLI
- **Performance**: Negligible (adds one DB query per model)
- **Risk**: Very low (adds safety, no regression for Pro users)

---

## Files to Review After Fix

1. `/src/app/api/mcp/route.ts` - Check the fix is applied correctly
2. Test logs - Should see "⛔ User attempted" messages when free users try CLI
3. Pro user tests - Should still get CLI access

---

## One-Click Summary

| What | Where | Why |
|------|-------|-----|
| **Bug** | Line 1467 | Missing `canUseCLI()` check |
| **Fix** | Add subscription verification | Ensure only Pro users get CLI |
| **Risk** | Very low | Only adds a safety check |
| **Benefit** | Close paywall bypass | Enforce Pro subscription |
