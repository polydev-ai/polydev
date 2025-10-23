# MCP Model Routing Bug: Visual Flow Diagrams

## Current Bug Flow (Broken ❌)

### Scenario: Free User Makes MCP Request

```
┌─────────────────────────────────────────────────────────────────┐
│ FREE USER with Claude Code Installed Locally                    │
│ Account: free@example.com (Tier: free, Status: active)          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  MCP Request    │
                    │  POST /api/mcp  │
                    │                 │
                    │ prompt: "hello" │
                    │ models: [       │
                    │   claude-3.5    │
                    │ ]              │
                    └─────────────────┘
                              │
                              ▼
            ┌────────────────────────────────────┐
            │ Line 1174: Check isCliRequest      │
            │                                    │
            │ Is request marked as CLI?          │
            │ - User-Agent has 'cli'?  NO        │
            │ - x-request-source=cli?  NO        │
            │ - args.source=cli?       NO        │
            │                                    │
            │ Result: isCliRequest = FALSE       │
            └────────────────────────────────────┘
                              │
                              ▼
            ┌────────────────────────────────────┐
            │ Line 1179: Request-level Check     │
            │                                    │
            │ if (isCliRequest) {                │
            │   // SKIPPED (isCliRequest=FALSE)  │
            │ }                                  │
            │                                    │
            │ ✓ Check is bypassed                │
            └────────────────────────────────────┘
                              │
                              ▼
            ┌────────────────────────────────────┐
            │ Lines 1322-1381: Select Models     │
            │                                    │
            │ Select from user API keys          │
            │ → claude-3-5-sonnet-20241022       │
            │                                    │
            │ Result: models = [                 │
            │   "claude-3-5-sonnet-20241022"     │
            │ ]                                  │
            └────────────────────────────────────┘
                              │
                              ▼
            ┌────────────────────────────────────┐
            │ Lines 1414+: For Each Model        │
            │                                    │
            │ Processing:                        │
            │ "claude-3-5-sonnet-20241022"       │
            │                                    │
            │ Find API key config                │
            │ → Provider: "anthropic"            │
            └────────────────────────────────────┘
                              │
                              ▼
            ┌────────────────────────────────────┐
            │ Lines 1448-1453: Map to CLI Tool   │
            │                                    │
            │ Provider: "anthropic"              │
            │ → CLI Tool: "claude_code"          │
            │                                    │
            │ Result: cliToolName =              │
            │ "claude_code"                      │
            └────────────────────────────────────┘
                              │
                              ▼
            ┌────────────────────────────────────┐
            │ Lines 1461-1465: Check CLI Config  │
            │                                    │
            │ Find from database:                │
            │ - provider = "claude_code"         │
            │ - status = "available"  ✓          │
            │ - enabled = true        ✓          │
            │                                    │
            │ Result: cliConfig = FOUND          │
            └────────────────────────────────────┘
                              │
                              ▼
            ┌────────────────────────────────────┐
            │ ❌ Line 1467: THE BUG LOCATION     │
            │                                    │
            │ if (cliConfig) {                   │
            │   skipApiKey = true                │
            │   ❌ NO PRO CHECK HERE             │
            │   return {                         │
            │     cli_available: true,           │
            │     model: "...",                  │
            │     ...                            │
            │   }                                │
            │ }                                  │
            │                                    │
            │ Result: FREE USER GETS CLI ❌      │
            └────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Response:      │
                    │  {              │
                    │    cli_ready: ✓ │
                    │    model: "..." │
                    │  }              │
                    │                 │
                    │  FREE USER      │
                    │  GETS CLI! ❌    │
                    └─────────────────┘
```

---

## Fixed Bug Flow (Correct ✅)

### Scenario: Free User Makes MCP Request (After Fix)

```
┌─────────────────────────────────────────────────────────────────┐
│ FREE USER with Claude Code Installed Locally                    │
│ Account: free@example.com (Tier: free, Status: active)          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  MCP Request    │
                    │  POST /api/mcp  │
                    │                 │
                    │ prompt: "hello" │
                    │ models: [       │
                    │   claude-3.5    │
                    │ ]              │
                    └─────────────────┘
                              │
                              ▼
            ┌────────────────────────────────────┐
            │ Line 1174: Check isCliRequest      │
            │                                    │
            │ Is request marked as CLI?          │
            │ - User-Agent has 'cli'?  NO        │
            │ - x-request-source=cli?  NO        │
            │ - args.source=cli?       NO        │
            │                                    │
            │ Result: isCliRequest = FALSE       │
            └────────────────────────────────────┘
                              │
                              ▼
            ┌────────────────────────────────────┐
            │ Line 1179: Request-level Check     │
            │                                    │
            │ if (isCliRequest) {                │
            │   // SKIPPED (isCliRequest=FALSE)  │
            │ }                                  │
            │                                    │
            │ ✓ Check is bypassed (OK)           │
            └────────────────────────────────────┘
                              │
                              ▼
            ┌────────────────────────────────────┐
            │ Lines 1322-1381: Select Models     │
            │                                    │
            │ Select from user API keys          │
            │ → claude-3-5-sonnet-20241022       │
            │                                    │
            │ Result: models = [                 │
            │   "claude-3-5-sonnet-20241022"     │
            │ ]                                  │
            └────────────────────────────────────┘
                              │
                              ▼
            ┌────────────────────────────────────┐
            │ Lines 1414+: For Each Model        │
            │                                    │
            │ Processing:                        │
            │ "claude-3-5-sonnet-20241022"       │
            │                                    │
            │ Find API key config                │
            │ → Provider: "anthropic"            │
            └────────────────────────────────────┘
                              │
                              ▼
            ┌────────────────────────────────────┐
            │ Lines 1448-1453: Map to CLI Tool   │
            │                                    │
            │ Provider: "anthropic"              │
            │ → CLI Tool: "claude_code"          │
            │                                    │
            │ Result: cliToolName =              │
            │ "claude_code"                      │
            └────────────────────────────────────┘
                              │
                              ▼
            ┌────────────────────────────────────┐
            │ Lines 1461-1465: Check CLI Config  │
            │                                    │
            │ Find from database:                │
            │ - provider = "claude_code"         │
            │ - status = "available"  ✓          │
            │ - enabled = true        ✓          │
            │                                    │
            │ Result: cliConfig = FOUND          │
            └────────────────────────────────────┘
                              │
                              ▼
            ┌────────────────────────────────────┐
            │ ✅ Line 1467: FIX APPLIED          │
            │                                    │
            │ if (cliConfig) {                   │
            │   ✅ NEW: Check subscription       │
            │   const cliAccessCheck =           │
            │     await subscriptionManager      │
            │       .canUseCLI(user.id)          │
            │                                    │
            │   if (!cliAccessCheck.canUse) {    │
            │     console.log(                   │
            │       "⛔ User attempted CLI       │
            │        without Pro..."             │
            │     )                              │
            │     // DON'T return CLI response   │
            │     // Fall through to API keys    │
            │   } else {                         │
            │     skipApiKey = true              │
            │     return { cli_available: true } │
            │   }                                │
            │ }                                  │
            │                                    │
            │ Result: Check fails, continue      │
            └────────────────────────────────────┘
                              │
                              ▼
            ┌────────────────────────────────────┐
            │ Lines 1492+: API Key Handling      │
            │                                    │
            │ skipApiKey = false (not set)       │
            │ → Use API key instead              │
            │ → Call Anthropic API               │
            │ → Get response                     │
            └────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Response:      │
                    │  {              │
                    │    model: "..." │
                    │    content: ... │
                    │    tokens: 123  │
                    │  }              │
                    │                 │
                    │  FREE USER USES │
                    │  API KEYS ✅     │
                    └─────────────────┘
```

---

## Pro User Comparison (Both Should Work)

### Scenario: Pro User Makes MCP Request

```
Before Fix (✅ Works)          After Fix (✅ Still Works)
────────────────────────────────────────────────────────

Free user → CLI check fails   Free user → CLI check fails
                              → Falls back to API keys
                              ✅ Correct

Pro user → CLI check passes   Pro user → CLI check passes
→ Uses CLI                    → Uses CLI
✅ Correct                    ✅ Correct (no regression)
```

---

## The Critical Gap

### Where the Bug Lives

```
Request-level Layer                Model-level Layer
────────────────────────────────────────────────────

Line 1179:                         Line 1467:
┌─────────────────────┐           ┌──────────────────┐
│ isCliRequest=true?  │           │ cliConfig found? │
│ ✓ Has Pro check     │           │ ❌ NO PRO CHECK  │
└─────────────────────┘           └──────────────────┘
     │ YES                             │ YES
     ▼                                 ▼
  Deny                             Use CLI (BUG!)


The Gap:
────────

isCliRequest=false (request not marked as CLI)
  ▼
Request-level check SKIPPED
  ▼
Models selected and routed at line 1414
  ▼
For each model, check if CLI available at line 1467
  ▼
❌ NO PRO CHECK HERE = BUG!
```

---

## Subscription State Diagram

### User States and CLI Access

```
            ┌──────────────┐
            │ FREE USER    │
            │ tier: free   │
            └──────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │ CLI Request?       │
        │                    │
        │ Line 1179 Check    │
        └────────────────────┘
           ✓         ❌
          /           \
    YES /             \ NO
      /                 \
     ▼                   ▼
┌────────────────┐  ┌──────────────────┐
│ ERROR:         │  │ Models selected  │
│ "Requires Pro" │  │ at line 1322     │
│                │  │                  │
│ ✓ Correct      │  │ For each model:  │
└────────────────┘  │ Check CLI        │
                    │                  │
                    │ Line 1467        │
                    │ (THE BUG) ❌      │
                    │                  │
                    │ cliConfig found? │
                    └──────────────────┘
                        │        │
                       YES      NO
                        │        │
                        ▼        ▼
                   ┌─────────┐ ┌──────────┐
                   │ CLI     │ │ API Keys │
                   │ (WRONG) │ │          │
                   │ ❌      │ │ ✓ OK     │
                   └─────────┘ └──────────┘


After Fix:
──────────

            ┌──────────────┐
            │ FREE USER    │
            │ tier: free   │
            └──────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │ CLI Request?       │
        │                    │
        │ Line 1179 Check    │
        └────────────────────┘
           ✓         ❌
          /           \
    YES /             \ NO
      /                 \
     ▼                   ▼
┌────────────────┐  ┌──────────────────┐
│ ERROR:         │  │ Models selected  │
│ "Requires Pro" │  │ at line 1322     │
│                │  │                  │
│ ✓ Correct      │  │ For each model:  │
└────────────────┘  │ Check CLI        │
                    │                  │
                    │ Line 1467        │
                    │ ✅ FIX ADDED     │
                    │                  │
                    │ cliConfig found? │
                    └──────────────────┘
                        │        │
                       YES      NO
                        │        │
                        ▼        ▼
                    ┌───────────────┐
                    │ Has Pro tier? │
                    └───────────────┘
                      ✓         ❌
                     /           \
                   YES            NO
                    /              \
                   ▼                ▼
              ┌────────┐        ┌──────────┐
              │ CLI    │        │ API Keys │
              │ ✓ OK   │        │ ✓ OK     │
              └────────┘        └──────────┘
```

---

## Summary: The Bug in One Picture

```
┌─────────────────────────────────────────────────────────┐
│                   MCP ENDPOINT                          │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Request-level Check (Line 1179)                  │  │
│  │                                                  │  │
│  │ if (isCliRequest) {                              │  │
│  │   ✓ Check Pro subscription                       │  │
│  │   if (!hasProSubscription) error()               │  │
│  │ }                                                │  │
│  │                                                  │  │
│  │ Problem: Only runs if request marked as CLI      │  │
│  └──────────────────────────────────────────────────┘  │
│                     ▼                                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Model Selection (Lines 1322-1381)                │  │
│  │                                                  │  │
│  │ Select models from API keys or args              │  │
│  │ Example: ["claude-3-5-sonnet-20241022"]          │  │
│  └──────────────────────────────────────────────────┘  │
│                     ▼                                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Model Routing (Lines 1414-1700)                  │  │
│  │                                                  │  │
│  │ For each model:                                  │  │
│  │   Get provider name                              │  │
│  │   Map to CLI tool                                │  │
│  │                                                  │  │
│  │   ┌──────────────────────────────────────────┐  │  │
│  │   │ Line 1467: Check CLI Available           │  │  │
│  │   │                                          │  │  │
│  │   │ if (cliConfig) {                         │  │  │
│  │   │   ❌ NO PRO CHECK HERE ← THE BUG!        │  │  │
│  │   │   skipApiKey = true                      │  │  │
│  │   │   return { cli_available: true }         │  │  │
│  │   │ } else {                                 │  │  │
│  │   │   ✓ Use API keys                         │  │  │
│  │   │ }                                        │  │  │
│  │   └──────────────────────────────────────────┘  │  │
│  │                                                  │  │
│  │ THE FIX:                                         │  │
│  │ Add Pro check before returning CLI response      │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Impact

### Before Fix
```
Free User Request Flow:
  Request → (isCliRequest=false) → Skip request-level check
    → Select models → Check CLI → NO PRO CHECK
    → Return CLI response → BUG ❌
```

### After Fix
```
Free User Request Flow:
  Request → (isCliRequest=false) → Skip request-level check ✓
    → Select models → Check CLI → ADD PRO CHECK ✓
    → Fail pro check → Fall through to API keys ✓
    → Return API response → CORRECT ✓
```

---

## All Possible Code Paths

### Path A: Free User, Request Marked as CLI
```
isCliRequest = true
  ↓
Line 1179 check
  ✓ Already blocked here (works)
```

### Path B: Free User, Request NOT Marked as CLI, CLI Available
```
isCliRequest = false
  ↓
Request-level check skipped (OK)
  ↓
Models selected
  ↓
Line 1467: cliConfig found
  ↓
Before fix: ❌ Returns CLI (BUG)
After fix:  ✓ Checks Pro, falls through to API keys
```

### Path C: Free User, Request NOT Marked as CLI, CLI NOT Available
```
isCliRequest = false
  ↓
Request-level check skipped (OK)
  ↓
Models selected
  ↓
Line 1467: cliConfig NOT found
  ↓
Before fix: ✓ Uses API keys
After fix:  ✓ Uses API keys (no change)
```

### Path D: Pro User, CLI Available
```
isCliRequest = true/false (doesn't matter)
  ↓
Models selected
  ↓
Line 1467: cliConfig found
  ↓
Before fix: ✓ Returns CLI
After fix:  ✓ Checks Pro (passes), returns CLI (no regression)
```

---

## Root Cause Summary

```
The system has TWO places where CLI access can be granted:

1. Request-level (Line 1179): ✓ Has pro check
2. Model-level (Line 1467):   ❌ Missing pro check

A regular API call bypasses check #1 (not marked as CLI request)
and succeeds at check #2 because it only checks CLI availability,
not user subscription.

→ Non-pro users can access CLI if they have it installed locally
```
