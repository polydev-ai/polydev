const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const os = require('os');
const which = require('which');

// Status reporter for sending CLI status to polydev.ai server
let StatusReporter;
try {
  StatusReporter = require('./statusReporter').StatusReporter;
} catch (e) {
  // StatusReporter not available, continue without it
  StatusReporter = null;
}

const execAsync = promisify(exec);

class CLIManager {
  constructor(options = {}) {
    this.providers = new Map();
    this.statusCache = new Map();
    this.CACHE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
    
    // Initialize status reporter if available
    this.statusReporter = null;
    if (StatusReporter && options.enableStatusReporting !== false) {
      this.statusReporter = new StatusReporter({
        userToken: options.userToken || process.env.POLYDEV_USER_TOKEN,
        reportingEnabled: options.reportingEnabled !== false,
        heartbeatIntervalMs: options.heartbeatIntervalMs,
        debug: options.debug || process.env.POLYDEV_CLI_DEBUG === 'true'
      });
    }
    
    this.initializeProviders();
  }

  initializeProviders() {
    const providers = [
      {
        id: 'claude_code',
        name: 'Claude Code',
        command: process.env.CLAUDE_CODE_PATH || 'claude',
        subcommands: {
          chat: [],
          version: ['--version'],
          auth_status: ['--print', 'test auth'], // Use --print to test auth
          test_prompt: ['--print', '--output-format', 'json'] // Use JSON output to get model info
        },
        install_instructions: 'Install via: npm install -g @anthropic-ai/claude-code',
        auth_instructions: 'Authenticate with Claude Code'
      },
      {
        id: 'codex_cli',
        name: 'Codex CLI',
        command: process.env.CODEX_CLI_PATH || 'codex',
        subcommands: {
          chat: ['chat'],
          version: ['--version'],
          auth_status: ['login', 'status'], // Correct command: codex login status
          test_prompt: ['exec'],
          alternate_test_prompts: [
            ['prompt'],
            ['ask']
          ]
        },
        install_instructions: 'Install Codex CLI from OpenAI',
        auth_instructions: 'Authenticate with: codex login'
      },
      {
        id: 'gemini_cli',
        name: 'Gemini CLI',
        command: process.env.GEMINI_CLI_PATH || 'gemini',
        subcommands: {
          chat: ['chat'],
          version: ['--version'],
          auth_status: ['auth-status'] // gemini-mcp auth-status command
        },
        install_instructions: 'Install Gemini CLI from Google',
        auth_instructions: 'Authenticate with: gemini (then /auth login)'
      }
    ];

    providers.forEach(provider => {
      this.providers.set(provider.id, provider);
    });
  }

  async forceCliDetection(specificProvider) {
    const results = {};
    const providersToCheck = specificProvider 
      ? [this.providers.get(specificProvider)].filter(Boolean) 
      : Array.from(this.providers.values());

    // Log system environment for debugging
    console.log(`[Polydev CLI] Detecting CLI providers - Node.js ${process.version}, Platform: ${process.platform}`);

    for (const provider of providersToCheck) {
      if (provider) {
        try {
          results[provider.id] = await this.detectCliProvider(provider);
          this.statusCache.set(provider.id, results[provider.id]);
          
          // Log compatibility issues for user awareness
          if (results[provider.id].error && results[provider.id].error.includes('Compatibility Issue')) {
            console.warn(`[Polydev CLI] ⚠️  ${provider.name} compatibility issue detected. See error details for solutions.`);
          }
        } catch (error) {
          results[provider.id] = {
            available: false,
            authenticated: false,
            error: `Detection failed: ${error.message}`,
            last_checked: new Date()
          };
        }
      }
    }

    // Report status to polydev.ai server (non-blocking)
    if (this.statusReporter && this.statusReporter.isConfigured()) {
      this.statusReporter.reportAllStatuses(results).catch(err => {
        console.warn(`[Polydev CLI] Status reporting failed:`, err.message);
      });
    }

    return results;
  }

  async getCliStatus(specificProvider) {
    const results = {};
    const providersToCheck = specificProvider 
      ? [this.providers.get(specificProvider)].filter(Boolean) 
      : Array.from(this.providers.values());

    for (const provider of providersToCheck) {
      if (provider) {
        const cached = this.statusCache.get(provider.id);
        if (cached && this.isCacheValid(cached)) {
          results[provider.id] = cached;
        } else {
          const detection = await this.forceCliDetection(provider.id);
          results[provider.id] = detection[provider.id];
        }
      }
    }

    return results;
  }

  isCacheValid(status) {
    if (!status.last_checked) return false;
    const now = new Date().getTime();
    const checked = new Date(status.last_checked).getTime();
    return (now - checked) < this.CACHE_TIMEOUT_MS;
  }

  async detectCliProvider(provider) {
    try {
      const cliPath = await this.findCliPath(provider.command);
      if (!cliPath) {
        return {
          available: false,
          authenticated: false,
          error: `${provider.name} not found in PATH. ${provider.install_instructions}`,
          last_checked: new Date()
        };
      }

      let version;
      try {
        const versionResult = await this.executeCliCommand(
          provider.command, 
          provider.subcommands.version,
          'args',
          5000
        );
        version = versionResult.stdout?.trim();
      } catch (versionError) {
        if (process.env.POLYDEV_CLI_DEBUG) {
          console.log(`[CLI Debug] Version check failed for ${provider.id}:`, versionError);
        }
      }

      let authenticated = false;
      let quotaExhausted = false;
      
      // For Claude Code, skip command-based auth check and use file-based detection directly
      // This avoids the recursion issue when running from within Claude Code
      if (provider.id === 'claude_code') {
        authenticated = await this.checkAuthenticationByFiles(provider.id);
        
        if (process.env.POLYDEV_CLI_DEBUG) {
          console.log(`[CLI Debug] File-based auth check for ${provider.id}:`, authenticated);
        }
      } else {
        // For other providers, try command-based auth check first
        try {
          const authResult = await this.executeCliCommand(
            provider.command,
            provider.subcommands.auth_status,
            'args',
            5000 // Reduced timeout to 5 seconds
          );
          
          // If command succeeds, check output for authentication indicators
          const authOutput = (authResult.stdout + ' ' + authResult.stderr).toLowerCase();
          
          if (process.env.POLYDEV_CLI_DEBUG) {
            console.log(`[CLI Debug] Auth output for ${provider.id}: "${authOutput}"`);
          }
          
          authenticated = this.parseAuthenticationStatus(provider.id, authOutput);
          
          // Check for quota exhaustion (authenticated but rate limited)
          if (provider.id === 'gemini_cli') {
            quotaExhausted = authOutput.includes('exhausted your daily quota') ||
                            authOutput.includes('quota') && authOutput.includes('exhausted');
          }
          
        } catch (authError) {
          if (process.env.POLYDEV_CLI_DEBUG) {
            console.log(`[CLI Debug] Auth check failed for ${provider.id}:`, authError);
          }
          
          // Fallback to file-based authentication detection
          authenticated = await this.checkAuthenticationByFiles(provider.id);
          
          if (process.env.POLYDEV_CLI_DEBUG) {
            console.log(`[CLI Debug] File-based auth check for ${provider.id}:`, authenticated);
          }
        }
      }

      // Special handling for Gemini CLI Node.js compatibility issues
      let errorMessage = undefined;
      if (!authenticated) {
        if (provider.id === 'gemini_cli') {
          // Check if the issue is Node.js compatibility
          try {
            const authResult = await this.executeCliCommand(
              provider.command,
              ['--help'],
              'args',
              2000
            );
            const testOutput = (authResult.stdout + ' ' + authResult.stderr).toLowerCase();
            if (testOutput.includes('referenceerror: file is not defined') ||
                testOutput.includes('undici/lib/web/webidl')) {
              errorMessage = `⚠️  Gemini CLI Compatibility Issue: Node.js v${process.version} doesn't support the 'File' global that Gemini CLI requires. 

Solutions:
• Update to Node.js v20+ (recommended): nvm install 20 && nvm use 20
• Reinstall Gemini CLI: npm uninstall -g @google/gemini-cli && npm install -g @google/gemini-cli@latest
• Alternative: Use Google AI Studio directly or switch to Claude/OpenAI providers

This is a known issue with @google/gemini-cli@0.3.4 and older Node.js versions.`;
            } else {
              errorMessage = `Not authenticated. ${provider.auth_instructions}`;
            }
          } catch {
            errorMessage = `Not authenticated. ${provider.auth_instructions}`;
          }
        } else {
          errorMessage = `Not authenticated. ${provider.auth_instructions}`;
        }
      }

      return {
        available: true,
        authenticated,
        quota_exhausted: quotaExhausted,
        version,
        path: cliPath,
        last_checked: new Date(),
        error: errorMessage
      };

    } catch (error) {
      return {
        available: false,
        authenticated: false,
        error: `Detection failed: ${error.message}`,
        last_checked: new Date()
      };
    }
  }

  async findCliPath(command) {
    try {
      return await which(command);
    } catch (error) {
      return null;
    }
  }

  async checkAuthenticationByFiles(providerId) {
    const os = require('os');
    
    try {
      switch (providerId) {
        case 'claude_code':
          // Check for Claude Code session files
          const claudeConfigPath = path.join(os.homedir(), '.claude.json');
          if (fs.existsSync(claudeConfigPath)) {
            const configContent = fs.readFileSync(claudeConfigPath, 'utf8');
            // Look for session or auth tokens in the config
            return configContent.length > 100 && 
                   (configContent.includes('session') || 
                    configContent.includes('token') || 
                    configContent.includes('auth'));
          }
          return false;
        
        case 'codex_cli':
          // Check for Codex auth files
          const codexAuthPath = path.join(os.homedir(), '.codex', 'auth.json');
          if (fs.existsSync(codexAuthPath)) {
            const authContent = fs.readFileSync(codexAuthPath, 'utf8');
            try {
              const authData = JSON.parse(authContent);
              return authData && (authData.token || authData.access_token || authData.authenticated);
            } catch {
              return authContent.length > 10; // Has some auth content
            }
          }
          return false;
        
        case 'gemini_cli':
          // Check for Gemini CLI auth files (if any)
          const geminiConfigPath = path.join(os.homedir(), '.config', 'gemini-cli', 'config.json');
          if (fs.existsSync(geminiConfigPath)) {
            const configContent = fs.readFileSync(geminiConfigPath, 'utf8');
            return configContent.includes('auth') || configContent.includes('token');
          }
          return false;
        
        default:
          return false;
      }
    } catch (error) {
      if (process.env.POLYDEV_CLI_DEBUG) {
        console.log(`[CLI Debug] File-based auth check error for ${providerId}:`, error.message);
      }
      return false;
    }
  }

  parseAuthenticationStatus(providerId, authOutput) {
    
    switch (providerId) {
      case 'claude_code':
        // If --print "test auth" works without error, Claude Code is authenticated
        // Look for actual response content (not authentication errors)
        const claudeAuth = !authOutput.includes('not authenticated') && 
               !authOutput.includes('please log in') &&
               !authOutput.includes('authentication required') &&
               !authOutput.includes('login required') &&
               authOutput.length > 10; // Has actual content response
        
        return claudeAuth;
      
      case 'codex_cli':
        // Look for specific codex login status responses
        const hasLoggedIn = authOutput.includes('logged in using');
        const hasAuthenticated = authOutput.includes('authenticated');
        const hasChatGpt = authOutput.includes('chatgpt') && !authOutput.includes('not logged in');
        
        
        return hasLoggedIn || hasAuthenticated || hasChatGpt;
      
      case 'gemini_cli':
        // Check for Node.js compatibility issues first
        if (authOutput.includes('referenceerror: file is not defined') || 
            authOutput.includes('undici/lib/web/webidl') ||
            authOutput.includes('file is not defined')) {
          return false; // CLI is broken due to Node.js compatibility
        }
        
        // Check for positive auth indicators
        // Gemini CLI outputs "Loaded cached credentials" when authenticated
        const hasCredentials = authOutput.toLowerCase().includes('cached credentials') ||
                               authOutput.toLowerCase().includes('loaded cached');
        const hasAuth = authOutput.includes('authenticated') || authOutput.includes('logged in');
        
        // Quota exhaustion still means authenticated (just rate limited)
        const hasQuotaError = authOutput.includes('exhausted your daily quota') ||
                             authOutput.includes('quota');
        
        // Not authenticated indicators
        const notAuth = authOutput.includes('not authenticated') || 
                       authOutput.includes('please login') ||
                       authOutput.includes('authentication required');
        
        return !notAuth && (hasCredentials || hasAuth || hasQuotaError);
      
      default:
        return authOutput.includes('authenticated') || authOutput.includes('logged in');
    }
  }

  async sendCliPrompt(providerId, prompt, mode = 'args', timeoutMs = null, model = null) {
    // Set provider-specific default timeouts (5 minutes for all by default, complex prompts take time)
    if (timeoutMs === null) {
      timeoutMs = 300000; // 300 seconds (5 minutes) default for all providers
    }
    
    // Ensure timeoutMs is valid (not undefined, null, Infinity, or negative)
    // Allow up to 600 seconds (10 minutes) for very complex operations
    if (!timeoutMs || timeoutMs === Infinity || timeoutMs < 1 || timeoutMs > 600000) {
      timeoutMs = 300000 // Default to 5 minutes
    }
    
    const startTime = Date.now();

    try {
      const provider = this.providers.get(providerId);
      if (!provider) {
        return {
          success: false,
          error: `Unknown provider: ${providerId}`,
          latency_ms: Date.now() - startTime,
          timestamp: new Date()
        };
      }

      const status = await this.getCliStatus(providerId);
      const providerStatus = status[providerId];
      
      if (!providerStatus?.available) {
        return {
          success: false,
          error: `${provider.name} is not available. ${provider.install_instructions}`,
          latency_ms: Date.now() - startTime,
          timestamp: new Date()
        };
      }

      if (!providerStatus.authenticated) {
        return {
          success: false,
          error: `${provider.name} is not authenticated. ${provider.auth_instructions}`,
          latency_ms: Date.now() - startTime,
          timestamp: new Date()
        };
      }

      // Check if CLI has quota exhausted - skip and suggest API fallback
      if (providerStatus.quota_exhausted) {
        console.log(`[Polydev CLI] ${provider.name} has exhausted daily quota, skipping CLI (use API fallback)`);
        return {
          success: false,
          error: `${provider.name} has exhausted daily quota. Use API fallback.`,
          error_code: 'QUOTA_EXHAUSTED',
          latency_ms: Date.now() - startTime,
          provider: providerId,
          timestamp: new Date()
        };
      }

      // Log model being used
      if (model) {
        console.log(`[Polydev CLI] Using model for ${providerId}: ${model}`);
      } else {
        console.log(`[Polydev CLI] No model specified for ${providerId}, using CLI default`);
      }

      const promptVariants = [
        provider.subcommands?.test_prompt ? [...provider.subcommands.test_prompt] : []
      ];

      if (Array.isArray(provider?.subcommands?.alternate_test_prompts)) {
        for (const altArgs of provider.subcommands.alternate_test_prompts) {
          promptVariants.push(Array.isArray(altArgs) ? [...altArgs] : []);
        }
      }

      if (providerId === 'codex_cli') {
        const execArgs = promptVariants.find(args => args.includes('exec')) || promptVariants[0];
        
        // Try with specified model first, fallback to CLI default if model fails
        let modelToUse = model;
        let attempts = 0;
        const maxAttempts = model ? 2 : 1; // Only retry if model was specified
        
        while (attempts < maxAttempts) {
          attempts++;
          try {
            const result = await this.executeCodexExec(provider.command, execArgs, prompt, timeoutMs, modelToUse);
            // executeCodexExec now returns { content, detectedModel, rawStdout, rawStderr }
            const content = result.content;
            const detectedModel = result.detectedModel;
            const rawStdout = result.rawStdout || '';
            const rawStderr = result.rawStderr || '';
            
            // Check ALL outputs for model error - content, rawStdout, and rawStderr
            const combinedOutput = `${content || ''} ${rawStdout} ${rawStderr}`.toLowerCase();
            const modelError = combinedOutput.includes('model is not supported') ||
              combinedOutput.includes('model not found') ||
              combinedOutput.includes('invalid model') ||
              combinedOutput.includes("doesn't exist") ||
              combinedOutput.includes("model does not exist") ||
              combinedOutput.includes("unknown model");
            
            if (modelError && modelToUse && attempts < maxAttempts) {
              console.log(`[Polydev CLI] Model '${modelToUse}' failed for Codex CLI (detected in output), retrying with CLI default...`);
              modelToUse = null; // Retry without model flag
              continue;
            }
            
            // Use detected model if available, otherwise fall back to what was requested or 'cli_default'
            const actualModel = detectedModel || modelToUse || 'cli_default';
            
            if (detectedModel && detectedModel !== model) {
              console.log(`[Polydev CLI] Codex CLI detected model: ${detectedModel} (requested: ${model || 'none'})`);
            }
            
            return {
              success: true,
              content,
              tokens_used: this.estimateTokens(prompt + content),
              latency_ms: Date.now() - startTime,
              provider: providerId,
              mode: 'args',
              model_used: actualModel,
              timestamp: new Date()
            };
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            
            // Check if error is model-related and we can retry
            const isModelError = errorMsg.toLowerCase().includes('model') && (
              errorMsg.includes('not supported') ||
              errorMsg.includes('not found') ||
              errorMsg.includes('invalid') ||
              errorMsg.includes("doesn't exist") ||
              errorMsg.includes("does not exist") ||
              errorMsg.includes("unknown")
            );
            
            if (isModelError && modelToUse && attempts < maxAttempts) {
              console.log(`[Polydev CLI] Model '${modelToUse}' error for Codex CLI, retrying with CLI default...`);
              modelToUse = null; // Retry without model flag
              continue;
            }
            
            return {
              success: false,
              error: `CLI execution failed: ${errorMsg}`,
              latency_ms: Date.now() - startTime,
              provider: providerId,
              mode,
              timestamp: new Date()
            };
          }
        }
      }

      let lastErrorMessage = null;

      for (const promptArgs of promptVariants) {
        // Build args with model flag if specified
        let args = Array.isArray(promptArgs) ? [...promptArgs] : [];
        
        // Add model flag based on CLI type
        if (model) {
          if (providerId === 'claude_code') {
            // Claude Code uses --model flag
            args = ['--model', model, ...args, prompt];
          } else if (providerId === 'gemini_cli') {
            // Gemini CLI uses -m flag
            args = ['-m', model, ...args, prompt];
          } else {
            // Default: just append prompt
            args = [...args, prompt];
          }
        } else {
          args = [...args, prompt];
        }

        try {
          const result = await this.executeCliCommand(
            provider.command,
            args,
            'args',
            timeoutMs,
            undefined
          );

          if (!result.error) {
            // Special handling for Claude Code JSON output
            if (providerId === 'claude_code') {
              const jsonResult = this.parseClaudeCodeJsonResponse(result.stdout || '');
              if (jsonResult) {
                console.log(`[Polydev CLI] Claude Code detected model: ${jsonResult.model_used} (from JSON output)`);
                return {
                  success: true,
                  content: jsonResult.content,
                  tokens_used: jsonResult.tokens_used,
                  latency_ms: Date.now() - startTime,
                  provider: providerId,
                  mode: 'args',
                  model_used: jsonResult.model_used,
                  cost_usd: jsonResult.cost_usd,
                  model_usage: jsonResult.model_usage,
                  timestamp: new Date()
                };
              }
            }
            
            // Fallback: Standard text output handling
            const content = this.cleanCliResponse(result.stdout || '');
            
            // Detect actual model from CLI output
            const detectedModel = this.detectModelFromOutput(providerId, result.stdout || '', result.stderr || '');
            const actualModel = detectedModel || model || 'cli_default';
            
            if (detectedModel && detectedModel !== model) {
              console.log(`[Polydev CLI] ${providerId} detected model: ${detectedModel} (requested: ${model || 'none'})`);
            }
            
            return {
              success: true,
              content,
              tokens_used: this.estimateTokens(prompt + content),
              latency_ms: Date.now() - startTime,
              provider: providerId,
              mode: 'args',
              model_used: actualModel,
              timestamp: new Date()
            };
          }

          lastErrorMessage = result.error;
          
          // Check for quota exhaustion error during execution
          const combinedOutput = ((result.stdout || '') + ' ' + (result.stderr || '') + ' ' + (result.error || '')).toLowerCase();
          if (combinedOutput.includes('exhausted') && combinedOutput.includes('quota') ||
              combinedOutput.includes('rate limit') ||
              combinedOutput.includes('too many requests')) {
            console.log(`[Polydev CLI] ${providerId} quota/rate limit error detected during execution`);
            return {
              success: false,
              error: `${provider.name} quota/rate limit exceeded. Use API fallback.`,
              error_code: 'QUOTA_EXHAUSTED',
              latency_ms: Date.now() - startTime,
              provider: providerId,
              timestamp: new Date()
            };
          }
        } catch (error) {
          lastErrorMessage = error instanceof Error ? error.message : String(error);
          
          // If model was specified and command failed, retry without model (graceful fallback)
          if (model && lastErrorMessage.includes('model')) {
            console.log(`[Polydev CLI] Model ${model} may be invalid for ${providerId}, retrying without model flag`);
            try {
              const fallbackArgs = Array.isArray(promptArgs) ? [...promptArgs, prompt] : [prompt];
              const fallbackResult = await this.executeCliCommand(
                provider.command,
                fallbackArgs,
                'args',
                timeoutMs,
                undefined
              );
              
              if (!fallbackResult.error) {
                const content = this.cleanCliResponse(fallbackResult.stdout || '');
                
                // Detect actual model from fallback output
                const detectedModel = this.detectModelFromOutput(providerId, fallbackResult.stdout || '', fallbackResult.stderr || '');
                const actualModel = detectedModel || 'cli_default_fallback';
                
                if (detectedModel) {
                  console.log(`[Polydev CLI] ${providerId} fallback detected model: ${detectedModel}`);
                }
                
                return {
                  success: true,
                  content,
                  tokens_used: this.estimateTokens(prompt + content),
                  latency_ms: Date.now() - startTime,
                  provider: providerId,
                  mode: 'args',
                  model_used: actualModel,
                  timestamp: new Date()
                };
              }
            } catch (fallbackError) {
              // Fallback also failed, continue with original error
            }
          }
        }
      }

      return {
        success: false,
        error: `CLI command failed: ${lastErrorMessage || 'Unknown error'}`,
        latency_ms: Date.now() - startTime,
        provider: providerId,
        mode: 'args',
        timestamp: new Date()
      };

    } catch (error) {
      return {
        success: false,
        error: `CLI execution failed: ${error.message}`,
        latency_ms: Date.now() - startTime,
        provider: providerId,
        mode,
        timestamp: new Date()
      };
    }
  }

  async executeCliCommand(command, args, mode = 'args', timeoutMs = 180000, stdinInput) {
    // Ensure timeoutMs is valid (not undefined, null, Infinity, or negative)
    // Allow up to 300 seconds (5 minutes) for complex operations
    if (!timeoutMs || timeoutMs === Infinity || timeoutMs < 1 || timeoutMs > 300000) {
      timeoutMs = 180000 // Default to 180 seconds
    }
    
    return new Promise((resolve, reject) => {
      if (process.env.POLYDEV_CLI_DEBUG) {
        console.log(`[CLI Debug] Executing: ${command} ${args.join(' ')} (mode: ${mode})`);
      }

      const child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: process.platform === 'win32',
        timeout: timeoutMs
      });

      if (child.stdin) {
        child.stdin.end();
      }

      let stdout = '';
      let stderr = '';
      let resolved = false;
      let debounceTimer = null;

      // Helper to check if output looks complete (for JSON output from claude code)
      const looksComplete = () => {
        const trimmed = stdout.trim();
        // For JSON output, check if it's valid JSON
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          try {
            JSON.parse(trimmed);
            return true; // Valid JSON means complete
          } catch {
            return false;
          }
        }
        // For text output, check if we have substantial content
        return trimmed.length > 50 && trimmed.includes('\n');
      };

      const doResolve = () => {
        if (resolved) return;
        resolved = true;
        if (debounceTimer) clearTimeout(debounceTimer);
        if (timeoutId) clearTimeout(timeoutId);
        if (!child.killed) {
          try { child.kill('SIGTERM'); } catch(_) {}
        }
        resolve({ stdout, stderr });
      };

      // Schedule early return check after debounce period
      const scheduleEarlyReturn = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (!resolved && looksComplete()) {
            console.log('[CLI Debug] Early return - output looks complete');
            doResolve();
          }
        }, 2000); // Wait 2 seconds after last data for Claude Code (faster JSON parsing)
      };

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
        scheduleEarlyReturn();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      if (mode === 'stdin' && stdinInput && child.stdin) {
        child.stdin.write(`${stdinInput}\n`);
        child.stdin.end();
      }

      child.on('close', (code) => {
        if (resolved) return;
        resolved = true;
        if (debounceTimer) clearTimeout(debounceTimer);
        if (timeoutId) clearTimeout(timeoutId);
        
        if (process.env.POLYDEV_CLI_DEBUG) {
          console.log(`[CLI Debug] Command finished with code ${code}`);
        }

        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          const trimmedStdErr = stderr.trim();
          const trimmedStdOut = stdout.trim();
          const errorMessage = trimmedStdErr || trimmedStdOut || `Command exited with code ${code}`;
          resolve({ 
            stdout, 
            stderr, 
            error: errorMessage,
            exit_code: code
          });
        }
      });

      child.on('error', (error) => {
        if (resolved) return;
        resolved = true;
        if (debounceTimer) clearTimeout(debounceTimer);
        if (timeoutId) clearTimeout(timeoutId);
        if (process.env.POLYDEV_CLI_DEBUG) {
          console.log(`[CLI Debug] Command error:`, error);
        }
        reject(error);
      });

      let timeoutId;

      timeoutId = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        if (debounceTimer) clearTimeout(debounceTimer);
        if (!child.killed) {
          child.kill('SIGTERM');
          // Force kill after 2 seconds if still running
          setTimeout(() => {
            if (!child.killed) {
              child.kill('SIGKILL');
            }
          }, 2000);
        }
        reject(new Error(`Command timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      child.on('exit', () => {
        if (debounceTimer) clearTimeout(debounceTimer);
      });
    });
  }

  // Detect actual model from CLI output before parsing/cleaning
  detectModelFromOutput(providerId, stdout, stderr) {
    const combinedOutput = (stdout || '') + '\n' + (stderr || '');
    
    // Different patterns for different CLI tools
    switch (providerId) {
      case 'claude_code': {
        // Claude Code may output model info in various formats
        // Look for patterns like "model: claude-sonnet-4-20250514" or "Using model: ..."
        const claudeModelMatch = combinedOutput.match(/(?:model|using model)[:\s]+([a-zA-Z0-9_.-]+)/i);
        if (claudeModelMatch && claudeModelMatch[1]) {
          const model = claudeModelMatch[1].trim();
          // Filter out invalid values
          if (model && model !== 'undefined' && model !== 'null' && model.length > 2) {
            return model;
          }
        }
        break;
      }
      
      case 'codex_cli': {
        // Codex CLI outputs configuration header like:
        // model:         gpt-4.1
        // or: model: o4-mini
        const codexModelMatch = combinedOutput.match(/^\s*model:\s*([a-zA-Z0-9_.-]+)/mi);
        if (codexModelMatch && codexModelMatch[1]) {
          const model = codexModelMatch[1].trim();
          if (model && model !== 'undefined' && model !== 'null' && model.length > 2) {
            return model;
          }
        }
        break;
      }
      
      case 'gemini_cli': {
        // Gemini CLI may output model info
        // Look for patterns like "model: gemini-2.0-flash" or "Using gemini-..."
        const geminiModelMatch = combinedOutput.match(/(?:model|using)[:\s]+(gemini[a-zA-Z0-9_.-]*)/i);
        if (geminiModelMatch && geminiModelMatch[1]) {
          const model = geminiModelMatch[1].trim();
          if (model && model.length > 2) {
            return model;
          }
        }
        break;
      }
    }
    
    return null; // Could not detect model from output
  }

  // Parse Claude Code JSON response to extract model and content
  parseClaudeCodeJsonResponse(stdout) {
    if (!stdout || !stdout.trim()) return null;
    
    try {
      // Try to parse as JSON
      const json = JSON.parse(stdout.trim());
      
      // Check if it's a valid Claude Code response
      if (json.type !== 'result' || !json.result) {
        return null;
      }
      
      // Extract content
      const content = json.result;
      
      // Extract primary model from modelUsage
      // The primary model is the one with highest cost - that's the user's configured main model
      // (Haiku is used internally for quick tasks, but the expensive model is what the user chose)
      let primaryModel = 'cli_default';
      const modelUsage = json.modelUsage || {};
      const modelNames = Object.keys(modelUsage);
      
      if (modelNames.length === 1) {
        // Only one model used - that's the primary
        primaryModel = modelNames[0];
      } else if (modelNames.length > 1) {
        // Multiple models - the one with highest cost is the user's configured main model
        let highestCost = -1;
        for (const [modelName, usage] of Object.entries(modelUsage)) {
          const cost = usage.costUSD || 0;
          if (cost > highestCost) {
            highestCost = cost;
            primaryModel = modelName;
          }
        }
      }
      
      // Calculate total tokens (excluding cache tokens which are just infrastructure overhead)
      let totalTokens = 0;
      let cacheTokens = 0;
      for (const usage of Object.values(modelUsage)) {
        // Count actual input/output tokens
        totalTokens += (usage.inputTokens || 0) + (usage.outputTokens || 0);
        // Track cache tokens separately (for cost calculations, but not displayed as "tokens used")
        cacheTokens += (usage.cacheReadInputTokens || 0) + (usage.cacheCreationInputTokens || 0);
      }
      
      return {
        content,
        model_used: primaryModel,
        tokens_used: totalTokens || json.usage?.input_tokens + json.usage?.output_tokens || 0,
        cache_tokens: cacheTokens, // Separate field for cache tokens
        cost_usd: json.total_cost_usd || 0,
        model_usage: modelUsage,
        session_id: json.session_id,
        duration_ms: json.duration_ms
      };
    } catch (e) {
      // Not valid JSON, return null to fall back to text parsing
      return null;
    }
  }

  async executeCodexExec(executable, commandArgs, prompt, timeoutMs, model = null) {
    if (!executable) {
      throw new Error('Missing Codex executable');
    }

    if (!commandArgs || commandArgs.length === 0) {
      throw new Error('Invalid Codex command configuration');
    }

    const workingDir = process.cwd();
    
    // Build args with optional model flag
    // Codex CLI uses -m or --model flag
    let args = [...commandArgs];
    
    // Add model flag if specified
    if (model) {
      args.push('-m', model);
      console.log(`[CLI Debug] Codex using model: ${model}`);
    }
    
    // Add standard flags and prompt
    args.push(
      '--sandbox',
      'workspace-write',
      '--skip-git-repo-check',
      '--cd',
      workingDir,
      prompt
    );

    return new Promise((resolve, reject) => {
      const baseTmp = process.env.POLYDEV_CLI_TMPDIR || process.env.TMPDIR || os.tmpdir();
      const tmpDir = path.join(baseTmp, 'polydev-codex');
      try {
        fs.mkdirSync(tmpDir, { recursive: true });
      } catch (error) {
        console.warn('[CLI Debug] Failed to create Codex temp dir:', error);
      }

      const child = spawn(executable, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: process.platform === 'win32',
        env: {
          ...process.env,
          TMPDIR: tmpDir,
          TEMP: tmpDir,
          TMP: tmpDir
        }
      });

      console.log(`[CLI Debug] Spawning Codex process: ${executable} ${args.join(' ')}`);

      if (child.stdin) {
        child.stdin.end();
      }

      let stdout = '';
      let stderr = '';
      let resolved = false;
      let debounceTimer = null; // Smart debounce timer for early return

      const stop = (handler) => {
        if (!resolved) {
          resolved = true;
          if (debounceTimer) clearTimeout(debounceTimer);
          try { child.kill('SIGTERM'); } catch (_) {}
          handler();
        }
      };

      const timeoutHandle = setTimeout(() => {
        stop(() => reject(new Error(`Codex exec timeout after ${timeoutMs}ms`)));
      }, timeoutMs);

      // Helper function to parse Codex output robustly
      const parseCodexOutput = (output) => {
        if (!output || !output.trim()) return null;
        
        // First, try to extract the response between "codex" marker and "tokens used"
        // This is the most reliable pattern for Codex CLI output
        const codexMarkerMatch = output.match(/\bcodex\s*\n([\s\S]*?)(?:\n\s*tokens used|\n\s*$)/i);
        if (codexMarkerMatch && codexMarkerMatch[1]) {
          const extracted = codexMarkerMatch[1].trim();
          if (extracted.length > 0 && !extracted.startsWith('ERROR')) {
            return extracted;
          }
        }
        
        // Fallback: Try to find bullet point responses
        const bulletMatches = output.match(/•\s*(.+)/g);
        if (bulletMatches && bulletMatches.length > 0) {
          const bulletContent = bulletMatches
            .map(m => m.replace(/^•\s*/, '').trim())
            .filter(s => s.length > 0)
            .join('\n');
          if (bulletContent.length > 0) {
            return bulletContent;
          }
        }
        
        // Last resort: Filter out known noise patterns line by line
        const lines = output.split('\n');
        const contentLines = [];
        
        // Patterns to skip (Codex-specific noise)
        const noisePatterns = [
          /^\s*$/,                                          // Empty lines
          /^\d{4}-\d{2}-\d{2}T[\d:]+.*?(ERROR|WARN|INFO)/i, // Timestamp logs
          /^OpenAI Codex v[\d.]+/i,                         // Version banner
          /^-{4,}$/,                                        // Separator lines
          /^workdir:/i,                                     // Header fields
          /^model:/i,
          /^provider:/i,
          /^approval:/i,
          /^sandbox:/i,
          /^reasoning effort:/i,
          /^reasoning summaries:/i,
          /^session id:/i,
          /^user$/i,                                        // "user" marker
          /^thinking$/i,                                    // "thinking" marker
          /^codex$/i,                                       // "codex" marker
          /^tokens used$/i,                                 // Token count header
          /^[\d,]+$/,                                       // Just numbers (token counts)
          /^ERROR:\s*MCP/i,                                 // MCP errors
          /MCP client for .* failed/i,                      // MCP client failures
          /handshake.*failed/i,                             // Handshake errors
          /connection closed/i,                             // Connection errors
          /\[MCP\]/i,                                       // MCP tags
          /^MCP\s/i,                                        // MCP prefix
          /rmcp::transport/i,                               // Rust MCP transport errors
          /serde error/i,                                   // Serde parsing errors
          /^\*\*.*\*\*$/,                                   // Bold status messages like **Awaiting next steps**
        ];
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          
          // Check if line matches any noise pattern
          const isNoise = noisePatterns.some(pattern => pattern.test(trimmedLine));
          if (isNoise) continue;
          
          // Skip if line looks like the echoed user prompt (heuristic: contains "?" and is long)
          if (trimmedLine.includes('?') && trimmedLine.length > 20) continue;
          
          contentLines.push(trimmedLine);
        }
        
        const result = contentLines.join('\n').trim();
        return result.length > 0 ? result : null;
      };

      // Check if we have a complete response - look for actual content
      const flushIfComplete = () => {
        const parsed = parseCodexOutput(stdout);
        // Only resolve early if we have meaningful content (at least 20 chars) and output looks complete
        // Look for signs that Codex has finished outputting (tokens used, empty lines at end, etc.)
        if (parsed && parsed.length >= 20) {
          const detectedModel = this.detectModelFromOutput('codex_cli', stdout, stderr);
          clearTimeout(timeoutHandle);
          if (debounceTimer) clearTimeout(debounceTimer);
          stop(() => resolve({ content: parsed, detectedModel, rawStdout: stdout.trim(), rawStderr: stderr.trim() }));
        }
      };

      // Smart debounce: wait 3 seconds after last data received before checking for early return
      const scheduleEarlyReturn = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (!resolved) {
            console.log('[CLI Debug] Checking for early return after debounce...');
            flushIfComplete();
          }
        }, 3000); // Wait 3 seconds after last data received
      };

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
        // Schedule early return check after debounce period
        scheduleEarlyReturn();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutHandle);

        const trimmedStdout = stdout.trim();
        const trimmedStderr = stderr.trim();
        
        // Combine stdout and stderr for parsing - Codex may output to either
        const combinedOutput = trimmedStdout + '\n' + trimmedStderr;

        // Detect the actual model used BEFORE parsing (model info is in the header)
        const detectedModel = this.detectModelFromOutput('codex_cli', trimmedStdout, trimmedStderr);

        // Always try to parse stdout first, regardless of exit code
        // MCP handshake failures cause non-zero exit but don't prevent valid responses
        const parsedStdout = parseCodexOutput(trimmedStdout);
        if (parsedStdout) {
          resolve({ content: parsedStdout, detectedModel, rawStdout: trimmedStdout, rawStderr: trimmedStderr });
          return;
        }
        
        // Try parsing combined output (some responses may appear in stderr)
        const parsedCombined = parseCodexOutput(combinedOutput);
        if (parsedCombined) {
          resolve({ content: parsedCombined, detectedModel, rawStdout: trimmedStdout, rawStderr: trimmedStderr });
          return;
        }

        // Only now consider it a failure
        if (code === 0) {
          // Successful exit but no parseable output
          if (trimmedStdout) {
            resolve({ content: trimmedStdout, detectedModel, rawStdout: trimmedStdout, rawStderr: trimmedStderr }); // Return raw output as fallback
          } else {
            reject(new Error('Codex completed but produced no output'));
          }
        } else {
          // Non-zero exit and no parseable response - this is a real error
          // Filter error message to remove MCP noise
          const errorLines = (trimmedStderr || trimmedStdout).split('\n')
            .filter(line => {
              const l = line.trim().toLowerCase();
              return l.length > 0 && 
                     !l.includes('mcp') && 
                     !l.includes('handshake') &&
                     !l.includes('rmcp::') &&
                     !l.includes('serde error');
            })
            .slice(0, 3); // Only first 3 relevant error lines
          
          const cleanError = errorLines.join('; ') || `Codex exited with code ${code}`;
          reject(new Error(cleanError));
        }
      });

      child.on('error', (error) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutHandle);
        reject(error);
      });
    });
  }

  cleanCliResponse(response) {
    const cleanResponse = response.replace(/\x1b\[[0-9;]*m/g, '');
    
    return cleanResponse
      .replace(/^(\s*>\s*|\s*$)/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  getAvailableProviders() {
    return Array.from(this.providers.values());
  }

  getProvider(providerId) {
    return this.providers.get(providerId);
  }

  // ============================================
  // Status Reporting Methods
  // ============================================

  /**
   * Enable status reporting to polydev.ai server
   * @param {string} userToken - User's MCP token (pd_xxx or polydev_xxx)
   * @param {object} options - Additional configuration options
   */
  enableStatusReporting(userToken, options = {}) {
    if (!StatusReporter) {
      console.warn('[Polydev CLI] StatusReporter not available');
      return false;
    }

    if (!this.statusReporter) {
      this.statusReporter = new StatusReporter({
        userToken,
        reportingEnabled: true,
        ...options
      });
    } else {
      this.statusReporter.configure({
        userToken,
        reportingEnabled: true,
        ...options
      });
    }

    console.log('[Polydev CLI] Status reporting enabled');
    return true;
  }

  /**
   * Disable status reporting
   */
  disableStatusReporting() {
    if (this.statusReporter) {
      this.statusReporter.configure({ reportingEnabled: false });
      this.statusReporter.stopHeartbeat();
      console.log('[Polydev CLI] Status reporting disabled');
    }
  }

  /**
   * Start automatic heartbeat for periodic status updates
   * @param {number} intervalMs - Interval in milliseconds (default: 15 minutes)
   */
  startStatusHeartbeat(intervalMs) {
    if (this.statusReporter) {
      if (intervalMs) {
        this.statusReporter.configure({ heartbeatIntervalMs: intervalMs });
      }
      this.statusReporter.startHeartbeat(this);
      console.log('[Polydev CLI] Status heartbeat started');
      return true;
    }
    return false;
  }

  /**
   * Stop automatic heartbeat
   */
  stopStatusHeartbeat() {
    if (this.statusReporter) {
      this.statusReporter.stopHeartbeat();
      console.log('[Polydev CLI] Status heartbeat stopped');
    }
  }

  /**
   * Get status reporting configuration and history
   */
  getStatusReportingInfo() {
    if (!this.statusReporter) {
      return {
        available: false,
        reason: 'StatusReporter not initialized'
      };
    }

    return {
      available: true,
      config: this.statusReporter.getConfig(),
      history: this.statusReporter.getHistory()
    };
  }

  /**
   * Manually trigger a status report
   * @returns {Promise<object>} - Report results
   */
  async reportStatusNow() {
    if (!this.statusReporter || !this.statusReporter.isConfigured()) {
      return {
        success: false,
        reason: 'Status reporting not configured'
      };
    }

    const statuses = await this.forceCliDetection();
    // forceCliDetection already reports, but we return the result
    return {
      success: true,
      statuses,
      reported: true
    };
  }
}

module.exports = { CLIManager, default: CLIManager };
