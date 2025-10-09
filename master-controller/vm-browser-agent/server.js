/**
 * VM Browser Agent
 * Provides web-based browser access via noVNC for OAuth authentication
 *
 * Architecture:
 * - User accesses web interface in their browser
 * - noVNC connects to TigerVNC server in VM
 * - User manually authenticates in Chromium browser running in VM
 * - Agent extracts credentials after authentication
 * - No automation - user does everything manually
 */

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const PORT = 8080;

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
        vncRunning: await checkVNCRunning(),
        browserRunning: await checkBrowserRunning()
      }));
      return;
    }

    // Start browser session for provider
    if (url.pathname.startsWith('/auth/') && req.method === 'POST') {
      const provider = url.pathname.split('/')[2];
      await handleStartAuth(req, res, provider);
      return;
    }

    // Get credential status
    if (url.pathname === '/credentials/status' && req.method === 'GET') {
      const provider = url.searchParams.get('provider');
      await handleCredentialStatus(res, provider);
      return;
    }

    // Extract credentials (called after user completes auth)
    if (url.pathname === '/credentials/extract' && req.method === 'POST') {
      await handleExtractCredentials(req, res);
      return;
    }

    // Test authentication
    if (url.pathname.startsWith('/test-auth/') && req.method === 'GET') {
      const provider = url.pathname.split('/')[2];
      await handleTestAuth(provider, res);
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
 * Start authentication session
 * Opens browser to provider's OAuth page
 * User will manually log in via VNC interface
 */
async function handleStartAuth(req, res, provider) {
  const body = await readBody(req);
  const { sessionId } = JSON.parse(body);

  logger.info('Starting auth session', { provider, sessionId });

  // Determine OAuth URL for provider
  let oauthUrl;
  switch (provider) {
    case 'codex':
    case 'claude_code':
      oauthUrl = 'https://platform.openai.com/auth/login';
      break;
    case 'gemini_cli':
      oauthUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
      break;
    default:
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unknown provider' }));
      return;
  }

  // Launch Firefox with OAuth URL
  // Browser will be visible in VNC session
  spawn('firefox', [
    oauthUrl
  ], {
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      DISPLAY: ':1'  // VNC display
    }
  }).unref();

  logger.info('Browser launched', { provider, url: oauthUrl });

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    success: true,
    message: 'Browser opened. Complete authentication in VNC session.',
    vncUrl: `http://${req.headers.host}/vnc`,
    provider
  }));
}

/**
 * Check credential status
 */
async function handleCredentialStatus(res, provider) {
  let credPath;

  switch (provider) {
    case 'codex':
      credPath = '/root/.codex/credentials.json';
      break;
    case 'claude_code':
      credPath = '/root/.claude/credentials.json';
      break;
    case 'gemini_cli':
      credPath = '/root/.config/gcloud/credentials.json';
      break;
    default:
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unknown provider' }));
      return;
  }

  try {
    await fs.access(credPath);
    const stats = await fs.stat(credPath);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      authenticated: true,
      path: credPath,
      modifiedAt: stats.mtime
    }));
  } catch {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ authenticated: false }));
  }
}

/**
 * Extract credentials from browser
 * Reads cookies/localStorage from Chromium profile
 */
async function handleExtractCredentials(req, res) {
  const body = await readBody(req);
  const { provider, sessionId } = JSON.parse(body);

  logger.info('Extracting credentials', { provider, sessionId });

  try {
    let credentials;

    // Extract based on provider
    switch (provider) {
      case 'codex':
      case 'claude_code':
        credentials = await extractOpenAICredentials();
        break;
      case 'gemini_cli':
        credentials = await extractGoogleCredentials();
        break;
      default:
        throw new Error('Unknown provider');
    }

    logger.info('Credentials extracted', { provider, hasCredentials: !!credentials });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      credentials
    }));

  } catch (error) {
    logger.error('Credential extraction failed', { provider, error: error.message });

    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: error.message
    }));
  }
}

/**
 * Extract OpenAI credentials from Firefox
 */
async function extractOpenAICredentials() {
  const profilePath = '/root/.mozilla/firefox/*.default-release';
  const cookiesPath = path.join(profilePath, 'cookies.sqlite');

  // Read cookies using sqlite3
  // This is a simplified version - actual implementation would use sqlite3 module
  // or extract from browser's cookie store

  const { execSync } = require('child_process');

  try {
    // Extract session token from cookies
    const result = execSync(
      `sqlite3 "${cookiesPath}" "SELECT name, value FROM cookies WHERE host_key LIKE '%openai.com%';"`,
      { encoding: 'utf-8' }
    );

    // Parse cookie data
    const lines = result.trim().split('\n');
    const cookies = {};

    for (const line of lines) {
      const [name, value] = line.split('|');
      if (name && value) {
        cookies[name] = value;
      }
    }

    return {
      sessionToken: cookies['__Secure-next-auth.session-token'],
      cookies,
      provider: 'openai'
    };

  } catch (error) {
    logger.error('Failed to extract OpenAI credentials', { error: error.message });
    throw error;
  }
}

/**
 * Extract Google credentials
 */
async function extractGoogleCredentials() {
  const profilePath = '/root/.config/chromium/Default';
  const cookiesPath = path.join(profilePath, 'Cookies');

  const { execSync } = require('child_process');

  try {
    const result = execSync(
      `sqlite3 "${cookiesPath}" "SELECT name, value FROM cookies WHERE host_key LIKE '%google.com%';"`,
      { encoding: 'utf-8' }
    );

    const lines = result.trim().split('\n');
    const cookies = {};

    for (const line of lines) {
      const [name, value] = line.split('|');
      if (name && value) {
        cookies[name] = value;
      }
    }

    return {
      cookies,
      provider: 'google'
    };

  } catch (error) {
    logger.error('Failed to extract Google credentials', { error: error.message });
    throw error;
  }
}

/**
 * Test if provider is authenticated
 */
async function handleTestAuth(provider, res) {
  let credPath;

  switch (provider) {
    case 'codex':
      credPath = '/root/.codex/credentials.json';
      break;
    case 'claude_code':
      credPath = '/root/.claude/credentials.json';
      break;
    case 'gemini_cli':
      credPath = '/root/.config/gcloud/credentials.json';
      break;
    default:
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unknown provider' }));
      return;
  }

  try {
    await fs.access(credPath);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ authenticated: true, path: credPath }));
  } catch {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ authenticated: false }));
  }
}

/**
 * Check if VNC server is running
 */
async function checkVNCRunning() {
  try {
    const { execSync } = require('child_process');
    execSync('pgrep Xvnc', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if browser is running
 */
async function checkBrowserRunning() {
  try {
    const { execSync } = require('child_process');
    execSync('pgrep firefox', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
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

// Start server
server.listen(PORT, '0.0.0.0', () => {
  logger.info('VM Browser Agent started', { port: PORT });
  logger.info('VNC will be accessible via noVNC web interface');
});
