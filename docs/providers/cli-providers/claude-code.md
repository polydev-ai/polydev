# Claude Code CLI Provider

Official Anthropic CLI tool for Claude Pro subscribers - the highest priority provider in Polydev's fallback system.

## Overview

Claude Code is Anthropic's official CLI tool that provides direct access to Claude models through your Claude Pro subscription. When available, it takes the highest priority in Polydev's fallback routing.

### Key Benefits

- **No API Key Management**: Uses your existing Claude Pro subscription
- **Highest Priority**: First choice in fallback system
- **Full Claude Access**: All Claude models including latest versions
- **Subscription Leverage**: Maximize value from your Claude Pro plan
- **Advanced Features**: Code analysis, file operations, debugging assistance

## Requirements

### Prerequisites
- **Claude Pro Subscription** - Required for CLI access
- **Node.js 18+** - For running Polydev
- **macOS, Linux, or Windows** - Cross-platform support

### System Requirements
- Minimum 4GB RAM
- Internet connection for authentication
- Terminal/command line access

## Installation

### Method 1: NPM (Recommended)

```bash
# Install globally via npm
npm install -g @anthropic-ai/claude-code

# Verify installation
claude --version
```

### Method 2: Direct Download

```bash
# macOS (Apple Silicon)
curl -L https://github.com/anthropics/claude-code/releases/latest/download/claude-code-darwin-arm64 -o claude
chmod +x claude
sudo mv claude /usr/local/bin/

# macOS (Intel)
curl -L https://github.com/anthropics/claude-code/releases/latest/download/claude-code-darwin-x64 -o claude
chmod +x claude
sudo mv claude /usr/local/bin/

# Linux
curl -L https://github.com/anthropics/claude-code/releases/latest/download/claude-code-linux-x64 -o claude
chmod +x claude
sudo mv claude /usr/local/bin/

# Windows (PowerShell)
Invoke-WebRequest -Uri "https://github.com/anthropics/claude-code/releases/latest/download/claude-code-windows-x64.exe" -OutFile "claude.exe"
Move-Item claude.exe $env:USERPROFILE\AppData\Local\Microsoft\WindowsApps\
```

### Method 3: Package Managers

```bash
# macOS with Homebrew
brew install anthropic/claude/claude-code

# Linux with Snap
sudo snap install claude-code

# Windows with Chocolatey
choco install claude-code

# Windows with Winget
winget install Anthropic.ClaudeCode
```

## Authentication

### Initial Setup

```bash
# Start authentication process
claude auth login

# This will:
# 1. Open browser to Claude Pro login
# 2. Authenticate your subscription
# 3. Store credentials locally
```

### Verify Authentication

```bash
# Check authentication status
claude auth status

# Expected output:
# ✓ Authenticated as user@example.com
# ✓ Claude Pro subscription active
# ✓ CLI access enabled
```

### Authentication Troubleshooting

**Authentication Failed:**
```bash
# Clear existing credentials
claude auth logout

# Re-authenticate
claude auth login --force

# Check subscription status
claude auth whoami
```

**Subscription Issues:**
- Verify Claude Pro subscription is active
- Check billing status in Claude dashboard
- Ensure subscription includes CLI access

## Configuration

### Environment Variables

```bash
# Custom Claude Code path (if not in PATH)
CLAUDE_CODE_PATH=/custom/path/to/claude

# Authentication token (auto-managed)
CLAUDE_AUTH_TOKEN=auto_managed_by_cli

# Debug mode
CLAUDE_DEBUG=1

# Timeout settings
CLAUDE_TIMEOUT=30000      # 30 seconds
CLAUDE_MAX_RETRIES=3
```

### Polydev Integration

Polydev automatically detects Claude Code if it's properly installed:

```bash
# Test detection in Polydev
npm run test:cli

# Force CLI detection
node -e "
const CLIManager = require('./lib/cliManager').default;
const manager = new CLIManager();
manager.detectCLI('claude_code').then(console.log);
"
```

Expected detection result:
```json
{
  "id": "claude_code",
  "name": "Claude Code",
  "available": true,
  "authenticated": true,
  "version": "1.2.3",
  "path": "/usr/local/bin/claude"
}
```

## Usage with Polydev

### Direct CLI Usage

```javascript
// Send prompt directly to Claude Code CLI
const response = await callTool({
  name: "polydev.send_cli_prompt",
  arguments: {
    provider_id: "claude_code",
    prompt: "Analyze this React component for performance issues:\n\n```jsx\nconst Component = () => {\n  const [data, setData] = useState([]);\n  const expensiveComputation = () => {\n    return data.map(item => item.value * 2);\n  };\n  return <div>{expensiveComputation().join(', ')}</div>;\n};\n```",
    mode: "args"
  }
});
```

### Automatic Fallback Usage

```javascript
// Polydev will try Claude Code first automatically
const perspectives = await callTool({
  name: "get_perspectives",
  arguments: {
    prompt: "Help me optimize this database query for better performance",
    models: ["claude-opus-4"]  // Will use CLI if available
  }
});

// Check which method was used
console.log(perspectives.fallback_method); // "cli" if Claude Code was used
```

### Project Context Integration

```javascript
// Claude Code with project memory
const codeReview = await callTool({
  name: "get_perspectives",
  arguments: {
    prompt: "Review the authentication module in this codebase for security issues",
    project_memory: "full",
    project_context: {
      root_path: "/path/to/project",
      includes: ["src/**/*.{js,ts,tsx}", "**/*.md"],
      excludes: ["node_modules/**", "dist/**"]
    }
  }
});
```

## Features and Capabilities

### Advanced Code Analysis

Claude Code CLI provides enhanced code analysis capabilities:

```bash
# Direct CLI usage examples
claude "Analyze this Python function for potential bugs and optimization opportunities" --file app.py

# Code explanation
claude "Explain how this algorithm works and its time complexity" --file algorithm.py

# Security review
claude "Review this authentication code for security vulnerabilities" --file auth.js
```

### File Operations

```bash
# Analyze multiple files
claude "Compare these two implementations and recommend the better approach" --file old_impl.py --file new_impl.py

# Project-wide analysis
claude "Analyze the overall architecture of this project and suggest improvements" --directory ./src
```

### Interactive Sessions

```bash
# Start interactive session
claude --interactive

# Continuous conversation mode
claude --session project_review
```

## Model Availability

### Supported Claude Models

Claude Code provides access to all Claude models:

- **claude-3-5-sonnet-20241022** - Latest Sonnet (default)
- **claude-3-5-haiku-20241022** - Fast Haiku model
- **claude-3-opus-20240229** - Most capable Opus model
- **claude-3-sonnet-20240229** - Balanced Sonnet model
- **claude-3-haiku-20240307** - Fast Haiku model

### Model Selection

```bash
# Specify model in CLI
claude --model claude-3-opus-20240229 "Complex reasoning task"

# In Polydev (automatic mapping)
{
  "models": ["claude-3-opus"]  // Maps to claude-3-opus-20240229
}
```

## Performance Optimization

### CLI Performance Settings

```bash
# Optimize for speed
CLAUDE_PRIORITY_MODE=speed        # Faster responses
CLAUDE_PARALLEL_REQUESTS=3        # Concurrent requests
CLAUDE_CACHE_RESPONSES=true       # Local caching

# Optimize for accuracy
CLAUDE_PRIORITY_MODE=accuracy     # More thorough analysis
CLAUDE_DOUBLE_CHECK=true          # Verification pass
```

### Polydev Integration Settings

```bash
# MCP server configuration
POLYDEV_CLI_TIMEOUT=45000         # Extended timeout for complex tasks
POLYDEV_CLI_MAX_BUFFER=1048576    # 1MB buffer for large outputs
POLYDEV_CLI_DEBUG=1               # Enable debug logging
```

## Troubleshooting

### Common Issues

**CLI Not Detected:**
```bash
# Check installation
which claude
claude --version

# Verify PATH
echo $PATH | grep -o '/[^:]*claude[^:]*'

# Test basic functionality
claude "Hello, Claude!"
```

**Authentication Problems:**
```bash
# Check current auth status
claude auth status

# Re-authenticate if needed
claude auth logout
claude auth login

# Verify subscription
claude auth whoami
```

**Performance Issues:**
```bash
# Check system resources
top | grep claude
ps aux | grep claude

# Clear cache if needed
claude auth clear-cache

# Reduce concurrency
export POLYDEV_CLI_MAX_CONCURRENT=1
```

### Debug Mode

Enable comprehensive debugging:

```bash
# Enable all debug modes
export CLAUDE_DEBUG=1
export POLYDEV_CLI_DEBUG=1
export DEBUG=*

# Run test
npm run test:cli
```

### Platform-Specific Issues

**macOS Gatekeeper:**
```bash
# Allow unsigned binary
sudo spctl --add /usr/local/bin/claude
sudo spctl --enable --label "Claude Code"

# Remove quarantine
xattr -rd com.apple.quarantine /usr/local/bin/claude
```

**Windows Permission Issues:**
```powershell
# Run as Administrator and add to PATH
$env:PATH += ";C:\Users\$env:USERNAME\AppData\Local\Microsoft\WindowsApps"

# Set execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Linux Permission Issues:**
```bash
# Fix executable permissions
chmod +x /usr/local/bin/claude

# Add user to required groups
sudo usermod -a -G dialout $USER
```

## Advanced Configuration

### Custom Prompts and Templates

```bash
# Create custom prompt templates
mkdir ~/.claude-code/templates

# Create template file
cat > ~/.claude-code/templates/code-review.txt << 'EOF'
Please review this code for:
1. Security vulnerabilities
2. Performance issues  
3. Code quality and maintainability
4. Best practices adherence

Code to review:
{code}
EOF

# Use template
claude --template code-review --file mycode.js
```

### Integration with Development Tools

```bash
# Git integration
git log -1 --format="%H %s" | claude "Analyze this commit for potential issues"

# CI/CD integration
claude "Review this deployment script for production safety" --file deploy.sh > review.txt
```

### Batch Processing

```bash
# Process multiple files
find . -name "*.js" -exec claude "Quick security check for this file" --file {} \;

# Bulk analysis
claude "Generate documentation for all these API endpoints" --directory ./api --output docs/
```

## Best Practices

### Effective Prompt Strategies

**Be Specific:**
```bash
# ❌ Vague
claude "Fix this code"

# ✅ Specific  
claude "Optimize this React component to prevent unnecessary re-renders while maintaining the same functionality"
```

**Provide Context:**
```bash
# Include relevant context
claude "This is a high-traffic authentication endpoint. Review for security and performance issues" --file auth.js
```

**Use Progressive Refinement:**
```bash
# Start broad, then narrow down
claude "Analyze the overall architecture"
claude "Focus on the database access patterns specifically"
claude "Suggest optimizations for the user query performance"
```

### Resource Management

```bash
# Monitor CLI resource usage
ps aux | grep claude | awk '{print $3, $4, $11}'

# Set resource limits
ulimit -v 2097152  # 2GB virtual memory limit
timeout 300 claude "Long-running analysis task"
```

### Security Considerations

- **Subscription Security**: Keep Claude Pro account secure with 2FA
- **Local Credentials**: CLI stores encrypted tokens locally
- **Code Privacy**: Code sent to Claude follows Anthropic's privacy policy
- **Network Security**: All communication uses HTTPS

## Integration Examples

### With Popular Editors

**VS Code Extension:**
```json
{
  "claude-code.enabled": true,
  "claude-code.autoAnalyze": true,
  "claude-code.reviewOnSave": false
}
```

**Vim Integration:**
```vim
" .vimrc
command! ClaudeReview !claude "Review this code for issues" --file %
command! ClaudeExplain !claude "Explain this code in detail" --file %
```

### With Build Tools

**npm scripts:**
```json
{
  "scripts": {
    "lint:claude": "claude 'Check all JavaScript files for potential issues' --directory src",
    "docs:claude": "claude 'Generate API documentation' --directory api --output docs/"
  }
}
```

## Migration and Updates

### Updating Claude Code

```bash
# Update via npm
npm update -g @anthropic-ai/claude-code

# Update via package manager
brew upgrade claude-code

# Verify update
claude --version
```

### Migration from API Usage

If migrating from Claude API to Claude Code CLI:

```bash
# Export existing preferences
claude config export > claude-settings.json

# Import to CLI
claude config import claude-settings.json

# Test migration
npm run test:cli
```

## Next Steps

Once Claude Code is configured:

1. **[Test Multi-Provider Setup](../index.md)** - Verify fallback system
2. **[Configure Additional Providers](../api-providers/)** - Add backup providers
3. **[Optimize Performance](../../config/preferences.md)** - Configure preferences
4. **[Troubleshooting](../../config/troubleshooting.md)** - Resolve any issues

---

**Need help with Claude Code?** Check the [official documentation](https://claude.ai/docs/cli) or join our [Discord](https://discord.gg/polydev).
