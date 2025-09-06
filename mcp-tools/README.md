# Polydev MCP CLI Status Reporter

This MCP (Model Context Protocol) tool enables automatic reporting of CLI tool status from your local environment to the Polydev web application.

## 🎯 **What It Does**

- **Automatically detects** Claude Code, Codex CLI, and Gemini CLI installations
- **Checks authentication status** for each CLI tool
- **Reports status in real-time** to your Polydev account
- **Updates your web dashboard** without manual intervention

## 🚀 **Quick Setup**

### Step 1: Get Your MCP Token
1. Go to [Polydev Settings > API Keys](https://polydev.com/settings/api-keys)
2. Expand the "CLI Providers" section  
3. Click "Setup MCP" 
4. Generate your MCP authentication token
5. Copy the environment variables

### Step 2: Configure Environment
Add these to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
export POLYDEV_MCP_TOKEN="mcp_your_token_here"
export POLYDEV_USER_ID="your_user_id" 
export POLYDEV_API_URL="https://polydev.com/api/cli-status-update"
```

Then reload your shell:
```bash
source ~/.zshrc  # or ~/.bashrc
```

### Step 3: Add MCP Server
Add to your MCP client configuration (Claude Code, Cursor, etc.):

#### For Claude Code:
```json
{
  "mcpServers": {
    "polydev-cli-reporter": {
      "command": "node",
      "args": ["path/to/cli-status-reporter.js"],
      "env": {
        "POLYDEV_MCP_TOKEN": "${POLYDEV_MCP_TOKEN}",
        "POLYDEV_USER_ID": "${POLYDEV_USER_ID}",
        "POLYDEV_API_URL": "${POLYDEV_API_URL}"
      }
    }
  }
}
```

#### For Cursor:
```json
{
  "mcp": {
    "servers": {
      "polydev-cli-reporter": {
        "command": "node",
        "args": ["path/to/cli-status-reporter.js"]
      }
    }
  }
}
```

## 🛠️ **Manual Testing**

Test the MCP tool manually:

```bash
# Check all CLI tools
node cli-status-reporter.js

# Or use MCP tool directly
report_cli_status({ provider: "all" })
```

## 📊 **What Gets Reported**

For each CLI tool, the system reports:

- **Installation status**: Installed/Not installed
- **Authentication status**: Authenticated/Needs login
- **CLI version**: Version information
- **Last used**: Timestamp of status check
- **Error details**: Any issues encountered

## 🔧 **Available MCP Tools**

### `report_cli_status`
Check and report status for specific CLI tools.

```javascript
// Check specific tool
report_cli_status({ provider: "claude_code" })

// Check all tools  
report_cli_status({ provider: "all" })
```

### `setup_cli_monitoring`
Configure automatic monitoring intervals.

```javascript
// Check every 15 minutes
setup_cli_monitoring({ 
  interval_minutes: 15,
  enabled: true 
})
```

## 🔍 **Troubleshooting**

### Token Issues
- **Invalid token**: Regenerate token in Polydev settings
- **Expired token**: Tokens expire after 1 year, regenerate as needed

### CLI Not Detected
- **PATH issues**: Ensure CLI tools are in your system PATH
- **Custom paths**: Update CLI configurations in Polydev settings

### Connection Issues  
- **Network**: Check internet connection to polydev.com
- **Firewall**: Ensure outbound HTTPS (port 443) is allowed
- **API changes**: Check for Polydev API updates

### Status Not Updating
1. Check environment variables are set correctly
2. Verify MCP server is running in your client
3. Check MCP tool logs for errors
4. Test manual status reporting

## 📋 **Status Meanings**

| Status | Description |
|--------|-------------|
| `available` | ✅ CLI installed and authenticated |
| `unavailable` | ⚠️ CLI installed but not authenticated |
| `not_installed` | ❌ CLI not found in system PATH |
| `checking` | 🔄 Status check in progress |

## 🔄 **Real-time Updates**

The system provides real-time status updates through:

- **Automatic checks**: Every 15 minutes by default
- **Event-triggered**: When CLI tools are used
- **Manual refresh**: Via web interface
- **MCP tool calls**: Immediate status reports

## 🔐 **Security**

- **Token-based authentication**: Secure MCP token system  
- **User-scoped**: Only your account can receive your status updates
- **No sensitive data**: Only status information is transmitted
- **Encrypted transport**: All communication over HTTPS

## 📈 **Monitoring**

View detailed CLI status history in Polydev:
- Status change logs
- Authentication events  
- Error diagnostics
- Usage patterns

## 🤝 **Support**

Need help? 
- Check troubleshooting section above
- Review MCP tool logs
- Contact Polydev support with your token ID (not the token itself)