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

/**
 * Clean CLI response by removing metadata and debug info
 * Strips: provider info, approval, sandbox, reasoning, session id, MCP errors, etc.
 * 
 * Codex CLI output structure:
 *   [metadata] → user → [echoed prompt] → thinking → [status] → codex → [RESPONSE]
 * 
 * Claude Code output structure:
 *   [may include JSON or plain text response]
 */
function cleanCliResponse(content) {
  if (!content || typeof content !== 'string') {
    return content || '';
  }
  
  const lines = content.split('\n');
  const cleanedLines = [];
  
  // State machine for Codex CLI output parsing
  // States: 'metadata' | 'user_section' | 'thinking_section' | 'response'
  let state = 'metadata';
  let foundCodexMarker = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Always skip MCP errors anywhere
    if (trimmed.startsWith('ERROR: MCP client for')) continue;
    if (trimmed.includes('failed to start') && trimmed.includes('MCP')) continue;
    if (trimmed.includes('handshake') && trimmed.includes('failed')) continue;
    if (trimmed.includes('connection closed')) continue;
    
    // State: metadata - skip until we hit a section marker
    if (state === 'metadata') {
      // Skip known metadata patterns
      if (!trimmed) continue;
      if (trimmed.startsWith('provider:')) continue;
      if (trimmed.startsWith('approval:')) continue;
      if (trimmed.startsWith('sandbox:')) continue;
      if (trimmed.startsWith('reasoning effort:')) continue;
      if (trimmed.startsWith('reasoning summaries:')) continue;
      if (trimmed.startsWith('session id:')) continue;
      if (trimmed.match(/^-{4,}$/)) continue; // Separator lines
      
      // Transition to user section
      if (trimmed === 'user') {
        state = 'user_section';
        continue;
      }
      
      // If we hit 'codex' directly (no user section), go to response
      if (trimmed === 'codex') {
        state = 'response';
        foundCodexMarker = true;
        continue;
      }
      
      // If we hit 'assistant' (Claude Code), this might be actual content
      if (trimmed === 'assistant') {
        state = 'response';
        continue;
      }
      
      // If no Codex markers found and we have content, it might be Claude Code output
      // Check if it looks like actual content (not metadata)
      if (!trimmed.includes(':') || trimmed.length > 100) {
        state = 'response';
        cleanedLines.push(line);
        continue;
      }
      
      continue;
    }
    
    // State: user_section - skip echoed prompt until thinking/codex
    if (state === 'user_section') {
      if (trimmed === 'thinking') {
        state = 'thinking_section';
        continue;
      }
      if (trimmed === 'codex') {
        state = 'response';
        foundCodexMarker = true;
        continue;
      }
      // Skip MCP startup logs (mcp: xxx starting/ready/failed)
      if (trimmed.startsWith('mcp:')) continue;
      if (trimmed.startsWith('mcp startup:')) continue;
      // Skip RMCP transport errors
      if (trimmed.includes('rmcp::transport')) continue;
      if (trimmed.includes('ERROR rmcp')) continue;
      // Skip everything in user section (echoed prompt, errors)
      continue;
    }
    
    // State: thinking_section - skip until codex marker
    if (state === 'thinking_section') {
      if (trimmed === 'codex') {
        state = 'response';
        foundCodexMarker = true;
        continue;
      }
      // Skip thinking content (bold status messages, reasoning)
      continue;
    }
    
    // State: response - keep actual response content
    if (state === 'response') {
      // Skip footer patterns
      if (trimmed === 'tokens used') continue;
      if (trimmed.match(/^[\d,]+$/) && i === lines.length - 1) continue; // Token count at end
      
      // Skip any remaining bold status markers
      if (trimmed.match(/^\*\*.*\*\*$/)) continue;
      
      // Keep this line
      cleanedLines.push(line);
    }
  }
  
  // Trim leading/trailing empty lines
  while (cleanedLines.length > 0 && !cleanedLines[0].trim()) {
    cleanedLines.shift();
  }
  while (cleanedLines.length > 0 && !cleanedLines[cleanedLines.length - 1].trim()) {
    cleanedLines.pop();
  }
  
  return cleanedLines.join('\n');
}

class StdioMCPWrapper {
  constructor() {
    this.userToken = process.env.POLYDEV_USER_TOKEN;
    if (!this.userToken) {
      console.error('POLYDEV_USER_TOKEN environment variable is required');
      process.exit(1);
    }
    
    // Server URL for API calls
    this.serverUrl = 'https://www.polydev.ai/api/mcp';
    
    // Initialize CLI Manager for local CLI functionality
    this.cliManager = new CLIManager();
    
    // Load manifest for tool definitions
    this.loadManifest();
    
    // Smart refresh scheduler (will be started after initialization)
    this.refreshScheduler = null;
    
    // Cache for user model preferences (provider -> model)
    this.userModelPreferences = null;
    this.perspectivesPerMessage = 2; // Default to 2 perspectives
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
          
          if (toolName === 'get_perspectives' || toolName === 'polydev.get_perspectives') {
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
   * Respects user's perspectives_per_message setting for total perspectives
   * Uses allProviders from dashboard - tries CLI first, falls back to API
   */
  async localSendCliPrompt(args) {
    console.error(`[Stdio Wrapper] Local CLI prompt sending with perspectives`);
    
    try {
      let { provider_id, prompt, mode = 'args', timeout_ms = 300000 } = args;
      
      // Ensure timeout_ms is valid (not undefined, null, Infinity, or negative)
      // Default to 5 minutes (300 seconds) for complex CLI responses
      if (!timeout_ms || timeout_ms === Infinity || timeout_ms < 1 || timeout_ms > 600000) {
        timeout_ms = 300000; // Default to 5 minutes for CLI responses
      }
      
      if (!prompt) {
        throw new Error('prompt is required');
      }

      // Use configured timeout but cap at 10 minutes max for safety
      const gracefulTimeout = Math.min(timeout_ms, 600000);

      // Fetch user's model preferences (cached, non-blocking on failure)
      // This also fetches perspectivesPerMessage setting and allProviders list
      let modelPreferences = {};
      try {
        modelPreferences = await this.fetchUserModelPreferences();
      } catch (prefError) {
        console.error('[Stdio Wrapper] Model preferences fetch failed (will use CLI defaults):', prefError.message);
      }

      // Get the user's perspectives_per_message setting (default 2)
      const maxPerspectives = this.perspectivesPerMessage || 2;
      console.error(`[Stdio Wrapper] Max perspectives per message: ${maxPerspectives}`);

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
        // No specific provider - use allProviders from dashboard in order
        // For each provider: try CLI first if available, otherwise use API
        console.error(`[Stdio Wrapper] Using allProviders from dashboard (max: ${maxPerspectives})`);
        
        // Get available CLIs for checking
        const { available: availableClis } = await this.getAllAvailableProviders();
        console.error(`[Stdio Wrapper] Available CLIs: ${availableClis.join(', ') || 'none'}`);
        
        // Use allProviders from API (full list including API-only providers)
        // Falls back to CLI-only providers if allProviders not available
        const allProviders = this.allProviders || [];
        
        if (allProviders.length === 0) {
          // Fallback: use legacy CLI-only flow
          console.error(`[Stdio Wrapper] No allProviders, using legacy CLI-only flow`);
          const userOrder = this.userProviderOrder || ['claude_code', 'codex_cli', 'gemini_cli'];
          const cliProviders = userOrder.slice(0, maxPerspectives).filter(p => availableClis.includes(p));
          
          const cliPromises = cliProviders.map(async (providerId) => {
            try {
              const model = modelPreferences[providerId] || null;
              const result = await this.cliManager.sendCliPrompt(providerId, prompt, mode, gracefulTimeout, model);
              return { provider_id: providerId, ...result };
            } catch (error) {
              return { provider_id: providerId, success: false, error: error.message };
            }
          });
          localResults = await Promise.all(cliPromises);
        } else {
          // NEW: Use allProviders list (includes CLI + API-only providers)
          const providersToUse = allProviders.slice(0, maxPerspectives);
          console.error(`[Stdio Wrapper] Using ${providersToUse.length} providers from dashboard`);
          
          // Separate into CLI providers vs API-only providers
          const cliProviderEntries = [];
          const apiOnlyProviders = [];
          
          for (const p of providersToUse) {
            if (p.cliId && availableClis.includes(p.cliId)) {
              // Has CLI and CLI is available
              cliProviderEntries.push(p);
            } else {
              // No CLI or CLI unavailable - needs API
              apiOnlyProviders.push(p);
            }
          }
          
          console.error(`[Stdio Wrapper] Provider breakdown: CLI=${cliProviderEntries.map(p => p.cliId).join(', ') || 'none'}, API-only=${apiOnlyProviders.map(p => p.provider).join(', ') || 'none'}`);
          
          // Run all CLI prompts concurrently
          if (cliProviderEntries.length > 0) {
            const cliPromises = cliProviderEntries.map(async (providerEntry) => {
              try {
                const model = providerEntry.model || modelPreferences[providerEntry.cliId] || null;
                if (model) {
                  console.error(`[Stdio Wrapper] Using model for ${providerEntry.cliId}: ${model}`);
                }
                const result = await this.cliManager.sendCliPrompt(providerEntry.cliId, prompt, mode, gracefulTimeout, model);
                return { 
                  provider_id: providerEntry.cliId, 
                  original_provider: providerEntry.provider,
                  ...result 
                };
              } catch (error) {
                console.error(`[Stdio Wrapper] CLI ${providerEntry.cliId} failed:`, error.message);
                return {
                  provider_id: providerEntry.cliId,
                  original_provider: providerEntry.provider,
                  success: false,
                  error: error.message,
                  latency_ms: gracefulTimeout
                };
              }
            });
            localResults = await Promise.all(cliPromises);
          }
          
          // Store API-only providers info for remote API call
          this._apiOnlyProviders = apiOnlyProviders;
        }
      }

      // Report CLI results to server for dashboard storage (non-blocking)
      this.reportCliResultsToServer(prompt, localResults, args).catch(err => {
        console.error('[Stdio Wrapper] CLI results reporting failed (non-critical):', err.message);
      });

      // Calculate how many successful local perspectives we got
      const successfulLocalCount = localResults.filter(r => r.success).length;
      const failedCliCount = localResults.filter(r => !r.success).length;
      
      // Need API for: API-only providers + failed CLIs
      const apiOnlyCount = (this._apiOnlyProviders || []).length;
      const remainingPerspectives = apiOnlyCount + failedCliCount;

      // Get remote perspectives for API-only providers and failed CLIs
      let perspectivesResult;
      if (remainingPerspectives > 0) {
        console.error(`[Stdio Wrapper] Need ${remainingPerspectives} perspectives from remote API (${apiOnlyCount} API-only + ${failedCliCount} failed CLIs)`);
        
        // Pass API-only provider info to help remote API choose correct models
        const apiProvidersInfo = (this._apiOnlyProviders || []).map(p => ({
          provider: p.provider,
          model: p.model
        }));
        
        perspectivesResult = await this.callPerspectivesForCli(args, localResults, remainingPerspectives, apiProvidersInfo);
      } else {
        console.error(`[Stdio Wrapper] Already have ${successfulLocalCount} perspectives from CLIs, skipping remote call`);
        perspectivesResult = {
          success: true,
          content: '',
          skipped: true,
          reason: `Already have ${successfulLocalCount} perspectives (max: ${maxPerspectives})`,
          timestamp: new Date().toISOString()
        };
      }

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
   * Uses user's provider order from dashboard (display_order) instead of hardcoded order
   * Falls back to API for providers where CLI is not available/authenticated
   */
  async getAllAvailableProviders() {
    try {
      const results = await this.cliManager.forceCliDetection();
      const availableProviders = [];
      const unavailableProviders = [];
      
      // Use user's provider order from dashboard (fetched via model-preferences API)
      // Falls back to default order if not yet loaded
      const priorityOrder = this.userProviderOrder || ['claude_code', 'codex_cli', 'gemini_cli'];
      console.error(`[Stdio Wrapper] Using provider order: ${priorityOrder.join(' > ')}`);
      
      for (const providerId of priorityOrder) {
        const status = results[providerId];
        if (status && status.available && status.authenticated) {
          // Skip providers with quota exhausted - they'll use API fallback
          if (status.quota_exhausted) {
            console.error(`[Stdio Wrapper] Skipping ${providerId} - quota exhausted, will use API fallback`);
            unavailableProviders.push(providerId);
            continue;
          }
          availableProviders.push(providerId);
        } else {
          // CLI not available - will fall back to API for this provider
          const reason = !status ? 'not detected' : (!status.available ? 'not installed' : 'not authenticated');
          console.error(`[Stdio Wrapper] CLI ${providerId} ${reason}, will use API fallback`);
          unavailableProviders.push(providerId);
        }
      }
      
      // Return available CLIs first, then unavailable ones (for API fallback)
      // The caller will handle mixing CLI + API based on availability
      return { available: availableProviders, unavailable: unavailableProviders };
      
    } catch (error) {
      console.error('[Stdio Wrapper] Failed to get available providers:', error);
      return { available: [], unavailable: [] };
    }
  }

  /**
   * Report CLI results to server for dashboard storage
   * This stores ONLY SUCCESSFUL CLI results in Supabase so they appear in the dashboard
   * Failed CLI results are not stored - they will get API fallback instead
   */
  async reportCliResultsToServer(prompt, localResults, args = {}) {
    // Only report successful CLI results (failed ones will get API fallback)
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
      // IMPORTANT: Only send successful results to dashboard
      // Failed CLI results will have API fallback, so we don't want to show both
      const cliResults = successfulResults.map(result => ({
        provider_id: result.provider_id,
        // IMPORTANT: cliManager returns model_used, not model
        model: result.model_used || result.model || this.getModelPreferenceForCli(result.provider_id),
        // Clean the content before sending to dashboard (remove metadata, MCP logs, etc.)
        content: cleanCliResponse(result.content || ''),
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
   * Get model preference for a CLI provider from cached user preferences
   * Falls back to a descriptive default if not available
   */
  getModelPreferenceForCli(providerId) {
    // Try to get from cached user model preferences first
    if (this.userModelPreferences && this.userModelPreferences[providerId]) {
      return this.userModelPreferences[providerId];
    }
    
    // Map CLI provider to API provider for lookup
    const cliToApiProvider = {
      'claude_code': 'anthropic',
      'codex_cli': 'openai',
      'gemini_cli': 'google'
    };
    
    const apiProvider = cliToApiProvider[providerId];
    if (apiProvider && this.userModelPreferences && this.userModelPreferences[apiProvider]) {
      return this.userModelPreferences[apiProvider];
    }
    
    // Fallback to descriptive defaults based on typical CLI models
    const defaults = {
      'claude_code': 'claude-sonnet-4',
      'codex_cli': 'gpt-4.1',
      'gemini_cli': 'gemini-2.5-pro'
    };
    return defaults[providerId] || 'unknown';
  }

  /**
   * Get default model name for a CLI tool (used when model not specified in result)
   * These are just display labels - actual model selection is done by:
   * 1. User's configured default_model in dashboard API keys
   * 2. CLI tool's own default if no preference set
   */
  getDefaultModelForCli(providerId) {
    // Prefer user's model preference if available
    return this.getModelPreferenceForCli(providerId);
  }

  /**
   * Call remote perspectives for CLI prompts
   * Only calls remote APIs for providers NOT covered by successful local CLIs
   * @param {Object} args - Original request arguments
   * @param {Array} localResults - Results from local CLIs
   * @param {number} maxPerspectives - Maximum number of remote perspectives to fetch
   * @param {Array} apiProvidersInfo - Optional array of API-only providers to request (from allProviders)
   */
  async callPerspectivesForCli(args, localResults, maxPerspectives = 2, apiProvidersInfo = []) {
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
    
    // If we don't need any perspectives, skip remote call
    if (maxPerspectives <= 0) {
      console.error(`[Stdio Wrapper] Max perspectives is 0, skipping remote perspectives`);
      return {
        success: true,
        content: '',
        skipped: true,
        reason: 'No perspectives needed',
        timestamp: new Date().toISOString()
      };
    }
    
    // Build list of specific providers to request (from API-only providers)
    const requestProviders = apiProvidersInfo.map(p => ({
      provider: p.provider,
      model: p.model
    }));
    
    console.error(`[Stdio Wrapper] Calling remote perspectives (excluding: ${excludeProviders.join(', ') || 'none'}, requesting: ${requestProviders.map(p => p.provider).join(', ') || 'any'}, max: ${maxPerspectives})`);
    
    // Format CLI responses for logging on the server
    const cliResponses = localResults.map(result => ({
      provider_id: result.provider_id,
      model: result.model_used || this.getDefaultModelForCli(result.provider_id),
      content: result.content || '',
      tokens_used: result.tokens_used || 0,
      latency_ms: result.latency_ms || 0,
      success: result.success || false,
      error: result.error || null
    }));
    
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
            // NEW: Specific providers to request (from API-only list)
            request_providers: requestProviders.length > 0 ? requestProviders : undefined,
            // Pass CLI responses for dashboard logging
            cli_responses: cliResponses,
            // Limit remote perspectives to what we need
            max_perspectives: maxPerspectives,
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
        // Display actual model name if detected, otherwise show provider ID
        const modelDisplay = cliResult.model_used && cliResult.model_used !== 'cli_default' && cliResult.model_used !== 'cli_default_fallback'
          ? cliResult.model_used 
          : cliResult.provider_id;
        formatted += `🟢 **Local CLI Response** (${modelDisplay})\n\n`;
        formatted += `${cleanCliResponse(cliResult.content)}\n\n`;
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
   * Also fetches and caches perspectivesPerMessage setting and allProviders list
   */
  async fetchUserModelPreferences() {
    // Check cache first
    if (this.userModelPreferences && this.modelPreferencesCacheTime) {
      const cacheAge = Date.now() - this.modelPreferencesCacheTime;
      if (cacheAge < this.MODEL_PREFERENCES_CACHE_TTL) {
        console.error('[Stdio Wrapper] Using cached model preferences');
        // Also restore cached userProviderOrder when using cache
        // (userProviderOrder was set during the initial API fetch)
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
        
        // Also cache perspectives_per_message setting (default 2)
        this.perspectivesPerMessage = result.perspectivesPerMessage || 2;
        
        // Cache provider order from user's dashboard (respects display_order)
        // This determines which CLIs/APIs to use first
        // IMPORTANT: This is cached alongside modelPreferences and restored when cache is used
        this.userProviderOrder = result.providerOrder || ['claude_code', 'codex_cli', 'gemini_cli'];
        
        // NEW: Cache full list of all providers (CLI + API-only) from dashboard
        // Format: [{ provider: 'openai', model: 'gpt-52-codex', cliId: 'codex_cli' }, { provider: 'x-ai', model: 'grok-4', cliId: null }, ...]
        this.allProviders = result.allProviders || [];
        
        console.error('[Stdio Wrapper] Model preferences loaded:', JSON.stringify(result.modelPreferences));
        console.error('[Stdio Wrapper] Provider order:', JSON.stringify(this.userProviderOrder));
        console.error('[Stdio Wrapper] All providers:', JSON.stringify(this.allProviders));
        console.error('[Stdio Wrapper] Perspectives per message:', this.perspectivesPerMessage);
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
