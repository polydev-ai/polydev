# MCP Model Routing Bug: READY TO IMPLEMENT

**Status**: ✅ Investigation Complete - Ready for Implementation
**Date**: October 19, 2025
**Severity**: High (Security - Paywall bypass)
**Effort**: Low (1 code section, ~15 lines)

---

## What's the Issue?

Non-pro users can access CLI models when they have them installed locally. The system checks Pro status at the request level but NOT at the model routing level, creating a security gap.

**Current state**: Free user can use `claude_code`, `codex_cli`, or `gemini_cli` locally
**Expected state**: Only Pro users should get CLI access

---

## Where's the Bug?

**File**: `/src/app/api/mcp/route.ts`
**Lines**: 1467-1477
**Exact problem**: Missing `await subscriptionManager.canUseCLI(user.id)` check

---

## The Fix (Copy-Paste Ready)

### Step 1: Locate the Code

Open `/src/app/api/mcp/route.ts` and find this section (around line 1467):

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

### Step 2: Replace With This

Replace the entire `if (cliConfig) { ... }` block with:

```typescript
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
}
```

### Step 3: That's It!

The rest of the code will handle the fallback to API keys automatically if `skipApiKey` is not set.

---

## What Changed?

**Before** (11 lines, BROKEN):
```typescript
if (cliConfig) {
  skipApiKey = true
  console.log(`[MCP] ✅ CLI tool ${cliToolName} is available and authenticated - SKIPPING API key for ${providerName}`)
  return { /* ... */ }
}
```

**After** (20 lines, FIXED):
```typescript
if (cliConfig) {
  const cliAccessCheck = await subscriptionManager.canUseCLI(user.id)

  if (!cliAccessCheck.canUse) {
    console.log(`[MCP] ⛔ User ${user.id} attempted to use CLI (${cliToolName}) without Pro subscription - falling back to API key`)
    console.log(`[MCP] CLI access blocked. Reason: ${cliAccessCheck.reason}`)
  } else {
    skipApiKey = true
    console.log(`[MCP] ✅ Pro user ${user.id} - CLI tool ${cliToolName} is available and authenticated - SKIPPING API key for ${providerName}`)
    return { /* ... */ }
  }
}
```

---

## Test Immediately After Fix

### Test 1: Free User Gets Blocked ✓

```bash
# 1. Create free user account: free@test.com
# 2. Install Claude Code locally (if not already)
# 3. Call MCP endpoint

curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <free_user_token>" \
  -d '{
    "prompt": "Say hello",
    "models": ["claude-3-5-sonnet-20241022"]
  }'

# Expected:
# - Response uses API key (not CLI)
# - Console shows: "⛔ User attempted to use CLI without Pro"
# - Returns normal LLM response
```

### Test 2: Pro User Still Works ✓

```bash
# 1. Create pro user account: pro@test.com
# 2. Install Claude Code locally
# 3. Call MCP endpoint

curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <pro_user_token>" \
  -d '{
    "prompt": "Say hello",
    "models": ["claude-3-5-sonnet-20241022"]
  }'

# Expected:
# - Response shows "CLI Available"
# - Console shows: "✅ Pro user - CLI tool available"
# - Uses local CLI
```

### Test 3: Free User Without CLI Works ✓

```bash
# 1. Free user without CLI installed
# 2. Call MCP endpoint

curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <free_user_token>" \
  -d '{
    "prompt": "Say hello",
    "models": ["claude-3-5-sonnet-20241022"]
  }'

# Expected:
# - Response uses API key (unchanged behavior)
# - No "⛔" message in console
```

---

## Deployment Steps

1. **Apply the fix** in `/src/app/api/mcp/route.ts` (lines 1467-1477)
2. **Run the 3 tests above** locally
3. **Review console logs** for expected messages
4. **Push to staging**
5. **Run 1-2 hour smoke test** with free/pro users
6. **Check logs for errors** (should see no new errors)
7. **Push to production**
8. **Monitor first 24 hours** for any issues

---

## Verification Checklist

After implementing the fix:

- [ ] Code compiles without errors
- [ ] TypeScript types check out
- [ ] Free user test shows fallback to API keys
- [ ] Pro user test shows CLI access
- [ ] Console logs show new "⛔ User attempted" messages for free users
- [ ] No regression for Pro users
- [ ] Performance is acceptable (~5-10ms additional per model)
- [ ] Logs can be exported for audit trail
- [ ] No other tests are broken

---

## Rollback Plan

If something goes wrong:

1. **Revert** the change in `/src/app/api/mcp/route.ts`
2. **Redeploy** to production
3. **Notify** team
4. **Investigate** what went wrong
5. **Try again** with additional testing

**Estimated rollback time**: < 5 minutes

---

## FAQ for Implementation

### Q: Will this break Pro users?
**A**: No. Pro users will still get CLI when available. The check ensures `canUseCLI()` returns true for them.

### Q: Will this break free users who rely on API keys?
**A**: No change. Free users will still use API keys (now correctly enforced).

### Q: What if `subscriptionManager.canUseCLI()` is slow?
**A**: It does one DB query (~5-10ms). MCP already does multiple API calls, so this is negligible.

### Q: Do I need to restart anything?
**A**: Just redeploy the app. No migrations or database changes needed.

### Q: Can I revert easily if needed?
**A**: Yes, literally 2 minutes to revert and redeploy.

### Q: What if the subscription check fails (DB down)?
**A**: The `canUseCLI()` method returns `{ canUse: false }` on errors, so it fails securely (blocks access).

---

## Files Involved

- `/src/app/api/mcp/route.ts` - The main fix (lines 1467-1477)
- `/src/lib/subscriptionManager.ts` - Already has the check function (no changes needed)
- Test accounts - Need free and pro test accounts

---

## Success Criteria

✅ **Success is when**:
- Free users cannot access CLI models → error or API key fallback
- Pro users still get CLI models → no regression
- Console logs show clear audit trail of blocks
- No new errors in logs
- Performance is good

❌ **Failure would be**:
- Free users still getting CLI access → need to debug
- Pro users losing CLI access → regression
- Errors in console logs → need to investigate

---

## Documentation

### Before You Start
1. Read: `MCP_MODEL_ROUTING_INVESTIGATION_SUMMARY.md` - Understand the bug
2. Read: `MCP_BUG_QUICK_FIX.md` - Quick reference
3. Review: `MCP_BUG_VISUAL_FLOW.md` - See the flow

### While Implementing
1. Use: `READY_TO_IMPLEMENT_FIX.md` - This document
2. Reference: `MCP_BUG_FIX_BEFORE_AFTER.md` - See exact changes

### After Implementation
1. Check: `MCP_BUG_QUICK_FIX.md` - Run the tests
2. Monitor: Logs for "⛔ User attempted" messages
3. Share: `MCP_MODEL_ROUTING_INVESTIGATION_SUMMARY.md` - Explain to team

---

## Time Estimate

| Task | Time |
|------|------|
| Read documentation | 10 min |
| Implement fix | 5 min |
| Local testing | 10 min |
| Deploy to staging | 5 min |
| Staging test | 15 min |
| Deploy to production | 5 min |
| Monitor | 30 min |
| **Total** | **~80 min** |

---

## Contact / Questions

If during implementation you encounter:
- **Compilation errors**: Check TypeScript types
- **Runtime errors**: Check console logs for exact error
- **Test failures**: Verify user subscription status in database
- **Performance issues**: Monitor latency in logs

---

## Summary

| What | Details |
|------|---------|
| **Fix location** | `/src/app/api/mcp/route.ts:1467-1477` |
| **Change type** | Add subscription check |
| **Lines added** | ~9 lines |
| **Time to implement** | 5 minutes |
| **Time to test** | 15 minutes |
| **Risk level** | Very low |
| **Impact** | Closes paywall bypass |
| **Regression risk** | None (Pro users unaffected) |

---

## Ready?

1. ✅ Issue identified
2. ✅ Root cause found
3. ✅ Solution designed
4. ✅ Fix code prepared
5. ✅ Tests documented
6. ✅ Rollback plan ready

**👉 Go implement the fix now!**

---

## After Implementation

Please come back and:
1. Share the test results
2. Show console logs with "⛔" messages for free users
3. Confirm Pro users still get CLI
4. Share monitoring logs from first 24 hours

Good luck! 🚀
