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
          'Content-Type': 'text/html',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(`
<!DOCTYPE html>
<html>
<head>
  <title>Polydev - Success</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #fff; }
    .container { text-align: center; padding: 40px; max-width: 400px; }
    h1 { color: #000; margin-bottom: 16px; font-size: 24px; }
    p { color: #666; margin: 8px 0; }
    .success { color: #16a34a; font-size: 48px; margin-bottom: 16px; }
    code { background: #f5f5f5; padding: 2px 8px; border-radius: 4px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="success">✓</div>
    <h1>Authenticated!</h1>
    <p>Token saved to your shell config.</p>
    <p>Restart your terminal or run:</p>
    <p><code>source ~/.zshrc</code></p>
    <p style="margin-top: 24px; font-size: 14px;">You can close this window.</p>
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
