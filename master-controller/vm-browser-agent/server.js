/**
 * VM Browser Agent - OAuth Proxy for CLI Tools
 *
 * This agent runs inside each Firecracker VM and handles the OAuth flow for CLI tools:
 * 1. Spawns CLI tool (codex signin, claude, gemini-cli auth)
 * 2. CLI starts OAuth callback server on localhost:1455
 * 3. Extracts OAuth URL from CLI output
 * 4. Serves OAuth URL to frontend via /oauth-url endpoint
 * 5. Proxies OAuth callbacks from http://{vmIP}:8080/auth/callback to localhost:1455
 * 6. Monitors credential files until auth completes
 */

const http = require('http');
const { spawn, execSync } = require('child_process');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const PORT = 8080;
const CLI_OAUTH_PORT = 1455; // Standard port for codex/claude OAuth callbacks
const BROWSER_DISPLAY = process.env.BROWSER_DISPLAY || ':1';

const pendingBrowserLaunches = new Map(); // sessionId -> oauthUrl waiting for session registration

// Active auth sessions
const authSessions = new Map(); // sessionId -> { provider, cliProcess, oauthUrl, credPath, completed }

// Logger
const logger = {
  info: (msg, meta = {}) => console.log(JSON.stringify({ level: 'info', msg, ...meta, timestamp: new Date().toISOString() })),
  error: (msg, meta = {}) => console.error(JSON.stringify({ level: 'error', msg, ...meta, timestamp: new Date().toISOString() })),
  warn: (msg, meta = {}) => console.warn(JSON.stringify({ level: 'warn', msg, ...meta, timestamp: new Date().toISOString() }))
};

function activateBrowserWindow() {
  const env = { ...process.env, DISPLAY: BROWSER_DISPLAY };
  const commands = [
    'xdotool search --onlyvisible --classname Firefox windowactivate --sync',
    'xdotool search --onlyvisible --class Firefox windowactivate --sync',
    'xdotool search --onlyvisible --classname firefox windowactivate --sync',
    'xdotool search --onlyvisible --class firefox windowactivate --sync',
    'xdotool search --onlyvisible --classname Chromium windowactivate --sync',
    'xdotool search --onlyvisible --class Chromium windowactivate --sync',
    'xdotool search --onlyvisible --class chromium windowactivate --sync'
  ];

  for (const cmd of commands) {
    try {
      execSync(cmd, { stdio: 'ignore', env });
      return true;
    } catch (error) {
      // Try next command
    }
  }

  return false;
}

function navigateBrowserTo(url, sessionId) {
  if (!activateBrowserWindow()) {
    return false;
  }

  try {
    const env = { ...process.env, DISPLAY: BROWSER_DISPLAY };
    execSync('xdotool key --clearmodifiers ctrl+l', { stdio: 'ignore', env });
    execSync(`xdotool type --delay 10 "${url.replace(/"/g, '\\"')}"`, { stdio: 'ignore', env });
    execSync('xdotool key Return', { stdio: 'ignore', env });

    logger.info('Navigated browser to URL via xdotool', {
      sessionId,
      url: url.substring(0, 100)
    });

    return true;
  } catch (error) {
    logger.warn('Failed to navigate browser via xdotool', {
      sessionId,
      error: error.message
    });
    return false;
  }
}

function normalizeOAuthUrl(url) {
  if (!url) return url;

  // Don't replace localhost - browser runs INSIDE the VM, so localhost is correct
  // The browser and OAuth agent are on the same machine (the VM)
  return url
    .trim()
    .replace(/[)\]]+$/, '');
}

function resolveBrowserExecutable() {
  const candidates = [
    process.env.BROWSER_EXECUTABLE,
    '/usr/bin/firefox',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium'
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (fsSync.existsSync(candidate)) {
        return candidate;
      }
    } catch (error) {
      logger.warn('Failed to stat browser candidate', { candidate, error: error.message });
    }
  }
  return null;
}

function launchBrowserForSession(sessionId, oauthUrl) {
  if (!oauthUrl) return;

  const session = authSessions.get(sessionId);
  if (!session) {
    pendingBrowserLaunches.set(sessionId, oauthUrl);
    return;
  }

  // Reuse existing browser window if possible
  if (navigateBrowserTo(oauthUrl, sessionId)) {
    session.browserLaunched = true;
    session.browserLaunchInProgress = false;
    return;
  }

  if (session.browserLaunchInProgress || session.browserLaunched) {
    return;
  }

  session.browserLaunchInProgress = true;

  try {
    const browserExecutable = resolveBrowserExecutable();
    if (!browserExecutable) {
      throw new Error('No supported browser executable found (expected chromium-browser or firefox)');
    }

    const proxyConfig = session?.proxyConfig || {};

    const executableName = path.basename(browserExecutable).toLowerCase();
    const isFirefox = executableName.includes('firefox');
    const chromiumProfile = '/root/.config/chromium';
    const firefoxProfile = '/root/.mozilla/firefox/oauth-profile';

    const args = isFirefox
      ? [
          '--no-remote',
          '--profile', firefoxProfile,
          '--private-window',
          '--width', '1280',
          '--height', '720',
          oauthUrl
        ]
      : [
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-session-crashed-bubble',
          '--disable-features=Translate,AutomationControlled',
          '--password-store=basic',
          `--user-data-dir=${chromiumProfile}`,
          '--allow-running-insecure-content',
          '--disable-web-security',
          '--enable-features=OverlayScrollbar',
          '--no-sandbox',  // Required when running as root
          oauthUrl
        ];

    if (isFirefox) {
      try {
        fsSync.mkdirSync(firefoxProfile, { recursive: true });
      } catch (error) {
        logger.warn('Failed to ensure Firefox profile directory', { sessionId, error: error.message });
      }
    } else {
      try {
        fsSync.mkdirSync(chromiumProfile, { recursive: true });
      } catch (error) {
        logger.warn('Failed to ensure Chromium user data dir', { sessionId, error: error.message });
      }
    }

    if (isFirefox) {
      try {
        execSync('pkill -f firefox', { stdio: 'ignore' });
      } catch {}
    } else {
      try {
        execSync('pkill -f chromium-browser', { stdio: 'ignore' });
      } catch {}
    }

    const proxyUrl = proxyConfig.httpsProxy || proxyConfig.httpProxy || process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.ALL_PROXY;
    if (proxyUrl && !isFirefox) {
      try {
        const parsed = new URL(proxyUrl);
        const proxyArg = `${parsed.protocol}//${parsed.username ? `${parsed.username}:${parsed.password}@` : ''}${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`;
        args.splice(args.length - 1, 0, `--proxy-server=${proxyArg}`);
        const bypassDefaults = ['<-loopback>', 'localhost', '127.0.0.1', '192.168.100.0/24'];
        const existingBypass = proxyConfig.noProxy || process.env.NO_PROXY || process.env.no_proxy;
        const bypassList = existingBypass
          ? `${existingBypass},${bypassDefaults.join(',')}`
          : bypassDefaults.join(',');
        args.splice(args.length - 1, 0, `--proxy-bypass-list=${bypassList}`);
        logger.info('Launching Chromium with proxy', {
          sessionId,
          provider: session.provider,
          proxyServer: proxyArg,
          bypassList
        });
      } catch (error) {
        logger.warn('Invalid proxy URL, skipping Chromium proxy configuration', {
          sessionId,
          provider: session.provider,
          proxyUrl,
          error: error.message
        });
      }
    }

    const env = {
      ...process.env,
      DISPLAY: BROWSER_DISPLAY,
      XAUTHORITY: process.env.XAUTHORITY || '/root/.Xauthority',
      PULSE_SERVER: process.env.PULSE_SERVER || 'unix:/run/pulse/native'
    };

    if (proxyConfig?.httpProxy && !isFirefox) {
      env.HTTP_PROXY = proxyConfig.httpProxy;
      env.ALL_PROXY = proxyConfig.httpProxy;
    }
    if (!isFirefox) {
      if (proxyConfig?.httpsProxy) {
        env.HTTPS_PROXY = proxyConfig.httpsProxy;
      } else if (proxyConfig?.httpProxy) {
        env.HTTPS_PROXY = proxyConfig.httpProxy;
      }
      if (proxyConfig?.noProxy) {
        env.NO_PROXY = proxyConfig.noProxy;
      }
    }

    // Log browser launch attempt with full details for debugging
    logger.info('Attempting browser launch', {
      sessionId,
      executable: browserExecutable,
      display: env.DISPLAY,
      xauthority: env.XAUTHORITY,
      hasXsocket: fsSync.existsSync(`/tmp/.X11-unix/X${BROWSER_DISPLAY.replace(':', '')}`),
      argsCount: args.length,
      provider: session.provider
    });

    const browserProcess = spawn(browserExecutable, args, {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],  // Capture stdout and stderr for debugging
      detached: true
    });

    // Capture stderr output from browser
    browserProcess.stderr.on('data', (data) => {
      logger.warn('Browser stderr', { sessionId, output: data.toString().substring(0, 500) });
    });

    // Capture stdout output from browser
    browserProcess.stdout.on('data', (data) => {
      logger.info('Browser stdout', { sessionId, output: data.toString().substring(0, 500) });
    });

    // Handle spawn errors
    browserProcess.on('error', (err) => {
      logger.error('Browser spawn error', { sessionId, error: err.message, code: err.code });
      session.browserLaunchInProgress = false;
    });

    browserProcess.on('exit', (code, signal) => {
      logger.info('Browser exited', { sessionId, code, signal, executable: browserExecutable });
      const s = authSessions.get(sessionId);
      if (s) {
        s.browserLaunched = false;
        s.browserLaunchInProgress = false;
        s.browserProcess = null;
      }
    });

    browserProcess.unref();

    session.browserLaunched = true;
    session.browserProcess = browserProcess;
    logger.info('Launched browser for OAuth', {
      sessionId,
      provider: session.provider,
      executable: browserExecutable,
      oauthUrl: oauthUrl.substring(0, 120)
    });
  } catch (error) {
    session.browserLaunchInProgress = false;
    logger.error('Failed to launch browser', {
      sessionId,
      error: error.message,
      stack: error.stack
    });
  }
}

// Surface otherwise silent failures from the runtime so the health check does not hang forever
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error?.message, stack: error?.stack });
});

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  logger.error('Unhandled rejection', { error: message, stack });
});

// HTTP server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    // Health check
    if (url.pathname === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        activeSessions: authSessions.size
      }));
      return;
    }

    // Start CLI OAuth flow
    if (url.pathname.startsWith('/auth/') && req.method === 'POST') {
      const provider = url.pathname.split('/')[2];
      await handleStartCLIAuth(req, res, provider);
      return;
    }

    // Get OAuth URL for frontend iframe
    if (url.pathname === '/oauth-url' && req.method === 'GET') {
      const sessionId = url.searchParams.get('sessionId');
      await handleGetOAuthURL(res, sessionId);
      return;
    }

    // Proxy OAuth callback to CLI's localhost server
    if (url.pathname === '/auth/callback' && req.method === 'GET') {
      await handleOAuthCallback(req, res);
      return;
    }

    // Check if authentication completed
    if (url.pathname === '/credentials/status' && req.method === 'GET') {
      const sessionId = url.searchParams.get('sessionId');
      await handleCredentialStatus(res, sessionId);
      return;
    }

    // Get extracted credentials
    if (url.pathname === '/credentials/get' && req.method === 'GET') {
      const sessionId = url.searchParams.get('sessionId');
      await handleGetCredentials(res, sessionId);
      return;
    }

    // Open URL in browser (trigger navigation to OAuth URL)
    if (url.pathname === '/open-url' && req.method === 'POST') {
      await handleOpenURL(req, res);
      return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));

  } catch (error) {
    logger.error('Request handler error', { error: error.message, stack: error.stack });
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error', message: error.message }));
  }
});

/**
 * Start CLI OAuth flow
 * Spawns the CLI tool (codex signin, claude, gemini-cli auth)
 * Captures OAuth URL from CLI output
 */
async function handleStartCLIAuth(req, res, provider) {
  const body = await readBody(req);
  let payload;
  try {
    payload = JSON.parse(body);
  } catch (error) {
    logger.error('Failed to parse auth payload', { provider, error: error.message, rawBody: body?.slice?.(0, 500) });
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
    return;
  }

  const sessionId = payload?.sessionId;
  const debugOptions = payload?.debug || payload?.debugOptions || {};
  const runStrace = debugOptions?.strace === true || debugOptions?.runStrace === true;
  const runExtraDiagnostics = debugOptions?.skipConnectivityChecks !== true;

  if (!sessionId) {
    logger.warn('Missing sessionId in auth payload', { provider, payloadKeys: Object.keys(payload || {}) });
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'sessionId is required' }));
    return;
  }

  logger.info('Starting CLI auth', { provider, sessionId, runStrace, runExtraDiagnostics });

  // Determine CLI command and credential path
  let cliCommand, cliArgs, credPath;

  switch (provider) {
    case 'codex':
    case 'codex_cli':
      cliCommand = 'codex';
      cliArgs = ['signin'];
      credPath = path.join(process.env.HOME || '/root', '.config/openai/auth.json');
      break;

    case 'claude_code':
      cliCommand = 'claude';
      cliArgs = [];
      credPath = path.join(process.env.HOME || '/root', '.claude/.credentials.json');
      break;

    case 'gemini_cli':
      cliCommand = 'gemini-cli';
      cliArgs = ['auth'];
      credPath = path.join(process.env.HOME || '/root', '.config/gemini-cli/credentials.json');
      break;

    default:
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unknown provider' }));
      return;
  }

  // Create browser capture script for BROWSER env var
  const captureScriptPath = `/tmp/capture-browser-${sessionId}.sh`;
  const captureOutputPath = `/tmp/oauth-url-${sessionId}.txt`;

  const captureScript = `#!/bin/bash
# Capture OAuth URL from browser launch attempt
echo "$1" > "${captureOutputPath}"
echo "BROWSER CAPTURE: $1" >&2
exit 0
`;

  await fs.writeFile(captureScriptPath, captureScript);
  await fs.chmod(captureScriptPath, 0o755);

  logger.info('Created browser capture script', { provider, sessionId, captureScriptPath });

  if (provider === 'claude_code') {
    try {
      const resolvPath = '/etc/resolv.conf';
      try {
        const stat = await fs.lstat(resolvPath);
        if (stat.isSymbolicLink()) {
          await fs.unlink(resolvPath);
        }
      } catch (err) {
        // ignore if file is missing or already regular file
      }

      const resolvContent = 'nameserver 1.1.1.1\nnameserver 8.8.8.8\n';
      await fs.writeFile(resolvPath, resolvContent, 'utf-8');
      logger.info('Overrode /etc/resolv.conf with static DNS entries', { provider, sessionId, resolvContent });
    } catch (error) {
      logger.warn('Failed to override resolv.conf', { provider, sessionId, error: error.message });
    }

    try {
      await fs.writeFile('/tmp/set-default-route.sh', '#!/bin/bash\nip route replace default via 192.168.100.1 dev eth0\n', 'utf-8');
      await fs.chmod('/tmp/set-default-route.sh', 0o755);
      execSync('/tmp/set-default-route.sh');
      logger.info('Ensured default route for Browser VM', { provider, sessionId });
    } catch (error) {
      logger.warn('Failed to set default route', { provider, sessionId, error: error.message });
    }

    const diagSummaries = [];
    if (debugOptions?.skipConnectivityChecks === true) {
      logger.info('Skipping connectivity diagnostics', { provider, sessionId });
    } else {
      const captureTail = data => {
        if (!data) return '';
        try {
          return data.toString().slice(-500);
        } catch {
          return '';
        }
      };

      const runDiagnostic = (label, command) => {
        try {
          const result = execSync(command, { stdio: ['ignore', 'pipe', 'pipe'] });
          const summary = { label, success: true, command, stdoutTail: captureTail(result) };
          diagSummaries.push(summary);
          logger.info(`${label} succeeded`, {
            provider,
            sessionId,
            command,
            stdout: summary.stdoutTail
          });
        } catch (error) {
          const summary = {
            label,
            success: false,
            command,
            error: error.message,
            stdoutTail: captureTail(error.stdout),
            stderrTail: captureTail(error.stderr)
          };
          diagSummaries.push(summary);
          logger.error(`${label} failed`, {
            provider,
            sessionId,
            command,
            error: error.message,
            stdout: summary.stdoutTail,
            stderr: summary.stderrTail
          });
        }
      };

      runDiagnostic('Anthropic API connectivity test', 'curl -sv https://api.anthropic.com -o /tmp/anthropic-curl.log --max-time 20');

      if (runExtraDiagnostics) {
        runDiagnostic('Claude Web connectivity test', 'curl -sv https://claude.ai -o /tmp/claude-ai-curl.log --max-time 20');
        runDiagnostic('TCP dial claude.ai:443', 'nc -zvw5 claude.ai 443');
        runDiagnostic('TCP dial api.anthropic.com:443', 'nc -zvw5 api.anthropic.com 443');
      }

      logger.info('Connectivity diagnostics completed', {
        provider,
        sessionId,
        runExtraDiagnostics,
        diagnostics: diagSummaries
      });
    }

    payload.__diagnostics = diagSummaries;
  }

  // Spawn CLI process with BROWSER env var to intercept browser launch
  let scriptLogPath = null;
  let straceLogPath = null;

  let commandParts = [cliCommand, ...cliArgs];

  // Codex CLI requires expect wrapper to respond to VT100 cursor position queries
  // It sends ESC[6n (VT100 cursor position query) and times out if no response is received
  if (provider === 'codex' || provider === 'codex_cli') {
    // Create expect script to intercept cursor query and respond
    const expectScriptPath = `/tmp/codex-expect-${sessionId}.exp`;
    const expectScript = `#!/usr/bin/expect -f
# Spawn Codex CLI with environment variables
set env(TERM) "dumb"
set env(CI) "true"
set env(NO_COLOR) "1"
set env(BROWSER) "${captureScriptPath}"
set env(HOME) "$env(HOME)"

# Increase timeout for the entire script
set timeout 30

# Spawn the Codex CLI
spawn ${cliCommand} ${cliArgs.join(' ')}

# Main expect loop
expect {
    # Respond to cursor position query (ESC[6n) with fake position (ESC[1;1R)
    "\\033\\[6n" {
        send "\\033\\[1;1R"
        exp_continue
    }
    # Ignore other terminal control sequences
    # Match ESC followed by any control sequence
    -re "\\033\\[\\[?0-9;\\]*[a-zA-Z]" {
        exp_continue
    }
    # Wait for process to exit
    eof
}
`;

    try {
      await fs.writeFile(expectScriptPath, expectScript);
      await fs.chmod(expectScriptPath, 0o755);
      logger.info('Created expect wrapper for Codex CLI', { provider, sessionId, expectScriptPath });

      // Use expect script as the command
      commandParts = ['expect', expectScriptPath];
    } catch (error) {
      logger.error('Failed to create expect script, falling back to script wrapper', {
        provider,
        sessionId,
        error: error.message
      });
      // Fallback to script wrapper
      scriptLogPath = `/tmp/${provider}-login-${sessionId}.log`;
      const joinedArgs = [cliCommand, ...cliArgs].join(' ');
      commandParts = ['script', '-q', '--return', '-c', joinedArgs, scriptLogPath];
    }
  }
  // Use a pseudo-terminal for Claude CLI so it behaves like an interactive session
  else if (provider === 'claude_code') {
    scriptLogPath = `/tmp/${provider}-login-${sessionId}.log`;
    const joinedArgs = [cliCommand, ...cliArgs].join(' ');
    commandParts = ['script', '-q', '--return', '-c', joinedArgs, scriptLogPath];
  }

  let command = commandParts[0];
  let args = commandParts.slice(1);

  if (runStrace) {
    straceLogPath = `/tmp/claude-strace-${sessionId}.log`;
    command = 'strace';
    args = ['-ttt', '-f', '-o', straceLogPath, ...commandParts];
    logger.info('Running CLI under strace', { provider, sessionId, straceLogPath });
  }

  const cliProcess = spawn(command, args, {
    env: {
      ...process.env,
      HOME: process.env.HOME || '/root',
      BROWSER: captureScriptPath,  // Intercept browser launch URLs
      TERM: 'dumb',  // Disable terminal features like cursor position queries
      NO_COLOR: '1'  // Disable ANSI color codes
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  cliProcess.on('error', (error) => {
    logger.error('CLI process failed to spawn', { provider, sessionId, error: error?.message, stack: error?.stack });
  });

  cliProcess.on('exit', (code, signal) => {
    logger.info('CLI process exited', { provider, sessionId, code, signal });
  });

  // Capture OAuth URL from BROWSER script output file
  let oauthUrl = null;
  const outputLines = [];

  // Also monitor stdout/stderr for debugging
  const logOutput = (data) => {
    const text = data.toString();
    outputLines.push(text);
    logger.info('CLI output', { provider, text: text.substring(0, 200) });

    const session = authSessions.get(sessionId);

    if (session?.automation) {
      // Claude Code automation
      if (!session.automation.themeAccepted && text.includes('Choose the text style')) {
        session.automation.themeAccepted = true;
        setTimeout(() => {
          try {
            cliProcess.stdin?.write('\r');
            logger.info('Auto-confirmed theme selection', { provider, sessionId });
          } catch (error) {
            logger.warn('Failed to auto-confirm theme selection', { provider, sessionId, error: error.message });
          }
        }, 200);
      }

      if (!session.automation.loginCommandSent && /Paste code here if prompted/i.test(text)) {
        session.automation.loginCommandSent = true;
        setTimeout(() => {
          try {
            cliProcess.stdin?.write('/login\n');
            logger.info('Issued /login command to Claude CLI', { provider, sessionId });
          } catch (error) {
            logger.warn('Failed to send /login command automatically', { provider, sessionId, error: error.message });
          }
        }, 200);
      }

      if (!session.automation.loginMethodSelected && /Select login method/i.test(text)) {
        session.automation.loginMethodSelected = true;
        setTimeout(() => {
          try {
            cliProcess.stdin?.write('\r');
            logger.info('Accepted default login method in Claude CLI', { provider, sessionId });
          } catch (error) {
            logger.warn('Failed to accept login method automatically', { provider, sessionId, error: error.message });
          }
        }, 200);
      }

      if (!session.automation.loginSuccessAcknowledged && /Login successful/i.test(text)) {
        session.automation.loginSuccessAcknowledged = true;
        setTimeout(() => {
          try {
            cliProcess.stdin?.write('\r');
            logger.info('Acknowledged login completion in Claude CLI', { provider, sessionId });
          } catch (error) {
            logger.warn('Failed to acknowledge Claude CLI login completion', { provider, sessionId, error: error.message });
          }
        }, 200);
      }

      // Codex CLI automation
      if (!session.automation.codexPressEnterSent && /Press Enter to continue/i.test(text)) {
        session.automation.codexPressEnterSent = true;
        setTimeout(() => {
          try {
            cliProcess.stdin?.write('\r');
            logger.info('Auto-pressed Enter to continue in Codex CLI (selecting option 1)', { provider, sessionId });
          } catch (error) {
            logger.warn('Failed to auto-press Enter in Codex CLI', { provider, sessionId, error: error.message });
          }
        }, 200);
      }
    }

    if (!oauthUrl) {
      const match = text.match(/https:\/\/[^\s]+/i);
      if (match && (match[0].includes('claude.ai') || match[0].includes('auth.openai.com'))) {
        oauthUrl = normalizeOAuthUrl(match[0]);
        logger.info('Captured OAuth URL from CLI output', { provider, sessionId, oauthUrl: oauthUrl.substring(0, 120) });
        launchBrowserForSession(sessionId, oauthUrl);
      }
    }
  };

  cliProcess.stdout.on('data', logOutput);
  cliProcess.stderr.on('data', logOutput);

  // For Claude CLI automation happens reactively within logOutput

  // Store session
  authSessions.set(sessionId, {
    provider,
    cliProcess,
    oauthUrl: () => oauthUrl, // Getter function
    credPath,
    completed: false,
    startedAt: Date.now(),
    proxyConfig: payload.proxy || null,  // Store DeCoKo proxy config for browser
    debug: {
      scriptLogPath,
      straceLogPath,
      diagnostics: payload.__diagnostics || null
    },
    automation: {
      themeAccepted: false,
      loginCommandSent: false,
      loginMethodSelected: false,
      loginSuccessAcknowledged: false,
      codexPressEnterSent: false
    },
    browserLaunched: false,
    browserLaunchInProgress: false,
    browserProcess: null
  });

  const pendingUrl = pendingBrowserLaunches.get(sessionId);
  if (pendingUrl) {
    pendingBrowserLaunches.delete(sessionId);
    launchBrowserForSession(sessionId, pendingUrl);
  }

  // Poll for OAuth URL from capture file with timeout
  const maxWaitMs = 15000; // 15 seconds
  const pollIntervalMs = 1000; // 1 second
  const startTime = Date.now();

  while (!oauthUrl && (Date.now() - startTime) < maxWaitMs) {
    // Try reading captured URL from file
    try {
      const capturedUrl = await fs.readFile(captureOutputPath, 'utf-8');
      if (capturedUrl.trim()) {
        oauthUrl = normalizeOAuthUrl(capturedUrl);

        logger.info('Captured OAuth URL via BROWSER env var', { provider, oauthUrl: oauthUrl.substring(0, 100) });
        launchBrowserForSession(sessionId, oauthUrl);
        break;
      }
    } catch (err) {
      // File doesn't exist yet, keep waiting
    }

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    logger.info('Polling for OAuth URL', {
      provider,
      sessionId,
      elapsed: Date.now() - startTime,
      hasUrl: !!oauthUrl,
      cliOutputLines: outputLines.length,
      captureFile: captureOutputPath
    });
  }

  if (oauthUrl) {
    logger.info('OAuth URL captured successfully', { provider, sessionId, oauthUrl: oauthUrl.substring(0, 100) });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      message: 'CLI OAuth server started',
      sessionId,
      oauthUrl
    }));
  } else {
    logger.warn('OAuth URL not captured within timeout', {
      provider,
      sessionId,
      elapsed: Date.now() - startTime,
      cliOutputLines: outputLines.length,
      cliOutput: outputLines.join('\n').substring(0, 500)
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      message: 'CLI started, waiting for OAuth URL...',
      sessionId,
      cliOutput: outputLines.join('\n').substring(0, 500)
    }));
  }
}

/**
 * Get OAuth URL for frontend to display in iframe
 */
async function handleGetOAuthURL(res, sessionId) {
  const session = authSessions.get(sessionId);

  if (!session) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Session not found' }));
    return;
  }

  const oauthUrl = typeof session.oauthUrl === 'function' ? session.oauthUrl() : session.oauthUrl;

  if (!oauthUrl) {
    res.writeHead(202, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      waiting: true,
      message: 'Waiting for CLI to generate OAuth URL...',
      elapsedMs: Date.now() - session.startedAt
    }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ oauthUrl }));
}

/**
 * Proxy OAuth callback to CLI's localhost:1455 server
 * Frontend redirects here after user logs in
 */
async function handleOAuthCallback(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  logger.info('OAuth callback received', {
    query: url.search,
    hasCode: url.searchParams.has('code'),
    hasError: url.searchParams.has('error')
  });

  // Forward to CLI's localhost OAuth server
  try {
    const proxyUrl = `http://localhost:${CLI_OAUTH_PORT}/auth/callback${url.search}`;

    const proxyRes = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Host': `localhost:${CLI_OAUTH_PORT}`,
        'User-Agent': 'PolydevOAuthProxy/1.0'
      },
      signal: AbortSignal.timeout(10000)
    });

    // Forward response to browser
    res.writeHead(proxyRes.status, {
      'Content-Type': proxyRes.headers.get('content-type') || 'text/html'
    });

    const responseText = await proxyRes.text();
    res.end(responseText);

    logger.info('OAuth callback proxied', { status: proxyRes.status });

  } catch (error) {
    logger.error('OAuth callback proxy failed', { error: error.message });

    // Show success page anyway - CLI might have saved credentials
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>Authentication Complete</title></head>
      <body>
        <h1>Authentication Complete</h1>
        <p>You can close this window and return to the dashboard.</p>
        <script>setTimeout(() => window.close(), 2000);</script>
      </body>
      </html>
    `);
  }
}

/**
 * Check if credentials file exists (auth completed)
 */
async function handleCredentialStatus(res, sessionId) {
  const session = authSessions.get(sessionId);

  if (!session) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Session not found' }));
    return;
  }

  try {
    await fs.access(session.credPath);
    const stats = await fs.stat(session.credPath);

    // Mark session as completed
    session.completed = true;

    if (session.browserProcess && !session.browserProcess.killed) {
      try {
        session.browserProcess.kill('SIGTERM');
        logger.info('Terminated Chromium after successful authentication', { sessionId });
      } catch (error) {
        logger.warn('Failed to terminate Chromium process', { sessionId, error: error.message });
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      authenticated: true,
      path: session.credPath,
      modifiedAt: stats.mtime,
      provider: session.provider
    }));

  } catch {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      authenticated: false,
      waiting: true,
      elapsedMs: Date.now() - session.startedAt
    }));
  }
}

/**
 * Get extracted credentials
 */
async function handleGetCredentials(res, sessionId) {
  const session = authSessions.get(sessionId);

  if (!session) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Session not found' }));
    return;
  }

  if (!session.completed) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Authentication not completed yet' }));
    return;
  }

  try {
    const credData = await fs.readFile(session.credPath, 'utf-8');
    const credentials = JSON.parse(credData);

    // Clean up session
    if (session.cliProcess && !session.cliProcess.killed) {
      session.cliProcess.kill();
    }
    if (session.browserProcess && !session.browserProcess.killed) {
      try {
        session.browserProcess.kill('SIGTERM');
      } catch {}
    }
    authSessions.delete(sessionId);
    pendingBrowserLaunches.delete(sessionId);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      provider: session.provider,
      credentials,
      credPath: session.credPath
    }));

  } catch (error) {
    logger.error('Failed to read credentials', { error: error.message, path: session.credPath });
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to read credentials', message: error.message }));
  }
}

/**
 * Open URL in browser
 * Triggers Firefox/Chromium to navigate to the specified URL
 */
async function handleOpenURL(req, res) {
  try {
    const body = await readBody(req);
    let payload;

    try {
      payload = JSON.parse(body);
    } catch (error) {
      logger.error('Failed to parse open-url payload', { error: error.message });
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      return;
    }

    const { url, sessionId } = payload;

    if (!url) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'url is required' }));
      return;
    }

    logger.info('Opening URL in browser', { url: url.substring(0, 100), sessionId });

    // If sessionId provided, try to use existing session's browser
    if (sessionId) {
      const session = authSessions.get(sessionId);
      if (session) {
        // If browser already launched, navigate it to the new URL using xdotool
        if (session.browserLaunched && session.browserProcess && !session.browserProcess.killed) {
          if (navigateBrowserTo(url, sessionId)) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, method: 'keyboard_navigation' }));
            return;
          }
        }

        // Browser not launched yet or navigation failed, launch it
        launchBrowserForSession(sessionId, url);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, method: 'browser_launch' }));
        return;
      }
    }

    // No session provided or session not found
    // Try xdotool navigation to existing browser first
    try {
      // Try Firefox first, then Chromium
      if (navigateBrowserTo(url)) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, method: 'keyboard_navigation' }));
        return;
      }
    } catch (error) {
      logger.warn('xdotool navigation failed, will launch new browser', { error: error.message });
    }

    // No existing browser found, launch new one
    const browserExecutable = resolveBrowserExecutable();
    if (!browserExecutable) {
      throw new Error('No supported browser executable found');
    }

    const env = {
      ...process.env,
      DISPLAY: BROWSER_DISPLAY
    };

    const browserProcess = spawn(browserExecutable, [url], {
      env,
      stdio: 'ignore',
      detached: true
    });

    browserProcess.unref();

    logger.info('Launched standalone browser for URL', { url: url.substring(0, 100) });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, method: 'standalone_launch' }));

  } catch (error) {
    logger.error('Failed to open URL', { error: error.message, stack: error.stack });
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

/**
 * Get VM's IP address from network interface
 */
function getVMIP() {
  const os = require('os');
  const interfaces = os.networkInterfaces();

  // Look for eth0 (common in VMs)
  if (interfaces.eth0) {
    const ipv4 = interfaces.eth0.find(addr => addr.family === 'IPv4');
    if (ipv4) return ipv4.address;
  }

  // Fallback to any non-localhost IPv4
  for (const iface of Object.values(interfaces)) {
    const ipv4 = iface.find(addr => addr.family === 'IPv4' && !addr.internal);
    if (ipv4) return ipv4.address;
  }

  return 'localhost';
}

/**
 * Utility: Read request body
 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

// Cleanup on exit
process.on('SIGTERM', () => {
  logger.info('Shutting down, cleaning up sessions...');
  for (const [sessionId, session] of authSessions.entries()) {
    if (session.cliProcess && !session.cliProcess.killed) {
      session.cliProcess.kill();
    }
  }
  process.exit(0);
});

// Start server
server.on('error', (error) => {
  logger.error('HTTP server error', { error: error?.message, stack: error?.stack });
});

server.on('clientError', (error, socket) => {
  logger.warn('HTTP client error', { error: error?.message });
  if (socket?.end) {
    try {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    } catch (err) {
      logger.warn('Failed to close socket after client error', { error: err?.message });
    }
  }
});

server.listen(PORT, '0.0.0.0', () => {
  logger.info('VM Browser Agent started', { port: PORT, vmIP: getVMIP() });
});
