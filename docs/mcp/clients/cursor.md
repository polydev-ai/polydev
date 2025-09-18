# Cursor

Use the hosted MCP endpoint with a user token or run the local bridge and point Cursor at it.

- Generate a token in the dashboard
- Set Authorization: Bearer poly_...
- Call JSON-RPC tools/call with get_perspectives

## Gotchas
- Cursor updates config on restart; fully quit/reopen if changes don't apply.
- Large outputs can be truncated in the panel; prefer streaming and copy logs.
