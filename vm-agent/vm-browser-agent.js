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
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const PORT = 8080;
const CLI_OAUTH_PORT = 1455; // Standard port for codex/claude OAuth callbacks

// Active auth sessions
const authSessions = new Map(); // sessionId -> { provider, cliProcess, oauthUrl, credPath, completed }

// Logger
const logger = {
  info: (msg, meta = {}) => console.log(JSON.stringify({ level: 'info', msg, ...meta, timestamp: new Date().toISOString() })),
  error: (msg, meta = {}) => console.error(JSON.stringify({ level: 'error', msg, ...meta, timestamp: new Date().toISOString() })),
  warn: (msg, meta = {}) => console.warn(JSON.stringify({ level: 'warn', msg, ...meta, timestamp: new Date().toISOString() }))
};

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
  const { sessionId, proxy } = JSON.parse(body);

  logger.info('Starting CLI auth', { provider, sessionId, hasProxy: !!proxy });

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
      cliArgs = []; // Claude CLI auto-starts auth on first run
      credPath = path.join(process.env.HOME || '/root', '.claude/credentials.json');
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

  // Build environment with proxy settings
  const cliEnv = {
    ...process.env,
    HOME: process.env.HOME || '/root',
    DISPLAY: process.env.DISPLAY || ':1',  // Ensure DISPLAY is set for X11 applications (xdg-open needs this)
    XAUTHORITY: process.env.XAUTHORITY || '/root/.Xauthority'  // Ensure X11 auth is available for browser
  };

  // Add proxy environment variables if provided
  if (proxy) {
    if (proxy.httpProxy) {
      cliEnv.HTTP_PROXY = proxy.httpProxy;
      cliEnv.http_proxy = proxy.httpProxy;
    }
    if (proxy.httpsProxy) {
      cliEnv.HTTPS_PROXY = proxy.httpsProxy;
      cliEnv.https_proxy = proxy.httpsProxy;
    }
    if (proxy.noProxy) {
      cliEnv.NO_PROXY = proxy.noProxy;
      cliEnv.no_proxy = proxy.noProxy;
    }
    logger.info('Using proxy configuration', {
      httpProxy: proxy.httpProxy,
      httpsProxy: proxy.httpsProxy
    });
  }

  // Spawn CLI process
  const cliProcess = spawn(cliCommand, cliArgs, {
    env: cliEnv,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  // Capture OAuth URL from CLI output
  let oauthUrl = null;
  const outputLines = [];

  const extractOAuthURL = (data) => {
    const text = data.toString();
    outputLines.push(text);
    logger.info('CLI output', { provider, text: text.substring(0, 200) });

    // Look for OAuth URL patterns
    const urlPatterns = [
      /https:\/\/auth\.openai\.com\/oauth\/authorize\?[^\s]+/,  // Codex
      /https:\/\/[^\s]*claude[^\s]*auth[^\s]+/i,                 // Claude Code
      /https:\/\/accounts\.google\.com\/o\/oauth2[^\s]+/         // Gemini
    ];

    for (const pattern of urlPatterns) {
      const match = text.match(pattern);
      if (match) {
        oauthUrl = match[0];
        // Rewrite redirect_uri to point to our proxy
        oauthUrl = oauthUrl.replace(
          /redirect_uri=http(?:s)?%3A%2F%2Flocalhost(?:%3A\d+)?/g,
          `redirect_uri=http%3A%2F%2F${getVMIP()}%3A8080`
        ).replace(
          /redirect_uri=http(?:s)?:\/\/localhost(?::\d+)?/g,
          `redirect_uri=http://${getVMIP()}:8080`
        );
        logger.info('Extracted OAuth URL', { provider, oauthUrl });

        // Automatically open browser with OAuth URL
        const { spawn: spawnBrowser } = require('child_process');
        logger.info('Auto-opening browser with OAuth URL', { oauthUrl, display: cliEnv.DISPLAY });

        const browserProcess = spawnBrowser('sensible-browser', [oauthUrl], {
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: cliEnv
        });

        // Capture any errors from sensible-browser
        browserProcess.stderr.on('data', (data) => {
          logger.error('sensible-browser stderr', { error: data.toString() });
        });

        browserProcess.on('error', (err) => {
          logger.error('sensible-browser spawn error', { error: err.message, display: cliEnv.DISPLAY });
        });

        browserProcess.on('exit', (code, signal) => {
          if (code !== 0) {
            logger.warn('sensible-browser exited with non-zero code', { code, signal, display: cliEnv.DISPLAY });
          }
        });

        browserProcess.unref();

        break;
      }
    }
  };

  cliProcess.stdout.on('data', extractOAuthURL);
  cliProcess.stderr.on('data', extractOAuthURL);

  // Store session
  authSessions.set(sessionId, {
    provider,
    cliProcess,
    oauthUrl: () => oauthUrl, // Getter function
    credPath,
    completed: false,
    startedAt: Date.now()
  });

  // Wait briefly for OAuth URL to be captured
  await new Promise(resolve => setTimeout(resolve, 2000));

  if (oauthUrl) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      message: 'CLI OAuth server started',
      sessionId,
      oauthUrl
    }));
  } else {
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
    authSessions.delete(sessionId);

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
server.listen(PORT, '0.0.0.0', () => {
  logger.info('VM Browser Agent started', { port: PORT, vmIP: getVMIP() });
});
