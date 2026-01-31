# /polydev-login - Browser-Based Authentication

Authenticate with Polydev by opening a browser window. This uses OAuth Device Authorization (RFC 8628) for secure CLI authentication.

## Instructions

When the user runs `/polydev-login`, do the following:

1. **Call the login MCP tool**:
   ```
   mcp__mcp-execution__polydev_login({
     open_browser: true,
     timeout_seconds: 300
   })
   ```

2. **The tool will**:
   - Generate a device code and user code
   - Open the browser to `https://polydev.ai/auth/device?code=XXXX-XXXX`
   - Poll until the user completes authentication
   - Return the token and account details

3. **After successful authentication**, display:
   - Confirmation of successful login
   - User's email
   - Credits remaining
   - Instructions for next steps

## Example Response

**User**: `/polydev-login`

**Claude calls**:
```
mcp__mcp-execution__polydev_login({ open_browser: true })
```

**On success, Claude displays**:
> ✅ **Successfully connected to Polydev!**
>
> - **Account**: user@example.com
> - **Credits**: 500 remaining
> - **Token**: Automatically configured
>
> You can now use `/polydev` to get multi-model AI perspectives.

## Troubleshooting

If login fails:
- Ensure you have a browser available
- Check your internet connection
- Visit [polydev.ai/dashboard](https://polydev.ai/dashboard) to login manually
- Copy your token and set `POLYDEV_USER_TOKEN` environment variable
