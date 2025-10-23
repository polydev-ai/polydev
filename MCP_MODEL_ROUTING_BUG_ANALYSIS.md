# MCP Model Routing Bug Analysis: Non-Pro Users Getting CLI Access

## Executive Summary

**Issue**: Non-pro users are able to access CLI models (codex_cli, claude_code, gemini_cli) in the MCP endpoint when they should be blocked. The system checks CLI access at the **request level** but not at the **model routing level**.

**Root Cause**: Line 1467 in `/src/app/api/mcp/route.ts` has NO subscription tier check when routing to CLI tools. The code checks if CLI is available and authenticated, but never verifies the user has a Pro subscription.

**Impact**:
- Free/non-pro users can query CLI models if they have them installed locally
- Circumvents the Pro paywall for CLI access
- Creates unfair access to premium features

---

## The Bug Location

### File: `/src/app/api/mcp/route.ts`

**Lines 1459-1477** (The Broken Code):
```typescript
if (cliToolName) {
  // Check if CLI tool is available and authenticated from the database
  cliConfig = cliConfigs.find((config: any) =>
    config.provider === cliToolName &&
    config.status === 'available' &&
    config.enabled === true
  )

  if (cliConfig) {
    skipApiKey = true  // ❌ NO PRO CHECK HERE!
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
}
```

---

## Why This Bug Exists

### The Current Flow (Broken)

```
1. Request arrives at MCP endpoint
   ↓
2. Line 1179: Check canUseCLI()
   ✓ WORKS: Rejects CLI requests from non-pro users
   (if request is marked as CLI request)
   ↓
3. BUT: Request might not be marked as CLI request
   (depends on headers: 'cli' in user-agent OR x-request-source OR args.source)
   ↓
4. Models are selected from API keys (line 1322-1381)
   ↓
5. ❌ FOR EACH MODEL: Check if CLI is available (line 1459-1477)
   - NO subscription tier check
   - If CLI is available → Use it regardless of pro status
   - Free users get access to CLI if installed locally
```

### The Checks That Exist

**Request-level check (Line 1178-1183)**: ✓ CORRECT
```typescript
if (isCliRequest) {
  const cliCheck = await subscriptionManager.canUseCLI(user.id)
  if (!cliCheck.canUse) {
    throw new Error(cliCheck.reason || 'CLI access requires Pro subscription')
  }
}
```

**Model-level check (Line 1467)**: ❌ MISSING
```typescript
// NO SUBSCRIPTION CHECK BEFORE USING CLI MODEL
if (cliConfig) {
  skipApiKey = true  // This should only happen if user is Pro
  // ... return CLI response
}
```

---

## Why It's Not Working as Expected

### Three Reasons Non-Pro Users Leak Through

**1. Request might not be detected as CLI request**
   - Detection relies on headers or explicit `args.source === 'cli'`
   - If a regular API call selects models, it won't trigger the request-level check
   - Line 1174-1176 detection logic:
     ```typescript
     const isCliRequest = request?.headers.get('user-agent')?.includes('cli') ||
                         request?.headers.get('x-request-source') === 'cli' ||
                         args.source === 'cli'
     ```

**2. Model selection happens AFTER request-level check**
   - The request-level check (line 1179) doesn't filter which models are available
   - It only blocks if user explicitly requests CLI
   - Then models are selected (lines 1322-1381)
   - Then routing happens (lines 1414-1700)

**3. No subscription check in model routing**
   - When checking CLI availability (line 1461-1465), no `canUseCLI()` call
   - The code only checks database status: `config.status === 'available' && config.enabled === true`
   - It should also check: `user has Pro subscription`

---

## How Non-Pro Users Access CLI Models Today

### Scenario: Free user with Claude Code installed locally

```
1. Free user calls MCP endpoint with prompt
2. Request doesn't have 'cli' markers, so isCliRequest = false
3. Request-level check (line 1179) is skipped ✓
4. Models are selected from their API keys
5. For each model, code checks: is CLI available? (line 1461)
6. If they have claude_code installed: YES, it's available
7. ❌ Code returns CLI response without checking Pro subscription
8. Free user gets access to their local CLI tool
```

---

## The Fix Required

### Option A: Add Pro Check at Model Routing Level (RECOMMENDED)

**Location**: Line 1467 in `/src/app/api/mcp/route.ts`

**Change**:
```typescript
if (cliConfig) {
  // ✅ ADD THIS CHECK
  const cliAccessCheck = await subscriptionManager.canUseCLI(user.id)
  if (!cliAccessCheck.canUse) {
    console.log(`[MCP] ⛔ User ${user.id} attempted to use CLI (${cliToolName}) without Pro - falling back to API key`)
    // Do NOT set skipApiKey = true, continue to API key fallback below
  } else {
    // Only skip API key if user is Pro
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
}
```

**Why this works**:
- Ensures every model routing decision checks subscription
- Non-pro users fallback to API keys automatically
- Pro users still get CLI when available
- Works regardless of how request was marked

---

## Subscription System Context

### From `subscriptionManager.ts` (Line 310-326)

```typescript
async canUseCLI(userId: string, useServiceRole: boolean = true):
  Promise<{ canUse: boolean; reason?: string }> {
  try {
    const subscription = await this.getUserSubscription(userId, useServiceRole)

    if (!subscription || subscription.tier !== 'pro' || subscription.status !== 'active') {
      return {
        canUse: false,
        reason: 'CLI access requires Polydev Pro subscription ($20/month)'
      }
    }

    return { canUse: true }
  } catch (error) {
    console.error('Error in canUseCLI:', error)
    return { canUse: false, reason: 'Error checking CLI access' }
  }
}
```

**Requirements**:
- User must have `tier === 'pro'`
- Subscription must be `status === 'active'`
- Otherwise: CLI access denied

---

## Model Routing Architecture

### Provider → CLI Tool Mapping (Line 1448-1453)

```typescript
const providerToCliMap: Record<string, string> = {
  'openai': 'codex_cli',
  'anthropic': 'claude_code',
  'google': 'gemini_cli',
  'gemini': 'gemini_cli'
}
```

**These are the models that can leak**:
- OpenAI models via `codex_cli` (Codex CLI tool)
- Anthropic models via `claude_code` (Claude Code tool)
- Google models via `gemini_cli` (Gemini CLI tool)

---

## Data Flow Diagram

```
MCP Request → Subscription Check (Line 1179)
                    ↓
           Only blocks if isCliRequest = true
           (depends on detection logic)
                    ↓
         Model Selection (Lines 1322-1381)
         - From args.models
         - OR from API keys
                    ↓
    For Each Model → Find API Key Config
                    ↓
         Get Provider Name (e.g., 'anthropic')
                    ↓
      Map to CLI Tool (e.g., 'claude_code')
                    ↓
    Check if CLI Available (Line 1461-1465)
    ✓ status === 'available'
    ✓ enabled === true
    ❌ NO SUBSCRIPTION CHECK
                    ↓
    If CLI Available → Use it
                    (even for non-Pro users!)
                    ↓
    If Not Available → Use API key
```

---

## Testing the Bug

### How to Reproduce

1. Create a test free user account
2. Install Claude Code locally on your machine
3. Call MCP endpoint with:
   ```json
   {
     "prompt": "Hello",
     "models": ["claude-3-5-sonnet-20241022"],
     "temperature": 0.7
   }
   ```
4. **Current behavior**: Returns CLI response (BUG!)
   ```json
   {
     "model": "claude-3-5-sonnet-20241022",
     "provider": "Anthropic (CLI Available)",
     "cli_available": true,
     "tokens_used": 0
   }
   ```
5. **Expected behavior**: Should use API key or return error
   ```json
   {
     "error": "CLI access requires Pro subscription"
   }
   ```

---

## Recommendation

### Implementation Steps

1. **Add Pro check in model routing loop** (Line 1467)
   - Call `subscriptionManager.canUseCLI(user.id)` before returning CLI response
   - If not Pro: skip CLI routing, continue to API key fallback
   - If Pro: current behavior

2. **Add logging** for audit trail
   - Log when non-pro user attempts CLI access
   - Log when CLI is skipped for non-pro users
   - Track pattern of attempts

3. **Test with free user**
   - Verify free users can't access CLI models
   - Verify Pro users still get CLI when available
   - Check fallback to API keys works

4. **Consider request-level detection enhancement**
   - May want to strengthen `isCliRequest` detection
   - Could add X-CLI-Tool header from CLI tools
   - Could add explicit CLI detection in Polydev tools

---

## Related Code References

- **Request-level check**: `/src/app/api/mcp/route.ts:1178-1183`
- **Model selection**: `/src/app/api/mcp/route.ts:1322-1381`
- **Model routing**: `/src/app/api/mcp/route.ts:1414-1700`
- **Subscription check**: `/src/lib/subscriptionManager.ts:310-326`
- **CLI configs fetch**: `/src/app/api/mcp/route.ts:1210-1212`
- **Subscription manager import**: `/src/app/api/mcp/route.ts` (top of file)

---

## Summary

The bug exists because:
1. ✓ Request-level CLI checks work (line 1179)
2. ❌ Model-level CLI checks don't verify subscription tier (line 1467)
3. Non-pro users can bypass by not marking request as CLI
4. Models get routed to CLI without subscription verification

The fix is simple:
- Add `canUseCLI()` check before using CLI at model routing level
- Fallback to API keys if not Pro
- Ensures subscription enforcement at every CLI access point
