# Security & Privacy

Polydev is built to keep your data under your control while giving you fast, accurate answers.

## Principles
- Least data: only the minimum context is attached to a request.
- Client-side encryption: project memory content is encrypted before upload.
- Clear routing: every run shows who answered (CLI, your key, or credits) and estimated cost.
- No vendor lock-in: use your CLI subscriptions or your own API keys.

## Authentication
- API keys: bearer tokens for REST and WebSocket APIs.
- MCP tokens: user tokens for editor clients; rotate from the dashboard.
- OAuth for dashboards only; not required for CLI usage.

## Project memory
- Content encrypted client-side; server stores ciphertext only.
- Hashed metadata (path hash, size, timestamp) supports analytics without revealing content.
- Opt-in folders with include/exclude patterns; disable or clear at any time.

## Data retention
- You decide what to keep: disable request storage or use privacy mode.
- Usage and cost records never include plaintext prompts.
- Webhook deliveries use signed headers and retries with backoff.

## Workspace safety
- Per-user preferences (routing order, budgets, allowed providers).
- Budgets and alerts for credits; export usage for audits.
- RLS-style isolation on the backend; service jobs never expose user secrets.

## Recommended setup
- Prefer local CLIs for sensitive repos.
- Limit memory to Smart mode unless doing deep reviews.
- Turn on streaming to avoid large responses piling up.
- Rotate tokens regularly; use separate tokens for CI.
