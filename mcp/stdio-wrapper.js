#!/usr/bin/env node

// Lightweight stdio wrapper with local CLI functionality and remote Polydev MCP server fallback
const fs = require('fs');
const path = require('path');
const CLIManager = require('../lib/cliManager').default;

class StdioMCPWrapper {
  constructor() {
    this.userToken = process.env.POLYDEV_USER_TOKEN;
    if (!this.userToken) {
      console.error('POLYDEV_USER_TOKEN environment variable is required');
      process.exit(1);
    }
    
    // Initialize CLI Manager for local CLI functionality
    this.cliManager = new CLIManager();
    
    // Load manifest for tool definitions
    this.loadManifest();
  }

  loadManifest() {
    try {
      const manifestPath = path.join(__dirname, 'manifest.json');
      this.manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
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
          return {
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: { tools: {} },
              serverInfo: {
                name: this.manifest.name,
                version: this.manifest.version
              }
            }
          };
        
        case 'tools/list':
          const tools = this.manifest.tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema
          }));
          
          return {
            jsonrpc: '2.0',
            id,
            result: { tools }
          };
        
        case 'tools/call':
          // Handle CLI tools locally, forward others to remote server
          const toolName = params.name;
          if (toolName.startsWith('polydev.') && this.isCliTool(toolName)) {
            return await this.handleLocalCliTool(request);
          } else {
            // Forward non-CLI tools to remote server
            const result = await this.forwardToRemoteServer(request);
            return result;
          }
        
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
          message: error.message
        }
      };
    }
  }

  async forwardToRemoteServer(request) {
    console.error(`[Stdio Wrapper] Forwarding request to remote server`);
    
    const response = await fetch('https://www.polydev.ai/api/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.userToken}`,
        'User-Agent': 'polydev-stdio-wrapper/1.0.0'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Stdio Wrapper] Remote server error: ${response.status} - ${errorText}`);
      
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: `Remote server error: ${response.status} - ${errorText}`
        }
      };
    }

    const result = await response.json();
    console.error(`[Stdio Wrapper] Got response from remote server`);
    return result;
  }

  /**
   * Check if a tool is a CLI tool that should be handled locally
   */
  isCliTool(toolName) {
    const cliTools = [
      'polydev.force_cli_detection',
      'polydev.get_cli_status', 
      'polydev.send_cli_prompt'
    ];
    return cliTools.includes(toolName);
  }

  /**
   * Handle CLI tools locally without remote server calls
   */
  async handleLocalCliTool(request) {
    const { method, params, id } = request;
    const { name: toolName, arguments: args } = params;

    console.error(`[Stdio Wrapper] Handling local CLI tool: ${toolName}`);

    try {
      let result;

      switch (toolName) {
        case 'polydev.force_cli_detection':
          result = await this.localForceCliDetection(args);
          break;
        
        case 'polydev.get_cli_status':
          result = await this.localGetCliStatus(args);
          break;
        
        case 'polydev.send_cli_prompt':
          result = await this.localSendCliPrompt(args);
          break;
        
        default:
          throw new Error(`Unknown CLI tool: ${toolName}`);
      }

      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: this.formatCliResponse(result)
            }
          ]
        }
      };

    } catch (error) {
      console.error(`[Stdio Wrapper] CLI tool error:`, error);
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

  /**
   * Local CLI detection implementation
   */
  async localForceCliDetection(args) {
    console.error(`[Stdio Wrapper] Local CLI detection started`);
    
    try {
      const providerId = args.provider_id; // Optional - detect specific provider
      
      // Force detection using CLI Manager (no remote API calls)
      const results = await this.cliManager.forceCliDetection(null, providerId);
      
      // Save status locally to file-based cache
      await this.saveLocalCliStatus(results);

      return {
        success: true,
        results,
        message: `Local CLI detection completed for ${providerId || 'all providers'}`,
        timestamp: new Date().toISOString(),
        local_only: true
      };

    } catch (error) {
      console.error('[Stdio Wrapper] Local CLI detection error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        local_only: true
      };
    }
  }

  /**
   * Local CLI status retrieval
   */
  async localGetCliStatus(args) {
    console.error(`[Stdio Wrapper] Local CLI status retrieval`);
    
    try {
      const providerId = args.provider_id;
      let results = {};

      if (providerId) {
        // Get specific provider status
        const status = await this.cliManager.getCliStatus(providerId);
        results[providerId] = status;
      } else {
        // Get all providers status
        const providers = this.cliManager.getProviders();
        for (const provider of providers) {
          const status = await this.cliManager.getCliStatus(provider.id);
          results[provider.id] = status;
        }
      }

      return {
        success: true,
        results,
        message: 'Local CLI status retrieved successfully',
        timestamp: new Date().toISOString(),
        local_only: true
      };

    } catch (error) {
      console.error('[Stdio Wrapper] Local CLI status error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        local_only: true
      };
    }
  }

  /**
   * Local CLI prompt sending
   */
  async localSendCliPrompt(args) {
    console.error(`[Stdio Wrapper] Local CLI prompt sending`);
    
    try {
      const { provider_id, prompt, mode = 'args', timeout_ms = 30000 } = args;
      
      if (!provider_id || !prompt) {
        throw new Error('provider_id and prompt are required');
      }

      // Send prompt using CLI Manager (local execution)
      const response = await this.cliManager.sendCliPrompt(
        provider_id, 
        prompt, 
        mode, 
        timeout_ms
      );

      // Record usage locally (file-based analytics)
      await this.recordLocalUsage(provider_id, prompt, response);

      return {
        success: response.success,
        content: response.content,
        error: response.error,
        tokens_used: response.tokensUsed,
        latency_ms: response.latencyMs,
        provider: provider_id,
        mode,
        timestamp: new Date().toISOString(),
        local_only: true
      };

    } catch (error) {
      console.error('[Stdio Wrapper] Local CLI prompt error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        local_only: true
      };
    }
  }

  /**
   * Save CLI status to local file cache
   */
  async saveLocalCliStatus(results) {
    try {
      const homeDir = require('os').homedir();
      const polydevevDir = path.join(homeDir, '.polydev');
      const statusFile = path.join(polydevevDir, 'cli-status.json');

      // Ensure directory exists
      if (!fs.existsSync(polydevevDir)) {
        fs.mkdirSync(polydevevDir, { recursive: true });
      }

      // Save status with timestamp
      const statusData = {
        last_updated: new Date().toISOString(),
        results
      };

      fs.writeFileSync(statusFile, JSON.stringify(statusData, null, 2));
      console.error(`[Stdio Wrapper] CLI status saved to ${statusFile}`);

    } catch (error) {
      console.error('[Stdio Wrapper] Failed to save local CLI status:', error);
    }
  }

  /**
   * Record local usage for analytics
   */
  async recordLocalUsage(providerId, prompt, response) {
    try {
      const homeDir = require('os').homedir();
      const polydevevDir = path.join(homeDir, '.polydev');
      const usageFile = path.join(polydevevDir, 'cli-usage.json');

      // Load existing usage data
      let usageData = [];
      if (fs.existsSync(usageFile)) {
        usageData = JSON.parse(fs.readFileSync(usageFile, 'utf8'));
      }

      // Add new usage record
      usageData.push({
        timestamp: new Date().toISOString(),
        provider: providerId,
        prompt_length: prompt.length,
        success: response.success,
        latency_ms: response.latencyMs,
        tokens_used: response.tokensUsed || 0
      });

      // Keep only last 1000 records
      if (usageData.length > 1000) {
        usageData = usageData.slice(-1000);
      }

      fs.writeFileSync(usageFile, JSON.stringify(usageData, null, 2));
      console.error(`[Stdio Wrapper] Usage recorded locally`);

    } catch (error) {
      console.error('[Stdio Wrapper] Failed to record local usage:', error);
    }
  }

  /**
   * Format CLI response for MCP output
   */
  formatCliResponse(result) {
    if (!result.success) {
      return `❌ **CLI Error**\n\n${result.error}\n\n*Timestamp: ${result.timestamp}*`;
    }

    if (result.content) {
      // Prompt response
      return `✅ **CLI Response** (${result.provider || 'Unknown'} - ${result.mode || 'unknown'} mode)\n\n${result.content}\n\n*Latency: ${result.latency_ms || 0}ms | Tokens: ${result.tokens_used || 0} | ${result.timestamp}*`;
    } else {
      // Status/detection response
      let formatted = `✅ **CLI Operation Success**\n\n`;
      formatted += `${result.message}\n\n`;
      
      if (result.results) {
        formatted += `**Results:**\n`;
        for (const [providerId, status] of Object.entries(result.results)) {
          const icon = status.available ? '🟢' : '🔴';
          const authIcon = status.authenticated ? '🔐' : '🔓';
          formatted += `- ${icon} ${authIcon} **${providerId}**: ${status.available ? 'Available' : 'Not Available'}`;
          if (status.version) formatted += ` (${status.version})`;
          if (status.error) formatted += ` - ${status.error}`;
          formatted += `\n`;
        }
      }
      
      formatted += `\n*${result.local_only ? 'Local execution' : 'Remote execution'} | ${result.timestamp}*`;
      return formatted;
    }
  }

  async start() {
    console.log('Starting Polydev Stdio MCP Wrapper...');
    
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
      console.log('Stdio MCP Wrapper shutting down...');
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

    console.log('Stdio MCP Wrapper ready and listening on stdin...');
  }
}

if (require.main === module) {
  const wrapper = new StdioMCPWrapper();
  wrapper.start().catch(error => {
    console.error('Failed to start wrapper:', error);
    process.exit(1);
  });
}

module.exports = StdioMCPWrapper;
