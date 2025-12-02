# Polydev AI - Model Selection System Documentation

## Overview

The Polydev platform has a sophisticated model selection system with multiple layers:
1. **User API Keys** - User's own provider API keys (highest priority)
2. **Admin-Provided Keys** - Platform-managed keys available to all users (fallback)
3. **CLI Subscriptions** - Pro users' subscription-based CLI tools (lowest priority)

---

## Database Tables

### `user_api_keys`
Stores both user and admin API keys.

| Column | Description |
|--------|-------------|
| `user_id` | Owner of the key (UUID) |
| `provider` | Provider name: `anthropic`, `openai`, `google`, `groq`, etc. |
| `encrypted_key` | The API key (encrypted) |
| `default_model` | The model ID to use with this key (e.g., `claude-sonnet-4-20250514`) |
| `display_order` | **MCP route ordering** - lower = higher priority (1, 2, 3...) |
| `priority_order` | **Chat/Perspectives route ordering** - lower = higher priority |
| `is_admin_key` | `true` = admin-managed key, `false` = user's personal key |
| `active` | Whether the key is enabled |

### `model_tiers`
Admin-configured models available to all users via tier priority.

| Column | Description |
|--------|-------------|
| `id` | Unique ID |
| `tier` | `premium`, `normal`, or `eco` |
| `provider` | Provider name |
| `model_name` | Full model ID (e.g., `claude-sonnet-4-20250514`) |
| `display_name` | Human-readable name (e.g., "Claude Sonnet 4") |
| `active` | Whether this tier is enabled |

### `user_preferences`
User settings including MCP configuration.

| Column | Description |
|--------|-------------|
| `user_id` | User ID |
| `mcp_settings` | JSON object containing: |
| - `perspectives_per_message` | Number of models to query (1-10, default: 2) |
| - `tier_priority` | Array ordering tiers, default: `['normal', 'eco', 'premium']` |
| - `saved_chat_models` | Fallback model list |

---

## Model Selection Flows

### 1. MCP Route (`/api/mcp/route.ts`)

**Purpose:** Multi-model perspectives for code consultation

**Selection Logic:**
```
1. Get user's perspectives_per_message setting (default: 2)
2. Query user_api_keys WHERE user_id = X AND active = true
3. ORDER BY display_order ASC
4. Filter to only keys with default_model set
5. Take top N keys (N = perspectives_per_message)
6. If no keys found, fallback to: gpt-5-2025-08-07
```

**Key Points:**
- Uses `display_order` column (NOT `priority_order`)
- Does NOT filter by `is_admin_key` - includes all user's keys
- Requires `default_model` to be set
- Lower `display_order` = higher priority (1 beats 2 beats 3)

**Example:**
```
User has 5 keys with display_order:
1. Google → gemini-2.5-flash
2. Anthropic → claude-sonnet-4-20250514
3. Groq → llama-3.3-70b
4. Cerebras → qwen-3-coder-480b
5. Together → llama-3.3-70b-turbo

perspectives_per_message = 3

Selected models: [gemini-2.5-flash, claude-sonnet-4-20250514, llama-3.3-70b]
```

---

### 2. Perspectives Route (`/api/perspectives/route.ts`)

**Purpose:** Alternative multi-model endpoint

**Selection Logic:**
```
1. Query user_api_keys WHERE:
   - user_id = X
   - active = true
   - is_admin_key = false  ← EXCLUDES admin keys!
2. ORDER BY priority_order ASC
3. Extract default_model from each
4. If no user keys, fallback to getPolyDevManagedKeys()
```

**Key Points:**
- Uses `priority_order` column (NOT `display_order`)
- Explicitly EXCLUDES admin keys (`is_admin_key = false`)
- Falls back to Polydev-managed keys if user has none

---

### 3. Chat Completions Route (`/api/chat/completions/route.ts`)

**Purpose:** Main chat interface with full provider fallback

**Priority Order:**
```
Priority 1: User's Own API Keys (is_admin_key = false)
Priority 2: Admin-Provided API Keys (is_admin_key = true)
Priority 3: CLI Subscriptions (Pro users only)
```

**Selection Logic:**
```
1. Get user's tier_priority preference (default: ['normal', 'eco', 'premium'])
2. Fetch user's personal keys (is_admin_key = false)
3. Fetch admin keys (is_admin_key = true)
4. Build provider config map with priorities
5. For each model request:
   - Check if user has key for that provider → use it (priority 1)
   - Check if admin has key for that provider → use it (priority 2)
   - Check if user has CLI subscription → use it (priority 3)
6. If request fails with 401 or CLI error:
   - Retry with admin key
   - Then try next fallback source
```

**Fallback Chain Example:**
```
User requests: claude-sonnet-4-20250514

1. Check user's Anthropic key → if exists, use it
2. If fails or missing → check admin's Anthropic key
3. If fails or missing → check user's CLI subscription (Pro only)
4. If all fail → error
```

---

## Tier Priority System (Admin Models)

### What is Tier Priority?

When a user doesn't have their own API key for a provider, the system uses admin-provided models. These are organized into three tiers:

| Tier | Cost | Models |
|------|------|--------|
| **Premium** | High | claude-sonnet-4, gpt-5, gemini-2.5-pro, grok-4 |
| **Normal** | Medium | claude-haiku, gemini-flash, gpt-5-mini, qwen-3-coder |
| **Eco** | Low | gemini-flash-lite, gpt-5-nano, grok-4-fast |

### User Preference: `tier_priority`

Users can customize which tier to prefer. Default order:
```json
["normal", "eco", "premium"]
```

This means:
1. First try normal tier models (balanced)
2. Then eco tier (cost-effective)
3. Finally premium tier (highest quality)

### How Tier Priority Works

When selecting admin models for a user:
```
1. Get user's tier_priority setting
2. Fetch all active models from model_tiers table
3. Sort by tier_priority order
4. Within each tier, admin controls priority via model_tiers.priority_order
```

---

## Key Differences Between Endpoints

| Aspect | MCP Route | Perspectives Route | Chat Route |
|--------|-----------|-------------------|------------|
| **Ordering Column** | `display_order` | `priority_order` | `priority_order` |
| **Admin Keys** | Included | Excluded | Separate priority |
| **Fallback** | Fixed model | Polydev managed | Admin → CLI |
| **Use Case** | Code consultation | General multi-model | Interactive chat |

---

## Common Issues

### Issue: Wrong Models Selected

**Symptom:** Models don't match the order shown in dashboard.

**Cause:** Duplicate keys with `display_order: 0`

**Solution:**
1. Check for duplicates: `SELECT * FROM user_api_keys WHERE user_id = X ORDER BY display_order`
2. Delete duplicates or fix display_order values
3. Ensure each intended key has unique, sequential display_order (1, 2, 3, 4, 5)

### Issue: Admin Keys Not Appearing

**Symptom:** User without own keys gets "no models configured" error.

**Cause:** Admin keys may be missing or `is_admin_key` not set.

**Solution:**
1. Check admin keys exist: `SELECT * FROM user_api_keys WHERE is_admin_key = true`
2. Verify `model_tiers` table has active entries
3. Check user's `tier_priority` setting matches available tiers

---

## Configuration Reference

### User Settings (Dashboard → Settings)

| Setting | Location | Effect |
|---------|----------|--------|
| **Perspectives per message** | MCP Settings | Number of models to query (1-10) |
| **Tier priority** | MCP Settings | Order of tier preference for admin models |
| **API Key order** | API Keys tab | Drag to reorder, sets `display_order` |

### Admin Settings (Admin Panel)

| Setting | Location | Effect |
|---------|----------|--------|
| **Admin API Keys** | Admin → Providers | Platform-wide keys with `is_admin_key = true` |
| **Model Tiers** | Admin → Models | Configure which models in each tier |
| **Default Max Tokens** | Admin → Config | `mcp_default_max_tokens` |

---

## SQL Reference Queries

### Check User's API Keys Order
```sql
SELECT provider, default_model, display_order, priority_order, is_admin_key, active
FROM user_api_keys
WHERE user_id = 'UUID'
ORDER BY display_order ASC;
```

### Check Admin-Provided Models
```sql
SELECT tier, provider, model_name, display_name, active
FROM model_tiers
WHERE active = true
ORDER BY tier, provider;
```

### Check User's MCP Settings
```sql
SELECT (mcp_settings->>'perspectives_per_message')::int as perspectives,
       mcp_settings->'tier_priority' as tier_priority
FROM user_preferences
WHERE user_id = 'UUID';
```

### Find Duplicate Keys
```sql
SELECT provider, COUNT(*), array_agg(display_order)
FROM user_api_keys
WHERE user_id = 'UUID'
GROUP BY provider
HAVING COUNT(*) > 1;
```

---

## Summary

1. **User keys take priority** - If user has configured their own API key for a provider, it's always used first.

2. **Admin keys are fallback** - When user has no key for a provider, admin-provided keys (from `model_tiers`) are used.

3. **Tier priority controls admin model selection** - User's `tier_priority` preference determines which admin models to use first (default: normal → eco → premium).

4. **`display_order` controls MCP** - The order shown in the dashboard API Keys tab (`display_order` column) determines MCP multi-model selection.

5. **`priority_order` controls other routes** - Chat and Perspectives routes use `priority_order` for selection.
