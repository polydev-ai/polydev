#!/usr/bin/env node

// Ensure fetch is available (polyfill for environments where native fetch is missing)
if (typeof globalThis.fetch === 'undefined') {
  const https = require('https');
  const http = require('http');
  const { URL } = require('url');

  globalThis.fetch = function fetchPolyfill(url, options = {}) {
    return new Promise((resolve, reject) => {
      const parsed = new URL(url);
      const mod = parsed.protocol === 'https:' ? https : http;
      const reqOptions = {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers: options.headers || {}
      };

      const req = mod.request(reqOptions, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: { get: (name) => res.headers[name.toLowerCase()] },
            json: () => Promise.resolve(JSON.parse(body)),
            text: () => Promise.resolve(body)
          });
        });
      });

      req.on('error', reject);
      req.setTimeout(300000, () => { req.destroy(); reject(new Error('Request timed out')); });
      if (options.body) req.write(options.body);
      req.end();
    });
  };

  console.error('[Polydev MCP] fetch polyfill loaded (native fetch unavailable)');
}

// Lightweight stdio wrapper with local CLI functionality and remote Polydev MCP server fallback
const fs = require('fs');
const path = require('path');
const os = require('os');
const { CLIManager } = require('../lib/cliManager');
const { ChatGPTPlan, ChatGPTPlanError, runChatGPTCli, isOpenAIModel, usageLimitNote, constants: CHATGPT } = require('../lib/chatgptPlan');

// After a network error or a 5xx from the Polydev server, it counts as unreachable for this long.
const SERVER_DOWN_MS = 2 * 60 * 1000;

// MCP stdio servers must only emit JSON-RPC on stdout.
// Redirect any accidental console output to stderr to avoid handshake failures.
console.log = console.error;
console.info = console.error;
console.debug = console.error;

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
 *   [may include JSON or plain text response]
 */
function cleanCliResponse(content) {
  if (!content || typeof content !== 'string') {
    return content || '';
  }
  
  const lines = content.split('\n');
  const cleanedLines = [];
  
  // State machine for Codex CLI output parsing
  // States: 'metadata' | 'user_section' | 'thinking_section' | 'response' | 'footer'
  let state = 'metadata';
  let foundCodexMarker = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Always skip these patterns anywhere in the output
    if (trimmed.startsWith('ERROR: MCP client for')) continue;
    if (trimmed.includes('failed to start') && trimmed.includes('MCP')) continue;
    if (trimmed.includes('handshake') && trimmed.includes('failed')) continue;
    if (trimmed.includes('connection closed')) continue;
    if (trimmed.startsWith('mcp:')) continue;  // MCP startup logs
    if (trimmed.startsWith('mcp startup:')) continue;  // MCP startup summary
    if (trimmed.includes('rmcp::transport')) continue;  // RMCP transport errors
    if (trimmed.includes('ERROR rmcp')) continue;
    if (trimmed.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) continue;  // Timestamp logs
    
    // State: metadata - skip until we hit a section marker
    if (state === 'metadata') {
      // Skip known metadata patterns
      if (!trimmed || trimmed.startsWith('provider:')) continue;
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
      // Skip everything in user section (echoed prompt)
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
      // Transition to footer when we see "tokens used"
      if (trimmed === 'tokens used') {
        state = 'footer';
        continue;
      }
      
      // Skip any bold status markers like **Processing...**
      if (trimmed.match(/^\*\*.*\*\*$/)) continue;
      
      // Keep this line - it's the actual response
      cleanedLines.push(line);
    }
    
    // State: footer - skip token count and anything after
    if (state === 'footer') {
      // Skip everything in footer (token counts, etc.)
      continue;
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
    this.isAuthenticated = !!this.userToken;
    
    // Server URL for API calls — mcp.polydev.ai bypasses Cloudflare proxy (100s timeout)
    // Direct to Vercel = 300s function timeout. Override with POLYDEV_REMOTE_URL if needed.
    this.serverUrl = process.env.POLYDEV_REMOTE_URL
      ? `${process.env.POLYDEV_REMOTE_URL.replace(/\/$/, '')}/api/mcp`
      : 'https://mcp.polydev.ai/api/mcp';
    
    // Pending session file for surviving restarts
    this.PENDING_SESSION_FILE = path.join(os.homedir(), '.polydev-pending-session');

    // Sandbox detection (Cowork, containers with limited disk/no browser)
    this._isSandboxed = null; // lazy-detected

    // MCP client info (set during initialize handshake)
    // Used to detect which IDE is running us and exclude its CLI to avoid recursive calls
    this.clientInfo = null;

    // Adaptive timeout tracking: stores recent response times per CLI
    // Used to set smarter timeouts instead of fixed 400s
    this.cliResponseTimes = {}; // { cliId: [latency_ms, ...] }
    this.CLI_RESPONSE_HISTORY_SIZE = 5; // Keep last 5 response times
    this.loadCliResponseTimes(); // Load from disk

    // Initialize CLI Manager for local CLI functionality
    // Disable StatusReporter - it's redundant (updateCliStatusInDatabase handles DB updates via /api/cli-status-update)
    // and causes 401 errors because /api/mcp uses different auth than /api/cli-status-update
    this.cliManager = new CLIManager({ enableStatusReporting: false });
    
    // Load manifest for tool definitions
    this.loadManifest();
    
    // Try to reload token from files if not in env (hot-reload support)
    if (!this.isAuthenticated) {
      this.reloadTokenFromFiles();
    }
    
    // Check for pending login session from previous process
    // This allows login to survive MCP reconnections
    if (!this.isAuthenticated) {
      this.resumePendingLoginSession();
    }
    
    // Log startup status
    if (this.userToken) {
      console.error('[Polydev] Starting with authentication token');
    } else {
      console.error('[Polydev] Starting without token - login required');
      console.error('[Polydev] Use the "login" tool or run in a terminal: npx -p polydev-ai polydev-login');
    }
    
    // Smart refresh scheduler (will be started after initialization)
    this.refreshScheduler = null;
    
    // CLI detection readiness tracking - requests will wait for this
    // Create the promise NOW in constructor so it exists before any requests arrive
    this._cliDetectionComplete = false;
    this._cliDetectionReady = new Promise((resolve) => {
      this._cliDetectionResolver = resolve;
    });
    
    // Cache for user model preferences
    this.userModelPreferences = null;
    this.perspectivesPerMessage = 2; // Default to 2 perspectives
    this.modelPreferencesCacheTime = null;
    this.MODEL_PREFERENCES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache
    
    // Login server reference (for cleanup)
    this._loginServer = null;
    
    // "Sign in with ChatGPT" plan usage (tokens stay in ~/.polydev/chatgpt/, mode 0600)
    this.chatgpt = new ChatGPTPlan();
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
          // Capture client info to detect which IDE is running us
          // This lets us exclude its CLI to avoid recursive calls (e.g., Claude Code → claude_code CLI)
          this.clientInfo = params?.clientInfo || null;
          if (this.clientInfo) {
            console.error(`[Stdio Wrapper] IDE detected: ${this.clientInfo.name} v${this.clientInfo.version || 'unknown'}`);
          }
          return {
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2025-06-18',
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
            ...(tool.title ? { title: tool.title } : {}),
            description: tool.description,
            inputSchema: tool.inputSchema,
            ...(tool.annotations ? { annotations: { title: tool.title, ...tool.annotations } } : {})
          }));
          
          return {
            jsonrpc: '2.0',
            id,
            result: { tools }
          };
        
        case 'tools/call':
          const toolName = params.name;
          
          // These tools work without authentication
          const noAuthTools = ['login', 'get_auth_status', 'polydev.login', 'polydev.get_auth_status'];
          
          if (noAuthTools.includes(toolName)) {
            if (toolName === 'login' || toolName === 'polydev.login') {
              return await this.handleLoginTool(params, id);
            }
            if (toolName === 'get_auth_status' || toolName === 'polydev.get_auth_status') {
              return await this.handleGetAuthStatus(params, id);
            }
          }

          // ChatGPT plan tools run entirely on this machine and need no Polydev account.
          if (toolName === 'chatgpt_plan_status' || toolName === 'polydev.chatgpt_plan_status') {
            return this.handleChatGPTPlanStatus(params, id);
          }
          if (toolName === 'connect_chatgpt_plan' || toolName === 'polydev.connect_chatgpt_plan') {
            return await this.handleConnectChatGPTPlan(params, id);
          }

          // ask_model (get_perspectives is its old name) and list_models also work without a
          // Polydev account: they then use only what is on this machine.
          const askNames = ['ask_model', 'get_perspectives', 'polydev.ask_model', 'polydev.get_perspectives'];
          const listNames = ['list_models', 'list_available_models', 'polydev.list_models', 'polydev.list_available_models'];
          if (askNames.includes(toolName) || listNames.includes(toolName)) {
            if (!this.isAuthenticated) this.reloadTokenFromFiles();
            if (askNames.includes(toolName)) return await this.handleGetPerspectivesWithCLIs(params, id);
            return await this.handleListModels(params, id);
          }
          
          // All other tools require authentication
          // Try hot-reload first if not authenticated
          if (!this.isAuthenticated) {
            this.reloadTokenFromFiles();
          }
          
          if (!this.isAuthenticated) {
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{
                  type: 'text',
                  text: `POLYDEV STATUS
==============

Authentication: Not connected

To login:
  1. Use the "login" tool (opens browser)
  2. Or in a terminal: npx -p polydev-ai polydev-login

Token will be saved automatically after login.`
                }],
                isError: true
              }
            };
          }
          
          // Enrich rank_perspectives with IDE + base model info before forwarding
          if (toolName === 'rank_perspectives' || toolName === 'polydev.rank_perspectives') {
            if (params.arguments) {
              // Always inject IDE info from MCP clientInfo (set during initialize handshake)
              // Known clientInfo.name values from MCP clients:
              //   claude-code, Claude Desktop, cursor, windsurf, cline, continue,
              //   github-copilot-developer, vscode, jetbrains
              if (!params.arguments.ide && this.clientInfo?.name) {
                params.arguments.ide = this.clientInfo.name;
                if (this.clientInfo.version) {
                  params.arguments.ide_version = this.clientInfo.version;
                }
              }

              // If model didn't self-identify, infer base_model from IDE name
              // Note: This is a fallback — the model's own self-report (from tool args) is preferred
              if (!params.arguments.base_model && this.clientInfo?.name) {
                const ideName = (this.clientInfo.name || '').toLowerCase();
                // Map IDE name → likely base model family (not specific model version)
                if (ideName.includes('claude')) {
                  params.arguments.base_model = 'claude'; // Could be opus, sonnet, haiku
                } else if (ideName.includes('cursor')) {
                  params.arguments.base_model = 'cursor'; // Could be claude, gpt, etc.
                } else if (ideName.includes('windsurf') || ideName.includes('codeium')) {
                  params.arguments.base_model = 'windsurf';
                } else if (ideName.includes('cline')) {
                  params.arguments.base_model = 'cline';
                } else if (ideName.includes('continue')) {
                  params.arguments.base_model = 'continue';
                } else if (ideName.includes('codex')) {
                  params.arguments.base_model = 'codex';
                } else if (ideName.includes('gemini')) {
                  params.arguments.base_model = 'gemini';
                } else {
                  params.arguments.base_model = ideName;
                }
              }

              if (!params.arguments.client_id) {
                params.arguments.client_id = 'stdio-wrapper';
              }
            }
          }

          // Handle CLI tools locally (support both prefixed and unprefixed names)
          if (this.isCliTool(toolName)) {
            return await this.handleLocalCliTool(request);
          } else if (toolName === 'search_x' || toolName === 'polydev.search_x') {
            return await this.handleSearchX(params, id);
          } else if (toolName === 'generate_image' || toolName === 'polydev.generate_image') {
            return await this.handleGenerateImage(params, id);
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

  /**
   * Handle login tool - opens browser for authentication
   * Uses polling-based flow that survives MCP reconnections
   */
  async handleLoginTool(params, id) {
    const crypto = require('crypto');

    // Accept user_token from params (essential for sandboxed environments like Cowork)
    const inlineToken = params?.arguments?.user_token;
    if (inlineToken && (inlineToken.startsWith('pd_') || inlineToken.startsWith('polydev_'))) {
      console.error('[Polydev] Login via inline user_token');
      this.userToken = inlineToken;
      this.isAuthenticated = true;
      process.env.POLYDEV_USER_TOKEN = inlineToken;
      this.saveTokenToFiles(inlineToken);
      return await this.fetchAuthStatusResponse(id);
    }

    // Check if already authenticated - verify with server first
    if (this.isAuthenticated && this.userToken) {
      console.error('[Polydev] Token exists locally, verifying with server...');
      const isValid = await this.verifyTokenWithServer();
      
      if (isValid) {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{
              type: 'text',
              text: `ALREADY AUTHENTICATED
=====================

Your token is configured and verified.

Available commands:
  /polydev:ask   Ask several AI models the same question
  /polydev:auth  Check status

To re-login, in a terminal: npx -p polydev-ai polydev-login login`
            }]
          }
        };
      }
      
      // Token is invalid/expired - clear state and proceed with login
      console.error('[Polydev] Token invalid/expired, proceeding with re-authentication...');
      this.isAuthenticated = false;
      this.userToken = null;
    }
    
    // In sandboxed environments, don't try browser login — show token-paste instructions
    if (this.isSandboxed()) {
      console.error('[Polydev] Sandbox detected — browser login unavailable');
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{
            type: 'text',
            text: `LOGIN - Sandboxed Environment
==============================

Browser login is not available in this environment (Cowork/container).

To authenticate, use one of these methods:

**Method 1: Pass token directly**
  1. Get your token from https://www.polydev.ai/dashboard/mcp-tokens
  2. Call login with user_token:

     mcp__plugin_polydev_mcp__login({ user_token: "pd_your_token_here" })

**Method 2: Set environment variable**
  Set POLYDEV_USER_TOKEN=pd_your_token before starting the MCP server.`
          }]
        }
      };
    }

    // Generate unique session ID for polling-based auth
    const sessionId = crypto.randomBytes(32).toString('hex');

    try {
      // Create session on server (with retry for transient network issues)
      let createResponse;
      let lastError;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          createResponse = await fetch(`https://www.polydev.ai/api/auth/cli-session/${sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          lastError = null;
          break; // Success, exit retry loop
        } catch (fetchErr) {
          lastError = fetchErr;
          const cause = fetchErr.cause ? ` (${fetchErr.cause.code || fetchErr.cause.message || fetchErr.cause})` : '';
          console.error(`[Polydev] Session creation attempt ${attempt + 1}/3 failed: ${fetchErr.message}${cause}`);
          if (attempt < 2) {
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); // 1s, 2s backoff
          }
        }
      }
      
      if (lastError) {
        const cause = lastError.cause ? ` (${lastError.cause.code || lastError.cause.message || lastError.cause})` : '';
        console.error('[Polydev] All session creation attempts failed:', lastError.message, cause);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{
              type: 'text',
              text: `Login failed: Could not reach polydev.ai${cause}\n\nThis usually means a network connectivity issue.\n\nAlternative: Run in your terminal:\n  npx -p polydev-ai polydev-login`
            }],
            isError: true
          }
        };
      }
      
      if (!createResponse.ok) {
        const error = await createResponse.text();
        console.error('[Polydev] Failed to create login session:', error);
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{
              type: 'text',
              text: `Login session creation failed. Please try again or run in a terminal: npx -p polydev-ai polydev-login`
            }],
            isError: true
          }
        };
      }
      
      // Open browser with session_id (no localhost callback needed)
      const authUrl = `https://polydev.ai/auth?session_id=${sessionId}&redirect=ide-plugin&auto=true`;
      
      console.error(`[Polydev] Opening browser for authentication...`);
      console.error(`[Polydev] Session ID: ${sessionId.slice(0, 8)}...`);
      console.error(`[Polydev] Auth URL: ${authUrl}`);
      
      this.openBrowser(authUrl).catch(() => {
        console.error('[Polydev] Could not open browser automatically');
        console.error('[Polydev] Please open this URL manually:', authUrl);
      });
      
      // Save pending session to file (allows resuming after MCP reconnect)
      this.savePendingSession(sessionId);
      
      // Start polling in background (survives reconnections because
      // if this process dies, the new one can resume polling with same session)
      this.startLoginPolling(sessionId);
      
      // Wait for authentication to complete (blocks up to 400s)
      console.error('[Polydev] Waiting for browser authentication to complete...');
      const authenticated = await this.waitForAuthCompletion();
      
      if (authenticated) {
        console.error('[Polydev] Login successful, returning status...');
        return await this.fetchAuthStatusResponse(id);
      }
      
      // Timeout - return fallback message
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{
            type: 'text',
            text: `AUTHENTICATION STARTED
======================

A browser window was opened for you to sign in.

If it didn't open, visit:
  ${authUrl}

Still waiting for login. Use /polydev:auth to check status after signing in.`
          }]
        }
      };
      
    } catch (error) {
      const cause = error.cause ? ` (${error.cause.code || error.cause.message || error.cause})` : '';
      console.error('[Polydev] Login error:', error.message, cause);
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{
            type: 'text',
            text: `Login failed: ${error.message}${cause}\n\nPlease try in a terminal: npx -p polydev-ai polydev-login`
          }],
          isError: true
        }
      };
    }
  }

  /**
   * Verify the current token is valid by checking with the server
   * Returns true if valid, false if invalid/expired
   * On network error, returns true (don't block for transient issues)
   */
  async verifyTokenWithServer() {
    if (!this.userToken) return false;
    try {
      const response = await fetch('https://www.polydev.ai/api/auth/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.userToken}`,
          'User-Agent': 'polydev-stdio-wrapper/1.0.0'
        }
      });
      if (!response.ok) {
        console.error(`[Polydev] Token verification failed: ${response.status}`);
        return false;
      }
      return true;
    } catch (error) {
      // Network error - assume valid to avoid blocking on transient issues
      console.error('[Polydev] Token verification network error (assuming valid):', error.message);
      return true;
    }
  }

  /**
   * Wait for authentication to complete by polling this.isAuthenticated
   * Used to block tool calls until login is detected by startLoginPolling
   * @param {number} timeoutMs - Max time to wait (default 400s)
   * @returns {boolean} true if authenticated, false if timed out
   */
  async waitForAuthCompletion(timeoutMs = 400000) {
    const pollInterval = 3000; // Check every 3 seconds
    const maxPolls = Math.floor(timeoutMs / pollInterval);
    
    for (let i = 0; i < maxPolls; i++) {
      await new Promise(r => setTimeout(r, pollInterval));
      if (this.isAuthenticated && this.userToken) {
        return true;
      }
    }
    return false;
  }

  /**
   * Fetch account status and return formatted response
   * Standalone helper that doesn't trigger re-auth (avoids circular calls)
   * @param {*} id - JSON-RPC request id
   * @returns {object} JSON-RPC response with account status
   */
  async fetchAuthStatusResponse(id) {
    try {
      const accountResponse = await fetch('https://www.polydev.ai/api/auth/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.userToken}`,
          'User-Agent': 'polydev-stdio-wrapper/1.0.0'
        }
      });
      
      if (accountResponse.ok) {
        const data = await accountResponse.json();
        const email = data.email || 'Connected';
        
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{
              type: 'text',
              text: `LOGIN SUCCESSFUL
================

Authentication: Connected
Account:        ${email}

Polydev is free. Your local CLIs and your own API keys pay for the tokens;
each account also gets 10 free requests on Polydev's keys.

You can now use:
  /polydev:ask   Ask several AI models the same question
  /polydev:auth  Check full status

Add API keys: https://www.polydev.ai/dashboard/models`
            }]
          }
        };
      }
    } catch (e) {
      console.error('[Polydev] Post-login status fetch failed:', e.message);
    }
    
    // Fallback if status fetch fails
    return {
      jsonrpc: '2.0',
      id,
      result: {
        content: [{
          type: 'text',
          text: `LOGIN SUCCESSFUL
================

Your token has been saved and is active.

You can now use:
  /polydev:ask   Ask several AI models the same question
  /polydev:auth  Check full status

Add API keys: https://www.polydev.ai/dashboard/models`
        }]
      }
    };
  }

  /**
   * Trigger re-authentication by opening browser and starting polling
   * Waits for auth to complete inline (up to 400s) then returns full status
   * Used when token is detected as invalid/expired
   * @param {*} id - JSON-RPC request id
   * @param {string} reason - Human-readable reason for re-auth
   * @returns {object} JSON-RPC response
   */
  async triggerReAuth(id, reason = 'Token invalid or expired') {
    // In sandboxed environments, browser login won't work — show token-paste instructions instead
    if (this.isSandboxed()) {
      console.error('[Polydev] Sandbox detected — skipping browser re-auth, showing token-paste instructions');
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{
            type: 'text',
            text: `${reason}

Browser login is not available in this environment (Cowork/container).

To authenticate, pass your token directly:
  1. Get your token from https://www.polydev.ai/dashboard/mcp-tokens
  2. Call: mcp__plugin_polydev_mcp__get_auth_status({ user_token: "pd_your_token_here" })
  3. Or: mcp__plugin_polydev_mcp__login({ user_token: "pd_your_token_here" })`
          }]
        }
      };
    }

    const crypto = require('crypto');
    const sessionId = crypto.randomBytes(32).toString('hex');

    // Clear local auth state
    this.isAuthenticated = false;
    this.userToken = null;

    try {
      const createResponse = await fetch(`https://www.polydev.ai/api/auth/cli-session/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!createResponse.ok) {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{
              type: 'text',
              text: `${reason}\n\nCould not initiate re-authentication. Please run in a terminal:\n  npx -p polydev-ai polydev-login`
            }],
            isError: true
          }
        };
      }

      const authUrl = `https://polydev.ai/auth?session_id=${sessionId}&redirect=ide-plugin&auto=true`;

      console.error(`[Polydev] Opening browser for re-authentication...`);
      this.openBrowser(authUrl).catch(() => {
        console.error('[Polydev] Could not open browser for re-authentication');
      });

      this.savePendingSession(sessionId);
      this.startLoginPolling(sessionId);

      // Wait for authentication to complete (blocks up to 400s)
      console.error('[Polydev] Waiting for browser authentication to complete...');
      const authenticated = await this.waitForAuthCompletion();
      
      if (authenticated) {
        console.error('[Polydev] Re-authentication successful, returning status...');
        return await this.fetchAuthStatusResponse(id);
      }

      // Timeout - return fallback message
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{
            type: 'text',
            text: `RE-AUTHENTICATION STARTED
=========================

${reason}

A browser window was opened for re-authentication.

If it didn't open, visit:
  ${authUrl}

Still waiting for login. Use /polydev:auth to check status after signing in.`
          }]
        }
      };
    } catch (error) {
      const errCode = error.cause?.code || error.code || '';
      const cause = errCode ? ` (${errCode})` : (error.cause?.message ? ` (${error.cause.message})` : '');
      console.error(`[Polydev] Re-auth failed: ${error.message}${cause}`);
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{
            type: 'text',
            text: `${reason}\n\nCould not reach Polydev server: ${error.message}${cause}\n\nTroubleshooting:\n  1. Check your internet connection\n  2. Try: /polydev:login\n  3. Or run in terminal: npx -p polydev-ai polydev-login`
          }],
          isError: true
        }
      };
    }
  }

  /**
   * Poll for login session completion
   * @param {string} sessionId - The session ID to poll
   * @param {boolean} isResume - Whether this is resuming from a previous process
   */
  async startLoginPolling(sessionId, isResume = false) {
    const pollInterval = 2000; // 2 seconds
    const maxPolls = 300; // 10 minutes max
    let polls = 0;
    
    if (isResume) {
      console.error('[Polydev] Resuming login polling from previous session...');
    }
    
    const poll = async () => {
      polls++;
      
      try {
        const response = await fetch(`https://www.polydev.ai/api/auth/cli-session/${sessionId}`);
        const data = await response.json();
        
        if (data.status === 'completed' && data.token) {
          // Success! Save the token and clear pending session
          this.clearPendingSession();
          this.saveTokenToFiles(data.token);
          this.userToken = data.token;
          this.isAuthenticated = true;
          this._freshLogin = true;
          
          console.error('[Polydev] Login successful! Token saved.');
          console.error('[Polydev] You can now use Polydev tools.');
          console.error('[Polydev] No restart required - token is active immediately.');
          return; // Stop polling
        }
        
        if (data.status === 'expired' || response.status === 410) {
          this.clearPendingSession();
          console.error('[Polydev] Login session expired. Please try again.');
          return; // Stop polling
        }
        
        if (data.status === 'not_found' || response.status === 404) {
          this.clearPendingSession();
          console.error('[Polydev] Login session not found.');
          return; // Stop polling
        }
        
        // Still pending, continue polling
        if (polls < maxPolls) {
          setTimeout(poll, pollInterval);
        } else {
          this.clearPendingSession();
          console.error('[Polydev] Login polling timed out.');
        }
        
      } catch (error) {
        console.error('[Polydev] Poll error:', error.message);
        // Continue polling on network errors
        if (polls < maxPolls) {
          setTimeout(poll, pollInterval);
        } else {
          this.clearPendingSession();
        }
      }
    };
    
    // Start polling
    setTimeout(poll, pollInterval);
  }

  /**
   * Handle get_auth_status tool - comprehensive status display
   */
  async handleGetAuthStatus(params, id) {
    // Accept user_token from params (essential for sandboxed environments like Cowork)
    const inlineToken = params?.arguments?.user_token;
    if (inlineToken && (inlineToken.startsWith('pd_') || inlineToken.startsWith('polydev_'))) {
      console.error('[Polydev] Using inline user_token from params');
      this.userToken = inlineToken;
      this.isAuthenticated = true;
      process.env.POLYDEV_USER_TOKEN = inlineToken;
      this.saveTokenToFiles(inlineToken); // safe — handles sandbox gracefully
    }

    // Try to hot-reload token if not authenticated
    if (!this.isAuthenticated || !this.userToken) {
      this.reloadTokenFromFiles();
    }

    if (!this.isAuthenticated || !this.userToken) {
      // No token found — check if we're in a sandbox (Cowork, containers)
      if (this.isSandboxed()) {
        console.error('[Polydev] No token and sandboxed — showing token-paste instructions');
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{
              type: 'text',
              text: `POLYDEV STATUS
==============

Authentication: Not connected (sandboxed environment detected)

Browser login is not available in this environment.

To authenticate, pass your token directly:
  1. Get your token from https://www.polydev.ai/dashboard/mcp-tokens
  2. Call get_auth_status with user_token parameter:

     mcp__plugin_polydev_mcp__get_auth_status({ user_token: "pd_your_token_here" })

  3. Or set the environment variable before starting:
     POLYDEV_USER_TOKEN=pd_your_token_here`
            }]
          }
        };
      }

      // Not sandboxed — auto-trigger browser login
      console.error('[Polydev] No token found, triggering browser login...');
      return await this.triggerReAuth(id, 'Not authenticated. Opening browser to login...');
    }

    try {
      // Fetch account status and model preferences in parallel
      const [accountResponse, modelPrefsResponse, cliStatus] = await Promise.all([
        fetch('https://www.polydev.ai/api/auth/status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.userToken}`,
            'User-Agent': 'polydev-stdio-wrapper/1.0.0'
          }
        }),
        fetch('https://www.polydev.ai/api/model-preferences', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.userToken}`,
            'User-Agent': 'polydev-stdio-wrapper/1.0.0'
          }
        }).catch(() => null),
        this.cliManager?.getCliStatus?.() || null
      ]);

      if (accountResponse.ok) {
        const data = await accountResponse.json();
        const email = data.email || 'Connected';
        
        // Parse model preferences
        let modelPrefs = null;
        if (modelPrefsResponse?.ok) {
          try {
            modelPrefs = await modelPrefsResponse.json();
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        // Build configured perspectives section
        let perspectivesSection = '\nConfigured Perspectives:';
        if (modelPrefs?.allProviders && modelPrefs.allProviders.length > 0) {
          const perspectiveCount = modelPrefs.perspectivesPerMessage || modelPrefs.allProviders.length;
          perspectivesSection += ` (${perspectiveCount} active)`;
          
          // Show providers in order with their selected models
          for (let i = 0; i < modelPrefs.allProviders.length; i++) {
            const p = modelPrefs.allProviders[i];
            const providerName = p.provider.charAt(0).toUpperCase() + p.provider.slice(1);
            const source = p.cliId ? 'CLI' : (p.tier ? 'Polydev keys' : 'your API key');
            perspectivesSection += `\n  ${i + 1}. ${providerName.padEnd(12)} ${p.model} [${source}]`;
          }
        } else {
          perspectivesSection += '\n  (none configured - using defaults)';
        }
        
        // Build CLI status section
        let cliSection = '\nLocal CLI Tools:';
        if (cliStatus) {
          cliSection += `\n  Claude Code    ${cliStatus.claude_code?.available ? '[connected]' : '[not found]'}${cliStatus.claude_code?.version ? ' ' + cliStatus.claude_code.version : ''}`;
          cliSection += `\n  Codex CLI      ${cliStatus.codex_cli?.available ? '[connected]' : '[not found]'}${cliStatus.codex_cli?.version ? ' ' + cliStatus.codex_cli.version : ''}`;
        } else {
          cliSection += '\n  (detecting...)';
        }
        const planStatus = this.chatgpt.status();
        cliSection += `\n  ChatGPT plan   ${planStatus.planEnabled ? '[connected] ' + CHATGPT.TEXT.inUse + ' for OpenAI models' : (planStatus.signedIn ? '[plan usage off]' : '[not connected] connect_chatgpt_plan tool')}`;
        
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{
              type: 'text',
              text: `POLYDEV STATUS
==============

Authentication: Connected
Account:        ${email}
${perspectivesSection}
${cliSection}

Each answer says what paid for it: your ChatGPT plan, Claude Code or Codex on this
machine, your own API key, OpenRouter, or Polydev free requests [Polydev keys].

Configure models and API keys: https://www.polydev.ai/dashboard/models`
            }]
          }
        };
      } else {
        // Token invalid/expired - auto-trigger browser re-auth
        console.error('[Polydev] Auth status: token invalid/expired, triggering re-auth...');
        return await this.triggerReAuth(id, 'Token invalid or expired. Re-authenticating...');
      }
    } catch (error) {
      // Categorize the error for clearer user messaging
      const errCode = error.cause?.code || error.code || '';
      const isNetwork = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'UND_ERR_CONNECT_TIMEOUT', 'FETCH_ERROR'].includes(errCode)
        || error.message?.includes('fetch') || error.message?.includes('network');
      const errorDetail = isNetwork
        ? `Network error: ${error.message}${errCode ? ` (${errCode})` : ''}\nCheck your internet connection and try again.`
        : `Error: ${error.message}${errCode ? ` (${errCode})` : ''}`;

      console.error(`[Polydev] Auth status check failed: ${error.message} (code: ${errCode})`);

      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{
            type: 'text',
            text: `POLYDEV STATUS
==============

Could not verify authentication status.

${errorDetail}

To retry: /polydev:auth
To re-login: /polydev:login`
          }],
          isError: true
        }
      };
    }
  }

  /**
   * Detect if running in a sandboxed environment (Cowork, containers, etc.)
   * where filesystem is read-only/limited and browser is unavailable.
   * Result is cached after first check.
   */
  isSandboxed() {
    if (this._isSandboxed !== null) return this._isSandboxed;

    try {
      // Try writing a test file to home directory
      const testFile = path.join(os.homedir(), '.polydev-sandbox-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      this._isSandboxed = false;
    } catch (e) {
      // ENOSPC, EROFS, EACCES all indicate sandbox-like constraints
      console.error(`[Polydev] Sandbox detected: ${e.code || e.message}`);
      this._isSandboxed = true;
    }

    return this._isSandboxed;
  }

  /**
   * Open URL in browser - best-in-class cross-platform implementation
   * Uses 'open' npm package with fallbacks for reliability in MCP/stdio context
   */
  async openBrowser(url) {
    // Try the 'open' package first (ESM, requires dynamic import)
    try {
      const open = await import('open');
      await open.default(url);
      console.error('[Polydev] Browser opened successfully');
      return;
    } catch (openError) {
      console.error('[Polydev] open package failed:', openError.message);
    }

    // Fallback 1: Platform-specific commands with exec
    const { exec } = require('child_process');
    const platform = process.platform;
    
    return new Promise((resolve, reject) => {
      let command;
      if (platform === 'darwin') {
        // macOS: try osascript first (more reliable in headless contexts)
        command = `osascript -e 'open location "${url}"'`;
      } else if (platform === 'win32') {
        command = `start "" "${url}"`;
      } else {
        command = `xdg-open "${url}"`;
      }

      exec(command, (error) => {
        if (error) {
          console.error('[Polydev] exec command failed:', error.message);
          
          // Fallback 2: spawn with detached
          const { spawn } = require('child_process');
          try {
            if (platform === 'darwin') {
              spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
            } else if (platform === 'win32') {
              spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore', shell: true }).unref();
            } else {
              spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
            }
            console.error('[Polydev] Browser opened via spawn fallback');
            resolve();
          } catch (spawnError) {
            console.error('[Polydev] spawn fallback failed:', spawnError.message);
            reject(new Error('All browser open methods failed'));
          }
        } else {
          console.error('[Polydev] Browser opened via exec');
          resolve();
        }
      });
    });
  }

  /**
   * Save token to shell config files
   */
  saveTokenToFiles(token) {
    if (this.isSandboxed()) {
      // In sandbox, just set in-memory — can't write files
      console.error('[Polydev] Sandbox: skipping file writes, token set in-memory only');
      process.env.POLYDEV_USER_TOKEN = token;
      return;
    }

    try {
      const shell = process.env.SHELL || '/bin/zsh';
      const rcFile = shell.includes('zsh') ? path.join(os.homedir(), '.zshrc') :
                     shell.includes('bash') ? path.join(os.homedir(), '.bashrc') :
                     path.join(os.homedir(), '.profile');

      let content = '';
      try { content = fs.readFileSync(rcFile, 'utf8'); } catch (e) {}

      const lines = content.split('\n').filter(line =>
        !line.trim().startsWith('export POLYDEV_USER_TOKEN') &&
        !line.trim().startsWith('POLYDEV_USER_TOKEN')
      );

      lines.push(`export POLYDEV_USER_TOKEN="${token}"`);
      fs.writeFileSync(rcFile, lines.join('\n').replace(/\n+$/, '') + '\n');

      // Also save to .polydev.env
      const envFile = path.join(os.homedir(), '.polydev.env');
      fs.writeFileSync(envFile, `POLYDEV_USER_TOKEN="${token}"\n`);

      console.error(`[Polydev] Token saved to ${rcFile} and ${envFile}`);
    } catch (e) {
      console.error(`[Polydev] Could not write token to files (${e.code || e.message}), set in-memory only`);
      process.env.POLYDEV_USER_TOKEN = token;
    }
  }

  /**
   * Reload token from config files (hot-reload support)
   * Called when token is not in env or when auth fails
   */
  reloadTokenFromFiles() {
    const locations = [
      path.join(os.homedir(), '.polydev.env'),
      path.join(os.homedir(), '.zshrc'),
      path.join(os.homedir(), '.bashrc'),
      path.join(os.homedir(), '.profile')
    ];

    for (const loc of locations) {
      try {
        if (!fs.existsSync(loc)) continue;
        const content = fs.readFileSync(loc, 'utf8');
        const match = content.match(/POLYDEV_USER_TOKEN[=\s]["']?([^"'\n]+)["']?/);
        if (match && match[1] && (match[1].startsWith('pd_') || match[1].startsWith('polydev_'))) {
          this.userToken = match[1];
          this.isAuthenticated = true;
          process.env.POLYDEV_USER_TOKEN = match[1]; // Update env for consistency
          console.error(`[Polydev] Token hot-reloaded from ${loc}`);
          return true;
        }
      } catch (e) {
        // Ignore read errors
      }
    }
    return false;
  }

  /**
   * Save pending login session ID to file
   * Allows login to survive MCP reconnections
   */
  savePendingSession(sessionId) {
    try {
      const data = {
        sessionId,
        createdAt: Date.now(),
        expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes
      };
      fs.writeFileSync(this.PENDING_SESSION_FILE, JSON.stringify(data));
      console.error(`[Polydev] Saved pending session: ${sessionId.slice(0, 8)}...`);
    } catch (error) {
      console.error('[Polydev] Failed to save pending session:', error.message);
    }
  }

  /**
   * Load pending login session from file
   */
  loadPendingSession() {
    try {
      if (!fs.existsSync(this.PENDING_SESSION_FILE)) {
        return null;
      }
      const content = fs.readFileSync(this.PENDING_SESSION_FILE, 'utf8');
      const data = JSON.parse(content);
      
      // Check if expired
      if (data.expiresAt && Date.now() > data.expiresAt) {
        this.clearPendingSession();
        console.error('[Polydev] Pending session expired, cleared');
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('[Polydev] Failed to load pending session:', error.message);
      return null;
    }
  }

  /**
   * Clear pending login session file
   */
  clearPendingSession() {
    try {
      if (fs.existsSync(this.PENDING_SESSION_FILE)) {
        fs.unlinkSync(this.PENDING_SESSION_FILE);
        console.error('[Polydev] Cleared pending session file');
      }
    } catch (error) {
      // Ignore errors
    }
  }

  /**
   * Resume polling for a pending login session (called on startup)
   */
  resumePendingLoginSession() {
    const pending = this.loadPendingSession();
    if (!pending || !pending.sessionId) {
      return;
    }
    
    console.error(`[Polydev] Found pending login session: ${pending.sessionId.slice(0, 8)}...`);
    console.error('[Polydev] Resuming authentication polling...');
    
    // Resume polling (this will auto-clear on success/failure)
    this.startLoginPolling(pending.sessionId, true /* isResume */);
  }

  /**
   * Get login success HTML page
   */
  getLoginSuccessHTML() {
    // Get CLI status for display
    const cliStatus = this.cliManager ? this.cliManager.getCachedStatus() : {};
    const detectedCLIs = Object.entries(cliStatus)
      .filter(([_, status]) => status && status.available)
      .map(([id, status]) => ({
        name: id === 'claude_code' ? 'Claude Code' : 
              id === 'codex_cli' ? 'Codex CLI' : 
              id === 'gemini_cli' ? 'Gemini CLI' : id,
        authenticated: status.authenticated
      }));
    
    const cliListHTML = detectedCLIs.length > 0 
      ? detectedCLIs.map(cli => 
          `<div class="cli-item"><span class="cli-dot ${cli.authenticated ? 'green' : 'yellow'}"></span>${cli.name}</div>`
        ).join('')
      : '<div class="cli-item"><span class="cli-dot gray"></span>No local CLIs detected</div>';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Polydev - Login Successful</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      display: flex; justify-content: center; align-items: center; 
      min-height: 100vh; background: #fafafa;
      padding: 20px;
    }
    .container { 
      text-align: center; padding: 40px; max-width: 480px; width: 100%;
      background: white; border-radius: 12px; 
      border: 1px solid #e5e5e5;
    }
    .logo { 
      width: 64px; height: 64px; margin: 0 auto 16px;
      background: #111; border-radius: 14px; 
      display: flex; align-items: center; justify-content: center;
    }
    .logo svg { width: 36px; height: 36px; }
    .brand { font-size: 24px; font-weight: 700; color: #111; margin-bottom: 4px; letter-spacing: -0.5px; }
    .tagline { color: #666; font-size: 13px; margin-bottom: 24px; }
    .success-badge {
      display: inline-flex; align-items: center; gap: 8px;
      background: #f0fdf4; color: #166534; padding: 10px 20px;
      border-radius: 6px; font-weight: 600; font-size: 14px;
      margin-bottom: 28px; border: 1px solid #bbf7d0;
    }
    .success-badge svg { width: 18px; height: 18px; }
    .section { text-align: left; margin-bottom: 20px; }
    .section-title { font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
    .cli-item { 
      display: flex; align-items: center; gap: 10px; 
      padding: 10px 12px; background: #fafafa; border-radius: 6px; 
      margin-bottom: 6px; font-size: 13px; color: #333; border: 1px solid #eee;
    }
    .cli-dot { width: 8px; height: 8px; border-radius: 50%; }
    .cli-dot.green { background: #22c55e; }
    .cli-dot.yellow { background: #eab308; }
    .cli-dot.gray { background: #d4d4d4; }
    .api-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
    .api-item { 
      padding: 10px; background: #fafafa; border-radius: 6px; 
      font-size: 12px; color: #333; text-align: center; border: 1px solid #eee;
    }
    .divider { height: 1px; background: #eee; margin: 24px 0; }
    .action-btn {
      display: block; width: 100%; padding: 12px 20px;
      background: #111; color: white; border: none; border-radius: 8px;
      font-size: 14px; font-weight: 600; cursor: pointer;
      text-decoration: none; margin-bottom: 10px;
      transition: background 0.2s;
    }
    .action-btn:hover { background: #333; }
    .secondary-btn {
      display: block; width: 100%; padding: 10px 20px;
      background: white; color: #333; border: 1px solid #ddd; border-radius: 8px;
      font-size: 13px; font-weight: 500; cursor: pointer; text-decoration: none;
    }
    .secondary-btn:hover { background: #fafafa; }
    .note { color: #999; font-size: 11px; margin-top: 16px; }
    .countdown { 
      color: #666; font-size: 12px; margin-top: 8px;
      display: flex; align-items: center; justify-content: center; gap: 6px;
    }
    .countdown-spinner {
      width: 12px; height: 12px; border: 2px solid #e5e5e5;
      border-top-color: #666; border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M2 17L12 22L22 17" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M2 12L12 17L22 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="brand">Polydev</div>
    <div class="tagline">Any model in any agent</div>
    
    <div class="success-badge">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      Login Successful
    </div>

    <div class="section">
      <div class="section-title">Local CLI Tools (your own plan)</div>
      \${cliListHTML}
    </div>

    <div class="section">
      <div class="section-title">Your API Keys</div>
      <p class="note">Add keys for OpenAI, Anthropic, Google, xAI, OpenRouter and others. Each account also gets 10 free requests on Polydev's keys.</p>
    </div>

    <div class="divider"></div>

    <a href="https://www.polydev.ai/dashboard/models" target="_blank" class="action-btn">
      Configure API Keys
    </a>
    <button onclick="window.close()" class="secondary-btn">Close Window</button>
    
    <p class="note">Token saved. Restart your IDE to activate.</p>
    <div class="countdown" id="countdown">
      <div class="countdown-spinner"></div>
      <span>Closing in <strong id="seconds">5</strong>s...</span>
    </div>
  </div>
  <script>
    // Auto-close countdown
    let seconds = 5;
    const interval = setInterval(() => {
      seconds--;
      document.getElementById('seconds').textContent = seconds;
      if (seconds <= 0) {
        clearInterval(interval);
        document.getElementById('countdown').innerHTML = 'Closing...';
        window.close();
        // Fallback: if window.close() doesn't work, hide countdown
        setTimeout(() => {
          document.getElementById('countdown').innerHTML = 'You can close this tab now.';
        }, 500);
      }
    }, 1000);
  </script>
</body>
</html>`;
  }

  /**
   * Send an MCP progress notification to the client
   * This is a JSON-RPC notification (no id) that compatible clients use to:
   * 1. Display progress UI (status bar, spinners)
   * 2. Reset their tool call timeout (if resetTimeoutOnProgress is enabled)
   * @param {string|number} progressToken - Token from request's _meta.progressToken
   * @param {number} progress - Current progress value (must increase monotonically)
   * @param {number} total - Total expected progress value
   * @param {string} message - Human-readable status message
   */
  sendProgressNotification(progressToken, progress, total, message) {
    if (!progressToken) return; // Client didn't request progress
    
    const notification = {
      jsonrpc: '2.0',
      method: 'notifications/progress',
      params: {
        progressToken,
        progress,
        total,
        message
      }
    };
    
    try {
      process.stdout.write(JSON.stringify(notification) + '\n');
      console.error(`[Polydev] Progress: ${progress}/${total} - ${message}`);
    } catch (err) {
      console.error(`[Polydev] Failed to send progress notification:`, err.message);
    }
  }

  /**
   * Start a periodic progress heartbeat to prevent client-side timeouts.
   * Sends a progress notification every intervalMs to keep the connection alive
   * @param {string|number} progressToken - Token from request's _meta.progressToken
   * @param {number} intervalMs - Heartbeat interval in milliseconds (default: 10s)
   * @returns {{ stop: Function, tick: Function }} Controller to stop heartbeat and manually tick progress
   */
  startProgressHeartbeat(progressToken, intervalMs = 10000) {
    if (!progressToken) return { stop: () => {}, tick: () => {} };
    
    let currentProgress = 0;
    const total = 100; // Use percentage-style progress
    
    const interval = setInterval(() => {
      currentProgress = Math.min(currentProgress + 5, 95); // Never reach 100 until done
      this.sendProgressNotification(progressToken, currentProgress, total, 'Processing perspectives...');
    }, intervalMs);
    
    return {
      stop: () => clearInterval(interval),
      tick: (progress, message) => {
        currentProgress = progress;
        this.sendProgressNotification(progressToken, progress, total, message);
      }
    };
  }

  /**
   * Forward a request to the remote Polydev API server
   */
  async forwardToRemoteServer(request) {
    console.error(`[Stdio Wrapper] Forwarding request to remote server: ${this.serverUrl}`);

    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 300000) : null; // 300s timeout

      const response = await fetch(this.serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.userToken}`,
          'User-Agent': 'polydev-stdio-wrapper/1.0.0'
        },
        body: JSON.stringify(request),
        ...(controller ? { signal: controller.signal } : {})
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Stdio Wrapper] Remote server error: ${response.status} - ${errorText}`);
        if (response.status >= 500) this._serverUnreachableAt = Date.now();

        if (response.status === 401) {
          console.error('[Polydev] Remote API returned 401 — token expired, triggering re-authentication...');
          return await this.triggerReAuth(request.id, 'Token expired or invalid. Re-authenticating...');
        }

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
      this._serverUnreachableAt = null;
      return result;
    } catch (error) {
      console.error(`[Stdio Wrapper] Network error:`, error.message);
      this._serverUnreachableAt = Date.now();
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
   * Handle X search tool locally — calls polydev.ai API
   */
  async handleSearchX(params, id) {
    const args = params.arguments || {};
    console.error('[Stdio Wrapper] Handling search_x locally');

    if (!args.query || typeof args.query !== 'string') {
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'Error: query is required and must be a string' }], isError: true } };
    }

    const userToken = args.user_token || this.userToken;
    if (!userToken) {
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'Authentication required for X search.\nUse the "login" tool first, or pass user_token parameter.' }], isError: true } };
    }

    try {
      const response = await fetch('https://polydev.ai/api/x-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
          'User-Agent': 'polydev-stdio-wrapper/1.0.0'
        },
        body: JSON.stringify({
          query: args.query,
          user_token: userToken,
          // No default: the server picks the newest xAI model.
          ...(args.model ? { model: args.model } : {})
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'X search needs your own xAI API key; it is not part of the free allowance.\n\n1. Get an xAI API key at https://console.x.ai\n2. Add it at https://www.polydev.ai/dashboard/models (select the "X-AI" provider)' }], isError: true } };
        }
        throw new Error(errorData.error || `X search failed: HTTP ${response.status}`);
      }

      const result = await response.json();

      // Format response
      let formatted = '# X Search Results\n\n';
      if (result.answer) {
        formatted += `## Summary\n${result.answer}\n\n`;
      }
      if (result.search_results && result.search_results.length > 0) {
        formatted += '## Posts Found\n\n';
        result.search_results.forEach((post, i) => {
          formatted += `### ${i + 1}. ${post.author || 'Unknown'}\n`;
          if (post.snippet) formatted += `${post.snippet}\n`;
          if (post.url) formatted += `[View post](${post.url})\n`;
          if (post.date) formatted += `*${post.date}*\n`;
          formatted += '\n';
        });
      }
      if (result.using_free_tier) {
        formatted += `---\n*Free searches remaining: ${result.free_searches_remaining}*\n`;
      }
      if (result.model) {
        formatted += `\n*Model: ${result.model} | Latency: ${result.latency_ms}ms*\n`;
      }

      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: formatted }] } };
    } catch (error) {
      console.error('[Stdio Wrapper] X search error:', error.message);
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `X search failed: ${error.message}` }], isError: true } };
    }
  }

  /**
   * Handle image generation tool locally — calls polydev.ai API
   */
  async handleGenerateImage(params, id) {
    const args = params.arguments || {};
    console.error('[Stdio Wrapper] Handling generate_image locally');

    if (!args.prompt || typeof args.prompt !== 'string') {
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'Error: prompt is required and must be a string' }], isError: true } };
    }

    const userToken = args.user_token || this.userToken;
    if (!userToken) {
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'Authentication required for image generation.\nUse the "login" tool first, or pass user_token parameter.' }], isError: true } };
    }

    try {
      const response = await fetch('https://polydev.ai/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`,
          'User-Agent': 'polydev-stdio-wrapper/1.0.0'
        },
        body: JSON.stringify({
          prompt: args.prompt,
          user_token: userToken,
          provider: args.provider || 'gemini',
          model: args.model,
          size: args.size || '1024x1024',
          quality: args.quality || 'auto'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 400 && errorData.setup_url) {
          return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `${errorData.error || 'Image generation needs an API key.'}\n\nTo use your own key:\n1. Get an API key from OpenAI (https://platform.openai.com) or Google AI (https://aistudio.google.com)\n2. Add it at https://www.polydev.ai/dashboard/models\n\nSupported providers: OpenAI and Google Gemini` }], isError: true } };
        }
        throw new Error(errorData.error || `Image generation failed: HTTP ${response.status}`);
      }

      const result = await response.json();

      // Save image to file if we have base64 data
      if (result.image_base64) {
        try {
          const timestamp = Date.now();
          const filename = `polydev-image-${timestamp}.png`;
          const outputDir = path.join(os.homedir(), '.polydev', 'images');
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
          const outputPath = path.join(outputDir, filename);
          fs.writeFileSync(outputPath, Buffer.from(result.image_base64, 'base64'));
          result.saved_to = outputPath;
          console.error(`[Stdio Wrapper] Image saved to: ${outputPath}`);
        } catch (saveError) {
          console.error('[Stdio Wrapper] Failed to save image:', saveError.message);
        }
      }

      // Format response
      let formatted = '# Image Generated\n\n';
      formatted += `**Provider**: ${result.provider || 'gemini'}\n`;
      formatted += `**Model**: ${result.model || 'provider default'}\n`;
      if (result.size) formatted += `**Size**: ${result.size}\n`;
      if (result.revised_prompt) formatted += `**Revised prompt**: ${result.revised_prompt}\n`;
      if (result.text_response) formatted += `**Description**: ${result.text_response}\n`;
      if (result.saved_to) formatted += `\n**Saved to**: \`${result.saved_to}\`\n`;
      if (result.image_base64) formatted += `\nImage data: ${(result.image_base64.length / 1024).toFixed(0)}KB base64 PNG\n`;
      if (result.latency_ms) formatted += `\n*Latency: ${result.latency_ms}ms*\n`;

      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: formatted }] } };
    } catch (error) {
      console.error('[Stdio Wrapper] Image generation error:', error.message);
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `Image generation failed: ${error.message}` }], isError: true } };
    }
  }

  /**
   * list_models: what this user can reach right now, and what pays for each.
   */
  async handleListModels(params, id) {
    const lines = ['MODELS YOU CAN REACH NOW', '', 'On this machine:'];
    const excludedCli = this.getExcludedCliForCurrentIDE();

    // ChatGPT plan
    const plan = this.chatgpt.status();
    if (plan.planEnabled && this.chatgpt.usable()) {
      try {
        const models = await this.chatgpt.listModels();
        lines.push(`- ChatGPT plan: ${models.length ? models.map((m) => m.slug).join(', ') : '(no models listed for this account)'}`);
        lines.push(`  Paid by: ${CHATGPT.PAID_BY_LABEL}. ${CHATGPT.TEXT.manageUsage}: ${CHATGPT.MANAGE_USAGE_URL}`);
      } catch (error) {
        lines.push(`- ChatGPT plan: connected, but its model list could not be read: ${error.message}`);
      }
    } else if (plan.signedIn && plan.ineligible) {
      lines.push('- ChatGPT plan: not eligible (needs Plus or Pro). ChatGPT said plan usage is not available for this account or workspace. If that changes, run `npx -y polydev-ai chatgpt login` again.');
    } else if (plan.signedIn && !plan.planEnabled) {
      lines.push('- ChatGPT plan: signed in, but plan usage is off. Run `npx -y polydev-ai chatgpt login` and allow ChatGPT plan usage.');
    } else if (plan.signedIn && plan.pausedUntil) {
      lines.push(`- ChatGPT plan: paused after a usage limit. ${CHATGPT.TEXT.manageUsage}: ${CHATGPT.MANAGE_USAGE_URL}`);
    } else {
      lines.push(`- ChatGPT plan: not connected. To connect: the connect_chatgpt_plan tool, or \`npx -y polydev-ai chatgpt login\` (${CHATGPT.TEXT.action}).`);
    }

    // Local CLIs
    let cliStatus = {};
    try {
      if (this._cliDetectionReady && !this._cliDetectionComplete) await this._cliDetectionReady;
      cliStatus = await this.cliManager.getCliStatus();
    } catch (_) { /* shown as unknown */ }
    for (const [cliId, label] of [['claude_code', 'Claude Code'], ['codex_cli', 'Codex']]) {
      const st = cliStatus[cliId];
      if (cliId === excludedCli) {
        lines.push(`- ${label}: skipped, because it is the agent calling Polydev`);
      } else if (st && st.available && st.authenticated) {
        lines.push(`- ${label}: its default model, or any model it accepts by name${st.version ? ` (${st.version})` : ''}`);
        lines.push(`  Paid by: ${this.cliManager.getPaidByLabel(cliId)}`);
      } else if (st && st.available) {
        lines.push(`- ${label}: installed but not signed in`);
      } else {
        lines.push(`- ${label}: not installed`);
      }
    }

    lines.push('', 'Through Polydev (polydev.ai):');
    if (!this.userToken) {
      lines.push('- Not signed in to Polydev on this machine. Use the login tool to reach models with your own API keys or Polydev free requests.');
    } else {
      const remote = await this.forwardToRemoteServer({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'list_available_models', arguments: params?.arguments || {} },
        id: `list-models-${Date.now()}`
      });
      const text = remote?.result?.content?.[0]?.text;
      if (text) {
        lines.push(text);
      } else {
        lines.push(`- Could not read the list from Polydev: ${remote?.error?.message || 'no response'}`);
      }
    }

    return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: lines.join('\n') }] } };
  }

  /**
   * chatgpt_plan_status: whether the ChatGPT plan is connected on this machine. No tokens are shown.
   */
  handleChatGPTPlanStatus(params, id) {
    const s = this.chatgpt.status();
    const pending = this._chatgptSignIn;
    let text;
    if (pending && pending.state === 'waiting') {
      text = `ChatGPT sign-in is waiting for you in the browser (until ${new Date(pending.expiresAt).toISOString()}).\n`
        + `If the browser did not open, open this link on this machine:\n${pending.url}\n`
        + 'Then call chatgpt_plan_status again.';
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } };
    }
    let prefix = '';
    if (pending && pending.state === 'failed' && !pending.reported) {
      pending.reported = true;
      prefix = `The last ChatGPT sign-in did not complete: ${pending.error}\n\n`;
    }
    if (!s.signedIn) {
      text = s.needsSignIn
        ? 'ChatGPT plan: the connection ended (disconnected in ChatGPT settings or expired). To sign in again, use the connect_chatgpt_plan tool or run `npx -y polydev-ai chatgpt login`.'
        : `ChatGPT plan: not connected.\nTo use your ChatGPT plan for OpenAI models, use the connect_chatgpt_plan tool or run \`npx -y polydev-ai chatgpt login\` (${CHATGPT.TEXT.action}). It opens ChatGPT sign-in in the browser.`;
    } else if (!s.planEnabled) {
      text = `ChatGPT: signed in as ${s.email || 'your account'}, but ChatGPT plan usage is off (the permission was not granted).\n`
        + 'To turn it on, sign in again and allow ChatGPT plan usage. Other ways to pay for OpenAI models: Codex on this machine, or your own OpenAI API key at https://www.polydev.ai/dashboard/models.';
    } else {
      text = `ChatGPT plan: connected as ${s.email || 'your account'}. ${CHATGPT.TEXT.inUse} for OpenAI models.\n`
        + `${CHATGPT.TEXT.manageUsage}: ${CHATGPT.MANAGE_USAGE_URL}`;
      if (s.pausedUntil) text += `\nPaused after a usage limit until ${s.pausedUntil}.`;
      if (s.ineligible) text += '\nNot eligible (needs Plus or Pro): ChatGPT reported that plan usage is not available for this account or workspace.';
      const welcome = this.chatgpt.takeWelcome();
      if (welcome) text = `${welcome}\n\n${text}`;
    }
    text = prefix + text;
    text += '\nTo disconnect: run `npx -y polydev-ai chatgpt logout` in a terminal.';
    return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }] } };
  }

  /**
   * connect_chatgpt_plan: start "Continue with ChatGPT" and return the sign-in link at once, while
   * the loopback listener waits in the background. This works when the browser cannot be opened
   * from here (SSH, remote IDE): the user opens the link, and chatgpt_plan_status reports the result.
   * The returned link never carries id_token_hint.
   */
  async handleConnectChatGPTPlan(params, id) {
    const args = params?.arguments || {};
    const timeoutSeconds = Math.min(600, Math.max(30, Number(args.timeout_seconds) || 300));
    if (this.isSandboxed()) {
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'ChatGPT sign-in needs a browser on this machine, which this environment does not have. Run `npx -y polydev-ai chatgpt login` on a machine with a browser.' }], isError: true } };
    }

    const reply = (text, isError = false) => ({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text }], ...(isError ? { isError: true } : {}) } });
    const callbackPort = (url) => {
      try { return new URL(new URL(url).searchParams.get('redirect_uri')).port || null; } catch (_) { return null; }
    };
    const linkText = (p) => `${CHATGPT.TEXT.action}: ${p.opened ? 'a browser window was opened for ChatGPT sign-in.' : 'the browser could not be opened from here.'}\n`
      + `If it did not open, open this link in a browser on this same machine to continue:\n${p.url}\n`
      + `The sign-in returns to 127.0.0.1 on this machine. Over SSH, first run \`ssh -L ${callbackPort(p.url) || '1455'}:127.0.0.1:${callbackPort(p.url) || '1455'} <this host>\` on your own computer, or run \`npx -y polydev-ai chatgpt login\` there instead.\n\n`
      + `The sign-in waits until ${new Date(p.expiresAt).toISOString()}. When you are done, call chatgpt_plan_status to see the result.`;

    // A second call while one sign-in is starting or waiting reuses it instead of opening another listener.
    const current = this._chatgptSignIn;
    if (current && current.state === 'waiting') return reply(linkText(current));
    if (current && current.state === 'starting') {
      return reply('A ChatGPT sign-in is already starting. Call chatgpt_plan_status in a few seconds for the link.');
    }

    const attempt = { state: 'starting', url: null, opened: false, expiresAt: Date.now() + timeoutSeconds * 1000, error: null, reported: false };
    this._chatgptSignIn = attempt;

    let announce;
    const linkReady = new Promise((resolve) => { announce = resolve; });
    const done = this.chatgpt.signIn({
      timeoutMs: timeoutSeconds * 1000,
      onAuthUrl: (url, didOpen) => {
        attempt.url = url;
        attempt.opened = didOpen;
        attempt.state = 'waiting';
        announce();
      }
    }).then((result) => {
      attempt.state = 'done';
      attempt.result = { email: result.email || null, planEnabled: !!result.planEnabled };
      console.error(`[Polydev] ChatGPT sign-in finished (plan usage ${result.planEnabled ? 'on' : 'off'})`);
    }, (error) => {
      attempt.state = 'failed';
      attempt.error = error && error.message ? error.message : String(error);
      console.error(`[Polydev] ChatGPT sign-in did not complete: ${attempt.error}`);
    }).finally(() => announce());

    // Wait only until the link exists (or sign-in failed before reaching the browser).
    await linkReady;
    if (attempt.state === 'waiting') return reply(linkText(attempt));
    await done;
    if (attempt.state === 'failed') {
      attempt.reported = true;
      return reply(`ChatGPT sign-in did not start: ${attempt.error}`, true);
    }
    return reply('ChatGPT sign-in finished. Call chatgpt_plan_status to see the result.');
  }

  /**
   * Check if a tool is a CLI tool that should be handled locally
   */
  isCliTool(toolName) {
    const cliTools = [
      'force_cli_detection',
      'get_cli_status',
      'send_cli_prompt',
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
    
    // Extract progress token from request metadata (MCP spec)
    // Clients that want progress updates include this in _meta.progressToken
    const progressToken = params?._meta?.progressToken;
    if (progressToken) {
      console.error(`[Stdio Wrapper] Client requested progress updates (token: ${progressToken})`);
    }
    
    // Start periodic heartbeat to prevent client-side timeouts
    // Sends progress notification every 10s to keep the connection alive
    const heartbeat = this.startProgressHeartbeat(progressToken);
    
    try {
      // Send initial progress
      heartbeat.tick(5, 'Initializing perspectives engine...');
      
      // Use existing localSendCliPrompt logic which already:
      // 1. Checks all local CLIs
      // 2. Calls remote perspectives
      // 3. Combines results
      const result = await this.localSendCliPrompt(params?.arguments || {}, progressToken);

      // Stop heartbeat before sending final response
      heartbeat.stop();
      heartbeat.tick(100, 'Complete');

      // Check if result indicates auth failure (from forwardToRemoteServer 401 handling)
      if (result?.result?.content?.[0]?.text?.includes('RE-AUTHENTICATION REQUIRED')) {
        // Auth failure already handled with re-auth response - pass through
        return result;
      }

      // localSendCliPrompt returns either:
      // - A string (from combineAllCliAndPerspectives) on success
      // - An object { success, error, timestamp } on exception
      if (result && typeof result === 'object' && result.success === false) {
        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: result.error || 'No answer.' }], isError: true }
        };
      }
      const resultText = typeof result === 'string'
        ? result
        : (result.content || this.formatCliResponse(result));

      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: resultText
            }
          ]
        }
      };

    } catch (error) {
      heartbeat.stop(); // Always clean up heartbeat
      console.error(`[Stdio Wrapper] get_perspectives error:`, error);
      
      // Check if error is specifically an HTTP 401 unauthorized
      // IMPORTANT: Don't match generic 'token' or 'auth' strings — they appear in
      // unrelated errors like "Unexpected token" (JSON parse) or "authentication" (CLI output)
      const errMsg = (error.message || '').toLowerCase();
      const isHttp401 = errMsg.includes('401') || errMsg.includes('unauthorized');
      if (isHttp401) {
        console.error('[Polydev] Perspectives auth error (401), suggesting re-login');
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{
              type: 'text',
              text: `Authentication error: ${error.message}\n\nPlease re-authenticate using the "login" tool or run in a terminal: npx -p polydev-ai polydev-login`
            }],
            isError: true
          }
        };
      }
      
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
    const progressToken = params?._meta?.progressToken;

    console.error(`[Stdio Wrapper] Handling local CLI tool: ${toolName}`);

    // Start heartbeat for long-running CLI operations
    const heartbeat = this.startProgressHeartbeat(progressToken);

    try {
      let result;

      switch (toolName) {
        case 'force_cli_detection':
        case 'polydev.force_cli_detection':
          result = await this.localForceCliDetection(args);
          break;
        
        case 'get_cli_status':
        case 'polydev.get_cli_status':
          result = await this.localGetCliStatus(args);
          break;
        
        case 'send_cli_prompt':
        case 'polydev.send_cli_prompt':
          result = await this.localSendCliPrompt(args, progressToken);
          break;
        
        default:
          throw new Error(`Unknown CLI tool: ${toolName}`);
      }

      heartbeat.stop();
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
      heartbeat.stop();
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
      console.error(`[Stdio Wrapper] CLI detection results:`, JSON.stringify(results, null, 2));
      
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
   * Get the CLI ID to exclude based on the current IDE client.
   * Prevents recursive calls (e.g., Claude Code calling claude_code CLI which spawns another Claude Code).
   * Returns null if no CLI should be excluded.
   */
  getExcludedCliForCurrentIDE() {
    if (!this.clientInfo?.name) return null;

    const clientName = this.clientInfo.name.toLowerCase();

    // Map known IDE client names to their corresponding CLI IDs
    // These are the clientInfo.name values sent during MCP initialize handshake
    const ideToCliMap = {
      // Claude Code variants
      'claude-code': 'claude_code',
      'claude_code': 'claude_code',
      'claude code': 'claude_code',
      'claudecode': 'claude_code',
      // Cursor uses Claude under the hood but is a separate IDE — don't exclude
      // Codex CLI / OpenAI
      'codex-cli': 'codex_cli',
      'codex_cli': 'codex_cli',
      'codex': 'codex_cli',
    };

    // Direct match first
    if (ideToCliMap[clientName]) {
      return ideToCliMap[clientName];
    }

    // Fuzzy match: check if client name contains known patterns
    if (clientName.includes('claude')) return 'claude_code';
    if (clientName.includes('codex')) return 'codex_cli';

    return null;
  }

  /**
   * Answer a prompt: sources on this machine first, then the Polydev server.
   *
   * On this machine: the ChatGPT plan (Sign in with ChatGPT) for OpenAI models, then Claude Code
   * and Codex under the user's own login. The CLI that matches the calling agent is skipped so it
   * never calls itself. The Polydev server (the user's API keys, OpenRouter, Polydev free requests)
   * fills the rest when this machine is signed in to Polydev.
   *
   * args: { prompt, model?, models?, provider_id?, timeout_ms? }
   */
  async localSendCliPrompt(args, progressToken) {
    console.error(`[Stdio Wrapper] Asking models (local sources first)`);

    try {
      args = args || {};
      let { provider_id, prompt, mode = 'args', timeout_ms = 400000 } = args;
      if (!timeout_ms || timeout_ms === Infinity || timeout_ms < 1 || timeout_ms > 600000) {
        timeout_ms = 400000;
      }
      if (!prompt || typeof prompt !== 'string') {
        throw new Error('prompt is required');
      }
      const gracefulTimeout = Math.min(timeout_ms, 600000);
      const requestedModels = this.normalizeRequestedModels(args);
      const polydevConnected = !!this.userToken;

      if (polydevConnected) {
        try {
          await this.fetchUserModelPreferences();
        } catch (prefError) {
          console.error('[Stdio Wrapper] Model preferences fetch failed (will use defaults):', prefError.message);
        }
      }
      this.sendProgressNotification(progressToken, 15, 100, 'Loaded model preferences');

      const maxPerspectives = requestedModels.length || this.perspectivesPerMessage || 2;
      const { available: availableClis } = await this.getAllAvailableProviders();
      const excludedCli = this.getExcludedCliForCurrentIDE();
      if (excludedCli) {
        console.error(`[Stdio Wrapper] Skipping ${excludedCli} (same as the calling agent)`);
      }
      const canUseCli = (cliId) => availableClis.includes(cliId) && cliId !== excludedCli;
      // A plan paused after a usage limit still takes its turn: it answers at once (no request) with
      // the limit, and the answer that replaces it says so.
      const planUsable = this.chatgpt.usable() || this.chatgptPaused();

      const tasks = []; // { source: 'chatgpt_plan' | 'cli', cliId?, provider, model }
      const serverModels = []; // explicitly requested models the server should answer
      const apiOnlyProviders = []; // providers the server should fill (default mode)

      if (provider_id) {
        if (provider_id === 'chatgpt_plan') {
          tasks.push({ source: 'chatgpt_plan', provider: 'openai', model: requestedModels[0] || null });
        } else {
          tasks.push({ source: 'cli', cliId: provider_id, provider: this.cliProviderName(provider_id), model: requestedModels[0] || null });
        }
      } else if (requestedModels.length > 0) {
        for (const model of requestedModels) {
          const family = this.modelFamily(model);
          if (family === 'openai' && planUsable) {
            tasks.push({ source: 'chatgpt_plan', provider: 'openai', model });
          } else if (family === 'openai' && canUseCli('codex_cli')) {
            tasks.push({ source: 'cli', cliId: 'codex_cli', provider: 'openai', model });
          } else if (family === 'anthropic' && canUseCli('claude_code')) {
            tasks.push({ source: 'cli', cliId: 'claude_code', provider: 'anthropic', model });
          } else {
            serverModels.push(model);
          }
        }
      } else {
        if (canUseCli('claude_code')) {
          tasks.push({ source: 'cli', cliId: 'claude_code', provider: 'anthropic', model: this.ownKeyModelFor('anthropic') });
        }
        if (planUsable) {
          tasks.push({ source: 'chatgpt_plan', provider: 'openai', model: null });
        } else if (canUseCli('codex_cli')) {
          tasks.push({ source: 'cli', cliId: 'codex_cli', provider: 'openai', model: this.ownKeyModelFor('openai') });
        }
        const used = new Set(tasks.map((t) => t.provider));
        for (const p of (this.allProviders || [])) {
          if (tasks.length + apiOnlyProviders.length >= maxPerspectives) break;
          const np = this.normalizeProviderName(p.provider);
          if (used.has(np)) continue;
          used.add(np);
          apiOnlyProviders.push({ provider: np, model: p.model });
        }
      }

      console.error(`[Stdio Wrapper] Plan: local=${tasks.map((t) => `${t.source === 'cli' ? t.cliId : t.source}${t.model ? `(${t.model})` : ''}`).join(', ') || 'none'}; server models=${serverModels.join(', ') || 'none'}; server providers=${apiOnlyProviders.map((p) => p.provider).join(', ') || 'none'}`);

      const runTask = async (task) => {
        if (task.source === 'chatgpt_plan') {
          const r = await this.askChatGPTPlan(prompt, task.model, gracefulTimeout);
          // After a usage limit, Codex is skipped only when it is signed in with ChatGPT (it may
          // draw on the same plan) and the Polydev server can answer instead (the user's own
          // OpenAI key, OpenRouter key or Polydev's free requests). Either way the answer says so.
          const skipCodex = r.usage_limit && (await this.codexUsesChatGPT()) && this.serverReachable();
          if (!r.success && !r.noFallback && !skipCodex && !provider_id && canUseCli('codex_cli')) {
            const c = await this.runCliTask('codex_cli', 'openai', prompt, mode, gracefulTimeout, task.model);
            const note = r.usage_limit
              ? usageLimitNote(c.paid_by || this.cliManager.getPaidByLabel('codex_cli'))
              : `ChatGPT plan did not answer (${r.error}); Codex answered instead.`;
            // The Codex answer stands in for the plan's; the server is not asked again for it.
            return { ...c, fallback_note: note, replaced_usage_limit: !!r.usage_limit };
          }
          return r;
        }
        return this.runCliTask(task.cliId, task.provider, prompt, mode, gracefulTimeout, task.model);
      };

      let localResults = [];
      if (tasks.length > 0) {
        this.sendProgressNotification(progressToken, 30, 100, `Asking ${tasks.length} source(s) on this machine...`);
        localResults = await Promise.all(tasks.map((task) => runTask(task).catch((error) => ({
          provider_id: task.source === 'cli' ? task.cliId : 'chatgpt_plan',
          original_provider: task.provider,
          success: false,
          error: error.message,
          requested_model: task.model
        }))));
        this.sendProgressNotification(progressToken, 55, 100, `Got ${localResults.filter((r) => r.success).length} answer(s) on this machine`);
      }

      // A requested model that failed locally goes to the server instead. After a ChatGPT usage
      // limit too: the answer then says that the plan hit its limit and what paid instead.
      if (requestedModels.length > 0 && !provider_id) {
        localResults.forEach((r, i) => {
          const model = tasks[i] && tasks[i].model;
          if (!r.success && !r.noFallback && model && !serverModels.includes(model)) serverModels.push(model);
        });
      }

      const notes = [];
      const successfulLocalCount = localResults.filter((r) => r.success).length;
      let perspectivesResult = { success: true, content: '', skipped: true };

      if (!polydevConnected) {
        if (serverModels.length > 0 || apiOnlyProviders.length > 0 || successfulLocalCount === 0) {
          const unasked = serverModels.length ? ` Not asked: ${serverModels.join(', ')}.` : '';
          notes.push(`This machine is not signed in to Polydev, so only sources on this machine were asked.${unasked} Use the login tool to also reach models through your own API keys.`);
        }
      } else if (requestedModels.length > 0 && !provider_id) {
        if (serverModels.length > 0) {
          this.sendProgressNotification(progressToken, 65, 100, `Asking Polydev for ${serverModels.length} model(s)...`);
          perspectivesResult = await this.callPerspectivesForCli(args, localResults, serverModels.length,
            serverModels.map((m) => ({ provider: this.modelFamily(m) || undefined, model: m })), { explicitModels: serverModels });
        } else if (successfulLocalCount > 0) {
          // Every named model answered here, so the server is not asked. Report the answers
          // (fire-and-forget, short timeout) so they show in the dashboard and can be ranked.
          this.reportCliResultsToServer(prompt, localResults, args).catch(() => {});
        }
      } else {
        const remainingPerspectives = Math.max(0, maxPerspectives - successfulLocalCount);
        // The server holds the authoritative perspectives_per_message, so it is asked whenever
        // there is room or local answers to record.
        if (remainingPerspectives > 0 || successfulLocalCount > 0) {
          this.sendProgressNotification(progressToken, 65, 100, remainingPerspectives > 0
            ? `Asking Polydev for ${remainingPerspectives} more answer(s)...`
            : 'Checking for more answers...');
          perspectivesResult = await this.callPerspectivesForCli(args, localResults, remainingPerspectives, apiOnlyProviders);
        }
      }

      for (const localResult of localResults) {
        if (localResult.provider_id) {
          this.recordLocalUsage(localResult.provider_id, prompt, localResult).catch(() => {});
        }
      }

      this.sendProgressNotification(progressToken, 90, 100, 'Combining answers...');
      return this.combineAllCliAndPerspectives(localResults, perspectivesResult, args, notes);

    } catch (error) {
      console.error('[Stdio Wrapper] ask_model error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        local_only: true
      };
    }
  }

  /** model / models arguments as a de-duplicated list (at most 10). */
  normalizeRequestedModels(args) {
    const list = [];
    if (typeof args.model === 'string' && args.model.trim()) list.push(args.model.trim());
    if (Array.isArray(args.models)) {
      for (const m of args.models) {
        if (typeof m === 'string' && m.trim()) list.push(m.trim());
      }
    }
    return [...new Set(list)].slice(0, 10);
  }

  normalizeProviderName(provider) {
    const map = { 'gemini': 'google', 'google-ai': 'google', 'x-ai': 'xai', 'open-ai': 'openai', 'anthropic-ai': 'anthropic' };
    const lower = String(provider || '').toLowerCase();
    return map[lower] || lower;
  }

  /** Which provider family a model id belongs to, or null when unknown. */
  modelFamily(model) {
    const raw = String(model || '').trim().toLowerCase();
    const slash = raw.indexOf('/');
    if (slash > 0) {
      const prefix = this.normalizeProviderName(raw.slice(0, slash));
      if (['openai', 'anthropic', 'google', 'xai', 'deepseek', 'mistral'].includes(prefix)) return prefix;
    }
    const m = slash > 0 ? raw.slice(slash + 1) : raw;
    if (isOpenAIModel(m)) return 'openai';
    if (m.startsWith('claude')) return 'anthropic';
    if (m.startsWith('gemini') || m.startsWith('gemma')) return 'google';
    if (m.startsWith('grok')) return 'xai';
    if (m.startsWith('deepseek')) return 'deepseek';
    return null;
  }

  cliProviderName(cliId) {
    return { claude_code: 'anthropic', codex_cli: 'openai', chatgpt_plan: 'openai' }[cliId] || null;
  }

  /** The model of the user's own API key for a provider (never a credits-tier model name). */
  ownKeyModelFor(provider) {
    const entry = (this.allProviders || []).find((p) => this.normalizeProviderName(p.provider) === provider && !p.tier);
    return entry ? entry.model || null : null;
  }

  sourceName(providerId) {
    return { chatgpt_plan: 'ChatGPT plan', claude_code: 'Claude Code', codex_cli: 'Codex' }[providerId] || providerId;
  }

  /** Run one local CLI with its adaptive timeout; retry with the CLI's default model on a model error. */
  async runCliTask(cliId, provider, prompt, mode, gracefulTimeout, model) {
    try {
      const cliTimeout = this.getAdaptiveTimeout(cliId, gracefulTimeout);
      let result = await this.cliManager.sendCliPrompt(cliId, prompt, mode, cliTimeout, model || null);
      if (!result.success && model) {
        const errorLower = (result.error || '').toLowerCase();
        if (errorLower.includes('not found') || errorLower.includes('not supported') || errorLower.includes('invalid model') ||
            errorLower.includes('does not exist') || errorLower.includes('unknown model')) {
          console.error(`[Stdio Wrapper] Model '${model}' failed for ${cliId}, retrying with the CLI default`);
          result = await this.cliManager.sendCliPrompt(cliId, prompt, mode, cliTimeout, null);
        }
      }
      if (result.success && result.latency_ms) {
        this.recordCliResponseTime(cliId, result.latency_ms);
      }
      return { provider_id: cliId, original_provider: provider, requested_model: model || null, ...result };
    } catch (error) {
      console.error(`[Stdio Wrapper] CLI ${cliId} failed:`, error.message);
      return {
        provider_id: cliId,
        original_provider: provider,
        success: false,
        error: error.message,
        paid_by: this.cliManager.getPaidByLabel(cliId),
        requested_model: model || null,
        latency_ms: gracefulTimeout
      };
    }
  }

  /** True when Codex on this machine is signed in with ChatGPT (as `codex login status` reports). */
  async codexUsesChatGPT() {
    try {
      const status = await this.cliManager.getCliStatus('codex_cli');
      const s = status && status.codex_cli;
      return !!(s && s.auth_method === 'chatgpt');
    } catch (_) {
      return false;
    }
  }

  /** True when this machine is signed in to Polydev and the server answered recently (or was not tried yet). */
  serverReachable() {
    if (!this.userToken) return false;
    return !(this._serverUnreachableAt && Date.now() - this._serverUnreachableAt < SERVER_DOWN_MS);
  }

  /** True while a signed-in, enabled ChatGPT plan is paused after a usage limit. */
  chatgptPaused() {
    try {
      const s = this.chatgpt.status();
      return !!(s.signedIn && s.planEnabled && s.pausedUntil && !s.ineligible);
    } catch (_) {
      return false;
    }
  }

  /** Answer with the user's ChatGPT plan (Responses API, store:false, stream:true). */
  async askChatGPTPlan(prompt, requestedModel, timeoutMs) {
    const start = Date.now();
    const base = { provider_id: 'chatgpt_plan', original_provider: 'openai', paid_by: CHATGPT.PAID_BY_LABEL, requested_model: requestedModel || null };
    if (this.chatgptPaused()) {
      return {
        ...base,
        success: false,
        error: `${CHATGPT.TEXT.limitReached}. ${CHATGPT.TEXT.manageUsage}: ${CHATGPT.MANAGE_USAGE_URL}`,
        error_code: 'subscription_sharing_usage_limit_exceeded',
        usage_limit: true,
        latency_ms: 0
      };
    }
    try {
      const model = await this.chatgpt.chooseModel(requestedModel);
      if (!model) {
        return {
          ...base,
          success: false,
          error: requestedModel ? `${requestedModel} is not in your ChatGPT plan's model list` : 'No models are available to your ChatGPT plan',
          latency_ms: Date.now() - start
        };
      }
      const out = await this.chatgpt.createResponse({ model, prompt, timeoutMs });
      const content = out.text || '';
      return {
        ...base,
        success: true,
        content,
        model_used: out.model || model,
        tokens_used: (out.usage && (out.usage.total_tokens || ((out.usage.input_tokens || 0) + (out.usage.output_tokens || 0)))) || Math.ceil((prompt.length + content.length) / 4),
        latency_ms: Date.now() - start
      };
    } catch (error) {
      const known = error instanceof ChatGPTPlanError;
      console.error(`[Stdio Wrapper] ChatGPT plan request failed: ${known ? error.code : error.message}`);
      return {
        ...base,
        success: false,
        error: error.message,
        error_code: known ? error.code : undefined,
        noFallback: !!(known && error.noFallback),
        usage_limit: !!(known && error.usageLimit),
        latency_ms: Date.now() - start
      };
    }
  }

  /**
   * Collect results from parallel promises, resolving early once we have N successes
   * This avoids waiting for slow/timed-out CLIs when we already have enough results
   * @param {Promise[]} promises - Array of promises to collect from
   * @param {number} needed - Number of successful results needed
   * @returns {Promise<Array>} Array of results (may include failures if not enough successes)
   */
  collectFirstNSuccesses(promises, needed) {
    return new Promise((resolve) => {
      const results = [];
      let successCount = 0;
      let completedCount = 0;
      let resolved = false;
      
      if (promises.length === 0) {
        resolve([]);
        return;
      }
      
      for (const promise of promises) {
        promise.then(result => {
          if (resolved) return;
          results.push(result);
          if (result.success) successCount++;
          completedCount++;
          
          // Resolve early if we have enough successes OR all complete
          if (successCount >= needed || completedCount >= promises.length) {
            resolved = true;
            resolve([...results]); // Copy to prevent mutation from late arrivals
          }
        });
      }
    });
  }

  /**
   * Get all available and authenticated CLI providers
   * Uses user's provider order from dashboard (display_order) instead of hardcoded order
   * Falls back to API for providers where CLI is not available/authenticated
   */
  async getAllAvailableProviders() {
    try {
      // Wait for initial CLI detection to complete if it's still running
      if (this._cliDetectionReady && !this._cliDetectionComplete) {
        console.error('[Polydev] Waiting for initial CLI detection to complete...');
        await this._cliDetectionReady;
        console.error('[Polydev] CLI detection ready, proceeding with request');
      }
      
      // Use cached status (refreshed by smart scheduler) instead of forceCliDetection on every request
      const results = await this.cliManager.getCliStatus();
      console.error(`[Stdio Wrapper] CLI status (cached):`, JSON.stringify(results, null, 2));
      const availableProviders = [];
      const unavailableProviders = [];
      
      // ALWAYS check ALL CLIs (they're FREE) — don't limit to userProviderOrder
      // userProviderOrder only affects ordering, not which CLIs get checked
      // This fixes the bug where CLIs were missed because model-preferences API
      // only returned providerOrder for credits-tier models
      const allCliIds = ['claude_code', 'codex_cli'];
      const userOrder = (this.userProviderOrder && this.userProviderOrder.length > 0) 
        ? this.userProviderOrder 
        : [];
      // Merge: user's preferred order first, then any CLIs not in their order
      const priorityOrder = [...new Set([...userOrder, ...allCliIds])];
      console.error(`[Stdio Wrapper] Using provider order: ${priorityOrder.join(' > ')} (user order: ${userOrder.join(', ') || 'none'})`);
      
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
  async reportCliResultsToServer(prompt, localResults, args = {}, { timeoutMs = 5000 } = {}) {
    // Only report successful results to dashboard
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

      // serverUrl is 'https://www.polydev.ai/api/mcp'
      // We need 'https://www.polydev.ai/api/mcp/report-cli-results'
      const response = await fetch(`${this.serverUrl}/report-cli-results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.userToken}`,
          'User-Agent': 'polydev-stdio-wrapper/1.0.0'
        },
        body: JSON.stringify(reportPayload),
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (!response.ok) {
        console.error('[Stdio Wrapper] Failed to report CLI results:', response.status);
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
      'chatgpt_plan': 'openai'
    };
    
    const apiProvider = cliToApiProvider[providerId];
    if (apiProvider && this.userModelPreferences && this.userModelPreferences[apiProvider]) {
      return this.userModelPreferences[apiProvider];
    }
    
    // Fallback to descriptive defaults based on typical CLI models
    const defaults = {
      'claude_code': 'claude-code-default',
      'codex_cli': 'codex-default',
      'chatgpt_plan': 'chatgpt-plan-default'
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
   * Get model for a specific CLI provider
   */
  async getModelForProvider(providerId) {
    const preferences = await this.fetchUserModelPreferences();
    return preferences[providerId] || null;
  }

  /**
   * Ask the Polydev server for the answers this machine did not cover.
   * Calls the server's `get_perspectives` tool (kept there as a permanent name) so a new client
   * works with the current server.
   * @param {Object} args - Original request arguments
   * @param {Array} localResults - Results from this machine
   * @param {number} maxPerspectives - How many answers the server should add
   * @param {Array} apiProvidersInfo - Providers/models to request
   * @param {Object} options - { explicitModels: string[] } when the caller named models
   */
  async callPerspectivesForCli(args, localResults, maxPerspectives = 2, apiProvidersInfo = [], options = {}) {
    const explicitModels = Array.isArray(options.explicitModels) ? options.explicitModels : null;
    const toApiProvider = { claude_code: 'anthropic', codex_cli: 'openai', chatgpt_plan: 'openai' };

    // In default mode, providers answered here are excluded and failed ones are asked for again.
    // When models were named, the server gets exactly those models instead.
    const excludeProviders = explicitModels ? [] : [...new Set(localResults
      .filter((r) => r.success)
      .map((r) => toApiProvider[r.provider_id])
      .filter(Boolean))];

    const failedFallbacks = explicitModels ? [] : localResults
      .filter((r) => !r.success && r.provider_id && !r.noFallback && toApiProvider[r.provider_id] && !excludeProviders.includes(toApiProvider[r.provider_id]))
      .map((r) => ({ provider: toApiProvider[r.provider_id], model: null }));

    const requestProviders = [...failedFallbacks, ...apiProvidersInfo.map((p) => ({ provider: p.provider, model: p.model }))];

    console.error(`[Stdio Wrapper] Calling Polydev (excluding: ${excludeProviders.join(', ') || 'none'}, requesting: ${requestProviders.map((p) => p.model || p.provider).join(', ') || 'any'}, max: ${maxPerspectives})`);

    // Answers from this machine, for the user's dashboard history. Never includes any token.
    const cliResponses = localResults.filter((r) => r.success).map((result) => ({
      provider_id: result.provider_id,
      model: result.model_used || this.getDefaultModelForCli(result.provider_id),
      content: cleanCliResponse(result.content || ''),
      tokens_used: result.tokens_used || 0,
      latency_ms: result.latency_ms || 0,
      success: true,
      error: null
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
            exclude_providers: excludeProviders,
            request_providers: requestProviders.length > 0 ? requestProviders : undefined,
            ...(explicitModels ? { models: explicitModels } : {}),
            cli_responses: cliResponses,
            max_perspectives: maxPerspectives,
            project_memory: 'none',
            temperature: 0.7,
            max_tokens: 20000
          }
        },
        id: `perspectives-${Date.now()}`
      };

      const remoteResponse = await this.forwardToRemoteServer(perspectivesRequest);

      if (!remoteResponse) {
        return { success: false, error: 'No response from the Polydev server', timestamp: new Date().toISOString() };
      }

      if (remoteResponse.result && remoteResponse.result.content && remoteResponse.result.content[0]) {
        if (remoteResponse.result.isError) {
          return { success: false, error: remoteResponse.result.content[0].text, timestamp: new Date().toISOString() };
        }
        return {
          success: true,
          content: remoteResponse.result.content[0].text,
          structured: remoteResponse.result.structuredContent || null,
          timestamp: new Date().toISOString(),
          raw: true
        };
      } else if (remoteResponse.error) {
        const errorMessage = typeof remoteResponse.error === 'string'
          ? remoteResponse.error
          : (remoteResponse.error?.message || JSON.stringify(remoteResponse.error) || 'Polydev request failed');
        return { success: false, error: errorMessage, timestamp: new Date().toISOString() };
      }
      return { success: false, error: 'Unexpected response from the Polydev server', timestamp: new Date().toISOString() };
    } catch (error) {
      console.error('[Stdio Wrapper] Perspectives call error:', error);
      return { success: false, error: `Polydev request failed: ${error.message}`, timestamp: new Date().toISOString() };
    }
  }

  /**
   * Make sure every server answer says what paid for it. Newer servers write a
   * "Paid by: ..." line under each answer and a `paid_by` field in the JSON summary; older
   * servers write neither, and the answer then says that the server did not report it.
   */
  annotateServerPaidBy(text, structured) {
    if (!text || typeof text !== 'string') return text;
    if (/^\s*Paid by:/mi.test(text)) return text;
    const looksLikeAnswers = text.includes('# Multiple AI Perspectives') || /^## /m.test(text);
    if (!looksLikeAnswers) return text;

    const paid = this.serverAnswerRows(text, structured).filter((r) => r.model && r.paidBy);
    if (paid.length) {
      return `${text}\n\n${paid.map((r) => `Paid by (${r.model}): ${r.paidBy}`).join('\n')}`;
    }
    return `${text}\n\nPaid by: not reported by this Polydev server version (one of: your API key, OpenRouter, Polydev free requests).`;
  }

  /**
   * The server's answers from its structured content or the JSON summary at the end of its text:
   * [{ model, provider, paidBy (label or null), error }].
   */
  serverAnswerRows(text, structured) {
    const labels = { your_api_key: 'your API key', openrouter: 'OpenRouter', polydev_free: 'Polydev free requests' };
    let rows = [];
    const fromStructured = structured && (structured.perspectives || structured.results || structured.responses);
    if (Array.isArray(fromStructured)) rows = fromStructured;
    if (!rows.length && typeof text === 'string') {
      const m = text.match(/```json\s*\n([\s\S]*?)\n```\s*$/);
      if (m) {
        try {
          const summary = JSON.parse(m[1]);
          if (Array.isArray(summary.perspectives)) rows = summary.perspectives;
        } catch (_) { /* no usable summary */ }
      }
    }
    return rows.filter((r) => r && typeof r === 'object').map((r) => ({
      model: r.model || null,
      provider: r.provider ? this.normalizeProviderName(r.provider) : null,
      paidBy: r.paid_by_label || labels[r.paid_by] || r.paid_by || null,
      error: r.error || null,
    }));
  }

  /**
   * When the ChatGPT plan hit its usage limit and the server answered instead, the line that says
   * so and what paid: the server answer for the same model (named models) or for OpenAI (default
   * selection), else a general line. Null when nothing replaced the plan's answer.
   */
  usageLimitNoteFor(localResults, safePersp) {
    const limited = localResults.filter((r) => !r.success && r.usage_limit);
    if (!limited.length || !safePersp.success || !safePersp.content) return null;
    const rows = this.serverAnswerRows(safePersp.content, safePersp.structured).filter((r) => !r.error && r.model);
    const bare = (m) => String(m || '').toLowerCase().replace(/^[^/]+\//, '');
    const notes = [];
    for (const r of limited) {
      const match = (r.requested_model && rows.find((row) => bare(row.model) === bare(r.requested_model)))
        || rows.find((row) => row.provider === 'openai' || this.modelFamily(row.model) === 'openai');
      if (match && match.paidBy) notes.push(usageLimitNote(match.paidBy, rows.length > 1 ? match.model : null));
    }
    if (!notes.length && rows.length) notes.push(usageLimitNote(null));
    return notes.length ? [...new Set(notes)].join('\n') : null;
  }

  /**
   * Combine answers from this machine and from the Polydev server. Every answer states what paid for it.
   */
  combineAllCliAndPerspectives(localResults, perspectivesResult, args, notes = []) {
    const safePersp = perspectivesResult || { success: false, error: 'No response from the Polydev server' };
    let formatted = '';

    const successful = localResults.filter((r) => r.success);
    const failed = localResults.filter((r) => !r.success);

    if (successful.some((r) => r.provider_id === 'chatgpt_plan')) {
      const welcome = this.chatgpt.takeWelcome();
      if (welcome) formatted += `${welcome}\n\n---\n\n`;
    }

    for (const r of successful) {
      const model = r.model_used && !String(r.model_used).endsWith('-default') && r.model_used !== 'cli_default'
        ? r.model_used
        : (r.requested_model || r.provider_id);
      formatted += `## ${model} (${this.sourceName(r.provider_id)})\n\n`;
      formatted += `${cleanCliResponse(r.content || '')}\n\n`;
      if (r.provider_id === 'chatgpt_plan') {
        formatted += `Paid by: ${CHATGPT.PAID_BY_LABEL} (${CHATGPT.TEXT.inUse}. ${CHATGPT.TEXT.manageUsage}: ${CHATGPT.MANAGE_USAGE_URL})\n`;
      } else {
        formatted += `Paid by: ${r.paid_by || this.cliManager.getPaidByLabel(r.provider_id) || 'this machine'}\n`;
      }
      if (r.fallback_note) formatted += `Note: ${r.fallback_note}\n`;
      formatted += `*Latency: ${r.latency_ms || 0}ms | Tokens: ${r.tokens_used || 0}*\n\n---\n\n`;
    }

    if (failed.length > 0) {
      formatted += `Not answered on this machine:\n`;
      for (const r of failed) {
        const which = r.requested_model ? `${this.sourceName(r.provider_id)} (${r.requested_model})` : this.sourceName(r.provider_id);
        formatted += `- ${which}: ${r.error}\n`;
      }
      formatted += `\n---\n\n`;
    }

    if (safePersp.success) {
      if (safePersp.content) {
        const limitNote = this.usageLimitNoteFor(localResults, safePersp);
        if (limitNote) formatted += `${limitNote}\n\n`;
        formatted += `${this.annotateServerPaidBy(safePersp.content, safePersp.structured)}\n\n`;
      }
    } else {
      formatted += `[Error] Polydev request failed: ${safePersp.error || 'Unknown error'}\n\n`;
    }

    for (const note of notes) {
      formatted += `${note}\n\n`;
    }

    const text = formatted.trim();
    if (!text) {
      return {
        success: false,
        error: 'No model could be asked. Connect a source: sign in to Claude Code or Codex on this machine, '
          + 'connect your ChatGPT plan (`npx -y polydev-ai chatgpt login`), or sign in to Polydev with the login tool.'
      };
    }
    if (successful.length === 0 && !(safePersp.success && safePersp.content)) {
      return { success: false, error: text };
    }
    return text;
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
      if (!fs.existsSync(polydeveevDir)) {
        fs.mkdirSync(polydeveevDir, { recursive: true });
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
   * Load CLI response times from disk for adaptive timeouts
   */
  loadCliResponseTimes() {
    try {
      const timesFile = path.join(os.homedir(), '.polydev', 'cli-response-times.json');
      if (fs.existsSync(timesFile)) {
        this.cliResponseTimes = JSON.parse(fs.readFileSync(timesFile, 'utf8'));
        console.error(`[Stdio Wrapper] Loaded CLI response times from disk`);
      }
    } catch (e) {
      // Non-critical
    }
  }

  /**
   * Record a CLI response time for adaptive timeout calculation
   */
  recordCliResponseTime(cliId, latencyMs) {
    if (!this.cliResponseTimes[cliId]) {
      this.cliResponseTimes[cliId] = [];
    }
    this.cliResponseTimes[cliId].push(latencyMs);
    // Keep only the last N entries
    if (this.cliResponseTimes[cliId].length > this.CLI_RESPONSE_HISTORY_SIZE) {
      this.cliResponseTimes[cliId] = this.cliResponseTimes[cliId].slice(-this.CLI_RESPONSE_HISTORY_SIZE);
    }
    // Save to disk (fire-and-forget)
    try {
      const timesFile = path.join(os.homedir(), '.polydev', 'cli-response-times.json');
      fs.writeFileSync(timesFile, JSON.stringify(this.cliResponseTimes));
    } catch (e) { /* non-critical */ }
  }

  /**
   * Get adaptive timeout for a CLI based on historical response times
   * Always uses 400s to ensure local CLIs get full time budget before falling back to credits
   */
  getAdaptiveTimeout(cliId, defaultTimeout = 400000) {
    // Per-CLI timeout caps: Codex is consistently slower, don't let it block results
    const maxTimeouts = {
      'codex_cli': 120000,   // 120s — Codex exec is slow
      'claude_code': 400000, // 400s
    };
    const maxTimeout = maxTimeouts[cliId] || defaultTimeout;

    const times = this.cliResponseTimes[cliId];
    if (!times || times.length === 0) {
      console.error(`[Stdio Wrapper] CLI timeout for ${cliId}: ${maxTimeout / 1000}s (no history)`);
      return maxTimeout;
    }
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    console.error(`[Stdio Wrapper] CLI timeout for ${cliId}: ${maxTimeout / 1000}s (avg response: ${Math.round(avg)}ms from ${times.length} samples)`);
    return maxTimeout;
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
          if (!this.cliManager.getProvider(providerId)) continue; // e.g. Gemini CLI, no longer offered
          if (this.isStale(status)) {
            const minutesOld = status.last_checked ? Math.floor((Date.now() - new Date(status.last_checked).getTime()) / (1000 * 60)) : -1;
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

      // Add new usage record
      const usageData = {
        timestamp: new Date().toISOString(),
        provider: providerId,
        prompt_length: prompt.length,
        success: response.success,
        latency_ms: response.latency_ms || response.latencyMs || 0,
        tokens_used: response.tokens_used || response.tokensUsed || 0
      };

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
    // Handle string results (from combineAllCliAndPerspectives)
    if (typeof result === 'string') return result;

    if (!result.success) {
      return `[Error] **CLI Error**\n\n${result.error || 'Unknown error'}\n\n*Timestamp: ${result.timestamp || new Date().toISOString()}*`;
    }

    // Handle combined CLI + perspectives response (single or multiple CLIs)
    if (result.sections) {
      return result.content;
    }

    if (result.content) {
      // Standard prompt response
      const cliCount = result.local_cli_count || 1;
      
      if (cliCount > 1) {
        return `Multi-CLI Response (${cliCount} local CLIs + perspectives)\n\n${result.content}\n\nTotal Latency: ${result.latency_ms || 0}ms | Total Tokens: ${result.tokens_used || 0} | ${result.timestamp}`;
      } else {
        return `CLI Response (${result.provider || 'Unknown'} - ${result.mode || 'unknown'} mode)\n\n${result.content}\n\nLatency: ${result.latency_ms || 0}ms | Tokens: ${result.tokens_used || 0} | ${result.timestamp}`;
      }
    } else {
      // Status/detection response
      let formatted = `CLI Operation Success\n\n`;
      formatted += `${result.message}\n\n`;
      
      if (result.results) {
        formatted += `Results:\n`;
        for (const [providerId, status] of Object.entries(result.results)) {
          const icon = status.available ? '[+]' : '[-]';
          const authStatus = status.authenticated ? '[auth]' : '[no-auth]';
          formatted += `- ${icon} ${authStatus} ${providerId}: ${status.available ? 'Available' : 'Not Available'}`;
          if (status.version) formatted += ` (${status.version})`;
          if (status.error) formatted += ` - ${status.error}`;
          formatted += `\n`;
        }
      }
      
      formatted += `\n${result.local_only ? 'Local execution' : 'Remote execution'} | ${result.timestamp}`;
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
        
        // Also cache perspectivesPerMessage setting (default 2)
        this.perspectivesPerMessage = result.perspectivesPerMessage || 2;
        
        // Cache provider order from user's dashboard (respects display_order)
        // This determines which CLIs/APIs to use first
        // IMPORTANT: This is cached alongside modelPreferences and restored when cache is used
        // NOTE: Use length check because empty array [] is truthy in JS
        this.userProviderOrder = (result.providerOrder && result.providerOrder.length > 0) 
          ? result.providerOrder 
          : ['claude_code', 'codex_cli'];
        
        // NEW: Cache full list of all providers (CLI + API-only providers) from dashboard
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
      'gpt': 'codex_cli'
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
    console.error('Starting Polydev MCP Server...');

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
            // Notifications have no id - don't respond to them (JSON-RPC spec)
            if (request.id === undefined) {
              console.error(`[Polydev] Received notification: ${request.method}`);
              continue;
            }
            const response = await this.handleRequest(request);
            process.stdout.write(JSON.stringify(response) + '\n');
          } catch (error) {
            console.error('Failed to process request:', error);
          }
        }
      }
    });

    process.stdin.on('end', () => {
      console.error('Polydev MCP Server shutting down...');
      this.stopSmartRefreshScheduler();
      process.exit(0);
    });

    // Handle process signals
    process.on('SIGINT', () => {
      console.error('Received SIGINT, shutting down...');
      this.stopSmartRefreshScheduler();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.error('Received SIGTERM, shutting down...');
      this.stopSmartRefreshScheduler();
      process.exit(0);
    });

    console.error('Polydev MCP Server ready.\n');

    // Run the onboarding/status check
    await this.runStartupFlow();

    // Only run CLI detection here if we already have a token
    // (If no token, CLI detection runs after login completes in runStartupFlow)
    if (this.userToken) {
      // Pre-seed CLI status from disk cache for instant availability
      // This eliminates the 3-7s startup penalty from shelling out to CLI --version
      try {
        const cachedStatus = await this.loadLocalCliStatus();
        if (cachedStatus && Object.keys(cachedStatus).length > 0) {
          console.error(`[Polydev] Pre-seeded CLI status from disk cache (${Object.keys(cachedStatus).length} providers)`);
          this.cliManager.setCachedStatus(cachedStatus);
          this._cliDetectionComplete = true; // Mark as complete so requests don't wait
          if (this._cliDetectionResolver) {
            this._cliDetectionResolver(); // Unblock any waiting requests
          }
        }
      } catch (e) {
        console.error('[Polydev] Disk cache pre-seed failed (will detect fresh):', e.message);
      }

      // Run full CLI detection in background to refresh the cache
      console.error('[Polydev] Detecting local CLI tools...');

      this.localForceCliDetection({})
        .then(async () => {
          this._cliDetectionComplete = true;
          // Display CLI status after detection
          await this.displayCliStatus();
        })
        .catch((error) => {
          console.error('[Polydev] CLI detection failed:', error.message);
          this._cliDetectionComplete = true;
        })
        .finally(() => {
          if (this._cliDetectionResolver) {
            this._cliDetectionResolver();
          }
          this.startSmartRefreshScheduler();
        });
    } else {
      // No token - CLI detection will run after login completes
      // Just start the scheduler
      this.startSmartRefreshScheduler();
    }
  }

  /**
   * Run startup flow - verify token if present, show instructions if not
   * NEVER auto-opens browser — only the explicit "login" tool should do that
   */
  async runStartupFlow() {
    // Last-chance token reload before deciding
    if (!this.userToken) {
      this.reloadTokenFromFiles();
    }
    
    if (!this.userToken) {
      // No token found — just log instructions, don't open browser
      console.error('─'.repeat(50));
      console.error('Polydev - Authentication Required');
      console.error('─'.repeat(50));
      console.error('No token found. To authenticate:');
      console.error('  1. Use the "login" tool');
      console.error('  2. Or in a terminal: npx -p polydev-ai polydev-login');
      console.error('─'.repeat(50) + '\n');
    } else {
      // Has token - verify it (also non-blocking)
      this.verifyAndDisplayAuth().catch((error) => {
        console.error('[Polydev] Auth verification error:', error.message);
      });
    }
  }

  /**
   * Verify token and display auth status
   */
  async verifyAndDisplayAuth() {
    try {
      const response = await fetch('https://www.polydev.ai/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.userToken}`,
          'User-Agent': 'polydev-mcp/1.0.0'
        },
        body: JSON.stringify({ action: 'check_status' })
      });

      if (response.ok) {
        const data = await response.json();
        console.error('─'.repeat(50));
        console.error('Polydev - Authenticated');
        console.error('─'.repeat(50));
        console.error(`Account: ${data.email || 'Connected'}`);
        console.error('─'.repeat(50) + '\n');
      } else {
        console.error('─'.repeat(50));
        console.error('Polydev - Token may be invalid');
        console.error('─'.repeat(50));
        console.error('Server returned non-OK. Will re-verify on next auth check.');
        console.error('Use the "login" tool or run in a terminal: npx -p polydev-ai polydev-login login');
        console.error('─'.repeat(50) + '\n');
      }
    } catch (error) {
      console.error('[Polydev] Could not verify auth (offline?):', error.message || 'unknown');
    }
  }

  /**
   * Display CLI tools status after detection
   */
  async displayCliStatus() {
    try {
      const status = await this.loadLocalCliStatus();
      if (!status || Object.keys(status).length === 0) {
        console.error('[Polydev] No local CLI tools detected.\n');
        return;
      }

      const tools = Object.entries(status);
      const available = tools.filter(([_, s]) => s.available);
      const authenticated = available.filter(([_, s]) => s.authenticated);

      console.error('─'.repeat(50));
      console.error('Local AI Tools (calls count against your own plan)');
      console.error('─'.repeat(50));

      for (const [id, s] of tools) {
        const name = id.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        if (s.available) {
          const authStatus = s.authenticated ? '[ready]' : '[needs auth]';
          console.error(`[OK] ${name.padEnd(15)} ${authStatus}`);
        } else {
          console.error(`[--] ${name.padEnd(15)} not installed`);
        }
      }

      if (available.length > 0) {
        console.error('');
        console.error(`${available.length} tool(s) installed, ${authenticated.length} ready to use`);
        console.error('Polydev asks these first, then your API keys.');
      }
      
      console.error('─'.repeat(50) + '\n');

      // Open models page on fresh login for API key setup
      if (this._freshLogin) {
        this._freshLogin = false;
        console.error('Opening Polydev Models page for API key configuration...');
        console.error('Add your API keys to ask more models.\n');
        
        const { spawn } = require('child_process');
        const modelsUrl = 'https://polydev.ai/dashboard/models';
        const platform = process.platform;
        
        if (platform === 'darwin') {
          spawn('open', [modelsUrl], { detached: true, stdio: 'ignore' }).unref();
        } else if (platform === 'win32') {
          spawn('cmd', ['/c', 'start', '', modelsUrl], { detached: true, stdio: 'ignore', shell: true }).unref();
        } else {
          spawn('xdg-open', [modelsUrl], { detached: true, stdio: 'ignore' }).unref();
        }
      }
    } catch (error) {
      // Ignore errors in status display
    }
  }

  /**
   * Check and display authentication status on startup
   * @deprecated Use verifyAndDisplayAuth instead
   */
  async checkAndDisplayAuthStatus() {
    await this.verifyAndDisplayAuth();
  }
}

if (require.main === module) {
  if (process.argv[2] === 'chatgpt') {
    // Terminal command: polydev-ai chatgpt login|logout|status|models
    runChatGPTCli(process.argv.slice(3)).then((code) => process.exit(code), (error) => {
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    });
  } else {
    const wrapper = new StdioMCPWrapper();
    wrapper.start().catch(error => {
      console.error('Failed to start wrapper:', error);
      process.exit(1);
    });
  }
}

/**
 * Smithery sandbox server factory
 * Creates a mock server instance for Smithery's capability scanning
 * This allows Smithery to discover tools/resources without real credentials
 */
function createSandboxServer() {
  // Embed manifest directly to work with Smithery bundling
  // (file paths don't resolve in bundled context)
  return {
    serverInfo: {
      name: 'polydev-perspectives',
      version: '1.8.70'
    },
    capabilities: { tools: {} },
    tools: [
      {
        name: 'ask_model',
        title: 'Ask models',
        description: 'Send one prompt to one or more AI models and return each answer with what paid for it.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: { type: 'string', description: 'The prompt to send' },
            model: { type: 'string', description: 'Optional model ID' },
            models: { type: 'array', items: { type: 'string' }, description: 'Optional list of model IDs' }
          },
          required: ['prompt']
        },
        annotations: { title: 'Ask models', readOnlyHint: true, destructiveHint: false, openWorldHint: true }
      },
      {
        name: 'get_perspectives',
        title: 'Ask models (old name)',
        description: 'Old name for ask_model. Same inputs and behaviour.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: { type: 'string', description: 'The prompt to send' },
            model: { type: 'string', description: 'Optional model ID' },
            models: { type: 'array', items: { type: 'string' }, description: 'Optional list of model IDs' }
          },
          required: ['prompt']
        },
        annotations: { title: 'Ask models (old name)', readOnlyHint: true, destructiveHint: false, openWorldHint: true }
      },
      {
        name: 'list_models',
        title: 'List models',
        description: 'List the models this user can reach right now and what pays for each.',
        inputSchema: { type: 'object', properties: {} },
        annotations: { title: 'List models', readOnlyHint: true, destructiveHint: false, openWorldHint: true }
      },
      {
        name: 'chatgpt_plan_status',
        title: 'ChatGPT plan status',
        description: 'Show whether the ChatGPT plan is connected on this machine.',
        inputSchema: { type: 'object', properties: {} },
        annotations: { title: 'ChatGPT plan status', readOnlyHint: true, destructiveHint: false, openWorldHint: false }
      },
      {
        name: 'connect_chatgpt_plan',
        title: 'Continue with ChatGPT',
        description: 'Start ChatGPT sign-in so OpenAI models can use your ChatGPT plan. Returns the sign-in link right away; call chatgpt_plan_status afterwards for the result.',
        inputSchema: { type: 'object', properties: { timeout_seconds: { type: 'integer', minimum: 30, maximum: 600 } } },
        annotations: { title: 'Continue with ChatGPT', readOnlyHint: false, destructiveHint: false, openWorldHint: true }
      },
      {
        name: 'get_auth_status',
        title: 'Polydev status',
        description: 'Check Polydev authentication status and setup instructions.',
        inputSchema: {
          type: 'object',
          properties: {
            user_token: { type: 'string', description: 'Polydev user authentication token (optional)' }
          }
        },
        annotations: { title: 'Polydev status', readOnlyHint: true, destructiveHint: false, openWorldHint: true }
      },
      {
        name: 'login',
        title: 'Sign in to Polydev',
        description: 'Sign in to Polydev in the browser and save the token on this machine.',
        inputSchema: {
          type: 'object',
          properties: {
            user_token: { type: 'string', description: 'Polydev user token for sandboxed environments' }
          }
        },
        annotations: { title: 'Sign in to Polydev', readOnlyHint: false, destructiveHint: false, openWorldHint: true }
      },
      {
        name: 'rank_perspectives',
        title: 'Rank answers',
        description: 'Rank the answers from ask_model, best first, when the user asks or agrees. Rankings feed the public leaderboard.',
        inputSchema: {
          type: 'object',
          properties: {
            ranked_models: { type: 'array', items: { type: 'string' }, description: 'Model IDs ranked best to worst' },
            base_model: { type: 'string', description: 'Your own model ID' }
          },
          required: ['ranked_models']
        },
        annotations: { title: 'Rank answers', readOnlyHint: false, destructiveHint: false, openWorldHint: true }
      },
      {
        name: 'search_x',
        title: 'Search X',
        description: "Search X (Twitter) with xAI's Grok. Needs your own xAI API key.",
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'What to search for on X' }
          },
          required: ['query']
        },
        annotations: { title: 'Search X', readOnlyHint: true, destructiveHint: false, openWorldHint: true }
      },
      {
        name: 'generate_image',
        title: 'Generate image',
        description: 'Generate an image with OpenAI or Google Gemini, using your own key or the free allowance.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: { type: 'string', description: 'Description of the image' },
            provider: { type: 'string', enum: ['openai', 'gemini'], description: 'Provider (default: gemini)' }
          },
          required: ['prompt']
        },
        annotations: { title: 'Generate image', readOnlyHint: false, destructiveHint: false, openWorldHint: true }
      }
    ]
  };
}

module.exports = StdioMCPWrapper;
module.exports.createSandboxServer = createSandboxServer;