#!/usr/bin/env node

// Lightweight stdio wrapper with local CLI functionality and remote Polydev MCP server fallback
const fs = require('fs');
const path = require('path');
const { CLIManager } = require('../lib/cliManager');

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
      const results = await this.cliManager.forceCliDetection(providerId);
      
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
        results = status;
      } else {
        // Get all providers status
        const providers = this.cliManager.getAvailableProviders();
        for (const provider of providers) {
          const status = await this.cliManager.getCliStatus(provider.id);
          results[provider.id] = status[provider.id];
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
   * Local CLI prompt sending with remote perspectives fallback/supplement
   */
  async localSendCliPrompt(args) {
    console.error(`[Stdio Wrapper] Local CLI prompt sending with perspectives`);
    
    try {
      let { provider_id, prompt, mode = 'args', timeout_ms = 30000 } = args;
      
      // Ensure timeout_ms is valid (not undefined, null, Infinity, or negative)
      if (!timeout_ms || timeout_ms === Infinity || timeout_ms < 1 || timeout_ms > 300000) {
        timeout_ms = 30000 // Default to 30 seconds
      }
      
      if (!prompt) {
        throw new Error('prompt is required');
      }

      // Auto-select best available provider if none specified
      if (!provider_id) {
        provider_id = await this.selectBestProvider();
        console.error(`[Stdio Wrapper] Auto-selected provider: ${provider_id}`);
      }

      // Use reasonable timeout for CLI responses (15 seconds instead of 5)
      const gracefulTimeout = Math.min(timeout_ms, 15000);
      
      // Start both operations concurrently for better performance
      const [localResult, perspectivesResult] = await Promise.allSettled([
        this.cliManager.sendCliPrompt(provider_id, prompt, mode, gracefulTimeout),
        this.callPerspectivesForCli(args, null)
      ]);

      // Process results
      const localResponse = localResult.status === 'fulfilled' ? localResult.value : {
        success: false,
        error: `CLI check failed: ${localResult.reason?.message || 'Unknown error'}`,
        latency_ms: gracefulTimeout,
        timestamp: new Date().toISOString()
      };

      const perspectivesResponse = perspectivesResult.status === 'fulfilled' ? perspectivesResult.value : {
        success: false,
        error: `Perspectives failed: ${perspectivesResult.reason?.message || 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };

      // Record usage locally (file-based analytics) - non-blocking
      this.recordLocalUsage(provider_id, prompt, localResponse).catch(err => {
        console.error('[Stdio Wrapper] Usage recording failed (non-critical):', err.message);
      });

      // Combine results
      return this.combineCliAndPerspectives(localResponse, perspectivesResponse, args);

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
   * Select the best available CLI provider automatically
   */
  async selectBestProvider() {
    try {
      const allStatus = await this.cliManager.getCliStatus();
      
      // Priority order: claude_code > codex_cli > gemini_cli
      const priorityOrder = ['claude_code', 'codex_cli', 'gemini_cli'];
      
      for (const providerId of priorityOrder) {
        const status = allStatus[providerId];
        if (status && status.available && status.authenticated) {
          return providerId;
        }
      }
      
      // If no authenticated provider, return the first available one
      for (const providerId of priorityOrder) {
        const status = allStatus[providerId];
        if (status && status.available) {
          return providerId;
        }
      }
      
      // Default fallback to claude_code (will trigger remote perspectives)
      return 'claude_code';
      
    } catch (error) {
      console.error('[Stdio Wrapper] Provider selection failed, defaulting to claude_code:', error);
      return 'claude_code';
    }
  }

  /**
   * Call remote perspectives for CLI prompts
   */
  async callPerspectivesForCli(args, localResult) {
    console.error(`[Stdio Wrapper] Calling remote perspectives for CLI prompt`);
    
    try {
      const perspectivesRequest = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'get_perspectives',
          arguments: {
            prompt: args.prompt,
            user_token: this.userToken,
            // Let the remote server use user's configured preferences for models
            // Don't specify models to use dashboard defaults
            project_memory: 'none',
            temperature: 0.7,
            max_tokens: 2000
          }
        },
        id: `perspectives-${Date.now()}`
      };

      const remoteResponse = await this.forwardToRemoteServer(perspectivesRequest);
      
      if (remoteResponse.result && remoteResponse.result.content && remoteResponse.result.content[0]) {
        // The remote response already contains formatted "Multiple AI Perspectives" content
        // Return it as-is without additional formatting to avoid duplication
        const rawContent = remoteResponse.result.content[0].text;
        return {
          success: true,
          content: rawContent,
          timestamp: new Date().toISOString(),
          raw: true // Flag to indicate this is pre-formatted content
        };
      } else if (remoteResponse.error) {
        return {
          success: false,
          error: remoteResponse.error.message || 'Remote perspectives failed',
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          error: 'Unexpected remote response format',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('[Stdio Wrapper] Perspectives call error:', error);
      return {
        success: false,
        error: `Perspectives request failed: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Combine local CLI and remote perspectives results
   */
  combineCliAndPerspectives(localResult, perspectivesResult, args) {
    const combinedResult = {
      success: true,
      timestamp: new Date().toISOString(),
      provider: args.provider_id,
      mode: args.mode,
      sections: {
        local: localResult,
        remote: perspectivesResult
      }
    };

    // Determine overall success and fallback status
    if (localResult.success && perspectivesResult.success) {
      combinedResult.content = this.formatCombinedResponse(localResult, perspectivesResult, false);
      combinedResult.tokens_used = localResult.tokens_used || 0;
      combinedResult.latency_ms = localResult.latency_ms || 0;
    } else if (!localResult.success && perspectivesResult.success) {
      // Fallback case
      combinedResult.content = this.formatCombinedResponse(localResult, perspectivesResult, true);
      combinedResult.fallback_used = true;
      combinedResult.tokens_used = 0; // No local tokens used
    } else if (localResult.success && !perspectivesResult.success) {
      // Local succeeded, remote failed
      combinedResult.content = this.formatCombinedResponse(localResult, perspectivesResult, false);
      combinedResult.tokens_used = localResult.tokens_used || 0;
      combinedResult.latency_ms = localResult.latency_ms || 0;
    } else {
      // Both failed
      combinedResult.success = false;
      combinedResult.error = `Local CLI failed: ${localResult.error}; Perspectives also failed: ${perspectivesResult.error}`;
    }

    return combinedResult;
  }

  /**
   * Format combined response text
   */
  formatCombinedResponse(localResult, perspectivesResult, isFallback) {
    let formatted = '';

    if (localResult.success) {
      // Local CLI succeeded
      formatted += `🟢 **Local CLI Response** (${localResult.provider} - ${localResult.mode} mode)\n\n`;
      formatted += `${localResult.content}\n\n`;
      formatted += `*Latency: ${localResult.latency_ms || 0}ms | Tokens: ${localResult.tokens_used || 0}*\n\n`;
      formatted += `---\n\n`;
    } else if (isFallback) {
      // Local CLI failed, using fallback
      formatted += `⚠️ **Local CLI unavailable**: ${localResult.error}\n`;
      formatted += `Using perspectives fallback.\n\n`;
      formatted += `---\n\n`;
    }

    if (perspectivesResult.success) {
      if (perspectivesResult.raw) {
        // Raw content is already formatted - use as-is without any additional title
        // The remote server already includes proper headers like "Multiple AI Perspectives"
        formatted += `${perspectivesResult.content}\n\n`;
      } else {
        // Legacy formatting for non-raw content (shouldn't be used with current server)
        const title = isFallback ? '🧠 **Perspectives Fallback**' : '🧠 **Supplemental Multi-Model Perspectives**';
        formatted += `${title}\n\n`;
        formatted += `${perspectivesResult.content}\n\n`;
      }
    } else if (!isFallback) {
      // Show remote error only if not in fallback mode
      formatted += `❌ **Perspectives request failed**: ${perspectivesResult.error}\n\n`;
    }

    return formatted.trim();
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

      // Ensure directory exists
      if (!fs.existsSync(polydevevDir)) {
        fs.mkdirSync(polydevevDir, { recursive: true });
      }

      // Load existing usage data
      let usageData = [];
      if (fs.existsSync(usageFile)) {
        try {
          usageData = JSON.parse(fs.readFileSync(usageFile, 'utf8'));
        } catch (parseError) {
          console.error('[Stdio Wrapper] Failed to parse existing usage file, starting fresh:', parseError);
          usageData = [];
        }
      }

      // Add new usage record
      usageData.push({
        timestamp: new Date().toISOString(),
        provider: providerId,
        prompt_length: prompt.length,
        success: response.success,
        latency_ms: response.latency_ms || response.latencyMs || 0,
        tokens_used: response.tokens_used || response.tokensUsed || 0
      });

      // Keep only last 1000 records
      if (usageData.length > 1000) {
        usageData = usageData.slice(-1000);
      }

      fs.writeFileSync(usageFile, JSON.stringify(usageData, null, 2));
      console.error(`[Stdio Wrapper] Usage recorded locally`);

    } catch (error) {
      console.error('[Stdio Wrapper] Failed to record local usage (non-critical):', error.message);
      // Don't throw - this is non-critical functionality
    }
  }

  /**
   * Format CLI response for MCP output
   */
  formatCliResponse(result) {
    if (!result.success) {
      return `❌ **CLI Error**\n\n${result.error}\n\n*Timestamp: ${result.timestamp}*`;
    }

    // Handle combined CLI + perspectives response
    if (result.sections) {
      return result.content;
    }

    if (result.content) {
      // Standard prompt response
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
