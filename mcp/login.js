#!/usr/bin/env node

/**
 * Polydev CLI Login - Browser-based authentication for Polydev
 *
 * Usage: npx polydev-ai login
 *
 * This script:
 * 1. Starts a local HTTP server to receive the callback
 * 2. Opens the browser to polydev.ai/auth/cli
 * 3. After authentication, receives the token via callback
 * 4. Saves the token to your shell config (~/.zshrc or ~/.bashrc)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const { execFile } = require('child_process');

const command = process.argv[2];

if (command === 'status') {
  showStatus();
} else if (command === 'help' || command === '--help' || command === '-h') {
  showHelp();
} else {
  runLogin();
}

function showHelp() {
  console.log(`
Polydev AI Login

Commands:
  login          Authenticate with Polydev (opens browser)
  status         Show current authentication status
  help           Show this help message

Usage:
  npx polydev-ai login     # Opens browser to authenticate
  npx polydev-ai status    # Check if authenticated

After login, restart your terminal or run: source ~/.zshrc
`);
}

function showStatus() {
  loadEnvFile(path.join(os.homedir(), '.polydev.env'));
  loadEnvFile(path.join(os.homedir(), '.zshrc'));

  const token = process.env.POLYDEV_USER_TOKEN;
  if (token && token.startsWith('pd_')) {
    console.log('✓ Authenticated with Polydev');
    console.log(`  Token: ${token.slice(0, 12)}...${token.slice(-4)}`);
  } else {
    console.log('✗ Not authenticated');
    console.log('  Run: npx polydev-ai login');
  }
}

function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(/POLYDEV_USER_TOKEN[=\s]["']?([^"'\n]+)["']?/);
    if (match && !process.env.POLYDEV_USER_TOKEN) {
      process.env.POLYDEV_USER_TOKEN = match[1];
    }
  } catch (e) {
    // ignore
  }
}

async function runLogin() {
  console.log('\n🔐 Polydev Authentication\n');

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost`);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end();
      return;
    }

    if (url.pathname === '/callback') {
      const token = url.searchParams.get('token');

      if (token && token.startsWith('pd_')) {
        const savedTo = saveToken(token);

        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Polydev - Authenticated</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #fff; }
    .container { text-align: center; padding: 40px; max-width: 400px; }
    .logo { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 24px; }
    .logo svg { width: 48px; height: 48px; }
    .logo span { font-size: 32px; font-weight: 700; color: #000; }
    .success-icon { width: 64px; height: 64px; background: #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
    .success-icon svg { width: 32px; height: 32px; }
    h1 { color: #000; margin-bottom: 16px; font-size: 24px; font-weight: 600; }
    p { color: #666; margin: 8px 0; font-size: 14px; }
    code { background: #f5f5f5; padding: 4px 12px; border-radius: 6px; font-size: 13px; color: #000; }
    .close-msg { margin-top: 32px; color: #999; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <svg viewBox="0 0 600 600" fill="#000">
        <g transform="translate(0,600) scale(0.1,-0.1)">
          <path d="M2938 4023 c-31 -54 -97 -169 -148 -257 -50 -87 -96 -168 -102 -180 -8 -20 7 -52 112 -232 67 -115 149 -256 182 -314 34 -58 75 -130 93 -160 18 -30 76 -131 130 -225 134 -235 124 -221 140 -198 45 65 306 547 301 558 -13 34 -642 1105 -649 1105 -2 0 -28 -44 -59 -97z"/>
          <path d="M2305 2933 c-164 -285 -605 -1057 -605 -1059 0 -2 144 -4 320 -4 l320 0 24 38 c13 20 85 143 159 272 74 129 204 357 289 505 85 149 160 280 167 293 l12 22 -324 0 -323 0 -39 -67z"/>
          <path d="M2678 2418 c5 -7 36 -60 67 -118 32 -58 79 -141 105 -185 26 -44 69 -117 95 -162 l48 -83 653 0 c360 0 654 2 654 3 0 2 -71 127 -159 278 l-159 274 -657 3 c-527 2 -656 0 -647 -10z"/>
        </g>
      </svg>
      <span>Polydev</span>
    </div>
    <div class="success-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
    <h1>Authenticated!</h1>
    <p>Token saved to your shell config.</p>
    <p>Restart your terminal or run:</p>
    <p><code>source ~/.zshrc</code></p>
    <p class="close-msg">You can close this window.</p>
  </div>
</body>
</html>
        `);

        console.log('✓ Token saved successfully!');
        console.log(`  Saved to: ${savedTo}`);
        console.log('\n  Restart your terminal or run: source ~/.zshrc\n');

        setTimeout(() => {
          server.close();
          process.exit(0);
        }, 500);
      } else {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid or missing token');
      }
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  server.listen(0, 'localhost', () => {
    const port = server.address().port;
    const callbackUrl = `http://localhost:${port}/callback`;
    const authUrl = `https://polydev.ai/auth/cli?callback=${encodeURIComponent(callbackUrl)}&redirect=claude-code`;

    console.log('Opening browser for authentication...');
    console.log(`\nIf browser doesn't open, visit:\n${authUrl}\n`);

    openBrowser(authUrl);

    setTimeout(() => {
      console.log('\n✗ Login timed out. Please try again.\n');
      server.close();
      process.exit(1);
    }, 5 * 60 * 1000);
  });

  server.on('error', (err) => {
    console.error('Server error:', err.message);
    process.exit(1);
  });
}

function saveToken(token) {
  const shell = process.env.SHELL || '/bin/zsh';
  const rcFile = shell.includes('zsh') ? path.join(os.homedir(), '.zshrc') :
                 shell.includes('bash') ? path.join(os.homedir(), '.bashrc') :
                 path.join(os.homedir(), '.profile');

  let content = '';
  try {
    content = fs.readFileSync(rcFile, 'utf8');
  } catch (e) {}

  const lines = content.split('\n').filter(line =>
    !line.trim().startsWith('export POLYDEV_USER_TOKEN') &&
    !line.trim().startsWith('POLYDEV_USER_TOKEN')
  );

  lines.push(`export POLYDEV_USER_TOKEN="${token}"`);
  fs.writeFileSync(rcFile, lines.join('\n').replace(/\n+$/, '') + '\n');

  const envFile = path.join(os.homedir(), '.polydev.env');
  fs.writeFileSync(envFile, `POLYDEV_USER_TOKEN="${token}"\n`);

  return rcFile;
}

function openBrowser(url) {
  // Use execFile with explicit command and arguments for safety
  const platform = process.platform;
  let cmd, args;

  if (platform === 'darwin') {
    cmd = 'open';
    args = [url];
  } else if (platform === 'win32') {
    cmd = 'cmd';
    args = ['/c', 'start', '', url];
  } else {
    cmd = 'xdg-open';
    args = [url];
  }

  execFile(cmd, args, (err) => {
    if (err) {
      console.log('Could not open browser automatically.');
      console.log(`Please open this URL manually: ${url}`);
    }
  });
}
