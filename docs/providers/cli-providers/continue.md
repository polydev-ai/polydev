# Continue.dev CLI Provider

Open-source AI code assistant with extensive MCP support for VS Code and JetBrains IDEs.

## Overview

Continue.dev is a powerful, open-source AI code assistant that brings advanced AI capabilities directly into your development environment. When integrated with Polydev's MCP server, it provides intelligent routing to multiple AI models for comprehensive coding assistance.

### Key Benefits

- **Deep Codebase Understanding**: Analyzes entire projects for context-aware suggestions
- **Real-time Code Suggestions**: AI-powered completions and refactoring
- **Multi-IDE Support**: Works with VS Code and all JetBrains IDEs
- **Custom Slash Commands**: Extensible command system
- **MCP Integration**: Native support for Model Context Protocol

## Requirements

### Prerequisites
- **VS Code** or **JetBrains IDE** (IntelliJ, PyCharm, WebStorm, etc.)
- **Node.js 18+** for MCP server
- **Continue Extension** installed in your IDE

### System Requirements
- Minimum 8GB RAM (16GB recommended for large projects)
- Internet connection for AI model access
- Modern multi-core processor

## Installation

### Step 1: Install Continue Extension

#### VS Code
```bash
# Install via VS Code Marketplace
code --install-extension continue.continue

# Or install via command palette:
# Ctrl+Shift+P → "Extensions: Install Extensions" → Search "Continue"
```

#### JetBrains IDEs
1. Open IDE Settings (Ctrl+Alt+S / Cmd+,)
2. Go to **Plugins**
3. Search for **"Continue"**
4. Click **Install**
5. Restart your IDE

### Step 2: Initial Configuration

Continue will create a configuration file at:
- **VS Code**: `.continue/config.json` in your project root
- **JetBrains**: `~/.continue/config.json`

## Polydev MCP Integration

### Step 1: Enable MCP Support

Edit your Continue configuration file:

```json
{
  "experimental": {
    "modelContextProtocol": true
  },
  "mcpServers": {
    "polydev": {
      "remote": {
        "transport": {
          "type": "http",
          "url": "https://www.polydev.ai/api/mcp"
        },
        "auth": {
          "type": "bearer",
          "token": "pd_your_token_here"
        }
      }
    }
  }
}
```

### Step 2: Get Your MCP Token

1. Visit [Polydev Dashboard](https://www.polydev.ai/dashboard/mcp-tokens)
2. Generate a new MCP token
3. Copy the token (starts with `pd_`)
4. Replace `pd_your_token_here` in your configuration

### Step 3: Configure Model Preferences

```json
{
  "models": [
    {
      "title": "Polydev Multi-Model",
      "provider": "mcp",
      "model": "polydev",
      "contextLength": 128000,
      "completionOptions": {
        "temperature": 0.7,
        "maxTokens": 2000
      }
    }
  ]
}
```

## Usage with Polydev

### Basic Multi-Model Queries

Use the `@polydev` mention in Continue chat:

```
@polydev What's the best way to optimize this React component for performance?

// Component code here...
const MyComponent = ({ data }) => {
  // Your component implementation
};
```

### Code Review with Multiple Perspectives

```
@polydev Review this authentication function for security issues:

function authenticate(username, password) {
  // Your authentication code
}
```

### Architecture Decisions

```
@polydev I'm deciding between Redux and Zustand for state management in my React app. 
What are the pros and cons of each approach?

// Include relevant code context
```

## Advanced Features

### Custom Slash Commands

Add Polydev-specific commands to your Continue configuration:

```json
{
  "slashCommands": [
    {
      "name": "polydev-review",
      "description": "Get multi-model code review",
      "params": {
        "file": "string"
      },
      "run": "Use @polydev to review {file} for best practices and potential issues"
    },
    {
      "name": "polydev-explain",
      "description": "Get detailed explanations from multiple models",
      "run": "Use @polydev to explain this code in detail with different perspectives"
    }
  ]
}
```

### Project Context Integration

Configure Continue to send relevant project context to Polydev:

```json
{
  "contextProviders": [
    {
      "name": "code",
      "params": {
        "maxChars": 100000,
        "includeTypes": [".js", ".ts", ".tsx", ".jsx", ".py", ".go", ".rs"]
      }
    },
    {
      "name": "docs",
      "params": {
        "includeTypes": [".md", ".txt", ".rst"]
      }
    }
  ]
}
```

## IDE-Specific Setup

### VS Code Configuration

Add to your VS Code `settings.json`:

```json
{
  "continue.enableTabAutocomplete": true,
  "continue.enableMCPIntegration": true,
  "continue.polydev.autoContextSelection": true,
  "continue.telemetryEnabled": false
}
```

### JetBrains Configuration

In your JetBrains IDE settings:

1. **File → Settings → Tools → Continue**
2. Enable **"MCP Integration"**
3. Set **"Default Model"** to **"Polydev Multi-Model"**
4. Configure **"Context Selection"** to **"Automatic"**

## Workflow Examples

### Daily Development Workflow

1. **Start Coding Session**
   ```
   @polydev I'm working on a new user authentication system. 
   What are the current best practices I should follow?
   ```

2. **Code Implementation**
   ```
   // Write your code with Continue's autocomplete
   // Use Ctrl+I for inline suggestions
   ```

3. **Code Review**
   ```
   @polydev Review this implementation for security and performance:
   [Select code block]
   ```

4. **Debugging**
   ```
   @polydev This function is throwing an error. Help me debug:
   [Paste error message and relevant code]
   ```

### Team Collaboration

```json
{
  "teamSettings": {
    "sharedMCPServers": {
      "polydev": {
        "enabled": true,
        "defaultForTeam": true
      }
    },
    "codeReviewIntegration": {
      "enabled": true,
      "autoRunOnPR": true
    }
  }
}
```

## Performance Optimization

### Large Project Configuration

```json
{
  "performance": {
    "indexing": {
      "maxFileSize": "1MB",
      "excludePatterns": [
        "**/node_modules/**",
        "**/dist/**",
        "**/.git/**",
        "**/build/**"
      ]
    },
    "contextWindow": {
      "maxTokens": 100000,
      "prioritizeRecentFiles": true
    }
  }
}
```

### Memory Management

```json
{
  "memoryManagement": {
    "cacheSize": "500MB",
    "clearCacheOnRestart": true,
    "limitContextHistory": 50
  }
}
```

## Troubleshooting

### Common Issues

**MCP Server Not Connecting:**
```bash
# Check MCP server status
curl -X POST https://www.polydev.ai/api/mcp/health

# Verify token is valid
curl -H "Authorization: Bearer pd_your_token" \
     https://www.polydev.ai/api/mcp/status
```

**Continue Not Responding:**
1. Check extension is enabled and updated
2. Restart your IDE
3. Verify configuration file syntax
4. Check IDE logs for errors

**Performance Issues:**
```json
{
  "performance": {
    "enableParallelProcessing": true,
    "maxConcurrentRequests": 3,
    "requestTimeout": 30000
  }
}
```

### Debug Mode

Enable detailed logging:

```json
{
  "logging": {
    "level": "debug",
    "enableMCPDebugging": true,
    "logToFile": true
  }
}
```

Check logs:
- **VS Code**: View → Output → Continue
- **JetBrains**: Help → Show Log in Finder/Explorer

## Best Practices

### Effective Prompt Strategies

**Be Context-Specific:**
```
@polydev In this React TypeScript project using Next.js 14, 
how should I implement server-side authentication with JWT tokens?
```

**Provide Relevant Code:**
```
@polydev Optimize this database query for better performance:

SELECT * FROM users 
WHERE created_at > NOW() - INTERVAL 30 DAY 
AND status = 'active'
ORDER BY last_login DESC
LIMIT 100;
```

**Ask for Multiple Approaches:**
```
@polydev Show me 3 different ways to implement caching in this Node.js API, 
with pros and cons of each approach.
```

### Code Organization

```json
{
  "workspaceConfig": {
    "enableProjectMemory": true,
    "contextAwaresuggestions": true,
    "fileGrouping": {
      "enabled": true,
      "patterns": {
        "components": "src/components/**",
        "utils": "src/utils/**",
        "hooks": "src/hooks/**"
      }
    }
  }
}
```

## Integration with Other Tools

### Git Integration

```json
{
  "gitIntegration": {
    "enabled": true,
    "features": {
      "commitMessageGeneration": true,
      "prReviewAssistance": true,
      "codeChangeAnalysis": true
    }
  }
}
```

### Testing Integration

```json
{
  "testingIntegration": {
    "frameworks": ["jest", "vitest", "cypress"],
    "autoGenerateTests": true,
    "testReviewEnabled": true
  }
}
```

## Migration from Other AI Tools

### From GitHub Copilot

```json
{
  "migration": {
    "preserveCompletionSettings": true,
    "importCustomPrompts": true,
    "keyboardShortcuts": {
      "useGitHubCopilotKeys": true
    }
  }
}
```

### From Tabnine

```json
{
  "migration": {
    "importCodeAnalysisSettings": true,
    "preserveTeamSettings": true
  }
}
```

## Enterprise Configuration

### Team-Wide Deployment

```json
{
  "enterprise": {
    "centralized": {
      "configServer": "https://your-company.com/continue-config",
      "policyEnforcement": true,
      "auditLogging": true
    },
    "security": {
      "allowedMCPServers": ["polydev"],
      "encryptLocalData": true,
      "requireSSO": true
    }
  }
}
```

## Next Steps

Once Continue.dev is configured with Polydev:

1. **[Explore Other CLI Providers](./claude-code.md)** - Add more AI providers
2. **[Configure Team Settings](../../config/preferences.md)** - Set up team-wide preferences
3. **[Advanced MCP Features](../../mcp/overview.md)** - Learn about advanced MCP capabilities
4. **[Performance Tuning](../../config/troubleshooting.md)** - Optimize your setup

---

**Need help with Continue.dev integration?** Check the [Continue documentation](https://continue.dev/docs) or join our [Discord](https://discord.gg/polydev).