# Analytics & Monitoring

Understand usage, cost, and performance across providers and models.

## Dashboards
- Requests over time, tokens, and spend
- Routing breakdown (CLI vs API keys vs credits)
- Latency per model and provider; error rates

## Usage exports
```bash
# Export last 7 days as CSV (example endpoint)
curl -H "Authorization: Bearer poly_your_api_key"   "https://api.polydev.ai/v1/usage/export?since=7d" -o usage.csv
```

## Cost visibility
Every run displays:
- Path used (CLI, API key, credits)
- Model and provider
- Estimated cost and token counts

## Alerts (optional)
- Daily and weekly spend thresholds
- Credit balance low notifications
- Provider health events (fallbacks)

## Best practices
- Keep CLIs as first hop to reduce spend
- Set per-key budgets and allowed providers
- Track latency/quality to refine defaults over time
