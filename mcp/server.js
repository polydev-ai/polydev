#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const CLIManager = require('../lib/cliManager').default;

class MCPServer {
  constructor() {
    this.capabilities = {
      tools: {},
      resources: {},
      prompts: {}
    };
    
    this.tools = new Map();
    this.cliManager = new CLIManager();
    this.loadManifest();
  }

  loadManifest() {
    try {
      const manifestPath = path.join(__dirname, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      
      // Register tools from manifest
      if (manifest.tools) {
        manifest.tools.forEach(tool => {
          this.tools.set(tool.name, tool);
        });
      }
      
      this.manifest = manifest;
    } catch (error) {
      console.error('Failed to load manifest:', error);
      process.exit(1);
    }
  }

  async handleRequest(request) {
    const { method, params, id } = request;

    try {
      switch (method) {
        case 'initialize':
          return this.handleInitialize(params, id);
        
        case 'tools/list':
          return this.handleToolsList(id);
        
        case 'tools/call':
          return await this.handleToolCall(params, id);
        
        default:
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: 'Method not found'
            }
          };
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: 'Internal error',
          data: error.message
        }
      };
    }
  }

  handleInitialize(params, id) {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: this.capabilities,
        serverInfo: {
          name: this.manifest.name,
          version: this.manifest.version
        }
      }
    };
  }

  handleToolsList(id) {
    const tools = Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }));

    return {
      jsonrpc: '2.0',
      id,
      result: { tools }
    };
  }

  async handleToolCall(params, id) {
    const { name, arguments: args } = params;
    
    if (!this.tools.has(name)) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32602,
          message: `Unknown tool: ${name}`
        }
      };
    }

    try {
      let result;
      
      switch (name) {
        case 'get_perspectives':
          result = await this.callPerspectivesAPI(args);
          break;
        
        case 'polydev.force_cli_detection':
          result = await this.forceCliDetection(args);
          break;
        
        case 'polydev.get_cli_status':
          result = await this.getCliStatus(args);
          break;
        
        case 'polydev.send_cli_prompt':
          result = await this.sendCliPrompt(args);
          break;
        
        default:
          throw new Error(`Tool ${name} not implemented`);
      }

      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: this.formatResponse(name, result)
            }
          ]
        }
      };
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: error.message
        }
      };
    }
  }

  async callPerspectivesAPI(args) {
    const serverUrl = 'https://www.polydev.ai/api/mcp';
    
    // Validate required arguments
    if (!args.prompt || typeof args.prompt !== 'string') {
      throw new Error('prompt is required and must be a string');
    }

    // Support both parameter token (Claude Code) and environment token (Cline)
    const userToken = args.user_token || process.env.POLYDEV_USER_TOKEN;
    
    // Debug logging
    console.error(`[Polydev MCP] Debug - args.user_token: ${args.user_token ? 'present' : 'missing'}`);
    console.error(`[Polydev MCP] Debug - process.env.POLYDEV_USER_TOKEN: ${process.env.POLYDEV_USER_TOKEN ? 'present' : 'missing'}`);
    console.error(`[Polydev MCP] Debug - final userToken: ${userToken ? 'present' : 'missing'}`);
    
    if (!userToken || typeof userToken !== 'string') {
      throw new Error('user_token is required. Either:\n' +
        '1. Pass user_token parameter, or\n' +
        '2. Set POLYDEV_USER_TOKEN environment variable\n' +
        'Generate token at: https://polydev.ai/dashboard/mcp-tokens');
    }

    console.error(`[Polydev MCP] Getting perspectives for: "${args.prompt.substring(0, 60)}${args.prompt.length > 60 ? '...' : ''}"`);
    console.error(`[Polydev MCP] Models: ${args.models ? args.models.join(', ') : 'using user preferences'}`);
    console.error(`[Polydev MCP] Project memory: ${args.project_memory || 'none'}`);

    // Call the MCP endpoint directly with proper MCP format
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
        'User-Agent': 'polydev-perspectives-mcp/1.0.0'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'get_perspectives',
          arguments: args
        },
        id: 1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage;
      
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`;
      } catch {
        errorMessage = errorText || `HTTP ${response.status}`;
      }

      if (response.status === 401) {
        throw new Error(`Authentication failed: ${errorMessage}. Generate a new token at https://polydev.ai/dashboard/mcp-tools`);
      }

      throw new Error(`Polydev API error: ${errorMessage}`);
    }

    const result = await response.json();
    
    // Handle MCP JSON-RPC response format
    if (result.result && result.result.content && result.result.content[0]) {
      const content = result.result.content[0].text;
      console.error(`[Polydev MCP] Got MCP response successfully`);
      return { content };
    } else if (result.error) {
      throw new Error(result.error.message || 'MCP API error');
    }
    
    console.error(`[Polydev MCP] Unexpected response format:`, result);
    return result;
  }

  formatResponse(toolName, result) {
    switch (toolName) {
      case 'get_perspectives':
        return this.formatPerspectivesResponse(result);
      
      case 'polydev.force_cli_detection':
        return this.formatCliDetectionResponse(result);
      
      case 'polydev.get_cli_status':
        return this.formatCliStatusResponse(result);
      
      case 'polydev.send_cli_prompt':
        return this.formatCliPromptResponse(result);
      
      default:
        return JSON.stringify(result, null, 2);
    }
  }

  formatPerspectivesResponse(result) {
    // Handle MCP response format (already formatted text)
    if (result.content) {
      return result.content;
    }
    
    // Handle legacy response format
    if (!result.responses || result.responses.length === 0) {
      return 'No perspectives received from models.';
    }

    let formatted = `# Multiple AI Perspectives\n\n`;
    formatted += `Got ${result.responses.length} perspectives in ${result.total_latency_ms}ms using ${result.total_tokens} tokens.\n\n`;

    result.responses.forEach((response, index) => {
      const modelName = response.model.toUpperCase();
      
      if (response.error) {
        formatted += `## ${modelName} - ERROR\n`;
        formatted += `❌ ${response.error}\n\n`;
      } else {
        formatted += `## ${modelName} Perspective\n`;
        formatted += `${response.content}\n\n`;
        if (response.tokens_used) {
          formatted += `*Tokens: ${response.tokens_used}, Latency: ${response.latency_ms}ms*\n\n`;
        }
      }
      
      if (index < result.responses.length - 1) {
        formatted += '---\n\n';
      }
    });

    return formatted;
  }

  formatCliDetectionResponse(result) {
    if (!result.success) {
      return `❌ CLI Detection Failed: ${result.error}`;
    }

    let formatted = `# CLI Provider Detection Results\n\n`;
    formatted += `✅ Detection completed at ${result.timestamp}\n`;
    formatted += `${result.message}\n\n`;

    if (result.results && Object.keys(result.results).length > 0) {
      // Count working vs broken providers
      let workingProviders = 0;
      let compatibilityIssues = 0;
      
      Object.entries(result.results).forEach(([providerId, status]) => {
        formatted += `## ${providerId.toUpperCase().replace('_', ' ')}\n`;
        
        if (status.available) {
          formatted += `✅ **Available** at ${status.path}\n`;
          if (status.version) {
            formatted += `📦 Version: ${status.version}\n`;
          }
          
          if (status.authenticated) {
            formatted += `🔐 **Authenticated** - Ready to use\n`;
            workingProviders++;
          } else {
            formatted += `❌ **Not Authenticated**\n`;
            if (status.error) {
              // Special formatting for compatibility issues
              if (status.error.includes('Compatibility Issue')) {
                formatted += `\n🚨 **COMPATIBILITY ISSUE**\n`;
                formatted += `${status.error}\n\n`;
                formatted += `**Need Help?** Contact support at https://polydev.ai/support with this error message.\n`;
                compatibilityIssues++;
              } else {
                formatted += `💡 ${status.error}\n`;
              }
            }
          }
        } else {
          formatted += `❌ **Not Available**\n`;
          if (status.error) {
            formatted += `💡 ${status.error}\n`;
          }
        }
        
        formatted += `⏰ Last checked: ${new Date(status.last_checked).toLocaleString()}\n\n`;
      });
      
      // Add summary
      formatted += `---\n\n`;
      formatted += `## 📊 System Status Summary\n`;
      formatted += `- **Working Providers**: ${workingProviders}/3 CLI tools ready\n`;
      if (compatibilityIssues > 0) {
        formatted += `- **⚠️  Compatibility Issues**: ${compatibilityIssues} provider(s) need attention\n`;
        formatted += `- **Recommendation**: Update Node.js or CLI tools as suggested above\n`;
      }
      
      if (workingProviders >= 2) {
        formatted += `- **Status**: ✅ System operational with ${workingProviders} working providers\n`;
      } else if (workingProviders >= 1) {
        formatted += `- **Status**: ⚠️  Limited functionality - only ${workingProviders} provider working\n`;
      } else {
        formatted += `- **Status**: ❌ No CLI providers working - check installations\n`;
      }
    }

    return formatted;
  }

  formatCliStatusResponse(result) {
    if (!result.success) {
      return `❌ CLI Status Check Failed: ${result.error}`;
    }

    let formatted = `# CLI Provider Status\n\n`;
    formatted += `Status retrieved at ${result.timestamp}\n\n`;

    if (result.results && Object.keys(result.results).length > 0) {
      Object.entries(result.results).forEach(([providerId, status]) => {
        const providerName = providerId.toUpperCase().replace('_', ' ');
        const statusIcon = status.available && status.authenticated ? '🟢' : 
                          status.available ? '🟡' : '🔴';
        
        formatted += `${statusIcon} **${providerName}**: `;
        
        if (status.available && status.authenticated) {
          formatted += `Ready to use`;
        } else if (status.available) {
          formatted += `Available but not authenticated`;
        } else {
          formatted += `Not available`;
        }
        
        formatted += `\n`;
      });
    } else {
      formatted += `No CLI providers detected.\n`;
    }

    return formatted;
  }

  formatCliPromptResponse(result) {
    if (!result.success) {
      return `❌ CLI Prompt Failed: ${result.error}`;
    }

    let formatted = `# CLI Response from ${result.provider.toUpperCase().replace('_', ' ')}\n\n`;
    formatted += `${result.content}\n\n`;
    formatted += `---\n`;
    formatted += `📊 **Stats**: ${result.tokens_used} tokens, ${result.latency_ms}ms latency\n`;
    formatted += `⚙️ **Mode**: ${result.mode} | **Time**: ${result.timestamp}`;

    return formatted;
  }

  /**
   * Force CLI detection for all providers using MCP Supabase integration
   */
  async forceCliDetection(args) {
    console.log('[MCP Server] Force CLI detection requested');
    
    try {
      const providerId = args.provider_id; // Optional - detect specific provider
      console.log('[MCP Server] Calling CLI Manager forceCliDetection with providerId:', providerId);
      
      // Force detection using CLI Manager
      const results = await this.cliManager.forceCliDetection(providerId);
      console.log('[MCP Server] CLI detection completed, results:', Object.keys(results));
      
      // CLI status is cached locally in CLIManager - no database updates needed
      // This MCP server runs in customer environments independently

      return {
        success: true,
        results,
        message: `CLI detection completed for ${providerId || 'all providers'}`,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('[MCP Server] CLI detection error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get CLI status with caching using MCP integration
   */
  async getCliStatus(args) {
    console.log('[MCP Server] Get CLI status requested');
    
    try {
      const providerId = args.provider_id;

      let results = {};

      if (providerId) {
        // Get specific provider status
        const allStatus = await this.cliManager.getCliStatus(providerId);
        results[providerId] = allStatus[providerId];
      } else {
        // Get all providers status
        const providers = this.cliManager.getAvailableProviders();
        for (const provider of providers) {
          const allStatus = await this.cliManager.getCliStatus(provider.id);
          results[provider.id] = allStatus[provider.id];
        }
      }

      return {
        success: true,
        results,
        message: 'CLI status retrieved successfully',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('[MCP Server] CLI status error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Send prompt to CLI provider using MCP integration
   */
  async sendCliPrompt(args) {
    console.log('[MCP Server] Send CLI prompt requested');
    
    try {
      const { provider_id, prompt, mode = 'args', timeout_ms = 30000, user_id } = args;
      
      if (!provider_id || !prompt) {
        throw new Error('provider_id and prompt are required');
      }

      // Send prompt using CLI Manager
      const response = await this.cliManager.sendCliPrompt(
        provider_id, 
        prompt, 
        mode, 
        timeout_ms
      );

      // CLI usage is tracked locally - no database integration needed
      // This MCP server runs independently in customer environments

      return {
        success: response.success,
        content: response.content,
        error: response.error,
        tokens_used: response.tokens_used,
        latency_ms: response.latency_ms,
        provider: provider_id,
        mode,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('[MCP Server] CLI prompt error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // CLI status and usage tracking is handled locally by CLIManager
  // No database integration needed - this MCP server runs independently

  async start() {
    console.log('Starting Polydev Perspectives MCP Server...');
    
    // Handle JSONRPC communication over stdio
    process.stdin.setEncoding('utf8');
    
    let buffer = '';
    
    process.stdin.on('data', async (chunk) => {
      buffer += chunk;
      
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const request = JSON.parse(line);
            const response = await this.handleRequest(request);
            process.stdout.write(JSON.stringify(response) + '\n');
          } catch (error) {
            console.error('Failed to process request:', error);
          }
        }
      }
    });

    process.stdin.on('end', () => {
      console.log('MCP Server shutting down...');
      process.exit(0);
    });

    // Handle process signals
    process.on('SIGINT', () => {
      console.log('Received SIGINT, shutting down...');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('Received SIGTERM, shutting down...');
      process.exit(0);
    });

    console.log('MCP Server ready and listening on stdin...');
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  const server = new MCPServer();
  server.start().catch(error => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });
}

module.exports = MCPServer;
