const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const which = require('which');

const execAsync = promisify(exec);

class CLIManager {
  constructor() {
    this.providers = new Map();
    this.statusCache = new Map();
    this.CACHE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
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
          test_prompt: ['--print']
        },
        install_instructions: 'Install via: npm install -g @anthropic-ai/claude-code',
        auth_instructions: 'Authenticate with Claude Code'
      },
      {
        id: 'codex_cli',
        name: 'Codex CLI',
        command: process.env.CODEX_CLI_PATH || 'codex',
        subcommands: {
          chat: [],
          version: ['--version'],
          auth_status: ['login', 'status'], // Correct command: codex login status
          test_prompt: ['exec']
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
        
        return !authOutput.includes('not authenticated') && 
               !authOutput.includes('please login') &&
               (authOutput.includes('authenticated') || authOutput.includes('logged in'));
      
      default:
        return authOutput.includes('authenticated') || authOutput.includes('logged in');
    }
  }

  async sendCliPrompt(providerId, prompt, mode = 'args', timeoutMs = null) {
    // Set provider-specific default timeouts
    if (timeoutMs === null) {
      timeoutMs = providerId === 'claude_code' ? 60000 : 30000; // 60s for Claude Code, 30s for others
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

      const args = [...provider.subcommands.test_prompt];
      if (mode === 'args') {
        args.push(prompt);
      }

      const result = await this.executeCliCommand(
        provider.command,
        args,
        mode,
        timeoutMs,
        mode === 'stdin' ? prompt : undefined
      );

      if (result.error) {
        return {
          success: false,
          error: `CLI command failed: ${result.error}`,
          latency_ms: Date.now() - startTime,
          provider: providerId,
          mode,
          timestamp: new Date()
        };
      }

      const content = this.cleanCliResponse(result.stdout || '');
      const tokens_used = this.estimateTokens(prompt + content);

      return {
        success: true,
        content,
        tokens_used,
        latency_ms: Date.now() - startTime,
        provider: providerId,
        mode,
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

  async executeCliCommand(command, args, mode = 'args', timeoutMs = 30000, stdinInput) {
    return new Promise((resolve, reject) => {
      if (process.env.POLYDEV_CLI_DEBUG) {
        console.log(`[CLI Debug] Executing: ${command} ${args.join(' ')} (mode: ${mode})`);
      }

      const child = spawn(command, args, {
        stdio: mode === 'stdin' ? ['pipe', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe'],
        shell: process.platform === 'win32',
        timeout: timeoutMs
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      if (mode === 'stdin' && stdinInput && child.stdin) {
        child.stdin.write(stdinInput);
        child.stdin.end();
      }

      child.on('close', (code) => {
        if (process.env.POLYDEV_CLI_DEBUG) {
          console.log(`[CLI Debug] Command finished with code ${code}`);
        }

        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          resolve({ 
            stdout, 
            stderr, 
            error: `Command exited with code ${code}` 
          });
        }
      });

      child.on('error', (error) => {
        if (process.env.POLYDEV_CLI_DEBUG) {
          console.log(`[CLI Debug] Command error:`, error);
        }
        reject(error);
      });

      let timeoutId;
      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      };

      timeoutId = setTimeout(() => {
        cleanup();
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

      child.on('close', () => {
        cleanup();
      });

      child.on('exit', () => {
        cleanup();
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
}

module.exports = { CLIManager, default: CLIManager };