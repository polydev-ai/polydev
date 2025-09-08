import { exec, spawn, ExecOptions } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
const which = require('which');

const execAsync = promisify(exec);

export interface CLIProvider {
  id: string;
  name: string;
  command: string;
  subcommands: {
    chat: string[];
    version: string[];
    auth_status: string[];
  };
  install_instructions: string;
  auth_instructions: string;
}

export interface CLIStatus {
  available: boolean;
  authenticated: boolean;
  version?: string;
  path?: string;
  error?: string;
  last_checked?: Date;
}

export interface CLIResponse {
  success: boolean;
  content?: string;
  error?: string;
  tokens_used?: number;
  latency_ms?: number;
  provider?: string;
  mode?: 'stdin' | 'args';
  timestamp?: Date;
}

export class CLIManager {
  private providers: Map<string, CLIProvider> = new Map();
  private statusCache: Map<string, CLIStatus> = new Map();
  private readonly CACHE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    const providers: CLIProvider[] = [
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
          auth_status: ['auth', 'status']
        },
        install_instructions: 'Install Codex CLI from OpenAI',
        auth_instructions: 'Authenticate with: codex auth'
      },
      {
        id: 'gemini_cli',
        name: 'Gemini CLI',
        command: process.env.GEMINI_CLI_PATH || 'gemini',
        subcommands: {
          chat: ['chat'],
          version: ['--version'],
          auth_status: ['auth', 'status']
        },
        install_instructions: 'Install Gemini CLI from Google',
        auth_instructions: 'Authenticate with: gemini auth login'
      }
    ];

    providers.forEach(provider => {
      this.providers.set(provider.id, provider);
    });
  }

  async forceCliDetection(specificProvider?: string): Promise<Record<string, CLIStatus>> {
    const results: Record<string, CLIStatus> = {};
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
            error: `Detection failed: ${error instanceof Error ? error.message : String(error)}`,
            last_checked: new Date()
          };
        }
      }
    }

    return results;
  }

  async getCliStatus(specificProvider?: string): Promise<Record<string, CLIStatus>> {
    const results: Record<string, CLIStatus> = {};
    const providersToCheck = specificProvider 
      ? [this.providers.get(specificProvider)].filter(Boolean) 
      : Array.from(this.providers.values());

    for (const provider of providersToCheck) {
      if (provider) {
        const cached = this.statusCache.get(provider.id);
        if (cached && this.isCacheValid(cached)) {
          results[provider.id] = cached;
        } else {
          // Force detection if cache is stale
          const detection = await this.forceCliDetection(provider.id);
          results[provider.id] = detection[provider.id];
        }
      }
    }

    return results;
  }

  private isCacheValid(status: CLIStatus): boolean {
    if (!status.last_checked) return false;
    const now = new Date().getTime();
    const checked = new Date(status.last_checked).getTime();
    return (now - checked) < this.CACHE_TIMEOUT_MS;
  }

  private async detectCliProvider(provider: CLIProvider): Promise<CLIStatus> {
    const startTime = Date.now();

    try {
      // Check if CLI is available in PATH
      const cliPath = await this.findCliPath(provider.command);
      if (!cliPath) {
        return {
          available: false,
          authenticated: false,
          error: `${provider.name} not found in PATH. ${provider.install_instructions}`,
          last_checked: new Date()
        };
      }

      // Get version information
      let version: string | undefined;
      try {
        const versionResult = await this.executeCliCommand(
          provider.command, 
          provider.subcommands.version,
          'args',
          5000
        );
        version = versionResult.stdout?.trim();
      } catch (versionError) {
        // Version command failed, but CLI might still be available
        if (process.env.POLYDEV_CLI_DEBUG) {
          console.log(`[CLI Debug] Version check failed for ${provider.id}:`, versionError);
        }
      }

      // Check authentication status
      let authenticated = false;
      try {
        const authResult = await this.executeCliCommand(
          provider.command,
          provider.subcommands.auth_status,
          'args',
          10000
        );
        
        // Different CLIs have different ways to indicate auth status
        const authOutput = (authResult.stdout + ' ' + authResult.stderr).toLowerCase();
        authenticated = this.parseAuthenticationStatus(provider.id, authOutput);
        
      } catch (authError) {
        // Auth check failed - assume not authenticated
        if (process.env.POLYDEV_CLI_DEBUG) {
          console.log(`[CLI Debug] Auth check failed for ${provider.id}:`, authError);
        }
        authenticated = false;
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
        error: `Detection failed: ${error instanceof Error ? error.message : String(error)}`,
        last_checked: new Date()
      };
    }
  }

  private async findCliPath(command: string): Promise<string | null> {
    try {
      return await which(command);
    } catch (error) {
      return null;
    }
  }

  private parseAuthenticationStatus(providerId: string, authOutput: string): boolean {
    // Parse different CLI authentication outputs
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
        // Default heuristic for unknown CLI tools
        return authOutput.includes('authenticated') || authOutput.includes('logged in');
    }
  }

  async sendCliPrompt(
    providerId: string,
    prompt: string,
    mode: 'stdin' | 'args' = 'args',
    timeoutMs: number = 30000
  ): Promise<CLIResponse> {
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

      // Check if CLI is available and authenticated
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

      // Execute the CLI command with the prompt
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

      // Parse and clean the response
      const content = this.cleanCliResponse(result.stdout || '');
      
      // Estimate tokens used (rough approximation)
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
        error: `CLI execution failed: ${error instanceof Error ? error.message : String(error)}`,
        latency_ms: Date.now() - startTime,
        provider: providerId,
        mode,
        timestamp: new Date()
      };
    }
  }

  private async executeCliCommand(
    command: string,
    args: string[],
    mode: 'stdin' | 'args' = 'args',
    timeoutMs: number = 30000,
    stdinInput?: string
  ): Promise<{ stdout: string; stderr: string; error?: string }> {
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

      // Send input via stdin if required
      if (mode === 'stdin' && stdinInput && child.stdin) {
        child.stdin.write(stdinInput);
        child.stdin.end();
      }

      child.on('close', (code) => {
        if (process.env.POLYDEV_CLI_DEBUG) {
          console.log(`[CLI Debug] Command finished with code ${code}`);
          console.log(`[CLI Debug] stdout: ${stdout.substring(0, 200)}...`);
          console.log(`[CLI Debug] stderr: ${stderr.substring(0, 200)}...`);
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

      // Timeout handling
      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      child.on('close', () => {
        clearTimeout(timeoutId);
      });
    });
  }

  private cleanCliResponse(response: string): string {
    // Remove ANSI escape codes
    const cleanResponse = response.replace(/\x1b\[[0-9;]*m/g, '');
    
    // Remove common CLI artifacts
    return cleanResponse
      .replace(/^(\s*>\s*|\s*$)/gm, '') // Remove prompt symbols and trailing whitespace
      .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
      .trim();
  }

  private estimateTokens(text: string): number {
    // Rough token estimation (1 token ≈ 4 characters for English text)
    return Math.ceil(text.length / 4);
  }

  // Utility method to list all available providers
  getAvailableProviders(): CLIProvider[] {
    return Array.from(this.providers.values());
  }

  // Utility method to get a specific provider
  getProvider(providerId: string): CLIProvider | undefined {
    return this.providers.get(providerId);
  }
}

export default CLIManager;