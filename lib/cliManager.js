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
          chat: ['chat'],
          version: ['--version'],
          auth_status: ['auth', 'status']
        },
        install_instructions: 'Install via: npm install -g @anthropic-ai/claude-code',
        auth_instructions: 'Authenticate with: claude auth login'
      },
      {
        id: 'codex_cli',
        name: 'Codex CLI',
        command: process.env.CODEX_CLI_PATH || 'codex',
        subcommands: {
          chat: ['chat'],
          version: ['--version'],
          auth_status: ['--help'] // Codex doesn't have auth status, use help as test
        },
        install_instructions: 'Install Codex CLI from OpenAI',
        auth_instructions: 'Authenticate with: codex login or set OPENAI_API_KEY'
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

    for (const provider of providersToCheck) {
      if (provider) {
        try {
          results[provider.id] = await this.detectCliProvider(provider);
          this.statusCache.set(provider.id, results[provider.id]);
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
      try {
        const authResult = await this.executeCliCommand(
          provider.command,
          provider.subcommands.auth_status,
          'args',
          5000 // Reduced timeout to 5 seconds
        );
        
        // If command succeeds, check output for authentication indicators
        const authOutput = (authResult.stdout + ' ' + authResult.stderr).toLowerCase();
        authenticated = this.parseAuthenticationStatus(provider.id, authOutput);
        
      } catch (authError) {
        if (process.env.POLYDEV_CLI_DEBUG) {
          console.log(`[CLI Debug] Auth check failed for ${provider.id}:`, authError);
        }
        // For most CLI tools, if the command fails, assume not authenticated
        // Exception: For codex/gemini using --help, if help works, assume available
        if (provider.id === 'codex_cli' || provider.id === 'gemini_cli') {
          authenticated = true; // If help command worked, CLI is functional
        } else {
          authenticated = false; // For claude, auth status failure means not authenticated
        }
      }

      return {
        available: true,
        authenticated,
        version,
        path: cliPath,
        last_checked: new Date(),
        error: authenticated ? undefined : `Not authenticated. ${provider.auth_instructions}`
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

  parseAuthenticationStatus(providerId, authOutput) {
    switch (providerId) {
      case 'claude_code':
        return !authOutput.includes('not authenticated') && 
               !authOutput.includes('please log in') &&
               (authOutput.includes('authenticated') || authOutput.includes('logged in'));
      
      case 'codex_cli':
        return !authOutput.includes('not authenticated') && 
               !authOutput.includes('please authenticate') &&
               (authOutput.includes('authenticated') || authOutput.includes('logged in'));
      
      case 'gemini_cli':
        return !authOutput.includes('not authenticated') && 
               !authOutput.includes('please login') &&
               (authOutput.includes('authenticated') || authOutput.includes('logged in'));
      
      default:
        return authOutput.includes('authenticated') || authOutput.includes('logged in');
    }
  }

  async sendCliPrompt(providerId, prompt, mode = 'args', timeoutMs = 30000) {
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

      const args = [...provider.subcommands.chat];
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

      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      child.on('close', () => {
        clearTimeout(timeoutId);
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