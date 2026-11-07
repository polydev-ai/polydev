const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const which = require('which');

// Local CLIs that Polydev can ask on the user's own machine, under the user's own login.
//
// Rules this file keeps:
//   - Sign-in state comes only from each CLI's own status command (`claude auth status --json`,
//     `codex login status`). No code path opens any CLI's credential or config file.
//   - Every `claude` call is single-turn (--max-turns 1) with all built-in tools off (--tools "")
//     and no MCP servers (--strict-mcp-config). It loads none of the user's or a project's settings
//     files (--setting-sources ""), so no user/project hooks, installed plugins or permission rules;
//     a per-run settings file adds {"disableAllHooks": true} on top. It starts in a fresh empty temp
//     directory (no CLAUDE.md). The user's own Claude login is still used: credentials are not a
//     settings source. (--bare is not used: it never reads the OAuth login.) No
//     --dangerously-skip-permissions anywhere.
//   - Every `codex` call runs `codex exec` in the read-only sandbox (-s read-only), from an empty
//     temp directory (no project AGENTS.md), with the user's MCP servers, plugins, apps, browser,
//     computer-use and code-mode tools switched off by config override for that run only.
//   - The prompt always goes to the CLI on stdin, never in argv. argv holds only fixed flags and a
//     model name that passed MODEL_NAME_RE, so nothing user-written reaches a shell on Windows
//     (where the CLI is started through cmd.exe to resolve npm's .cmd shims).
//   - Gemini CLI is not offered: Google AI Pro/Ultra plans no longer work in it (18 Jun 2026), so it
//     would only run on a Gemini API key, which the user can add to Polydev directly instead.

// Status reporter for sending CLI status to polydev.ai server (opt-in only)
let StatusReporter;
try {
  StatusReporter = require('./statusReporter').StatusReporter;
} catch (e) {
  StatusReporter = null;
}

// Display labels used when a CLI does not say which model answered.
const CLI_DEFAULT_MODELS = {
  'claude_code': 'claude-code-default',
  'codex_cli': 'codex-default'
};

// What pays for each local answer, shown to the user with every result.
const PAID_BY_LABELS = {
  'claude_code': 'Claude Code on this machine',
  'codex_cli': 'Codex on this machine'
};

const STATUS_TIMEOUT_MS = 20000;

// `--tools ""` must reach Claude Code as an empty argument. On Windows the CLI is started through
// a shell, where a bare empty string would vanish and `--tools` would swallow the next flag.
const EMPTY_ARG = process.platform === 'win32' ? '""' : '';

// The per-run Claude Code settings file. Passed by a relative name (resolved against the run's
// temp directory) so no path with spaces reaches argv through cmd.exe on Windows.
const CLAUDE_SETTINGS_FILE = 'polydev-claude-settings.json';
const CLAUDE_RUN_SETTINGS = { disableAllHooks: true };

// Model names are the only caller-supplied value that reaches argv. Anything else is rejected.
const MODEL_NAME_RE = /^[A-Za-z0-9._:\/-]{1,100}$/;

function validateModelName(model) {
  if (model === null || model === undefined || model === '') return null;
  const name = String(model);
  if (!MODEL_NAME_RE.test(name) || name.startsWith('-')) {
    const error = new Error('Model name contains characters that are not allowed');
    error.code = 'INVALID_MODEL_NAME';
    throw error;
  }
  return name;
}

// Codex config overrides for an isolated, answer-only run. Unknown `features.*` keys are ignored
// by Codex, so these stay safe on versions that lack a feature (unlike `--disable`, which errors).
const CODEX_ISOLATION_ARGS = [
  '-c', 'mcp_servers={}',
  '-c', 'features.plugins=false',
  '-c', 'features.apps=false',
  '-c', 'features.browser_use=false',
  '-c', 'features.computer_use=false',
  '-c', 'features.code_mode_host=false'
];

const CLAUDE_MODEL_ALIASES = {
  'claude-opus-4-6': 'opus',
  'claude-opus-4-5': 'opus',
  'claude-opus-4.5': 'opus',
  'claude-4.5-opus': 'opus',
  'claude-sonnet-4-6': 'sonnet',
  'claude-sonnet-4-5': 'sonnet',
  'claude-sonnet-4.5': 'sonnet',
  'claude-4.5-sonnet': 'sonnet',
  'claude-3-5-sonnet': 'sonnet',
  'claude-3-5-haiku': 'haiku',
  'claude-haiku-3-5': 'haiku'
};

function cliEnv(extra = {}) {
  const env = {
    ...process.env,
    HOME: process.env.HOME || os.homedir(),
    NO_COLOR: '1',
    TERM: 'dumb',
    NONINTERACTIVE: '1',
    // Never let a CLI open a browser from here (sign-in, updates).
    NO_BROWSER: '1',
    BROWSER: 'echo',
    DISPLAY: '',
    HEADLESS: '1',
    CODEX_DISABLE_UPDATE_CHECK: '1',
    CLAUDE_CODE_DISABLE_UPDATE_CHECK: '1',
    npm_config_update_notifier: 'false',
    NO_UPDATE_NOTIFIER: '1',
    ...extra
  };
  // An empty ANTHROPIC_API_KEY makes Claude Code fail with "Invalid API key" (GitHub #8327).
  // A real key is the user's own configuration and is left alone.
  if (env.ANTHROPIC_API_KEY === '') delete env.ANTHROPIC_API_KEY;
  return env;
}

/** Stop a child process if it is still running; resolves once it exited (SIGKILL after 2 s, gives up after 3 s). */
function stopChild(child) {
  if (!child || typeof child.on !== 'function') return Promise.resolve();
  const running = () => child.exitCode === null && child.signalCode === null;
  if (child.exitCode === undefined || !running()) return Promise.resolve(); // already gone, or a stub without process state
  return new Promise((resolve) => {
    const done = () => { clearTimeout(kill); clearTimeout(giveUp); resolve(); };
    child.once('exit', done);
    child.once('close', done);
    try { child.kill('SIGTERM'); } catch (_) {}
    const kill = setTimeout(() => { try { if (running()) child.kill('SIGKILL'); } catch (_) {} }, 2000);
    const giveUp = setTimeout(done, 3000);
  });
}

function isAuthError(text) {
  const t = (text || '').toLowerCase();
  return t.includes('not logged in') ||
    t.includes('please run /login') ||
    t.includes('please log in') ||
    t.includes('login required') ||
    t.includes('not authenticated') ||
    t.includes('authentication required') ||
    t.includes('invalid api key') ||
    t.includes('failed to authenticate');
}

function isRateLimit(text) {
  const t = (text || '').toLowerCase();
  return (t.includes('exhausted') && t.includes('quota')) ||
    t.includes('rate limit') ||
    t.includes('usage limit') ||
    t.includes('too many requests');
}

function isModelError(text) {
  const t = (text || '').toLowerCase();
  return t.includes('model is not supported') ||
    t.includes('model not found') ||
    t.includes('invalid model') ||
    t.includes('unknown model') ||
    t.includes('model does not exist') ||
    (t.includes('model') && (t.includes('not found') || t.includes('not supported') || t.includes("doesn't exist") || t.includes('does not exist')));
}

class CLIManager {
  constructor(options = {}) {
    this.providers = new Map();
    this.statusCache = new Map();
    // Injectable for tests.
    this.spawn = options.spawn || spawn;
    this.CACHE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

    // StatusReporter is opt-in only (enableStatusReporting: true).
    this.statusReporter = null;
    if (StatusReporter && options.enableStatusReporting === true) {
      this.statusReporter = new StatusReporter({
        userToken: options.userToken || process.env.POLYDEV_USER_TOKEN,
        reportingEnabled: true,
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
        paid_by: PAID_BY_LABELS.claude_code,
        subcommands: {
          version: ['--version'],
          auth_status: ['auth', 'status', '--json'],
          // Single turn, no built-in tools, no MCP servers, nothing saved as a session, and no
          // user/project settings (so no hooks or plugins). runClaudePrompt adds --settings.
          prompt: ['-p', '--output-format', 'json', '--tools', EMPTY_ARG, '--max-turns', '1',
            '--strict-mcp-config', '--no-session-persistence', '--setting-sources', EMPTY_ARG]
        },
        install_instructions: 'Install Claude Code: https://docs.claude.com/en/docs/claude-code',
        auth_instructions: 'Sign in by running `claude` once in a terminal'
      },
      {
        id: 'codex_cli',
        name: 'Codex CLI',
        command: process.env.CODEX_CLI_PATH || 'codex',
        paid_by: PAID_BY_LABELS.codex_cli,
        subcommands: {
          version: ['--version'],
          auth_status: ['login', 'status'],
          prompt: ['exec']
        },
        install_instructions: 'Install Codex CLI: npm install -g @openai/codex',
        auth_instructions: 'Sign in with: codex login'
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

    console.log(`[Polydev CLI] Detecting CLI providers - Node.js ${process.version}, Platform: ${process.platform}`);

    await Promise.all(providersToCheck.map(async (provider) => {
      try {
        results[provider.id] = await this.detectCliProvider(provider);
      } catch (error) {
        results[provider.id] = {
          available: false,
          authenticated: false,
          error: `Detection failed: ${error.message}`,
          last_checked: new Date()
        };
      }
      this.statusCache.set(provider.id, results[provider.id]);
    }));

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
      const cached = this.statusCache.get(provider.id);
      if (cached && this.isCacheValid(cached)) {
        results[provider.id] = cached;
      } else {
        const detection = await this.forceCliDetection(provider.id);
        results[provider.id] = detection[provider.id];
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

  /** All cached CLI statuses that are still fresh (synchronous). */
  getCachedStatus() {
    const result = {};
    for (const [providerId, status] of this.statusCache.entries()) {
      if (this.isCacheValid(status)) {
        result[providerId] = status;
      }
    }
    return result;
  }

  /** Pre-seed the status cache (e.g. from the disk cache). Unknown providers are ignored. */
  setCachedStatus(statusMap) {
    for (const [providerId, status] of Object.entries(statusMap || {})) {
      if (this.providers.has(providerId)) {
        this.statusCache.set(providerId, status);
      }
    }
  }

  async detectCliProvider(provider) {
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
      const versionResult = await this.executeCliCommand(provider.command, provider.subcommands.version, 'args', STATUS_TIMEOUT_MS);
      version = versionResult.stdout?.trim();
    } catch (versionError) {
      if (process.env.POLYDEV_CLI_DEBUG) {
        console.log(`[CLI Debug] Version check failed for ${provider.id}:`, versionError.message);
      }
    }

    // Ask the CLI itself. `authenticated` is true, false, or null when the CLI could not say
    // (older versions without a status command); null is tried, and an auth error at prompt
    // time then marks it signed out.
    let authenticated = null;
    let authMethod = null;
    try {
      const authResult = await this.executeCliCommand(provider.command, provider.subcommands.auth_status, 'args', STATUS_TIMEOUT_MS);
      const parsed = this.parseAuthenticationStatus(provider.id, authResult);
      authenticated = parsed.authenticated;
      authMethod = parsed.method;
    } catch (authError) {
      if (process.env.POLYDEV_CLI_DEBUG) {
        console.log(`[CLI Debug] Auth status failed for ${provider.id}:`, authError.message);
      }
    }

    return {
      available: true,
      authenticated: authenticated !== false,
      auth_confirmed: authenticated === true,
      auth_method: authMethod,
      quota_exhausted: false,
      version,
      path: cliPath,
      paid_by: provider.paid_by,
      last_checked: new Date(),
      error: authenticated === false ? `Not signed in. ${provider.auth_instructions}` : undefined
    };
  }

  async findCliPath(command) {
    try {
      return await which(command);
    } catch (error) {
      return null;
    }
  }

  /**
   * Read the output of a CLI's own status command.
   *   claude auth status --json -> {"loggedIn": true|false, "authMethod": ...}; exit 1 when signed out
   *   codex login status        -> "Logged in using ..." (exit 0) or "Not logged in" (exit 1)
   * @returns {{authenticated: boolean|null, method: string|null}}
   */
  parseAuthenticationStatus(providerId, result) {
    const stdout = (result && result.stdout) || '';
    const stderr = (result && result.stderr) || '';
    const combined = `${stdout}\n${stderr}`.toLowerCase();

    switch (providerId) {
      case 'claude_code': {
        try {
          const start = stdout.indexOf('{');
          const json = JSON.parse(stdout.slice(start >= 0 ? start : 0).trim());
          if (typeof json.loggedIn === 'boolean') {
            return { authenticated: json.loggedIn, method: typeof json.authMethod === 'string' ? json.authMethod : null };
          }
        } catch (_) { /* not JSON: older CLI */ }
        if (combined.includes('not logged in')) return { authenticated: false, method: null };
        return { authenticated: null, method: null };
      }
      case 'codex_cli': {
        if (combined.includes('not logged in')) return { authenticated: false, method: null };
        if (combined.includes('logged in')) {
          // e.g. "Logged in using ChatGPT" or "Logged in using an API key - sk-...": only the kind
          // is kept, never the key preview.
          const m = combined.match(/logged in using ([^\n]+)/);
          const how = m ? m[1] : '';
          const method = /chatgpt/.test(how) ? 'chatgpt' : (/api key/.test(how) ? 'api_key' : (how ? 'other' : null));
          return { authenticated: true, method };
        }
        if (result && typeof result.exit_code === 'number' && result.exit_code !== 0) return { authenticated: false, method: null };
        return { authenticated: null, method: null };
      }
      default:
        return { authenticated: null, method: null };
    }
  }

  markSignedOut(providerId, message) {
    const cached = this.statusCache.get(providerId);
    if (cached) {
      this.statusCache.set(providerId, { ...cached, authenticated: false, auth_confirmed: false, error: message, last_checked: new Date() });
    }
  }

  async sendCliPrompt(providerId, prompt, mode = 'args', timeoutMs = null, model = null) {
    if (!timeoutMs || timeoutMs === Infinity || timeoutMs < 1 || timeoutMs > 600000) {
      timeoutMs = 400000;
    }

    const startTime = Date.now();
    const fail = (error, extra = {}) => ({
      success: false,
      error,
      latency_ms: Date.now() - startTime,
      provider: providerId,
      paid_by: PAID_BY_LABELS[providerId] || null,
      timestamp: new Date(),
      ...extra
    });

    try {
      const provider = this.providers.get(providerId);
      if (!provider) {
        return fail(`Unknown provider: ${providerId}`);
      }

      const status = await this.getCliStatus(providerId);
      const providerStatus = status[providerId];

      if (!providerStatus?.available) {
        return fail(`${provider.name} is not available. ${provider.install_instructions}`);
      }
      if (!providerStatus.authenticated) {
        return fail(`${provider.name} is not signed in. ${provider.auth_instructions}`);
      }

      try {
        model = validateModelName(model);
      } catch (error) {
        return fail(`${error.message}: ${JSON.stringify(String(model)).slice(0, 120)}`, { error_code: 'INVALID_MODEL_NAME' });
      }

      if (providerId === 'codex_cli') {
        return await this.runCodexPrompt(provider, prompt, timeoutMs, model, startTime, fail);
      }
      return await this.runClaudePrompt(provider, prompt, timeoutMs, model, startTime, fail);
    } catch (error) {
      return fail(`CLI execution failed: ${error.message}`, { mode });
    }
  }

  // The prompt is not part of argv: it goes on stdin (see runClaudePrompt).
  buildClaudeArgs(model, { settingsFile = CLAUDE_SETTINGS_FILE } = {}) {
    const provider = this.providers.get('claude_code');
    const args = [...provider.subcommands.prompt];
    if (settingsFile) args.push('--settings', settingsFile);
    const safeModel = validateModelName(model);
    if (safeModel) {
      const cliModel = CLAUDE_MODEL_ALIASES[safeModel.toLowerCase()] || safeModel;
      args.push('--model', cliModel);
    }
    return args;
  }

  async runClaudePrompt(provider, prompt, timeoutMs, model, startTime, fail) {
    const attempt = async (useModel) => {
      // A fresh empty directory per run, holding only the run's settings file: no CLAUDE.md or
      // project settings load from here. `claude -p` with no prompt argument reads stdin.
      const baseTmp = process.env.POLYDEV_CLI_TMPDIR || os.tmpdir();
      let tmpDir = null;
      try {
        tmpDir = fs.mkdtempSync(path.join(baseTmp, 'polydev-claude-'));
        fs.writeFileSync(path.join(tmpDir, CLAUDE_SETTINGS_FILE), JSON.stringify(CLAUDE_RUN_SETTINGS), { mode: 0o600 });
      } catch (error) {
        console.warn('[CLI Debug] Failed to create the Claude Code temp dir:', error.message);
        if (tmpDir) { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {} }
        tmpDir = null;
      }
      // Without the settings file, --setting-sources "" alone still keeps user/project hooks out.
      const args = this.buildClaudeArgs(useModel, { settingsFile: tmpDir ? CLAUDE_SETTINGS_FILE : null });
      let child = null;
      try {
        return await this.executeCliCommand(provider.command, args, 'stdin', timeoutMs, prompt,
          { cwd: tmpDir || os.tmpdir(), onSpawn: (c) => { child = c; } });
      } finally {
        // After a timeout or an early return the CLI may still be running: stop it first, then
        // remove its working directory.
        await stopChild(child);
        if (tmpDir) { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {} }
      }
    };

    let result = await attempt(model);
    let json = this.parseClaudeCodeJsonResponse(result.stdout || '');
    let errorText = json && json.is_error ? json.error : (result.error || '');

    if (errorText && model && isModelError(errorText)) {
      console.log(`[Polydev CLI] Model '${model}' failed for Claude Code, retrying with its default model`);
      result = await attempt(null);
      json = this.parseClaudeCodeJsonResponse(result.stdout || '');
      errorText = json && json.is_error ? json.error : (result.error || '');
    }

    if (json && !json.is_error) {
      return {
        success: true,
        content: json.content,
        tokens_used: json.tokens_used,
        input_tokens: json.input_tokens,
        output_tokens: json.output_tokens,
        latency_ms: Date.now() - startTime,
        provider: 'claude_code',
        mode: 'args',
        model_used: json.model_used,
        cost_usd: json.cost_usd,
        model_usage: json.model_usage,
        paid_by: PAID_BY_LABELS.claude_code,
        timestamp: new Date()
      };
    }

    const combined = `${errorText} ${result.stdout || ''} ${result.stderr || ''}`;
    if (/unknown option ['"]?--(setting-sources|settings|strict-mcp-config|no-session-persistence|tools)\b/i.test(combined)) {
      // Never retried without these flags: that would load the user's hooks and settings.
      return fail('Claude Code on this machine is too old to run without your own hooks and settings. Update it (`claude update`) to use it here.',
        { error_code: 'CLI_TOO_OLD' });
    }
    if (isAuthError(combined)) {
      // Not marked signed out: `claude auth status` said it is signed in, and the likely cause is
      // a sign-in that comes from settings (apiKeyHelper, env such as ANTHROPIC_BASE_URL, Bedrock
      // or Vertex), which --setting-sources "" turns off here.
      return fail('Claude Code could not sign in for this request. Claude Code here gets its sign-in from settings '
        + '(apiKeyHelper, ANTHROPIC_BASE_URL, Bedrock or Vertex), which Polydev turns off when it runs Claude Code; '
        + 'add your Anthropic API key in Polydev instead (https://www.polydev.ai/dashboard/models). '
        + `If Claude Code is simply signed out: ${provider.auth_instructions}.`,
        { error_code: 'AUTH_FROM_SETTINGS' });
    }
    if (isRateLimit(combined)) {
      return fail('Claude Code reached a usage or rate limit.', { error_code: 'QUOTA_EXHAUSTED' });
    }
    if (!errorText && (result.stdout || '').trim()) {
      // Non-JSON output (very old CLI): use it as plain text.
      const content = this.cleanCliResponse(result.stdout);
      return {
        success: true,
        content,
        tokens_used: this.estimateTokens(prompt + content),
        input_tokens: Math.ceil(prompt.length / 4),
        output_tokens: Math.ceil(content.length / 4),
        latency_ms: Date.now() - startTime,
        provider: 'claude_code',
        mode: 'args',
        model_used: this.detectModelFromOutput('claude_code', result.stdout, result.stderr) || model || CLI_DEFAULT_MODELS.claude_code,
        paid_by: PAID_BY_LABELS.claude_code,
        timestamp: new Date()
      };
    }
    return fail(`Claude Code failed: ${errorText || 'no output'}`);
  }

  async runCodexPrompt(provider, prompt, timeoutMs, model, startTime, fail) {
    let modelToUse = model;
    const maxAttempts = model ? 2 : 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.executeCodexExec(provider.command, provider.subcommands.prompt, prompt, timeoutMs, modelToUse);
        const content = result.content;
        const combinedOutput = `${content || ''} ${result.rawStdout || ''} ${result.rawStderr || ''}`;
        if (isModelError(combinedOutput) && modelToUse && attempt < maxAttempts) {
          console.log(`[Polydev CLI] Model '${modelToUse}' failed for Codex CLI, retrying with its default model`);
          modelToUse = null;
          continue;
        }
        return {
          success: true,
          content,
          tokens_used: this.estimateTokens(prompt + content),
          input_tokens: Math.ceil(prompt.length / 4),
          output_tokens: Math.ceil(content.length / 4),
          latency_ms: Date.now() - startTime,
          provider: 'codex_cli',
          mode: 'args',
          model_used: result.detectedModel || modelToUse || CLI_DEFAULT_MODELS.codex_cli,
          paid_by: PAID_BY_LABELS.codex_cli,
          timestamp: new Date()
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (isModelError(errorMsg) && modelToUse && attempt < maxAttempts) {
          console.log(`[Polydev CLI] Model '${modelToUse}' error for Codex CLI, retrying with its default model`);
          modelToUse = null;
          continue;
        }
        if (isAuthError(errorMsg)) {
          this.markSignedOut('codex_cli', `Not signed in. ${provider.auth_instructions}`);
          return fail(`Codex is not signed in. ${provider.auth_instructions}`, { error_code: 'NOT_SIGNED_IN' });
        }
        if (isRateLimit(errorMsg)) {
          return fail('Codex reached a usage or rate limit.', { error_code: 'QUOTA_EXHAUSTED' });
        }
        return fail(`CLI execution failed: ${errorMsg}`);
      }
    }
    return fail('CLI execution failed');
  }

  async executeCliCommand(command, args, mode = 'args', timeoutMs = 400000, stdinInput, options = {}) {
    if (!timeoutMs || timeoutMs === Infinity || timeoutMs < 1 || timeoutMs > 600000) {
      timeoutMs = 400000;
    }

    return new Promise((resolve, reject) => {
      if (process.env.POLYDEV_CLI_DEBUG) {
        console.log(`[CLI Debug] Executing: ${command} ${args.slice(0, -1).join(' ')} ... (mode: ${mode})`);
      }

      const child = this.spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: process.platform === 'win32',
        windowsHide: true,
        timeout: timeoutMs,
        cwd: options.cwd,
        env: cliEnv()
      });
      if (typeof options.onSpawn === 'function') options.onSpawn(child);

      let stdout = '';
      let stderr = '';
      let resolved = false;
      let debounceTimer = null;
      let timeoutId;

      // JSON output is complete once it parses.
      const looksComplete = () => {
        const trimmed = stdout.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          try {
            JSON.parse(trimmed);
            return true;
          } catch {
            return false;
          }
        }
        return false;
      };

      const finish = (value) => {
        if (resolved) return;
        resolved = true;
        if (debounceTimer) clearTimeout(debounceTimer);
        if (timeoutId) clearTimeout(timeoutId);
        resolve(value);
      };

      const scheduleEarlyReturn = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (!resolved && looksComplete()) {
            try { child.kill('SIGTERM'); } catch (_) {}
            finish({ stdout, stderr });
          }
        }, 2000);
      };

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
        scheduleEarlyReturn();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      if (child.stdin) {
        child.stdin.on?.('error', () => {}); // the CLI may exit before reading everything
        if (mode === 'stdin' && stdinInput) child.stdin.write(`${stdinInput}\n`);
        child.stdin.end();
      }

      child.on('close', (code) => {
        if (resolved) return;
        if (code === 0) {
          finish({ stdout, stderr, exit_code: 0 });
        } else {
          const errorMessage = stderr.trim() || stdout.trim() || `Command exited with code ${code}`;
          finish({ stdout, stderr, error: errorMessage, exit_code: code });
        }
      });

      child.on('error', (error) => {
        if (resolved) return;
        resolved = true;
        if (debounceTimer) clearTimeout(debounceTimer);
        if (timeoutId) clearTimeout(timeoutId);
        reject(error);
      });

      timeoutId = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        if (debounceTimer) clearTimeout(debounceTimer);
        try { child.kill('SIGTERM'); } catch (_) {}
        // child.killed turns true as soon as SIGTERM is sent, so check whether the process has exited instead.
        setTimeout(() => { try { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); } catch (_) {} }, 2000);
        reject(new Error(`Command timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  // Detect the model from CLI output before parsing/cleaning
  detectModelFromOutput(providerId, stdout, stderr) {
    const combinedOutput = (stdout || '') + '\n' + (stderr || '');
    let match = null;
    if (providerId === 'claude_code') {
      match = combinedOutput.match(/(?:model|using model)[:\s]+([a-zA-Z0-9_.-]+)/i);
    } else if (providerId === 'codex_cli') {
      // Codex prints a header such as "model: gpt-x"
      match = combinedOutput.match(/^\s*model:\s*([a-zA-Z0-9_.-]+)/mi);
    }
    if (match && match[1]) {
      const model = match[1].trim();
      if (model && model !== 'undefined' && model !== 'null' && model.length > 2) return model;
    }
    return null;
  }

  // Parse Claude Code's --output-format json result
  parseClaudeCodeJsonResponse(stdout) {
    if (!stdout || !stdout.trim()) return null;

    try {
      const json = JSON.parse(stdout.trim());
      if (json.type !== 'result') return null;
      if (json.is_error) {
        return { is_error: true, error: typeof json.result === 'string' && json.result ? json.result : (json.terminal_reason || 'Claude Code reported an error') };
      }
      if (typeof json.result !== 'string') return null;

      let primaryModel = CLI_DEFAULT_MODELS.claude_code;
      const modelUsage = json.modelUsage || {};
      const modelNames = Object.keys(modelUsage);
      if (modelNames.length === 1) {
        primaryModel = modelUsage[modelNames[0]]?.canonicalModel || modelNames[0];
      } else if (modelNames.length > 1) {
        let highestCost = -1;
        for (const [modelName, usage] of Object.entries(modelUsage)) {
          const cost = usage.costUSD || 0;
          if (cost > highestCost) {
            highestCost = cost;
            primaryModel = usage.canonicalModel || modelName;
          }
        }
      }

      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let cacheTokens = 0;
      for (const usage of Object.values(modelUsage)) {
        totalInputTokens += (usage.inputTokens || 0);
        totalOutputTokens += (usage.outputTokens || 0);
        cacheTokens += (usage.cacheReadInputTokens || 0) + (usage.cacheCreationInputTokens || 0);
      }
      const totalTokens = totalInputTokens + totalOutputTokens;

      return {
        content: json.result,
        model_used: primaryModel,
        tokens_used: totalTokens || ((json.usage?.input_tokens || 0) + (json.usage?.output_tokens || 0)),
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
        cache_tokens: cacheTokens,
        cost_usd: json.total_cost_usd || 0,
        model_usage: modelUsage,
        session_id: json.session_id,
        duration_ms: json.duration_ms
      };
    } catch (e) {
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

    const args = [...commandArgs];
    const safeModel = validateModelName(model);
    if (safeModel) {
      args.push('-m', safeModel);
    }

    // Read-only sandbox: Codex cannot write files or run commands that change anything.
    // The prompt goes on stdin (`-` as the prompt argument), never in argv.
    const directPrompt = `Answer this question directly from your knowledge. Do not execute any commands, read any files, or use any tools. Provide a concise, expert response.\n\n${prompt}`;
    args.push(
      '-s', 'read-only',
      '--skip-git-repo-check',
      '-c', 'model_reasoning_effort=medium',
      ...CODEX_ISOLATION_ARGS,
      '-'
    );

    return new Promise((resolve, reject) => {
      // A fresh empty directory per run: Codex starts there, so no project AGENTS.md or files load.
      const baseTmp = process.env.POLYDEV_CLI_TMPDIR || os.tmpdir();
      let tmpDir;
      try {
        tmpDir = fs.mkdtempSync(path.join(baseTmp, 'polydev-codex-'));
      } catch (error) {
        tmpDir = os.tmpdir();
        console.warn('[CLI Debug] Failed to create Codex temp dir:', error.message);
      }
      const cleanup = () => {
        if (tmpDir && tmpDir !== os.tmpdir()) {
          try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
        }
      };

      const child = this.spawn(executable, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: process.platform === 'win32',
        windowsHide: true,
        cwd: tmpDir,
        env: cliEnv({
          TMPDIR: tmpDir,
          TEMP: tmpDir,
          TMP: tmpDir,
          // Prevent shell init scripts from hanging (GitHub issue #7353)
          BASH_ENV: '/dev/null'
        })
      });

      console.log(`[CLI Debug] Spawning Codex process: ${executable} exec -s read-only${safeModel ? ` -m ${safeModel}` : ''}`);

      child.on('close', cleanup);
      child.on('error', cleanup);

      if (child.stdin) {
        child.stdin.on?.('error', () => {});
        child.stdin.write(directPrompt);
        child.stdin.end();
      }

      let stdout = '';
      let stderr = '';
      let resolved = false;
      let debounceTimer = null;

      const stop = (handler) => {
        if (!resolved) {
          resolved = true;
          if (debounceTimer) clearTimeout(debounceTimer);
          try { child.kill('SIGTERM'); } catch (_) {}
          setTimeout(() => { try { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); } catch (_) {} }, 2000).unref();
          handler();
        }
      };

      const timeoutHandle = setTimeout(() => {
        stop(() => reject(new Error(`Codex exec timeout after ${timeoutMs}ms`)));
      }, timeoutMs);

      const parseCodexOutput = (output) => {
        if (!output || !output.trim()) return null;

        // The answer sits between a line "codex" and "tokens used".
        const codexMarkerMatch = output.match(/(?:^|\n)codex\s*\n([\s\S]*?)(?:\n\s*tokens used|\n\s*$)/i);
        if (codexMarkerMatch && codexMarkerMatch[1]) {
          const extracted = codexMarkerMatch[1].trim();
          if (extracted.length > 0 && !extracted.startsWith('ERROR')) {
            return extracted;
          }
        }

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

        const noisePatterns = [
          /^\s*$/,
          /^\d{4}-\d{2}-\d{2}T[\d:]+.*?(ERROR|WARN|INFO)/i,
          /^OpenAI Codex v[\d.]+/i,
          /^-{4,}$/,
          /^workdir:/i,
          /^model:/i,
          /^provider:/i,
          /^approval:/i,
          /^sandbox:/i,
          /^reasoning effort:/i,
          /^reasoning summaries:/i,
          /^session id:/i,
          /^user$/i,
          /^thinking$/i,
          /^codex$/i,
          /^tokens used$/i,
          /^[\d,]+$/,
          /^ERROR:\s*MCP/i,
          /MCP client for .* failed/i,
          /handshake.*failed/i,
          /connection closed/i,
          /\[MCP\]/i,
          /^MCP\s/i,
          /rmcp::transport/i,
          /serde error/i,
          /^\*\*.*\*\*$/,
        ];

        const contentLines = [];
        for (const line of output.split('\n')) {
          const trimmedLine = line.trim();
          if (noisePatterns.some(pattern => pattern.test(trimmedLine))) continue;
          if (trimmedLine.includes('?') && trimmedLine.length > 20) continue; // echoed prompt
          contentLines.push(trimmedLine);
        }
        const result = contentLines.join('\n').trim();
        return result.length > 0 ? result : null;
      };

      const flushIfComplete = () => {
        const parsed = parseCodexOutput(stdout);
        if (parsed && parsed.length >= 20) {
          const detectedModel = this.detectModelFromOutput('codex_cli', stdout, stderr);
          clearTimeout(timeoutHandle);
          stop(() => resolve({ content: parsed, detectedModel, rawStdout: stdout.trim(), rawStderr: stderr.trim() }));
        }
      };

      const scheduleEarlyReturn = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (!resolved) flushIfComplete();
        }, 3000);
      };

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
        scheduleEarlyReturn();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutHandle);
        if (debounceTimer) clearTimeout(debounceTimer);

        const trimmedStdout = stdout.trim();
        const trimmedStderr = stderr.trim();
        const detectedModel = this.detectModelFromOutput('codex_cli', trimmedStdout, trimmedStderr);

        // MCP handshake failures cause a non-zero exit but do not prevent a valid answer.
        const parsedStdout = parseCodexOutput(trimmedStdout);
        if (parsedStdout) {
          resolve({ content: parsedStdout, detectedModel, rawStdout: trimmedStdout, rawStderr: trimmedStderr });
          return;
        }
        const parsedCombined = parseCodexOutput(trimmedStdout + '\n' + trimmedStderr);
        if (parsedCombined && code === 0) {
          resolve({ content: parsedCombined, detectedModel, rawStdout: trimmedStdout, rawStderr: trimmedStderr });
          return;
        }

        if (code === 0) {
          if (trimmedStdout) {
            resolve({ content: trimmedStdout, detectedModel, rawStdout: trimmedStdout, rawStderr: trimmedStderr });
          } else {
            reject(new Error('Codex completed but produced no output'));
          }
        } else {
          const errorLines = (trimmedStderr || trimmedStdout).split('\n')
            .filter(line => {
              const l = line.trim().toLowerCase();
              return l.length > 0 && !l.includes('mcp') && !l.includes('handshake') && !l.includes('rmcp::') && !l.includes('serde error');
            })
            .slice(0, 3);
          reject(new Error(errorLines.join('; ') || `Codex exited with code ${code}`));
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

  getProviders() {
    return this.getAvailableProviders();
  }

  getProvider(providerId) {
    return this.providers.get(providerId);
  }

  getPaidByLabel(providerId) {
    return PAID_BY_LABELS[providerId] || null;
  }

  // ============================================
  // Status Reporting Methods (opt-in)
  // ============================================

  enableStatusReporting(userToken, options = {}) {
    if (!StatusReporter) {
      console.warn('[Polydev CLI] StatusReporter not available');
      return false;
    }
    if (!this.statusReporter) {
      this.statusReporter = new StatusReporter({ userToken, reportingEnabled: true, ...options });
    } else {
      this.statusReporter.configure({ userToken, reportingEnabled: true, ...options });
    }
    console.log('[Polydev CLI] Status reporting enabled');
    return true;
  }

  disableStatusReporting() {
    if (this.statusReporter) {
      this.statusReporter.configure({ reportingEnabled: false });
      this.statusReporter.stopHeartbeat();
      console.log('[Polydev CLI] Status reporting disabled');
    }
  }

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

  stopStatusHeartbeat() {
    if (this.statusReporter) {
      this.statusReporter.stopHeartbeat();
      console.log('[Polydev CLI] Status heartbeat stopped');
    }
  }

  getStatusReportingInfo() {
    if (!this.statusReporter) {
      return { available: false, reason: 'StatusReporter not initialized' };
    }
    return {
      available: true,
      config: this.statusReporter.getConfig(),
      history: this.statusReporter.getHistory()
    };
  }

  async reportStatusNow() {
    if (!this.statusReporter || !this.statusReporter.isConfigured()) {
      return { success: false, reason: 'Status reporting not configured' };
    }
    const statuses = await this.forceCliDetection();
    return { success: true, statuses, reported: true };
  }
}

module.exports = { CLIManager, default: CLIManager, PAID_BY_LABELS };
