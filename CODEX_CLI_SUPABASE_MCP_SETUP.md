# Setting Up Supabase MCP for Codex CLI

## The Problem

Codex CLI is getting this error when trying to use Supabase MCP:
```
the MCP runtime doesn't expose globalThis.crypto, so every execute_sql call fails before the query runs
```

## The Solution

Codex CLI needs to be configured with the same Supabase MCP server that Claude Code is using. The configuration needs to be added to Codex CLI's MCP config file.

## Configuration Location

Codex CLI likely uses one of these config file locations:
- `~/.codex/mcp-config.json`
- `~/.config/codex/mcp-config.json`
- Or whatever location Codex CLI reads from (check Codex CLI docs)

## Configuration to Add

Add this Supabase MCP server configuration to Codex CLI's MCP config:

```json
{
  "mcpServers": {
    "supabase": {
      "autoApprove": [
        "list_organizations",
        "get_organization",
        "list_projects",
        "execute_sql",
        "apply_migration",
        "get_project",
        "list_tables",
        "get_cost",
        "confirm_cost",
        "create_project",
        "pause_project",
        "restore_project",
        "list_extensions",
        "list_migrations",
        "list_edge_functions",
        "deploy_edge_function",
        "get_logs",
        "get_project_url",
        "get_anon_key",
        "generate_typescript_types",
        "create_branch",
        "list_branches",
        "delete_branch",
        "merge_branch",
        "reset_branch",
        "rebase_branch"
      ],
      "disabled": false,
      "timeout": 60,
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "sbp_d42a4490d496711ebefa6580fdc04f94809b8b5b",
        "--project-ref",
        "oxhutuxkthdxvciytwmb"
      ],
      "env": {
        "SUPABASE_URL": "https://oxhutuxkthdxvciytwmb.supabase.co",
        "SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94aHV0dXhrdGhkeHZjaXl0d21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyNzMzMzcsImV4cCI6MjA3MTg0OTMzN30.EsiSRt0diyWACYNKldKPl8oOQ4JxV6y0CJF9CseQSPc",
        "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94aHV0dXhrdGhkeHZjaXl0d21iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjI3MzMzNywiZXhwIjoyMDcxODQ5MzM3fQ.AX97KtQDwBvJe017gzqUkJd1zuIHU07nMaAOJB4CR6c"
      },
      "transportType": "stdio"
    }
  }
}
```

## Key Configuration Details

- **Package:** `@supabase/mcp-server-supabase@latest`
- **Access Token:** `sbp_d42a4490d496711ebefa6580fdc04f94809b8b5b`
- **Project Ref:** `oxhutuxkthdxvciytwmb`
- **Transport:** `stdio` (standard input/output communication)

## Why This Should Work

1. **Same package version** - Using `@latest` ensures both editors use the same MCP server implementation
2. **Same credentials** - Both will have identical database access
3. **Stdio transport** - This is the standard way Node.js MCP servers communicate

## About the `globalThis.crypto` Error

This error typically occurs when:
1. The MCP server process doesn't have access to Node.js crypto APIs
2. The runtime environment is missing Web Crypto API polyfills

However, since the Supabase MCP server runs as a **separate Node.js process** via `npx`, it should have access to Node.js's built-in `crypto` module. The issue might be:

- **Outdated Node.js version** - Make sure Codex CLI is using Node.js 18+ (which has Web Crypto API)
- **MCP server version issue** - Using `@latest` should fix this
- **Environment isolation** - The MCP server runs in its own process, so it shouldn't inherit runtime limitations

## Testing the Setup

After adding the configuration, test it in Codex CLI:

```typescript
// Test 1: List tables
mcp__supabase__list_tables({ schemas: ["public"] })

// Test 2: Simple query
mcp__supabase__execute_sql({
  query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' LIMIT 5"
})

// Test 3: Check users table
mcp__supabase__execute_sql({
  query: "SELECT user_id, email, status FROM users LIMIT 3"
})
```

## Alternative: Use Supabase CLI Instead

If MCP still doesn't work, Codex CLI can use the Supabase CLI directly:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref oxhutuxkthdxvciytwmb

# Run queries
supabase db query "SELECT * FROM users LIMIT 5"
```

## Troubleshooting

### If still getting crypto errors:

1. **Check Node.js version:**
   ```bash
   node --version  # Should be 18+
   ```

2. **Test MCP server manually:**
   ```bash
   npx -y @supabase/mcp-server-supabase@latest \
     --access-token sbp_d42a4490d496711ebefa6580fdc04f94809b8b5b \
     --project-ref oxhutuxkthdxvciytwmb
   ```

3. **Check Codex CLI logs** for more details about the error

4. **Update Codex CLI** to the latest version

### If MCP connection fails:

1. Check that `npx` is in PATH
2. Verify network connectivity to npm registry
3. Check firewall/proxy settings
4. Try increasing timeout to 120 seconds

## Security Note

The credentials in this configuration are already shared in the codebase at `/Users/venkat/Documents/cline/fixed-mcp-config.json`. These are:
- Supabase access token (starts with `sbp_`)
- Project reference ID
- Anon key (public, safe to share)
- Service role key (sensitive, has admin access)

Keep this configuration file secure and don't commit it to public repositories.

## Next Steps

1. Find Codex CLI's MCP configuration file location
2. Add the Supabase MCP server configuration
3. Restart Codex CLI
4. Test with simple queries
5. Report back if issues persist

---

**Reference Config Source:** `/Users/venkat/Documents/cline/fixed-mcp-config.json` (lines 81-131)
