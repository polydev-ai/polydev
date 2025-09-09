# Cursor CLI Provider

AI-first code editor with built-in chat and MCP integration for enhanced coding workflows.

## Overview

Cursor is a revolutionary AI-first code editor built on VS Code, designed from the ground up for AI-enhanced development. With native MCP support, Cursor integrates seamlessly with Polydev to provide multi-model AI assistance directly in your editor.

### Key Benefits

- **AI-First Design**: Built specifically for AI-enhanced coding workflows
- **Native Chat Interface**: Built-in AI chat with full editor context
- **Multi-File Context**: Understands relationships across your entire codebase
- **Real-Time Suggestions**: Contextual AI completions and edits
- **MCP Integration**: First-class support for Model Context Protocol

## Requirements

### Prerequisites
- **Cursor Editor** - Download from cursor.com
- **Node.js 18+** for MCP server functionality
- **Modern Development Environment** (macOS, Windows, or Linux)

### System Requirements
- Minimum 8GB RAM (16GB+ recommended)
- 4GB+ available disk space
- Internet connection for AI model access
- Multi-core processor for optimal performance

## Installation

### Step 1: Install Cursor

#### macOS
```bash
# Download from website
open https://cursor.com

# Or via Homebrew
brew install --cask cursor

# Verify installation
cursor --version
```

#### Windows
```bash
# Download installer from cursor.com
# Or via Winget
winget install cursor

# Verify installation
cursor --version
```

#### Linux
```bash
# Download AppImage from cursor.com
wget https://download.cursor.sh/linux/appImage/x64
chmod +x cursor-*.AppImage

# Or via package manager (Ubuntu/Debian)
sudo apt update && sudo apt install cursor
```

### Step 2: Initial Setup

1. Launch Cursor
2. Sign in with your Cursor account
3. Complete the welcome setup
4. Install recommended extensions if prompted

## Polydev MCP Configuration

### Step 1: Access MCP Settings

1. Open Cursor Settings (`Cmd/Ctrl + ,`)
2. Navigate to **Extensions → MCP Servers**
3. Click **"Add MCP Server"**

### Step 2: Configure Polydev MCP Server

Add the following configuration:

```json
{
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

### Step 3: Get Your MCP Token

1. Visit [Polydev Dashboard](https://www.polydev.ai/dashboard/mcp-tokens)
2. Click **"Generate New Token"**
3. Copy the generated token
4. Replace `pd_your_token_here` in your configuration
5. Save and restart Cursor

## Using Polydev in Cursor

### Built-in Chat Interface

Cursor's native chat (`Cmd/Ctrl + L`) now supports Polydev tools:

```
Use get_perspectives tool to analyze this React component:

const UserProfile = ({ userId }) => {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]);
  
  return <div>{user?.name}</div>;
};

What potential issues do you see, and how can I improve it?
```

### Inline AI Assistance

Use `Cmd/Ctrl + K` for inline AI suggestions with Polydev context:

1. Select code you want to modify
2. Press `Cmd/Ctrl + K`
3. Type your request: "Get multiple perspectives on optimizing this function"
4. Cursor will use Polydev to provide diverse AI insights

### Multi-Model Code Review

```
@polydev Review this authentication implementation for security best practices:

export async function authenticate(req, res) {
  const { username, password } = req.body;
  
  // Current implementation
  const user = await User.findOne({ username });
  if (user && user.password === password) {
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
}
```

## Advanced Configuration

### Custom Model Preferences

Configure Cursor to prefer specific models for different tasks:

```json
{
  "cursor": {
    "ai": {
      "models": {
        "chat": "polydev-multi",
        "autocomplete": "polydev-fast",
        "codeReview": "polydev-comprehensive"
      }
    }
  }
}
```

### Workspace-Specific Settings

Create `.cursor/settings.json` in your project:

```json
{
  "polydev": {
    "enabled": true,
    "features": {
      "multiModelPerspectives": true,
      "contextAwareSupport": true,
      "projectMemoryIntegration": true
    },
    "preferences": {
      "defaultModels": ["claude-3-5-sonnet", "gpt-4", "gemini-pro"],
      "maxTokensPerRequest": 4000,
      "temperature": 0.7
    }
  }
}
```

## Features and Workflows

### AI-Enhanced Debugging

When encountering errors, use Cursor's debugging features with Polydev:

1. **Error Analysis**
   ```
   I'm getting this error. Get perspectives from multiple AI models:
   
   TypeError: Cannot read property 'map' of undefined
   at Component.render (App.js:23:15)
   ```

2. **Stack Trace Investigation**
   ```
   @polydev Analyze this stack trace and suggest potential fixes:
   [Paste full stack trace]
   ```

### Refactoring Assistance

```
@polydev I need to refactor this class component to functional component with hooks. 
Show me multiple approaches:

class UserList extends React.Component {
  constructor(props) {
    super(props);
    this.state = { users: [], loading: true };
  }
  
  componentDidMount() {
    this.fetchUsers();
  }
  
  // ... rest of component
}
```

### Architecture Planning

```
@polydev I'm building a real-time chat application. 
What are the pros and cons of different architectural approaches:

1. WebSockets vs Server-Sent Events
2. REST API vs GraphQL
3. Redis vs PostgreSQL for message storage
4. Microservices vs Monolith

Consider scalability, complexity, and development time.
```

## Cursor-Specific Features

### Composer Integration

Cursor's Composer feature works seamlessly with Polydev:

1. Open Composer (`Cmd/Ctrl + I`)
2. Describe your feature: "Build a user authentication system"
3. Polydev provides multiple implementation approaches
4. Composer generates code based on the selected approach

### Multi-File Editing

```
@polydev I need to implement user authentication across these files:
- /src/components/LoginForm.jsx
- /src/hooks/useAuth.js  
- /src/utils/api.js
- /src/context/AuthContext.js

Show me a coordinated implementation plan.
```

### Smart Imports

Cursor automatically suggests imports with Polydev context:

```typescript
// Type @polydev and get intelligent import suggestions
// based on your project structure and commonly used patterns
import { useCallback, useMemo } from 'react';
import { debounce } from 'lodash';
```

## Performance Optimization

### Editor Performance

```json
{
  "cursor": {
    "performance": {
      "aiRequestCaching": true,
      "contextualIndexing": true,
      "maxConcurrentRequests": 3,
      "responseTimeout": 30000
    }
  }
}
```

### Project-Specific Optimization

```json
{
  "cursor": {
    "workspace": {
      "indexing": {
        "excludePatterns": [
          "**/node_modules/**",
          "**/dist/**",
          "**/.git/**",
          "**/coverage/**"
        ],
        "maxFileSize": "1MB",
        "enableSmartIndexing": true
      }
    }
  }
}
```

## Team Collaboration

### Shared Configuration

Create team-wide Cursor settings:

```json
{
  "cursor": {
    "team": {
      "sharedMCPServers": {
        "polydev": {
          "enabled": true,
          "requiresAuth": true,
          "allowedProjects": ["frontend", "backend", "mobile"]
        }
      },
      "codeReviewWorkflow": {
        "enabled": true,
        "requireMultiModelReview": true,
        "autoRunOnCommit": false
      }
    }
  }
}
```

### Code Standards Enforcement

```json
{
  "cursor": {
    "codeStandards": {
      "enforceWithPolydev": true,
      "rules": {
        "requireTypeScript": true,
        "maxFunctionLength": 50,
        "requireDocumentation": true
      }
    }
  }
}
```

## Troubleshooting

### Common Issues

**MCP Connection Problems:**
1. Verify token is valid and not expired
2. Check internet connection
3. Restart Cursor completely
4. Clear Cursor cache: `Cmd/Ctrl + Shift + P` → "Developer: Clear Cache"

**Performance Issues:**
```json
{
  "cursor": {
    "troubleshooting": {
      "enableDiagnostics": true,
      "logLevel": "debug",
      "performanceMonitoring": true
    }
  }
}
```

**Token Authentication Errors:**
```bash
# Test token validity
curl -H "Authorization: Bearer pd_your_token" \
     https://www.polydev.ai/api/mcp/status

# Expected response: {"status": "authenticated", "user": {...}}
```

### Debug Mode

Enable detailed logging:

1. Open Command Palette (`Cmd/Ctrl + Shift + P`)
2. Type "Developer Tools"
3. Open Console tab
4. Enable "Preserve log"
5. Monitor MCP-related messages

### Performance Monitoring

```json
{
  "cursor": {
    "monitoring": {
      "trackResponseTimes": true,
      "logSlowRequests": true,
      "enableUsageAnalytics": false,
      "performanceThresholds": {
        "maxResponseTime": 5000,
        "maxMemoryUsage": "2GB"
      }
    }
  }
}
```

## Best Practices

### Effective AI Interaction

**Context-Rich Requests:**
```
@polydev In this Next.js 14 project using TypeScript and Tailwind CSS, 
I need to implement a responsive dashboard component. 
Consider these requirements:
- Mobile-first design
- Dark mode support  
- Accessibility compliance
- Performance optimization
```

**Iterative Development:**
```
@polydev Start with a basic implementation:
1. First, show a simple version
2. Then, add error handling
3. Finally, add performance optimizations

Let's go step by step.
```

### Code Organization

```
@polydev Organize this codebase structure:

src/
├── components/
├── hooks/
├── utils/
├── types/
└── pages/

What's the best way to organize a React TypeScript project of this size?
```

### Git Integration

```
@polydev Review my git diff before committing:

git diff --staged

Are there any issues or improvements you'd suggest?
```

## Migration Guide

### From VS Code

1. **Import Settings**: Cursor automatically imports VS Code settings
2. **Extension Compatibility**: Most VS Code extensions work in Cursor
3. **Keyboard Shortcuts**: Use familiar VS Code shortcuts
4. **File Association**: Set Cursor as default editor

### From Other AI Tools

**From GitHub Copilot:**
```json
{
  "migration": {
    "preserveCompletionPreferences": true,
    "importCustomPrompts": true,
    "keyboardShortcuts": {
      "useStandardShortcuts": true
    }
  }
}
```

## Enterprise Features

### Security Configuration

```json
{
  "cursor": {
    "enterprise": {
      "security": {
        "allowedMCPServers": ["polydev"],
        "requireSSO": true,
        "auditLogging": true,
        "dataRetentionPolicy": "30days"
      }
    }
  }
}
```

### Compliance

```json
{
  "cursor": {
    "compliance": {
      "enableAuditTrail": true,
      "requireCodeReview": true,
      "restrictedFeatures": [],
      "approvedMCPProviders": ["polydev"]
    }
  }
}
```

## Advanced Integrations

### CI/CD Integration

```yaml
# .github/workflows/cursor-ai-review.yml
name: AI Code Review
on: [pull_request]

jobs:
  ai-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: AI Code Review
        uses: cursor-ai/review-action@v1
        with:
          mcp_server: "polydev"
          token: ${{ secrets.POLYDEV_TOKEN }}
```

### Docker Development

```dockerfile
# Dockerfile.cursor-dev
FROM node:18-alpine
RUN apk add --no-cache curl git
COPY . /workspace
WORKDIR /workspace
RUN npm install
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

## Next Steps

After configuring Cursor with Polydev:

1. **[Explore Advanced MCP Features](../../mcp/overview.md)** - Learn about advanced capabilities
2. **[Configure Additional Providers](../index.md)** - Add more AI providers  
3. **[Team Setup Guide](../../config/preferences.md)** - Configure team-wide settings
4. **[Performance Optimization](../../config/troubleshooting.md)** - Optimize your setup

---

**Need help with Cursor integration?** Check the [Cursor documentation](https://docs.cursor.com) or join our [Discord](https://discord.gg/polydev).