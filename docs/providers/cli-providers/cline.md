# Cline (Claude in VSCode) CLI Provider

Popular VS Code extension bringing Claude directly into your editor with comprehensive MCP support.

## Overview

Cline (formerly Claude Dev) is a powerful VS Code extension that brings Claude's AI capabilities directly into your development environment. With native MCP integration, Cline provides seamless access to Polydev's multi-model perspectives for enhanced coding assistance.

### Key Benefits

- **Seamless VS Code Integration**: Native extension with full IDE access
- **File System Operations**: Direct file reading, writing, and manipulation
- **Terminal Integration**: Execute commands and see results in context
- **MCP Protocol Support**: First-class Model Context Protocol integration  
- **Multi-Model Routing**: Access multiple AI providers through Polydev

## Requirements

### Prerequisites
- **Visual Studio Code** (version 1.80 or higher)
- **Node.js 18+** for MCP server functionality
- **Claude API Access** (optional - Polydev provides alternatives)

### System Requirements  
- Minimum 4GB RAM (8GB+ recommended for large projects)
- 2GB+ available disk space
- Internet connection for AI model access
- Modern processor for optimal performance

## Installation

### Step 1: Install Cline Extension

#### Via VS Code Marketplace
1. Open VS Code
2. Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on Mac) 
3. Search for **"Cline"**
4. Click **Install** on the official Cline extension
5. Reload VS Code when prompted

#### Via Command Line
```bash
# Install using VS Code CLI
code --install-extension saoudrizwan.claude-dev

# Verify installation
code --list-extensions | grep cline
```

### Step 2: Initial Configuration

1. After installation, Cline will appear in the Activity Bar
2. Click the Cline icon to open the side panel
3. Follow the welcome setup wizard

## Polydev MCP Integration

### Step 1: Configure MCP Server

Open VS Code settings (`Ctrl/Cmd + ,`) and add:

```json
{
  "cline.mcpServers": {
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

1. Visit [Polydev MCP Dashboard](https://www.polydev.ai/dashboard/mcp-tokens)
2. Click **"Generate New MCP Token"**  
3. Copy the token (begins with `pd_`)
4. Replace `pd_your_token_here` in your settings
5. Restart VS Code

### Step 3: Verify Integration

1. Open Cline panel
2. Start a new conversation
3. Type: "Test MCP connection with get_perspectives tool"
4. Cline should confirm Polydev integration is active

## Using Polydev with Cline

### Multi-Model Perspectives

Request perspectives from multiple AI models:

```
Use get_perspectives tool to analyze this React component for performance issues:

const UserList = ({ users }) => {
  const [filteredUsers, setFilteredUsers] = useState([]);
  
  useEffect(() => {
    setFilteredUsers(users.filter(user => user.active));
  }, [users]);
  
  return (
    <div>
      {filteredUsers.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
};

What optimizations would multiple AI models suggest?
```

### Code Review and Analysis

```
Use get_perspectives tool to review this authentication function:

export async function authenticateUser(username, password) {
  const user = await User.findOne({ username });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  const isValid = await bcrypt.compare(password, user.hashedPassword);
  
  if (!isValid) {
    throw new Error('Invalid password');
  }
  
  const token = jwt.sign(
    { userId: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  return { user, token };
}

Check for security vulnerabilities and best practices.
```

### Architecture Decision Support

```
I'm deciding between different state management approaches for my React app. 
Use get_perspectives tool to get multiple AI opinions on:

1. Redux Toolkit vs Zustand vs Jotai
2. Consider app size: ~50 components, 10 API endpoints
3. Team size: 4 developers
4. Performance requirements: Real-time updates

What are the pros/cons from different AI perspectives?
```

## Advanced Configuration

### Workspace-Specific Settings

Create `.vscode/settings.json` in your project:

```json
{
  "cline.polydev": {
    "enabled": true,
    "features": {
      "multiModelPerspectives": true,
      "projectMemoryIntegration": true,
      "contextAwareAssistance": true
    },
    "preferences": {
      "defaultModels": [
        "claude-3-5-sonnet",
        "gpt-4",
        "gemini-pro"
      ],
      "maxTokensPerRequest": 4000,
      "temperature": 0.7,
      "includeProjectContext": true
    }
  }
}
```

### Custom Commands

Add custom commands to VS Code's command palette:

```json
{
  "cline.customCommands": [
    {
      "title": "Polydev: Multi-Model Code Review",
      "command": "cline.polydev.codeReview",
      "when": "editorHasSelection"
    },
    {
      "title": "Polydev: Architecture Analysis",
      "command": "cline.polydev.architectureAnalysis",
      "when": "explorerResourceIsFolder"
    },
    {
      "title": "Polydev: Performance Optimization",
      "command": "cline.polydev.performanceCheck",
      "when": "editorLangId == javascript || editorLangId == typescript"
    }
  ]
}
```

## Cline Features with Polydev

### File System Integration

Cline can analyze entire project structures with Polydev:

```
Analyze my project structure and suggest improvements:

/src
├── components/
│   ├── Header.jsx
│   ├── Sidebar.jsx
│   └── Footer.jsx
├── hooks/
│   ├── useAuth.js
│   └── useApi.js
├── utils/
│   ├── api.js
│   └── helpers.js
└── pages/
    ├── Home.jsx
    ├── Profile.jsx
    └── Settings.jsx

Use get_perspectives tool to get multiple opinions on:
1. Folder organization
2. Component architecture
3. Potential improvements
```

### Terminal Integration

Execute commands with AI assistance:

```
I need to set up a CI/CD pipeline. Use get_perspectives tool to:

1. Analyze my current project setup
2. Recommend GitHub Actions vs GitLab CI vs Jenkins
3. Provide implementation examples

Current tech stack: Node.js, React, PostgreSQL, Docker
```

### Git Integration

```
Review my recent git commits and suggest improvements:

git log --oneline -10

Use get_perspectives tool to analyze:
1. Commit message quality
2. Code changes patterns
3. Potential issues or improvements
```

## Workflow Examples

### Daily Development Workflow

1. **Morning Planning**
   ```
   Use get_perspectives tool to prioritize today's tasks:
   
   TODO:
   - Fix user authentication bug
   - Implement search functionality  
   - Optimize database queries
   - Write unit tests
   
   What order should I tackle these in?
   ```

2. **Code Implementation**
   ```
   I'm implementing a search feature. Use get_perspectives tool for:
   
   1. Best search algorithm for this data structure
   2. Frontend UX considerations
   3. Backend performance optimization
   4. Testing strategies
   ```

3. **Code Review**
   ```
   Before committing, use get_perspectives tool to review:
   
   [Select modified files in explorer]
   
   Check for:
   - Code quality issues
   - Security vulnerabilities  
   - Performance problems
   - Best practice adherence
   ```

### Debugging Workflow

```
I'm getting this error. Use get_perspectives tool for debugging help:

Error: TypeError: Cannot read property 'map' of undefined
    at SearchResults.render (SearchResults.jsx:15:23)
    at finishClassComponent (react-dom.development.js:17160:31)
    at updateClassComponent (react-dom.development.js:17110:24)

Current component code:
[Paste relevant code]

What are the possible causes and solutions?
```

### Learning and Exploration

```
I want to learn about WebAssembly in JavaScript. Use get_perspectives tool to:

1. Explain WebAssembly concepts from different angles
2. Show practical use cases
3. Provide implementation examples
4. Discuss pros/cons vs pure JavaScript

Make it suitable for an intermediate JavaScript developer.
```

## Performance Optimization

### VS Code Settings

Optimize Cline performance:

```json
{
  "cline.performance": {
    "enableCaching": true,
    "maxConcurrentRequests": 3,
    "requestTimeout": 30000,
    "contextWindow": {
      "maxTokens": 100000,
      "smartTruncation": true
    }
  }
}
```

### Project-Specific Optimization

```json
{
  "cline.workspace": {
    "indexing": {
      "excludePatterns": [
        "**/node_modules/**",
        "**/dist/**", 
        "**/.git/**",
        "**/coverage/**",
        "**/*.log"
      ],
      "maxFileSize": "1MB",
      "enableIntelligentIndexing": true
    },
    "memoryManagement": {
      "maxHistoryLength": 50,
      "clearCacheOnReload": true,
      "limitContextSize": true
    }
  }
}
```

## Team Collaboration

### Shared Configuration

Create team-wide Cline settings:

```json
{
  "cline.team": {
    "sharedMCPServers": {
      "polydev": {
        "enabled": true,
        "requireAuth": true,
        "allowedFeatures": [
          "multiModelPerspectives",
          "codeReview", 
          "architectureAnalysis"
        ]
      }
    },
    "workflows": {
      "codeReview": {
        "requireMultiModelAnalysis": true,
        "autoRunOnSave": false,
        "includeSecurityCheck": true
      }
    }
  }
}
```

### Code Standards

```json
{
  "cline.codeStandards": {
    "enforceWithPolydev": true,
    "rules": {
      "requireTypeScript": true,
      "maxFunctionLength": 50,
      "requireTests": true,
      "requireDocumentation": true
    },
    "reviewChecklist": [
      "Security vulnerabilities",
      "Performance issues", 
      "Code style consistency",
      "Test coverage",
      "Documentation quality"
    ]
  }
}
```

## Troubleshooting

### Common Issues

**Extension Not Loading:**
```bash
# Check VS Code version
code --version

# Reinstall extension
code --uninstall-extension saoudrizwan.claude-dev
code --install-extension saoudrizwan.claude-dev

# Clear extension cache
rm -rf ~/.vscode/extensions/saoudrizwan.claude-dev*
```

**MCP Connection Issues:**
1. Verify token is valid and not expired
2. Check internet connectivity
3. Restart VS Code completely
4. Clear VS Code workspace cache

**Performance Problems:**
```json
{
  "cline.troubleshooting": {
    "enableDiagnostics": true,
    "logLevel": "info",
    "performanceMonitoring": true,
    "memoryUsageThreshold": "1GB"
  }
}
```

### Debug Mode

Enable detailed logging:

1. Open Command Palette (`Ctrl+Shift+P`)
2. Run "Developer: Toggle Developer Tools"  
3. Check Console for Cline-related messages
4. Enable verbose logging in settings:

```json
{
  "cline.logging": {
    "level": "debug",
    "enableMCPLogging": true,
    "enablePerformanceLogging": true,
    "logToFile": true
  }
}
```

### Token Validation

```bash
# Test MCP token
curl -H "Authorization: Bearer pd_your_token" \
     https://www.polydev.ai/api/mcp/status

# Expected response
{
  "status": "authenticated",
  "user": { "id": "...", "email": "..." },
  "features": ["get_perspectives", "..."]
}
```

## Best Practices

### Effective Prompt Engineering

**Context-Aware Requests:**
```
In this Next.js 14 TypeScript project with Tailwind CSS, I need to:

1. Create a responsive navigation component
2. Implement dark mode toggle
3. Add mobile menu functionality
4. Ensure accessibility compliance

Use get_perspectives tool to get different implementation approaches.
```

**Iterative Problem Solving:**
```
Let's solve this step by step. Use get_perspectives tool for each phase:

Phase 1: Architecture design for user authentication
Phase 2: Database schema planning
Phase 3: API endpoint structure
Phase 4: Frontend integration approach

Start with Phase 1.
```

### Code Organization

```
Analyze and improve my component organization:

src/components/
├── common/          # Shared components
├── forms/           # Form components
├── layout/          # Layout components  
└── pages/           # Page-specific components

Use get_perspectives tool to suggest:
1. Better organization patterns
2. Component composition strategies
3. Props drilling solutions
4. State management approaches
```

### Testing Integration

```
Help me implement a comprehensive testing strategy:

Current setup:
- Jest for unit tests
- React Testing Library for component tests
- Cypress for E2E tests

Use get_perspectives tool to review:
1. Test coverage gaps
2. Testing best practices
3. Mock strategies
4. Performance testing approaches
```

## Advanced Features

### Custom MCP Tools

Create project-specific tools:

```json
{
  "cline.customMCPTools": [
    {
      "name": "project_analyzer",
      "description": "Analyze project structure and dependencies",
      "inputSchema": {
        "type": "object",
        "properties": {
          "analysis_type": {
            "type": "string",
            "enum": ["structure", "dependencies", "performance"]
          }
        }
      }
    }
  ]
}
```

### Integration with Other Tools

**ESLint Integration:**
```json
{
  "cline.integrations": {
    "eslint": {
      "enabled": true,
      "autoFix": true,
      "usePolyddevForRuleExplanations": true
    }
  }
}
```

**Prettier Integration:**
```json
{
  "cline.integrations": {
    "prettier": {
      "enabled": true,
      "formatOnSave": true,
      "usePolyddevForStyleGuides": true
    }
  }
}
```

## Migration and Updates

### Updating Cline

```bash
# Update via VS Code
# Command Palette → "Extensions: Check for Extension Updates"

# Or via command line
code --list-extensions --show-versions | grep cline
code --uninstall-extension saoudrizwan.claude-dev
code --install-extension saoudrizwan.claude-dev
```

### Backup Configuration

```bash
# Backup VS Code settings
cp ~/.vscode/settings.json ~/.vscode/settings.json.backup

# Backup workspace settings
cp .vscode/settings.json .vscode/settings.json.backup
```

## Enterprise Configuration

### Security Settings

```json
{
  "cline.enterprise": {
    "security": {
      "allowedMCPServers": ["polydev"],
      "requireSSO": false,
      "auditLogging": true,
      "dataRetentionDays": 30
    }
  }
}
```

### Compliance

```json
{
  "cline.compliance": {
    "enableAuditTrail": true,
    "requireCodeReview": true,
    "approvedAIProviders": ["polydev"],
    "restrictedFeatures": []
  }
}
```

## Next Steps

After configuring Cline with Polydev:

1. **[Explore Multi-Model Features](../../features/perspectives/)** - Learn about advanced perspective capabilities
2. **[Configure Additional Providers](../index.md)** - Add more AI providers to your setup
3. **[Advanced MCP Integration](../../mcp/overview.md)** - Discover advanced MCP features
4. **[Performance Optimization](../../config/troubleshooting.md)** - Optimize your development environment

---

**Need help with Cline integration?** Check the [Cline documentation](https://github.com/saoudrizwan/claude-dev) or join our [Discord](https://discord.gg/polydev).