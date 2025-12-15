#!/usr/bin/env node

// Lightweight stdio wrapper with local CLI functionality and remote Polydev MCP server fallback
const fs = require('fs');
const path = require('path');
const os = require('os');
const { CLIManager } = require('../lib/cliManager');

// Simple .env file loader (no external dependencies)
function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return false;

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let loaded = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue;

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;

      const key = trimmed.substring(0, eqIndex).trim();
      let value = trimmed.substring(eqIndex + 1).trim();

      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Only set if not already defined (don't override existing env vars)
      if (!process.env[key]) {
        process.env[key] = value;
        loaded++;
      }
    }

    return loaded > 0;
  } catch (error) {
    return false;
  }
}

// Load .env files from multiple locations (in priority order)
function loadEnvironment() {
  const envPaths = [
    path.join(process.cwd(), '.env'),           // Current working directory
    path.join(process.cwd(), '.env.local'),     // Local overrides
    path.join(os.homedir(), '.polydev.env'),    // User home directory
    path.join(os.homedir(), '.env'),            // Home directory fallback
  ];

  const loaded = [];
  for (const envPath of envPaths) {
    if (loadEnvFile(envPath)) {
      loaded.push(envPath);
    }
  }

  if (loaded.length > 0) {
    console.error(`[Stdio Wrapper] Loaded env from: ${loaded.join(', ')}`);
  }
}

// Load environment variables FIRST, before any checks
loadEnvironment();

function ensureWritableTmpDir() {
  const candidates = [
    process.env.POLYDEV_TMPDIR,
    '/tmp/polydev',
    '/tmp',
    path.join(os.tmpdir(), 'polydev'),
    path.join(process.cwd(), '.polydev-tmp')
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      fs.mkdirSync(candidate, { recursive: true });
      fs.accessSync(candidate, fs.constants.W_OK);
      return candidate;
    } catch (error) {
      console.warn(`[Stdio Wrapper] TMP candidate not writable (${candidate}):`, error.message);
    }
  }

  console.error('[Stdio Wrapper] No writable TMP directory found; Codex CLI will fail.');
  return null;
}

const writableTmp = ensureWritableTmpDir();
if (writableTmp) {
  process.env.TMPDIR = writableTmp;
  process.env.TMP = writableTmp;
  process.env.TEMP = writableTmp;
  console.error(`[Stdio Wrapper] Using TMP directory: ${writableTmp}`);
}

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
    
    // Smart refresh scheduler (will be started after initialization)
    this.refreshScheduler = null;
    
    // Cache for user model preferences (provider -> model)
    this.userModelPreferences = null;
    this.modelPreferencesCacheTime = null;
    this.MODEL_PREFERENCES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
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
          // Handle get_perspectives with local CLIs + remote perspectives
          const toolName = params.name;
          
          if (toolName === 'get_perspectives') {
            return await this.handleGetPerspectivesWithCLIs(params, id);
          }
          
          // Handle other CLI tools locally
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

    try {
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
    } catch (error) {
      console.error(`[Stdio Wrapper] Network error:`, error.message);
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: `Network error: ${error.message}`
        }
      };
    }
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
   * Handle get_perspectives with local CLIs + remote perspectives
   */
  async handleGetPerspectivesWithCLIs(params, id) {
    console.error(`[Stdio Wrapper] Handling get_perspectives with local CLIs + remote`);
    
    try {
      // Use existing localSendCliPrompt logic which already:
      // 1. Checks all local CLIs
      // 2. Calls remote perspectives
      // 3. Combines results
      const result = await this.localSendCliPrompt(params.arguments);
      
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: result.content || this.formatCliResponse(result)
            }
          ]
        }
      };

    } catch (error) {
      console.error(`[Stdio Wrapper] get_perspectives error:`, error);
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
   * Local CLI detection implementation with database updates
   */
  async localForceCliDetection(args) {
    console.error(`[Stdio Wrapper] Local CLI detection with model detection started`);
    
    try {
      const providerId = args.provider_id; // Optional - detect specific provider
      
      // Force detection using CLI Manager (no remote API calls)
      const results = await this.cliManager.forceCliDetection(providerId);
      
      // Save status locally to file-based cache
      await this.saveLocalCliStatus(results);

      // Update database with CLI status
      await this.updateCliStatusInDatabase(results);
      
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
        const providers = this.cliManager.getProviders();
        for (const provider of providers) {
          const status = await this.cliManager.getCliStatus(provider.id);
          results[provider.id] = status;
        }
      }

      // Update database with current status
      await this.updateCliStatusInDatabase(results);

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
   * Local CLI prompt sending with ALL available CLIs + remote perspectives
   */
  async localSendCliPrompt(args) {
    console.error(`[Stdio Wrapper] Local CLI prompt sending with perspectives`);
    
    try {
      let { provider_id, prompt, mode = 'args', timeout_ms = 30000 } = args;
      
      // Ensure timeout_ms is valid (not undefined, null, Infinity, or negative)
      if (!timeout_ms || timeout_ms === Infinity || timeout_ms < 1 || timeout_ms > 300000) {
        timeout_ms = 30000; // Default to 30 seconds
      }
      
      if (!prompt) {
        throw new Error('prompt is required');
      }

      // Use reasonable timeout for CLI responses (180 seconds for complex prompts)
      const gracefulTimeout = Math.min(timeout_ms, 180000);

      // Fetch user's model preferences (cached, non-blocking on failure)
      let modelPreferences = {};
      try {
        modelPreferences = await this.fetchUserModelPreferences();
      } catch (prefError) {
        console.error('[Stdio Wrapper] Model preferences fetch failed (will use CLI defaults):', prefError.message);
      }

      let localResults = [];

      if (provider_id) {
        // Specific provider requested - use only that one
        console.error(`[Stdio Wrapper] Using specific provider: ${provider_id}`);
        const model = modelPreferences[provider_id] || null;
        if (model) {
          console.error(`[Stdio Wrapper] Using user's preferred model for ${provider_id}: ${model}`);
        } else {
          console.error(`[Stdio Wrapper] No model preference for ${provider_id}, using CLI default`);
        }
        const result = await this.cliManager.sendCliPrompt(provider_id, prompt, mode, gracefulTimeout, model);
        localResults = [{ provider_id, ...result }];
      } else {
        // No specific provider - use ALL available local CLIs
        console.error(`[Stdio Wrapper] Using all available local CLIs`);
        const availableProviders = await this.getAllAvailableProviders();
        
        if (availableProviders.length === 0) {
          console.error(`[Stdio Wrapper] No local CLIs available, will use remote perspectives only`);
          localResults = [];
        } else {
          console.error(`[Stdio Wrapper] Found ${availableProviders.length} available CLIs: ${availableProviders.join(', ')}`);
          
          // Run all CLI prompts concurrently
          const cliPromises = availableProviders.map(async (providerId) => {
            try {
              const model = modelPreferences[providerId] || null;
              if (model) {
                console.error(`[Stdio Wrapper] Using user's preferred model for ${providerId}: ${model}`);
              }
              const result = await this.cliManager.sendCliPrompt(providerId, prompt, mode, gracefulTimeout, model);
              return { provider_id: providerId, ...result };
            } catch (error) {
              console.error(`[Stdio Wrapper] CLI ${providerId} failed:`, error.message);
              return {
                provider_id: providerId,
                success: false,
                error: error.message,
                latency_ms: gracefulTimeout
              };
            }
          });

          localResults = await Promise.all(cliPromises);
        }
      }

      // Report CLI results to server for dashboard storage (non-blocking)
      this.reportCliResultsToServer(prompt, localResults, args).catch(err => {
        console.error('[Stdio Wrapper] CLI results reporting failed (non-critical):', err.message);
      });

      // Get remote perspectives (only for models not covered by local CLIs)
      const perspectivesResult = await this.callPerspectivesForCli(args, localResults);

      // Record usage for all CLI responses
      for (const localResult of localResults) {
        if (localResult.provider_id) {
          this.recordLocalUsage(localResult.provider_id, prompt, localResult).catch(err => {
            console.error(`[Stdio Wrapper] Usage recording failed for ${localResult.provider_id} (non-critical):`, err.message);
          });
        }
      }

      // Combine all results
      return this.combineAllCliAndPerspectives(localResults, perspectivesResult, args);

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
   * Get all available and authenticated CLI providers
   */
  async getAllAvailableProviders() {
    try {
      const results = await this.cliManager.forceCliDetection();
      const availableProviders = [];
      
      // Priority order: claude_code > codex_cli > gemini_cli
      const priorityOrder = ['claude_code', 'codex_cli', 'gemini_cli'];
      
      for (const providerId of priorityOrder) {
        const status = results[providerId];
        if (status && status.available && status.authenticated) {
          availableProviders.push(providerId);
        }
      }
      
      return availableProviders;
      
    } catch (error) {
      console.error('[Stdio Wrapper] Failed to get available providers:', error);
      return [];
    }
  }

  /**
   * Report CLI results to server for dashboard storage
   * This stores CLI results in Supabase so they appear in the dashboard
   */
  async reportCliResultsToServer(prompt, localResults, args = {}) {
    // Only report if we have successful CLI results
    const successfulResults = localResults.filter(r => r.success);
    if (successfulResults.length === 0) {
      console.error('[Stdio Wrapper] No successful CLI results to report');
      return;
    }

    if (!this.userToken) {
      console.error('[Stdio Wrapper] No user token available for CLI results reporting');
      return;
    }

    try {
      const cliResults = localResults.map(result => ({
        provider_id: result.provider_id,
        model: result.model || this.getDefaultModelForCli(result.provider_id),
        content: result.content || '',
        tokens_used: result.tokens_used || 0,
        latency_ms: result.latency_ms || 0,
        success: result.success || false,
        error: result.error || null
      }));

      const reportPayload = {
        prompt: prompt,
        cli_results: cliResults,
        temperature: args.temperature || 0.7,
        max_tokens: args.max_tokens || 20000
      };

      const response = await fetch(`${this.serverUrl.replace('/mcp', '')}/api/mcp/report-cli-results`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.userToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'polydev-stdio-wrapper/1.0.0'
        },
        body: JSON.stringify(reportPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Stdio Wrapper] Failed to report CLI results:', response.status, errorText);
        return;
      }

      const result = await response.json();
      console.error(`[Stdio Wrapper] CLI results reported to dashboard: ${result.stored} results stored`);
      
    } catch (error) {
      // Non-critical - log and continue
      console.error('[Stdio Wrapper] Error reporting CLI results (non-critical):', error.message);
    }
  }

  /**
   * Get default model name for a CLI tool (used when model not specified in result)
   */
  getDefaultModelForCli(providerId) {
    const defaults = {
      'claude_code': 'claude-sonnet-4-20250514',
      'codex_cli': 'gpt-4.1',
      'gemini_cli': 'gemini-2.5-pro'
    };
    return defaults[providerId] || providerId;
  }

  /**
   * Call remote perspectives for CLI prompts
   * Only calls remote APIs for providers NOT covered by successful local CLIs
   */
  async callPerspectivesForCli(args, localResults) {
    // Determine which providers succeeded locally
    const successfulLocalProviders = localResults
      .filter(r => r.success)
      .map(r => r.provider_id);
    
    // Map CLI provider IDs to API provider names for exclusion
    const cliToApiProvider = {
      'claude_code': 'anthropic',
      'codex_cli': 'openai', 
      'gemini_cli': 'google'
    };
    
    const excludeProviders = successfulLocalProviders
      .map(cli => cliToApiProvider[cli])
      .filter(Boolean);
    
    // If all major providers are covered locally, skip remote call entirely
    if (excludeProviders.length >= 3 || 
        (excludeProviders.includes('anthropic') && excludeProviders.includes('openai') && excludeProviders.includes('google'))) {
      console.error(`[Stdio Wrapper] All providers covered by local CLIs, skipping remote perspectives`);
      return {
        success: true,
        content: '',
        skipped: true,
        reason: 'All providers covered by local CLIs',
        timestamp: new Date().toISOString()
      };
    }
    
    console.error(`[Stdio Wrapper] Calling remote perspectives (excluding: ${excludeProviders.join(', ') || 'none'})`);
    
    try {
      const perspectivesRequest = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'get_perspectives',
          arguments: {
            prompt: args.prompt,
            user_token: this.userToken,
            // Exclude providers that succeeded locally
            exclude_providers: excludeProviders,
            project_memory: 'none',
            temperature: 0.7,
            max_tokens: 20000
          }
        },
        id: `perspectives-${Date.now()}`
      };

      const remoteResponse = await this.forwardToRemoteServer(perspectivesRequest);

      // Guard against undefined/null response
      if (!remoteResponse) {
        return {
          success: false,
          error: 'No response from remote server',
          timestamp: new Date().toISOString()
        };
      }

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
        // Normalize error - handle both string and object formats
        const errorMessage = typeof remoteResponse.error === 'string'
          ? remoteResponse.error
          : (remoteResponse.error?.message || JSON.stringify(remoteResponse.error) || 'Remote perspectives failed');
        return {
          success: false,
          error: errorMessage,
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
   * Combine multiple CLI results and remote perspectives
   */
  combineAllCliAndPerspectives(localResults, perspectivesResult, args) {
    // Ensure perspectivesResult is always an object to prevent undefined errors
    const safePersp = perspectivesResult || { success: false, error: 'No response from perspectives server' };

    const combinedResult = {
      success: true,
      timestamp: new Date().toISOString(),
      mode: args.mode,
      local_cli_count: localResults.length,
      sections: {
        local: localResults,
        remote: safePersp
      }
    };

    // Check if any local CLIs succeeded
    const successfulClis = localResults.filter(result => result.success);
    const hasSomeLocalSuccess = successfulClis.length > 0;

    // Determine overall success and content
    if (hasSomeLocalSuccess && safePersp.success) {
      combinedResult.content = this.formatMultipleCliResponse(localResults, safePersp, false);
      combinedResult.tokens_used = successfulClis.reduce((total, cli) => total + (cli.tokens_used || 0), 0);
      combinedResult.latency_ms = Math.max(...successfulClis.map(cli => cli.latency_ms || 0));
    } else if (!hasSomeLocalSuccess && safePersp.success) {
      // Complete fallback case - no local CLIs worked
      combinedResult.content = this.formatMultipleCliResponse(localResults, safePersp, true);
      combinedResult.fallback_used = true;
      combinedResult.tokens_used = 0; // No local tokens used
    } else if (hasSomeLocalSuccess && !safePersp.success) {
      // Local CLIs succeeded, remote failed
      combinedResult.content = this.formatMultipleCliResponse(localResults, safePersp, false);
      combinedResult.tokens_used = successfulClis.reduce((total, cli) => total + (cli.tokens_used || 0), 0);
      combinedResult.latency_ms = Math.max(...successfulClis.map(cli => cli.latency_ms || 0));
    } else {
      // Both failed
      combinedResult.success = false;
      const cliErrors = localResults.map(cli => `${cli.provider_id}: ${cli.error || 'Unknown error'}`).join('; ');
      const perspectivesError = safePersp.error || 'Unknown remote error';
      combinedResult.error = `All local CLIs failed: ${cliErrors}; Perspectives also failed: ${perspectivesError}`;
    }

    return combinedResult;
  }

  /**
   * Format multiple CLI responses with remote perspectives
   */
  formatMultipleCliResponse(localResults, perspectivesResult, isFallback) {
    // Safety check - ensure perspectivesResult is always an object
    const safePersp = perspectivesResult || { success: false, error: 'No perspectives data' };
    let formatted = '';

    // Show all local CLI responses
    const successfulClis = localResults.filter(result => result.success);
    const failedClis = localResults.filter(result => !result.success);

    if (successfulClis.length > 0) {
      // Show successful CLI responses
      for (const cliResult of successfulClis) {
        formatted += `🟢 **Local CLI Response** (${cliResult.provider_id} - ${cliResult.mode || 'args'} mode)\n\n`;
        formatted += `${cliResult.content}\n\n`;
        formatted += `*Latency: ${cliResult.latency_ms || 0}ms | Tokens: ${cliResult.tokens_used || 0}*\n\n`;
        formatted += `---\n\n`;
      }
    }

    if (failedClis.length > 0 && successfulClis.length === 0) {
      // All local CLIs failed
      formatted += `⚠️ **All Local CLIs Unavailable**\n`;
      for (const cliResult of failedClis) {
        formatted += `- ${cliResult.provider_id}: ${cliResult.error}\n`;
      }
      formatted += `Using perspectives fallback.\n\n`;
      formatted += `---\n\n`;
    } else if (failedClis.length > 0) {
      // Some CLIs failed, some succeeded
      formatted += `⚠️ **Some CLIs Failed**\n`;
      for (const cliResult of failedClis) {
        formatted += `- ${cliResult.provider_id}: ${cliResult.error}\n`;
      }
      formatted += `\n---\n\n`;
    }

    // Add remote perspectives
    if (safePersp.success) {
      if (safePersp.raw) {
        // Raw content is already formatted - use as-is
        formatted += `${safePersp.content}\n\n`;
      } else {
        // Legacy formatting
        const title = (successfulClis.length === 0) ? '🧠 **Perspectives Fallback**' : '🧠 **Supplemental Multi-Model Perspectives**';
        formatted += `${title}\n\n`;
        formatted += `${safePersp.content}\n\n`;
      }
    } else if (successfulClis.length > 0) {
      // Show remote error only if we have local success
      formatted += `❌ **Perspectives request failed**: ${safePersp.error || 'Unknown error'}\n\n`;
    }

    return formatted.trim();
  }

  /**
   * Update CLI status in database
   */
  async updateCliStatusInDatabase(results) {
    console.error('[Stdio Wrapper] Updating CLI status in database...');
    
    try {
      // Get user token from environment variables
      const userToken = process.env.POLYDEV_MCP_TOKEN || this.userToken;
      
      if (!userToken) {
        console.error('[Stdio Wrapper] No user token available for database updates');
        return;
      }
      
      console.error(`[Stdio Wrapper] Using token: ${userToken ? userToken.substring(0, 20) + '...' : 'MISSING'}`);
      
      for (const [providerId, result] of Object.entries(results)) {
        const statusData = {
          provider: providerId,
          status: result.available ? 'available' : 'unavailable',
          mcp_token: userToken,
          cli_version: result.version || null,
          cli_path: result.cli_path || null,
          authenticated: result.authenticated || false,
          last_used: result.last_checked || new Date().toISOString(),
          message: result.error || `${providerId} is ${result.available ? 'available' : 'unavailable'}`,
          additional_info: {
            default_model: result.default_model || null,
            available_models: result.available_models || [],
            model_detection_method: result.model_detection_method || 'fallback',
            model_detected_at: result.model_detected_at || new Date().toISOString()
          }
        };

        console.error(`[Stdio Wrapper] Updating ${providerId} with data:`, JSON.stringify({
          provider: statusData.provider,
          status: statusData.status,
          authenticated: statusData.authenticated
        }, null, 2));

        const response = await fetch('https://www.polydev.ai/api/cli-status-update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(statusData)
        });

        if (response.ok) {
          const responseData = await response.json();
          console.error(`[Stdio Wrapper] Successfully updated ${providerId} status in database`);
        } else {
          const errorText = await response.text();
          console.error(`[Stdio Wrapper] Failed to update ${providerId}: ${response.status} - ${errorText}`);
        }
      }

    } catch (error) {
      console.error('[Stdio Wrapper] Error updating database:', error);
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
   * Load CLI status from local file cache
   */
  async loadLocalCliStatus() {
    try {
      const homeDir = require('os').homedir();
      const statusFile = path.join(homeDir, '.polydev', 'cli-status.json');
      
      if (fs.existsSync(statusFile)) {
        const data = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
        return data.results || {};
      }
    } catch (error) {
      console.error('[Stdio Wrapper] Failed to load local status:', error);
    }
    return {};
  }

  /**
   * Get smart timeout based on CLI status (same logic as SmartCliCache)
   * Returns timeout in minutes
   */
  getSmartTimeout(cliStatus) {
    if (!cliStatus.available) {
      return 2; // 2 minutes - check frequently for new installs
    }
    
    if (!cliStatus.authenticated) {
      return 3; // 3 minutes - check for authentication
    }
    
    if (cliStatus.model_detection_method === 'fallback') {
      return 5; // 5 minutes - retry interactive detection
    }
    
    return 10; // 10 minutes - stable, working CLI
  }

  /**
   * Check if CLI status is stale based on smart timeout
   */
  isStale(cliStatus) {
    if (!cliStatus.last_checked) return true;
    
    const now = new Date();
    const lastChecked = new Date(cliStatus.last_checked);
    const minutesOld = (now.getTime() - lastChecked.getTime()) / (1000 * 60);
    const timeout = this.getSmartTimeout(cliStatus);
    
    return minutesOld > timeout;
  }

  /**
   * Start smart refresh scheduler
   * Checks every minute but only refreshes stale CLIs based on smart timeouts
   */
  startSmartRefreshScheduler() {
    console.error('[Stdio Wrapper] Starting smart refresh scheduler...');
    
    // Check every 1 minute, but only refresh what's actually stale
    this.refreshScheduler = setInterval(async () => {
      try {
        // Read current status from local cache
        const currentStatus = await this.loadLocalCliStatus();
        
        if (!currentStatus || Object.keys(currentStatus).length === 0) {
          console.error('[Stdio Wrapper] No local CLI status found, running initial detection...');
          await this.localForceCliDetection({});
          return;
        }
        
        // Check which CLIs need refresh based on smart timeouts
        const staleProviders = [];
        for (const [providerId, status] of Object.entries(currentStatus)) {
          if (this.isStale(status)) {
            const minutesOld = Math.floor((new Date().getTime() - new Date(status.last_checked).getTime()) / (1000 * 60));
            const timeout = this.getSmartTimeout(status);
            staleProviders.push({ providerId, minutesOld, timeout });
          }
        }
        
        if (staleProviders.length > 0) {
          console.error(`[Stdio Wrapper] Smart refresh: ${staleProviders.length} stale CLI providers detected`);
          staleProviders.forEach(({ providerId, minutesOld, timeout }) => {
            console.error(`[Stdio Wrapper] - ${providerId}: ${minutesOld} min old (timeout: ${timeout} min)`);
          });
          
          // Only detect the stale providers
          for (const { providerId } of staleProviders) {
            console.error(`[Stdio Wrapper] Refreshing ${providerId}...`);
            await this.localForceCliDetection({ provider_id: providerId });
          }
          
          console.error('[Stdio Wrapper] Smart refresh completed');
        }
        
      } catch (error) {
        console.error('[Stdio Wrapper] Smart refresh error:', error);
      }
    }, 60000); // Check every minute
    
    console.error('[Stdio Wrapper] Smart refresh scheduler started (checks every 60 seconds)');
  }

  /**
   * Stop smart refresh scheduler
   */
  stopSmartRefreshScheduler() {
    if (this.refreshScheduler) {
      clearInterval(this.refreshScheduler);
      this.refreshScheduler = null;
      console.error('[Stdio Wrapper] Smart refresh scheduler stopped');
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

    // Handle combined CLI + perspectives response (single or multiple CLIs)
    if (result.sections) {
      return result.content;
    }

    if (result.content) {
      // Standard prompt response
      const cliCount = result.local_cli_count || 1;
      
      if (cliCount > 1) {
        return `✅ **Multi-CLI Response** (${cliCount} local CLIs + perspectives)\n\n${result.content}\n\n*Total Latency: ${result.latency_ms || 0}ms | Total Tokens: ${result.tokens_used || 0} | ${result.timestamp}*`;
      } else {
        return `✅ **CLI Response** (${result.provider || 'Unknown'} - ${result.mode || 'unknown'} mode)\n\n${result.content}\n\n*Latency: ${result.latency_ms || 0}ms | Tokens: ${result.tokens_used || 0} | ${result.timestamp}*`;
      }
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

  /**
   * Fetch user's model preferences from API keys
   * Returns a map of CLI provider -> default_model
   */
  async fetchUserModelPreferences() {
    // Check cache first
    if (this.userModelPreferences && this.modelPreferencesCacheTime) {
      const cacheAge = Date.now() - this.modelPreferencesCacheTime;
      if (cacheAge < this.MODEL_PREFERENCES_CACHE_TTL) {
        console.error('[Stdio Wrapper] Using cached model preferences');
        return this.userModelPreferences;
      }
    }

    console.error('[Stdio Wrapper] Fetching user model preferences from API...');
    
    try {
      // Call the dedicated model-preferences endpoint
      const response = await fetch('https://www.polydev.ai/api/model-preferences', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.userToken}`,
          'User-Agent': 'polydev-stdio-wrapper/1.0.0'
        }
      });

      if (!response.ok) {
        console.error('[Stdio Wrapper] Failed to fetch model preferences:', response.status);
        return this.userModelPreferences || {};
      }

      const result = await response.json();
      
      if (result.success && result.modelPreferences) {
        // Cache the preferences
        this.userModelPreferences = result.modelPreferences;
        this.modelPreferencesCacheTime = Date.now();
        
        console.error('[Stdio Wrapper] Model preferences loaded:', JSON.stringify(result.modelPreferences));
        return result.modelPreferences;
      } else {
        console.error('[Stdio Wrapper] No model preferences in response');
        return this.userModelPreferences || {};
      }

    } catch (error) {
      console.error('[Stdio Wrapper] Error fetching model preferences:', error.message);
      return this.userModelPreferences || {};
    }
  }

  /**
   * Map provider name to CLI provider ID
   */
  mapProviderToCli(provider) {
    const providerLower = (provider || '').toLowerCase().trim();
    
    // Map provider names to CLI tool IDs
    const providerMap = {
      'anthropic': 'claude_code',
      'anthropic-ai': 'claude_code',
      'claude': 'claude_code',
      'openai': 'codex_cli',
      'open-ai': 'codex_cli',
      'gpt': 'codex_cli',
      'google': 'gemini_cli',
      'google-ai': 'gemini_cli',
      'gemini': 'gemini_cli'
    };
    
    return providerMap[providerLower] || null;
  }

  /**
   * Get model for a specific CLI provider
   */
  async getModelForProvider(providerId) {
    const preferences = await this.fetchUserModelPreferences();
    return preferences[providerId] || null;
  }

  async start() {
    console.log('Starting Polydev Stdio MCP Wrapper...');
    
    // Run initial CLI detection on startup
    console.error('[Stdio Wrapper] Running initial CLI detection...');
    try {
      await this.localForceCliDetection({});
      console.error('[Stdio Wrapper] Initial CLI detection completed');
    } catch (error) {
      console.error('[Stdio Wrapper] Initial CLI detection failed:', error);
    }
    
    // Start smart refresh scheduler for automatic updates
    this.startSmartRefreshScheduler();
    
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
      this.stopSmartRefreshScheduler();
      process.exit(0);
    });

    // Handle process signals
    process.on('SIGINT', () => {
      console.log('Received SIGINT, shutting down...');
      this.stopSmartRefreshScheduler();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('Received SIGTERM, shutting down...');
      this.stopSmartRefreshScheduler();
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
