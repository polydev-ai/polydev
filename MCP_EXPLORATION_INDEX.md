# MCP Model Routing Logic - Complete Exploration Index

This directory contains comprehensive documentation of the Polydev MCP model routing system, with detailed analysis of CLI selection, pro/non-pro restrictions, API key fallback, and admin-provided model routing.

## Documentation Files

### 1. **MODEL_ROUTING_LOGIC_ANALYSIS.md** (17 KB)
**Comprehensive deep-dive into the entire model routing system**

Contains:
- Complete pro/non-pro user check system
- CLI model selection and routing logic
- Admin-provided model routing
- Sequence of priority and selection
- How the bug manifests with examples
- Smart CLI cache and detection mechanisms
- API key fallback logic
- Subscription tier system
- Admin provided models endpoint
- Client source exclusions

**Read this for:** Complete understanding of how models are selected and routed

**Key sections:**
- Section 1: Pro/Non-Pro User Checks
- Section 2: CLI Model Selection & Routing
- Section 3: Admin-Provided Model Routing
- Section 5: How the Bug Manifests

### 2. **KEY_FILES_SUMMARY.md** (11 KB)
**Quick reference guide to all core files and their purposes**

Contains:
- 7 core files with line numbers and key sections
- Data flow patterns
- Critical code patterns (pro check, model selection, CLI routing)
- Key database tables and schemas
- File relationships diagram
- Bug location with before/after code

**Read this for:** Quick lookup of specific functionality and exact line numbers

**Key sections:**
- All 7 core files with their purposes
- Critical code patterns
- Data structures and tables
- The bug location with exact code

### 3. **EXPLORATION_SUMMARY.md** (10 KB)
**Executive summary of findings and methodology**

Contains:
- Executive summary
- List of all analyzed files
- Model selection flow
- Pro/non-pro subscription system
- CLI model routing explanation
- API key fallback logic
- Admin-provided models
- Client source detection
- The bug: missing pro check
- How to verify the bug
- Absolute paths for all files

**Read this for:** High-level overview and executive summary

**Key sections:**
- Executive summary
- Model selection flow
- Pro/non-pro subscription system
- The bug explanation
- How to verify the bug

---

## File Locations (Absolute Paths)

### Core System Files

**MCP Route Handler (PRIMARY - WHERE BUG IS)**
```
/Users/venkat/Documents/polydev-ai/src/app/api/mcp/route.ts
```
Lines 1459-1490: CLI-first routing decision (missing pro check)
Lines 1173-1183: REQUEST-level pro check (correctly implemented)

**Subscription Manager (PRO/NON-PRO LOGIC)**
```
/Users/venkat/Documents/polydev-ai/src/lib/subscriptionManager.ts
```
Lines 310-326: `canUseCLI()` method - the pro check

**Smart CLI Cache (CLI DETECTION)**
```
/Users/venkat/Documents/polydev-ai/src/lib/smartCliCache.ts
```

**Available Models Endpoint (MODEL LISTING)**
```
/Users/venkat/Documents/polydev-ai/src/app/api/models/available/route.ts
```

**Admin Provided Models (ADMIN ROUTING)**
```
/Users/venkat/Documents/polydev-ai/src/app/api/models/admin-provided/route.ts
```

**Client Detection (EXCLUSIONS)**
```
/Users/venkat/Documents/polydev-ai/src/lib/client-detection.ts
```

**Model Tiers (CONFIGURATION)**
```
/Users/venkat/Documents/polydev-ai/src/lib/model-tiers.ts
```

---

## The Bug at a Glance

**Location:** `/Users/venkat/Documents/polydev-ai/src/app/api/mcp/route.ts` (Line 1467)

**Problem:** Missing pro/non-pro check when routing models through CLI

**Current Code:**
```typescript
if (cliConfig) {
  skipApiKey = true
  // NO CHECK - uses CLI for any user
}
```

**Should Be:**
```typescript
if (cliConfig) {
  const cliCheck = await subscriptionManager.canUseCLI(user.id)
  if (cliCheck.canUse) {
    skipApiKey = true
  } else {
    skipApiKey = false  // Fall through to API key
  }
}
```

**Impact:**
- Non-pro users can use CLI models when they shouldn't
- Pro/non-pro distinction is lost at model routing level
- Request-level check is bypassed for model selection

---

## Model Selection Sequence

```
1. MCP Request → /api/mcp/tools/call
2. Authentication ✓
3. Is CLI Request? → Check canUseCLI() at REQUEST level ✓
4. Select Models from args/apiKeys/fallback
5. For Each Model:
   a. Get provider
   b. Check CLI available
   c. ❌ MISSING: Check canUseCLI() at MODEL level
   d. If CLI available → Use CLI
   e. Else → Use API key or credits
```

---

## Key Insights

### 1. Two-Level Pro Checking (One is Missing)
- **Level 1:** REQUEST level (line 1179) - ✓ Implemented
- **Level 2:** MODEL selection level (line 1467) - ❌ Missing

### 2. CLI-First Architecture
The system prioritizes local CLI tools over API keys:
- If Claude Code is available → Use it (should check pro)
- If Codex CLI is available → Use it (should check pro)
- If Gemini CLI is available → Use it (should check pro)
- Otherwise → Use API key or admin credits

### 3. Subscription Tiers
- **Free:** 200 messages/month, NO CLI access, CAN use admin models
- **Pro:** Unlimited messages, HAS CLI access, CAN use own APIs + admin models

### 4. Provider-to-CLI Mapping
```
OpenAI → codex_cli (Codex CLI)
Anthropic → claude_code (Claude Code)
Google → gemini_cli (Gemini CLI)
Gemini → gemini_cli (Gemini CLI)
```

### 5. Client Source Exclusions
- Claude Code requests exclude Anthropic providers (recursive call prevention)
- Codex CLI requests exclude OpenAI providers (recursive call prevention)

---

## How to Navigate the Documentation

### If you want to understand...

**How the entire system works:**
→ Read **MODEL_ROUTING_LOGIC_ANALYSIS.md** (sections 1-10)

**Where specific functionality is:**
→ Read **KEY_FILES_SUMMARY.md** (look up the file, find line numbers)

**The bug and its impact:**
→ Read **EXPLORATION_SUMMARY.md** (The Bug section)

**Code patterns and examples:**
→ Read **KEY_FILES_SUMMARY.md** (Critical Code Patterns section)

**Database structure:**
→ Read **KEY_FILES_SUMMARY.md** (Key Tables/Data Structures section)

**File relationships:**
→ Read **KEY_FILES_SUMMARY.md** (Summary of File Relationships)

---

## Quick Facts

**System Architecture:**
- 7 core files involved
- ~5000 lines of relevant code
- Multi-tier subscription system (free vs pro)
- CLI-first routing strategy
- Admin credits fallback

**Pro/Non-Pro Logic:**
- Stored in `user_subscriptions.tier` (free | pro)
- Checked via `canUseCLI()` method
- Enforced at REQUEST level but NOT at MODEL level

**Model Sources (in priority order):**
1. CLI (Local tools - Claude Code, Codex, Gemini CLI)
2. API (User's own API keys)
3. Admin (Admin-provided models via OpenRouter)

**Provider Mapping:**
- OpenAI → Codex CLI
- Anthropic → Claude Code
- Google/Gemini → Gemini CLI

---

## Testing the Bug

**Test Case 1: Non-Pro User**
```
1. Create free account
2. Install Claude Code and authenticate
3. Call get_perspectives with Anthropic model
4. Expected: Error or API key used
5. Actual: "CLI Available" response (BUG)
```

**Test Case 2: Pro User**
```
1. Create pro account
2. Install Claude Code and authenticate
3. Call get_perspectives with Anthropic model
4. Expected: "CLI Available" (correct)
5. Actual: "CLI Available" (correct)
```

---

## Summary

Complete exploration of Polydev's MCP model routing system reveals a sophisticated architecture with three documentation files providing:

1. **MODEL_ROUTING_LOGIC_ANALYSIS.md** - Deep technical analysis
2. **KEY_FILES_SUMMARY.md** - Quick reference with code patterns
3. **EXPLORATION_SUMMARY.md** - Executive summary

**Main Finding:** Missing pro/non-pro check when routing models through CLI tools at the per-model selection level (line 1467 in route.ts).

**Fix:** Add `canUseCLI()` check before deciding to use CLI for each model.

