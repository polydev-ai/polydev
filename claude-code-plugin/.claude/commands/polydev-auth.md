# /polydev-auth - Check Authentication Status

Check your current Polydev authentication status and account information.

## Instructions

When the user runs `/polydev-auth`, do the following:

1. **Call the auth MCP tool**:
   ```
   mcp__mcp-execution__polydev_auth()
   ```

2. **Display the results** showing:
   - Authentication status (authenticated or not)
   - Account email (if authenticated)
   - Credits remaining
   - Subscription tier
   - Enabled models

## Example Response

**User**: `/polydev-auth`

**Claude calls**:
```
mcp__mcp-execution__polydev_auth()
```

**If authenticated, Claude displays**:
> **Polydev Account Status**
>
> | Field | Value |
> |-------|-------|
> | **Status** | ✅ Authenticated |
> | **Email** | user@example.com |
> | **Tier** | Free |
> | **Credits** | 485 / 500 |
> | **Models** | GPT-5 Mini, Gemini 3 Flash, Grok 4.1, GLM-4.7 |

**If not authenticated, Claude displays**:
> **Polydev Account Status**
>
> ❌ Not authenticated
>
> Run `/polydev-login` to connect your account, or visit [polydev.ai/dashboard](https://polydev.ai/dashboard) to get your token.
