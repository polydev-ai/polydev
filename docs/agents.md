# Polydev AI Agents Guide

## 1. Purpose and Scope
Polydev AI provides a production-grade Model Context Protocol (MCP) server that unlocks “second opinions” for developers directly inside editors such as VS Code (via Cline), Cursor, Claude Desktop, and any other MCP-compatible client. This document distills everything agents and platform integrators need to know—from high-level value to deep implementation details—drawing on the full codebase, Supabase backend, and the comprehensive legacy documentation (`POLYDEV_AI_COMPREHENSIVE_DOCUMENTATION.md`).

Use this guide when building or integrating agents that:
- Dispatch Polydev MCP tools for multi-model reasoning, CLI orchestration, or memory management
- Run Polydev’s hosted MCP server or the local Node bridge (`mcp/server.js`)
- Need to align with Polydev’s access preferences: **CLI subscriptions → BYO API keys → Polydev-managed credits**

> Note on data access  
> Use the Polydev dashboard and public APIs for any configuration or usage data. Direct database tooling is internal-only.

---

## 2. Platform Overview
- **Mission**: Provide immediate unblock assistance by synthesizing multiple model perspectives, leveraging existing user subscriptions whenever possible.
- **Surfaces**: Local MCP clients (Cline, Claude Desktop, Cursor, custom JSON-RPC clients), Polydev web chat, remote dashboard.
- **Provider Routing Strategy**: Try local CLI tools first (Codex CLI, Claude Code CLI, Gemini CLI), then user API keys (OpenAI, Anthropic, Google, etc.), finally Polydev credits that proxy through Polydev’s enterprise OpenRouter account.
- **Remote Dashboard**: Configure providers, monitor usage, manage MCP tokens, manipulate zero-knowledge memory, control subscriptions (100 free message sessions, then $20/month Unlimited), purchase credits, redeem referrals.
- **Model Metadata**: Entire provider/model catalog, friendly IDs, and pricing ingest from [models.dev](https://models.dev); synchronized into Supabase tables (`providers_registry`, `models_registry`, `model_mappings`, `model_pricing`, `models_dev_sync_log`).

---

## 3. Architecture at a Glance
### 3.1 Layers
1. **Frontend (Next.js App Router)**: React + shadcn/ui components under `src/app/**` for chat, settings, memory explorers, usage dashboards. Streams responses from `/api/chat` and `/api/perspectives` via SSE.
2. **API Routes / Services**: Extend Polydev’s unified orchestration for perspectives, chat, CLI command execution, MCP OAuth exchange, billing, usage analytics, and models.dev data access.
3. **MCP Bridge (`mcp/server.js`)**: Node stdio server that loads tool schema from `mcp/manifest.json`, instantiates `CLIManager` and `UniversalMemoryExtractor`, then handles JSON-RPC (`initialize`, `tools/list`, `tools/call`). Supports remote hosted mode (calling `https://www.polydev.ai/api/mcp`) and local CLI execution.
4. **Supabase Backend**: Auth, Postgres tables, storage buckets. RLS enforces per-user access; service-role policies empower controlled backend tasks (Stripe hooks, CLI status writes, models.dev sync). See §5 for schema breakdown.
5. **External Services**: Upstash Redis (caching), PostHog (analytics), BetterStack (monitoring), Stripe (billing), OpenRouter (credit-backed inference providers).

### 3.2 Control Flow Highlights
- **Perspectives Request**: `/api/perspectives` validates quotas → pulls user preferences (`user_preferences`) → selects models with `models.dev` mapping → for each, executes CLI/API/credit path → aggregates Markdown response and logs tokens/latency to `mcp_request_logs`, `mcp_usage_logs`, `usage_sessions`.
      - **CLI Detection**: `polydev.force_cli_detection` triggers `CLIManager.forceCliDetection` → updates cache and dashboard status.
- **Memory Pipeline**: `UniversalMemoryExtractor` inspects CLI memory paths → encrypts contents client-side → stores encrypted blobs + metadata in `mcp_project_memories`, `mcp_conversation_memory`, `user_cli_memory_sources`, `user_memory_audit_log` → `polydev.get_memory_context` fetches relevant snippets for prompt augmentation.
- **MCP Authentication**: Clients register via `mcp_registered_clients`, request authorization codes (`mcp_auth_codes`) with PKCE, exchange for access tokens (`mcp_access_tokens`). Alternatively, users generate static tokens (`mcp_user_tokens`). All requests must include bearer token headers.

---

## 4. Agent-Facing MCP Tools
Polydev MCP tools (defined in `mcp/manifest.json`, implemented in `mcp/server.js`) encapsulate major capabilities:

| Tool | Purpose | Key Inputs | Data Sources |
|------|---------|------------|--------------|
| `get_perspectives` | Multi-model synthesis, optional auto memory injection | `prompt`, `models`, `project_memory`, `user_token` | `/api/mcp` endpoint (hosted) → Supabase logs → CLI/API providers |
| `polydev.force_cli_detection` | Force re-scan of CLI tools | optional `provider`, `user_id` | Local CLI env, Supabase `cli_status_logs` |
| `polydev.get_cli_status` | Retrieve cached status (available/authenticated/version/path) | `provider` | `CLIManager` cache |
| `polydev.send_cli_prompt` | Send prompt to CLI tool with timeout/stream handling | `provider`, `prompt`, `mode` (`stdin`/`args`) | CLI binary execution |
| `polydev.detect_memory_sources` | List available CLI memory files | `cli_tools`, `project_path` | Local filesystem |
| `polydev.extract_memory` | Encrypt & sync memory to Supabase | `cli_tools`, `project_path`, `max_files`, etc. | Supabase `mcp_project_memories`, `mcp_conversation_memory`, etc. |
| `polydev.get_recent_conversations` | Fetch latest conversational snippets | `cli_tools`, `limit` | Supabase memory tables |
| `polydev.get_memory_context` | Retrieve relevant memory entries for a prompt | `prompt`, `cli_tools`, `max_entries` | Supabase memory tables (with optional decryption) |
| `polydev.manage_memory_preferences` | Read/update zero-knowledge memory toggles | `action`, `settings` | `user_memory_preferences` |

Agents should respect Polydev’s preference hierarchy: attempt CLI prompts first; if `polydev.send_cli_prompt` fails due to availability/auth, escalate to `get_perspectives` (which will use API keys or credits automatically).

---

## 5. Supabase Schema Overview
Below is a condensed summary tailored for agent implementations; full detail resides in `POLYDEV_AI_COMPREHENSIVE_DOCUMENTATION.md §13` and Part 3 notes above.

### 5.1 Identity & Preferences
- `profiles`: user metadata (subscription tier, quotas, notification flags, company). Trigger `handle_new_user` syncs on signup.
- `user_preferences`: default provider/model, usage preference (CLI/API/credits/auto), enhanced model preferences, MCP-specific JSON.
- `user_memory_preferences`: zero-knowledge controls (enable, privacy mode, CLI enablement map, thresholds).
- `cli_provider_configurations` & `cli_status_logs`: CLI detection state, versions, auth status, last seen timestamps.

### 5.2 Authentication Tokens
- `mcp_registered_clients`, `mcp_auth_codes`, `mcp_access_tokens`: OAuth2 + PKCE flows for MCP clients.
- `mcp_user_tokens`: user-generated tokens for hosted MCP usage.
- `mcp_tokens`: secure tokens for CLI status reporting (added in 2025 migration).

### 5.3 Memory Tables (Zero-Knowledge)
- `mcp_project_memories`, `mcp_conversation_memory`: encrypted content tied to project identifier, CLI tool, memory type, relevance scores.
- `user_cli_memory_sources`: hashed metadata about extracted files for dedup.
- `user_memory_audit_log`: audit entries for extract/access/inject/delete events.

### 5.4 Usage & Logging
- `chat_sessions`, `chat_messages`, `chat_logs`: Web chat history and aggregates.
- `mcp_request_logs`, `mcp_usage_logs`, `usage_sessions`: Per-request metrics, model/provider breakdowns, token/cost data (with encrypted prompt/response fields).
- `model_usage`: Cost ledger linked to OpenRouter usage.

### 5.5 Provider Catalog
- `providers_registry`, `models_registry`, `model_mappings`, `model_pricing`, `models_dev_sync_log`: Derived from models.dev sync.

### 5.6 Billing & Credits
- `user_api_keys`, `openrouter_user_keys`, `openrouter_keys`: BYO credentials (client-side encrypted).
- `user_subscriptions`, `user_message_usage`, `user_credits`, `user_budgets`: Subscription tiers, quotas, balances, spending limits.
- `credit_purchases`, `purchase_history`, `stripe_webhook_events`, `stripe_customers`: Stripe billing integration.
- `user_referrals`, `referral_codes`: Incentive tracking.

For data and configuration changes, prefer the dashboard or public APIs; internal database tooling is not required for agents.

---

## 6. Runtime Infrastructure
- **CLIManager (`lib/cliManager.ts`)**: Defines CLI provider descriptors, detection logic, cached status, prompt dispatch with timeouts, Supabase status updates.
- **UniversalMemoryExtractor (`src/lib/universalMemoryExtractor.ts`)**: Pattern-matches CLI memory files, encrypts content using `ZeroKnowledgeEncryption`, syncs to Supabase, exposes retrieval helpers.
- **ModelsDevService (`src/lib/models-dev-integration.ts`)**: Fetches `https://models.dev/api/v1/models`, transforms data, and upserts provider/model/mapping tables; includes pricing fallback and sync logging.
- **Subscription/Credit Managers**: `subscriptionManager`, `referralSystem`, `stripeManager` orchestrate Stripe billing, quota enforcement, referral bonuses.
- **API Endpoints**: `/api/perspectives`, `/api/chat`, `/api/cli-command`, `/api/cli-detect`, `/api/mcp/auth`, `/api/credits/budget`, `/api/usage/**`, `/api/models-dev/**`, `/api/webhooks/stripe`, etc.

---

## 7. Security and Compliance
- **Zero-Knowledge Memory**: Client-side AES-256-GCM encryption; Supabase stores only ciphertext + hashed metadata. `privacy_mode` optionally disables returning plaintext even to the user.
- **Authentication**: Supabase Auth for users; MCP supports OAuth 2.0 with PKCE and static tokens. CLI MCP server expects bearer tokens on every request.
- **Access Controls**: RLS on most tables ensures per-user data isolation. Service-role key limited to backend operations; code paths guard against misuse.
- **Audit & Monitoring**: `user_memory_audit_log`, `cli_status_logs`, `mcp_request_logs` provide traceability. BetterStack + PostHog monitor health/usage.
- **Fallback Strategy**: CLI → API keys → credits ensures cost containment and resilience. Circuit breaker pattern prevents provider thrashing; partial responses returned if some models fail.

---

## 8. Extending Polydev Agents
- **New MCP Tools**: Update `mcp/manifest.json`, implement handler in `mcp/server.js`, log outputs, consider Supabase persistence via MCP tool call (not direct SQL).
- **Additional Providers**: Extend `CLIManager` or add API handlers (`src/lib/llm/handlers`). Ensure models.dev mapping exists or add manual pricing data.
- **Custom Agents**: Use MCP JSON-RPC (`initialize`, `tools/list`, `tools/call`). Respect tool schemas, supply `user_token`, and handle formatted Markdown results.
- **Automation**: Scripts in `/scripts` (e.g., `sync-claude-to-supabase.js`) demonstrate batch operations; prefer API-backed jobs for external integrations.

---

## 9. Operational Playbooks
1. **Check CLI Availability**  
   - Call `polydev.force_cli_detection` → inspect returned Markdown for availability/auth hints → status also appears in the dashboard.
2. **Investigate Memory Sync**  
   - Use `polydev.detect_memory_sources` and `polydev.extract_memory`. Memory state is visible in the dashboard.
3. **Monitor Usage & Billing**  
   - Dashboards aggregate usage and cost; for deeper introspection, export via usage APIs.
4. **Troubleshoot MCP Auth**  
   - If OAuth flows misbehave, verify registered clients and redirect URIs in the dashboard.
5. **Update Models Catalog**  
   - Trigger models.dev sync (script or scheduled job) → confirm in the dashboard’s models section.

---

## 10. Quick Reference
- **Primary Repo**: `https://github.com/backspacevenkat/polydev-ai`
- **Key Directories**: `mcp/`, `src/app/api/`, `src/lib/`, `supabase/migrations/`, `docs/`
- **Hosted MCP Endpoint**: `https://www.polydev.ai/api/mcp`
- **Supabase Project Ref**: `oxhutuxkthdxvciytwmb`
- **Models.dev Source**: `https://models.dev/api/v1/models`
- **Support Channels**: Dashboard support (`https://polydev.ai/support`), Discord (`https://discord.gg/polydev`)

---

## 11. Change Log
- **March 2025**: Added `cli_status_logs`, `mcp_tokens` tables; expanded CLI metadata columns.
- **September 2024**: Migrated documentation to `POLYDEV_AI_COMPREHENSIVE_DOCUMENTATION.md v1.2.2` (basis for this guide). Added universal memory extractor and MCP OAuth PKCE support.

---

## 12. Final Notes
- Always prefer MCP tool calls for database interactions; avoid running SQL files manually.  
- Keep bearer tokens secure; never log plaintext MCP tokens or API keys.  
- When building new agents, follow the CLI → API → credits fallback pattern to minimize cost and friction for users.  
- Polydev’s strength comes from combining multi-model reasoning with zero-knowledge memory—leverage both in your agent designs.
