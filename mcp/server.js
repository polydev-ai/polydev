#!/usr/bin/env node

// Register ts-node for TypeScript support
try {
  require('ts-node/register');
} catch (e) {
  // ts-node not available, proceed without it
}

const fs = require('fs');
const path = require('path');
const CLIManager = require('../lib/cliManager').default;

let UniversalMemoryExtractor;
try {
  UniversalMemoryExtractor = require('../src/lib/universalMemoryExtractor').UniversalMemoryExtractor;
} catch (e) {
  // Fallback if TypeScript module is not available
  console.warn('UniversalMemoryExtractor not available, memory features will be disabled');
  UniversalMemoryExtractor = class {
    async detectMemorySources() { return []; }
    async extractMemory() { return {}; }
    async getRecentConversations() { return []; }
    async getRelevantContext() { return ''; }
    async getPreferences() { return {}; }
    async updatePreferences() { return {}; }
    async resetPreferences() { return {}; }
  };
}

class MCPServer {
  constructor() {
    this.capabilities = {
      tools: {},
      resources: {},
      prompts: {}
    };
    
    this.tools = new Map();
    this.cliManager = new CLIManager();
    this.memoryExtractor = new UniversalMemoryExtractor();
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
        
        case 'force_cli_detection':
          result = await this.forceCliDetection(args);
          break;
        
        case 'get_cli_status':
          result = await this.getCliStatus(args);
          break;
        
        case 'send_cli_prompt':
          result = await this.sendCliPrompt(args);
          break;
        
        case 'enable_status_reporting':
          result = await this.enableStatusReporting(args);
          break;
        
        case 'disable_status_reporting':
          result = await this.disableStatusReporting(args);
          break;
        
        case 'get_status_reporting_info':
          result = await this.getStatusReportingInfo(args);
          break;
        
        case 'detect_memory_sources':
          result = await this.detectMemorySources(args);
          break;
        
        case 'extract_memory':
          result = await this.extractMemory(args);
          break;
        
        case 'get_recent_conversations':
          result = await this.getRecentConversations(args);
          break;
        
        case 'get_memory_context':
          result = await this.getMemoryContext(args);
          break;
        
        case 'manage_memory_preferences':
          result = await this.manageMemoryPreferences(args);
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

    // Auto-inject memory context if enabled and not already provided
    let enhancedPrompt = args.prompt;
    if (!args.project_memory && args.auto_inject_memory !== false) {
      try {
        console.error('[Polydev MCP] Attempting to inject memory context...');
        const memoryContext = await this.getMemoryContext({
          prompt: args.prompt,
          cli_tools: ['all'],
          max_entries: 3
        });
        
        if (memoryContext.success && memoryContext.context.entries.length > 0) {
          const contextText = memoryContext.context.entries
            .map(entry => `[${entry.source}] ${entry.content.substring(0, 500)}`)
            .join('\n\n');
          
          enhancedPrompt = `Context from previous work:\n${contextText}\n\nCurrent request:\n${args.prompt}`;
          console.error(`[Polydev MCP] Injected ${memoryContext.context.entries.length} memory entries`);
        }
      } catch (error) {
        console.error('[Polydev MCP] Memory injection failed, continuing without:', error.message);
      }
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
          arguments: {
            ...args,
            prompt: enhancedPrompt,
            project_memory: enhancedPrompt !== args.prompt ? 'auto-injected' : args.project_memory
          }
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
      
      case 'force_cli_detection':
        return this.formatCliDetectionResponse(result);

      case 'get_cli_status':
        return this.formatCliStatusResponse(result);

      case 'send_cli_prompt':
        return this.formatCliPromptResponse(result);

      case 'enable_status_reporting':
      case 'disable_status_reporting':
      case 'get_status_reporting_info':
        return this.formatStatusReportingResponse(result);

      case 'detect_memory_sources':
      case 'extract_memory':
      case 'get_recent_conversations':
      case 'get_memory_context':
      case 'manage_memory_preferences':
        return this.formatMemoryResponse(result);
      
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
      
      // Ensure timeout_ms is valid (not undefined, null, Infinity, or negative)
      let validTimeout = timeout_ms;
      if (!validTimeout || validTimeout === Infinity || validTimeout < 1 || validTimeout > 300000) {
        validTimeout = 30000 // Default to 30 seconds
      }
      
      if (!provider_id || !prompt) {
        throw new Error('provider_id and prompt are required');
      }

      // Send prompt using CLI Manager
      const response = await this.cliManager.sendCliPrompt(
        provider_id, 
        prompt, 
        mode, 
        validTimeout
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

  // ============================================
  // Status Reporting Methods
  // ============================================

  /**
   * Enable status reporting to polydev.ai server
   */
  async enableStatusReporting(args) {
    console.log('[MCP Server] Enable status reporting requested');
    
    try {
      const { user_token, heartbeat_interval_minutes = 15, start_heartbeat = true } = args;
      
      const token = user_token || process.env.POLYDEV_USER_TOKEN;
      
      if (!token) {
        return {
          success: false,
          error: 'user_token is required. Either pass it as an argument or set POLYDEV_USER_TOKEN environment variable.',
          timestamp: new Date().toISOString()
        };
      }

      // Enable status reporting on CLI manager
      const enabled = this.cliManager.enableStatusReporting(token, {
        heartbeatIntervalMs: heartbeat_interval_minutes * 60 * 1000
      });

      if (!enabled) {
        return {
          success: false,
          error: 'StatusReporter is not available. Make sure the polydev-ai package is up to date.',
          timestamp: new Date().toISOString()
        };
      }

      // Start heartbeat if requested
      if (start_heartbeat) {
        this.cliManager.startStatusHeartbeat();
      }

      // Trigger initial status report
      const statuses = await this.cliManager.forceCliDetection();

      return {
        success: true,
        message: 'Status reporting enabled successfully',
        heartbeat_enabled: start_heartbeat,
        heartbeat_interval_minutes,
        initial_status: statuses,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('[MCP Server] Enable status reporting error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Disable status reporting
   */
  async disableStatusReporting(args) {
    console.log('[MCP Server] Disable status reporting requested');
    
    try {
      this.cliManager.disableStatusReporting();

      return {
        success: true,
        message: 'Status reporting disabled',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('[MCP Server] Disable status reporting error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get status reporting configuration and history
   */
  async getStatusReportingInfo(args) {
    console.log('[MCP Server] Get status reporting info requested');
    
    try {
      const info = this.cliManager.getStatusReportingInfo();

      return {
        success: true,
        ...info,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('[MCP Server] Get status reporting info error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Format status reporting responses
   */
  formatStatusReportingResponse(result) {
    if (!result.success) {
      return `❌ Status Reporting Error: ${result.error}`;
    }

    let formatted = `# Status Reporting\n\n`;
    formatted += `✅ ${result.message || 'Operation completed'}\n`;
    formatted += `⏰ ${result.timestamp}\n\n`;

    if (result.config) {
      formatted += `## Configuration\n`;
      formatted += `- **Server URL**: ${result.config.serverUrl}\n`;
      formatted += `- **Reporting Enabled**: ${result.config.reportingEnabled ? '✅' : '❌'}\n`;
      formatted += `- **Heartbeat Running**: ${result.config.heartbeatRunning ? '✅' : '❌'}\n`;
      formatted += `- **Heartbeat Interval**: ${Math.round(result.config.heartbeatIntervalMs / 60000)} minutes\n`;
      formatted += `- **Online**: ${result.config.isOnline ? '✅' : '❌'}\n`;
      formatted += `- **Pending Reports**: ${result.config.pendingReportsCount}\n\n`;
    }

    if (result.initial_status) {
      formatted += `## Initial CLI Status\n`;
      Object.entries(result.initial_status).forEach(([provider, status]) => {
        const icon = status.available && status.authenticated ? '🟢' : 
                    status.available ? '🟡' : '🔴';
        formatted += `${icon} **${provider}**: ${status.available ? 'Available' : 'Not Available'}`;
        if (status.authenticated) formatted += ' (Authenticated)';
        formatted += `\n`;
      });
      formatted += `\n`;
    }

    if (result.history && result.history.length > 0) {
      formatted += `## Recent Report History\n`;
      const recentHistory = result.history.slice(-5);
      recentHistory.forEach(entry => {
        const icon = entry.success ? '✅' : '❌';
        formatted += `${icon} ${entry.provider}: ${entry.status} at ${entry.timestamp}\n`;
      });
    }

    if (result.heartbeat_enabled !== undefined) {
      formatted += `\n## Heartbeat\n`;
      formatted += `- **Enabled**: ${result.heartbeat_enabled ? '✅' : '❌'}\n`;
      if (result.heartbeat_interval_minutes) {
        formatted += `- **Interval**: Every ${result.heartbeat_interval_minutes} minutes\n`;
      }
    }

    return formatted;
  }

  /**
   * Detect available memory sources across CLI tools
   */
  async detectMemorySources(args) {
    console.log('[MCP Server] Detect memory sources requested');
    
    try {
      const { cli_tools = ['all'] } = args;
      
      const sources = await this.memoryExtractor.detectMemorySources(cli_tools);
      
      return {
        success: true,
        sources,
        message: `Detected ${Object.keys(sources).length} memory sources`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[MCP Server] Memory detection error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Extract memory from detected sources
   */
  async extractMemory(args) {
    console.log('[MCP Server] Extract memory requested');
    
    try {
      const { cli_tools = ['all'], memory_types = ['all'], project_path } = args;
      
      const extractedMemory = await this.memoryExtractor.extractMemory({
        cliTools: cli_tools,
        memoryTypes: memory_types,
        projectPath: project_path
      });
      
      return {
        success: true,
        memory: extractedMemory,
        message: `Extracted ${extractedMemory.totalEntries} memory entries`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[MCP Server] Memory extraction error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get recent conversations from CLI tools
   */
  async getRecentConversations(args) {
    console.log('[MCP Server] Get recent conversations requested');
    
    try {
      const { cli_tools = ['all'], limit = 10, project_path } = args;
      
      const conversations = await this.memoryExtractor.getRecentConversations({
        cliTools: cli_tools,
        limit,
        projectPath: project_path
      });
      
      return {
        success: true,
        conversations,
        message: `Retrieved ${conversations.length} recent conversations`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[MCP Server] Conversation retrieval error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get relevant memory context for current prompt
   */
  async getMemoryContext(args) {
    console.log('[MCP Server] Get memory context requested');
    
    try {
      const { prompt, cli_tools = ['all'], max_entries = 5, project_path } = args;
      
      if (!prompt) {
        throw new Error('prompt is required for context retrieval');
      }
      
      const context = await this.memoryExtractor.getRelevantContext({
        prompt,
        cliTools: cli_tools,
        maxEntries: max_entries,
        projectPath: project_path
      });
      
      return {
        success: true,
        context,
        message: `Found ${context.entries.length} relevant context entries`,
        relevanceScore: context.averageRelevance,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[MCP Server] Context retrieval error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Manage memory preferences and settings
   */
  async manageMemoryPreferences(args) {
    console.log('[MCP Server] Manage memory preferences requested');
    
    try {
      const { action = 'get', preferences = {} } = args;
      
      let result;
      
      switch (action) {
        case 'get':
          result = await this.memoryExtractor.getPreferences();
          break;
        
        case 'set':
          result = await this.memoryExtractor.updatePreferences(preferences);
          break;
        
        case 'reset':
          result = await this.memoryExtractor.resetPreferences();
          break;
        
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      
      return {
        success: true,
        preferences: result,
        message: `Memory preferences ${action} completed`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[MCP Server] Preferences management error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Format memory tool responses
   */
  formatMemoryResponse(result) {
    if (!result.success) {
      return `❌ Memory Operation Failed: ${result.error}`;
    }

    let formatted = `# Memory Operation Results\n\n`;
    formatted += `✅ ${result.message}\n`;
    formatted += `⏰ ${result.timestamp}\n\n`;

    // Format specific results based on operation type
    if (result.sources) {
      formatted += this.formatMemorySourcesResult(result.sources);
    } else if (result.memory) {
      formatted += this.formatExtractedMemoryResult(result.memory);
    } else if (result.conversations) {
      formatted += this.formatConversationsResult(result.conversations);
    } else if (result.context) {
      formatted += this.formatContextResult(result.context, result.relevanceScore);
    } else if (result.preferences) {
      formatted += this.formatPreferencesResult(result.preferences);
    }

    return formatted;
  }

  formatMemorySourcesResult(sources) {
    let formatted = `## 📁 Memory Sources Detected\n\n`;
    
    Object.entries(sources).forEach(([cliTool, toolSources]) => {
      formatted += `### ${cliTool.toUpperCase().replace('_', ' ')}\n`;
      
      Object.entries(toolSources).forEach(([memoryType, files]) => {
        const icon = memoryType === 'global' ? '🌍' : memoryType === 'project' ? '📂' : '💬';
        formatted += `${icon} **${memoryType}**: ${files.length} sources\n`;
        
        files.forEach(file => {
          const status = file.exists ? '✅' : '❌';
          formatted += `  ${status} \`${file.path}\`\n`;
        });
      });
      
      formatted += `\n`;
    });
    
    return formatted;
  }

  formatExtractedMemoryResult(memory) {
    let formatted = `## 🧠 Extracted Memory\n\n`;
    formatted += `📊 **Total Entries**: ${memory.totalEntries}\n`;
    formatted += `💾 **Total Size**: ${(memory.totalSize / 1024).toFixed(1)}KB\n\n`;
    
    Object.entries(memory.byCliTool).forEach(([cliTool, toolMemory]) => {
      formatted += `### ${cliTool.toUpperCase().replace('_', ' ')}\n`;
      formatted += `- Global: ${toolMemory.global.length} entries\n`;
      formatted += `- Project: ${toolMemory.project.length} entries\n`;
      formatted += `- Conversations: ${toolMemory.conversations.length} entries\n\n`;
    });
    
    return formatted;
  }

  formatConversationsResult(conversations) {
    let formatted = `## 💬 Recent Conversations\n\n`;
    
    conversations.forEach((conv, index) => {
      formatted += `### ${index + 1}. ${conv.cliTool.toUpperCase().replace('_', ' ')}\n`;
      formatted += `📅 ${new Date(conv.timestamp).toLocaleString()}\n`;
      formatted += `💭 ${conv.messageCount} messages, ${(conv.size / 1024).toFixed(1)}KB\n`;
      
      if (conv.topics && conv.topics.length > 0) {
        formatted += `🏷️ Topics: ${conv.topics.join(', ')}\n`;
      }
      
      formatted += `\n`;
    });
    
    return formatted;
  }

  formatContextResult(context, relevanceScore) {
    let formatted = `## 🎯 Relevant Context\n\n`;
    formatted += `📊 **Average Relevance**: ${(relevanceScore * 100).toFixed(1)}%\n\n`;
    
    context.entries.forEach((entry, index) => {
      formatted += `### ${index + 1}. ${entry.source} (${(entry.relevance * 100).toFixed(1)}%)\n`;
      formatted += `${entry.content.substring(0, 200)}...\n\n`;
    });
    
    return formatted;
  }

  formatPreferencesResult(preferences) {
    let formatted = `## ⚙️ Memory Preferences\n\n`;
    
    Object.entries(preferences).forEach(([key, value]) => {
      formatted += `- **${key}**: ${typeof value === 'object' ? JSON.stringify(value) : value}\n`;
    });
    
    return formatted;
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
