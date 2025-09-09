# MCP Server Setup

Complete guide to installing and configuring Polydev's MCP server for your AI agents.

## Overview

The Polydev MCP server acts as a bridge between your AI agents and multiple LLM providers, implementing the Model Context Protocol specification for seamless integration.

### What You'll Get

- **Universal Tool Interface**: Standardized access to 20+ AI providers
- **Intelligent Fallback**: Automatic CLI → API Keys → Credits routing
- **Project Memory**: Context-aware assistance with TF-IDF search
- **Performance Analytics**: Real-time monitoring and optimization
- **Secure Access**: Encrypted API key storage and permission management

## Installation Methods

### Method 1: NPM Package (Recommended)

```bash
# Install globally
npm install -g @polydev/mcp-server

# Start server
polydev-mcp-server --port 3001

# Or run directly
npx @polydev/mcp-server
```

### Method 2: From Source

```bash
# Clone repository
git clone https://github.com/polydev-ai/polydev.git
cd polydev

# Install dependencies
npm install

# Build MCP server
npm run build:mcp

# Start server
npm run mcp:server
```

### Method 3: Docker

```bash
# Pull official image
docker pull polydev/mcp-server:latest

# Run container
docker run -p 3001:3001 \
  -e POLYDEV_CLI_DEBUG=1 \
  -v ~/.polydev:/app/.polydev \
  polydev/mcp-server:latest
```

### Method 4: Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  polydev-mcp:
    image: polydev/mcp-server:latest
    ports:
      - "3001:3001"
    environment:
      - POLYDEV_CLI_DEBUG=1
      - POLYDEV_API_URL=http://localhost:3000/api/perspectives
    volumes:
      - ~/.polydev:/app/.polydev
      - ~/.config/polydev:/app/.config
    restart: unless-stopped
```

```bash
# Start with Docker Compose
docker-compose up -d

# Check logs
docker-compose logs -f polydev-mcp
```

## Configuration

### Environment Variables

Create a `.env` file in your project directory:

```bash
# .env
# Core MCP Configuration
POLYDEV_MCP_PORT=3001
POLYDEV_MCP_HOST=localhost
POLYDEV_DEBUG=1

# CLI Provider Settings
POLYDEV_CLI_DEBUG=1
POLYDEV_CLI_TIMEOUT=30000
CLAUDE_CODE_PATH=/usr/local/bin/claude
CODEX_CLI_PATH=/usr/local/bin/codex

# API Configuration
POLYDEV_API_URL=http://localhost:3000/api/perspectives
POLYDEV_USER_TOKEN=poly_your_token_here

# Security Settings
POLYDEV_ALLOW_FILE_ACCESS=true
POLYDEV_ALLOWED_PATHS=/Users/username/projects,/opt/projects
POLYDEV_MAX_CONCURRENT_REQUESTS=5
```

### Configuration File

Create `polydev.config.json`:

```json
{
  "mcp": {
    "port": 3001,
    "host": "localhost",
    "debug": true,
    "cors": {
      "enabled": true,
      "origins": ["*"]
    }
  },
  "providers": {
    "cli": {
      "enabled": true,
      "timeout": 30000,
      "detection": {
        "claude_code": {
          "enabled": true,
          "path": "/usr/local/bin/claude"
        },
        "codex_cli": {
          "enabled": true,
          "path": "/usr/local/bin/codex"
        },
        "gemini_cli": {
          "enabled": true,
          "path": "/usr/local/bin/gcloud"
        }
      }
    },
    "api": {
      "enabled": true,
      "fallback_url": "http://localhost:3000/api/perspectives",
      "user_token": "poly_your_token_here"
    }
  },
  "security": {
    "file_access": {
      "enabled": true,
      "allowed_paths": [
        "/Users/username/projects",
        "/opt/projects"
      ],
      "denied_paths": [
        "/etc",
        "/var/log",
        "~/.ssh"
      ]
    },
    "resource_limits": {
      "max_file_size": "10MB",
      "max_concurrent_requests": 5,
      "request_timeout": 300000
    }
  },
  "features": {
    "project_memory": {
      "enabled": true,
      "cache_size": 100,
      "tfidf_enabled": true
    },
    "analytics": {
      "enabled": true,
      "endpoint": "http://localhost:3000/api/analytics"
    }
  }
}
```

## Server Startup

### Basic Startup

```bash
# Start with default configuration
npm run mcp:server

# Start with custom port
POLYDEV_MCP_PORT=3002 npm run mcp:server

# Start with debug mode
POLYDEV_CLI_DEBUG=1 POLYDEV_DEBUG=1 npm run mcp:server
```

### Advanced Startup Options

```bash
# Custom configuration file
npm run mcp:server -- --config /path/to/custom-config.json

# Specific environment
NODE_ENV=production npm run mcp:server

# With performance monitoring
npm run mcp:server -- --monitor --metrics-port 3003
```

### Verification

```bash
# Check server health
curl http://localhost:3001/health

# Expected response:
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 12345,
  "providers": {
    "cli_detected": ["claude_code", "codex_cli"],
    "api_configured": true
  }
}
```

## Agent Configuration

### Claude Desktop

Edit your Claude Desktop configuration:

```bash
# macOS
~/.config/Claude/claude_desktop_config.json

# Windows  
%APPDATA%\Claude\claude_desktop_config.json

# Linux
~/.config/Claude/claude_desktop_config.json
```

Configuration:
```json
{
  "mcpServers": {
    "polydev": {
      "command": "node",
      "args": ["/path/to/polydev/mcp/server.js"],
      "env": {
        "POLYDEV_CLI_DEBUG": "1",
        "POLYDEV_API_URL": "http://localhost:3000/api/perspectives"
      }
    }
  }
}
```

### Cline (VS Code Extension)

Configure in VS Code settings:

```json
{
  "cline.mcpServers": {
    "polydev": {
      "command": "node",
      "args": ["/path/to/polydev/mcp/server.js"],
      "env": {
        "POLYDEV_CLI_DEBUG": "1"
      }
    }
  }
}
```

### Continue (VS Code Extension)

Add to Continue config:

```json
{
  "mcpServers": [
    {
      "name": "polydev",
      "command": "node",
      "args": ["/path/to/polydev/mcp/server.js"]
    }
  ]
}
```

### Custom Clients

For custom MCP clients:

```typescript
import { MCPClient } from '@modelcontextprotocol/client';

const client = new MCPClient({
  server: {
    command: 'node',
    args: ['/path/to/polydev/mcp/server.js'],
    env: {
      POLYDEV_CLI_DEBUG: '1'
    }
  }
});

await client.connect();
```

## Testing Installation

### Basic Connectivity Test

```javascript
// Test MCP server connection
const testConnection = async () => {
  try {
    const result = await client.callTool({
      name: 'get_perspectives',
      arguments: {
        prompt: 'Hello, Polydev!',
        models: ['gpt-3.5-turbo']
      }
    });
    
    console.log('✅ MCP server is working:', result);
  } catch (error) {
    console.error('❌ MCP connection failed:', error);
  }
};
```

### CLI Provider Test

```javascript
// Test CLI provider detection
const testCLI = async () => {
  try {
    const result = await client.callTool({
      name: 'report_cli_status',
      arguments: {}
    });
    
    console.log('CLI providers:', result);
  } catch (error) {
    console.error('CLI test failed:', error);
  }
};
```

### Comprehensive Test Suite

```bash
# Run all integration tests
npm run test:mcp

# Test specific providers
npm run test:mcp -- --provider claude_code
npm run test:mcp -- --provider openai

# Test with sample prompts
npm run test:mcp -- --samples
```

## Performance Tuning

### Memory Optimization

```bash
# Increase Node.js heap size
export NODE_OPTIONS="--max-old-space-size=4096"
npm run mcp:server

# Optimize garbage collection
export NODE_OPTIONS="--gc-concurrent --max-old-space-size=4096"
```

### Connection Pooling

```json
{
  "performance": {
    "connection_pool": {
      "max_connections": 10,
      "idle_timeout": 300000,
      "connection_timeout": 30000
    },
    "caching": {
      "response_cache_ttl": 900,
      "context_cache_size": 100
    }
  }
}
```

### Request Optimization

```json
{
  "optimization": {
    "parallel_requests": 3,
    "request_batching": true,
    "compression": true,
    "keep_alive": true
  }
}
```

## Monitoring and Logging

### Enable Comprehensive Logging

```bash
# .env
LOG_LEVEL=debug
LOG_FORMAT=json
LOG_TO_FILE=true
LOG_FILE_PATH=./logs/polydev-mcp.log

# Rotate logs
LOG_ROTATE=true
LOG_MAX_SIZE=100MB
LOG_MAX_FILES=5
```

### Health Monitoring

```javascript
// Health check endpoint
const healthStatus = await fetch('http://localhost:3001/health').then(r => r.json());

console.log('Server health:', healthStatus);
// {
//   "status": "healthy",
//   "uptime": 3600,
//   "memory_usage": "45.2 MB",
//   "cpu_usage": "2.3%",
//   "active_connections": 3,
//   "providers": {
//     "cli_providers": ["claude_code", "codex_cli"],
//     "api_providers": ["openai", "anthropic"]
//   }
// }
```

### Performance Metrics

```bash
# Enable metrics endpoint
POLYDEV_METRICS_ENABLED=true
POLYDEV_METRICS_PORT=3003

# Access metrics
curl http://localhost:3003/metrics

# Prometheus format metrics
curl http://localhost:3003/metrics/prometheus
```

## Security Configuration

### File System Permissions

```json
{
  "security": {
    "file_access": {
      "mode": "whitelist",
      "allowed_paths": [
        "/Users/username/projects/**",
        "/opt/workspace/**"
      ],
      "allowed_extensions": [
        ".js", ".ts", ".tsx", ".py", ".md", ".json", ".yaml"
      ],
      "max_file_size": "10MB",
      "max_files_per_request": 20
    }
  }
}
```

### Network Security

```json
{
  "security": {
    "network": {
      "cors": {
        "enabled": true,
        "allowed_origins": ["http://localhost:3000"],
        "allowed_methods": ["GET", "POST"],
        "allowed_headers": ["Content-Type", "Authorization"]
      },
      "rate_limiting": {
        "enabled": true,
        "requests_per_minute": 60,
        "burst_limit": 10
      }
    }
  }
}
```

### API Key Protection

```json
{
  "security": {
    "encryption": {
      "enabled": true,
      "algorithm": "aes-256-gcm",
      "key_derivation": "pbkdf2"
    },
    "validation": {
      "api_key_format": true,
      "token_expiry": true,
      "signature_verification": true
    }
  }
}
```

## Troubleshooting

### Common Issues

**Server Won't Start:**
```bash
# Check port availability
lsof -i :3001
netstat -tulpn | grep :3001

# Check Node.js version
node --version  # Requires 18+

# Check permissions
ls -la mcp/server.js
chmod +x mcp/server.js
```

**Agent Can't Connect:**
```bash
# Verify MCP server is running
curl http://localhost:3001/health

# Check agent configuration path
cat ~/.config/Claude/claude_desktop_config.json

# Test with absolute paths
which node  # Use full path in config
```

**CLI Providers Not Detected:**
```bash
# Check CLI installation
which claude
which codex
which gcloud

# Test CLI authentication
claude auth status
codex --version
gcloud auth list

# Enable CLI debugging
POLYDEV_CLI_DEBUG=1 npm run mcp:server
```

**Performance Issues:**
```bash
# Monitor resource usage
top -p $(pgrep -f polydev)

# Check memory leaks
node --inspect mcp/server.js

# Increase limits
ulimit -n 4096  # Increase file descriptors
```

### Debug Mode

```bash
# Enable all debugging
export POLYDEV_DEBUG=1
export POLYDEV_CLI_DEBUG=1  
export DEBUG=*

# Start server with debugging
npm run mcp:server

# Check debug output
tail -f logs/polydev-mcp.log
```

### Log Analysis

```bash
# Search for errors
grep -i error logs/polydev-mcp.log

# Check connection issues
grep -i "connection" logs/polydev-mcp.log

# Monitor request patterns
grep "tool_call" logs/polydev-mcp.log | tail -n 20
```

## Advanced Configuration

### Custom Tool Registration

```typescript
// Register custom MCP tools
import { MCPServer } from '@polydev/mcp-server';

const server = new MCPServer();

server.registerTool({
  name: 'custom_analysis',
  description: 'Custom analysis tool',
  inputSchema: {
    type: 'object',
    properties: {
      data: { type: 'string' },
      analysis_type: { type: 'string' }
    },
    required: ['data']
  },
  handler: async (args) => {
    // Custom tool implementation
    return {
      content: [{
        type: 'text',
        text: `Analysis result: ${args.data}`
      }]
    };
  }
});
```

### Plugin System

```json
{
  "plugins": {
    "enabled": true,
    "auto_load": true,
    "plugin_paths": [
      "./plugins",
      "~/.polydev/plugins"
    ],
    "installed_plugins": [
      "@polydev/plugin-jira",
      "@polydev/plugin-github",
      "custom-analytics-plugin"
    ]
  }
}
```

### Multi-Server Setup

```bash
# Primary server (port 3001)
POLYDEV_MCP_PORT=3001 npm run mcp:server

# Secondary server (port 3002) 
POLYDEV_MCP_PORT=3002 POLYDEV_INSTANCE=secondary npm run mcp:server

# Load balancer configuration
# nginx.conf
upstream polydev_mcp {
    server localhost:3001;
    server localhost:3002;
}
```

## Production Deployment

### Systemd Service (Linux)

```ini
# /etc/systemd/system/polydev-mcp.service
[Unit]
Description=Polydev MCP Server
After=network.target

[Service]
Type=simple
User=polydev
WorkingDirectory=/opt/polydev
ExecStart=/usr/bin/node mcp/server.js
Restart=always
RestartSec=3
Environment=NODE_ENV=production
Environment=POLYDEV_MCP_PORT=3001

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable polydev-mcp
sudo systemctl start polydev-mcp

# Check status
sudo systemctl status polydev-mcp

# View logs
journalctl -u polydev-mcp -f
```

### PM2 Process Manager

```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'polydev-mcp',
    script: 'mcp/server.js',
    env: {
      NODE_ENV: 'production',
      POLYDEV_MCP_PORT: 3001
    },
    instances: 2,
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G'
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save
pm2 startup
```

### Docker Production

```dockerfile
# Dockerfile.production
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build:mcp

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["npm", "run", "mcp:server:prod"]
```

## Next Steps

Your MCP server is now configured! Next steps:

1. **[Configure Agent Integration](agents/)** - Connect with your AI agent
2. **[Explore Available Tools](tools/)** - Learn about MCP tools and capabilities  
3. **[Set Up Monitoring](../features/analytics.md)** - Track performance and usage
4. **[Security Hardening](security.md)** - Configure advanced security features

---

**Need help with MCP server setup?** Check our [troubleshooting guide](../config/troubleshooting.md) or join our [Discord](https://discord.gg/polydev).