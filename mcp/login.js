#!/usr/bin/env node

/**
 * Polydev CLI - Clean, professional onboarding
 * Works in: Claude Code, Cursor, Cline, VS Code, any terminal
 *
 * Usage (bin: polydev-login; `npx polydev-ai` itself starts the MCP server):
 *   npx -p polydev-ai polydev-login            # Full setup
 *   npx -p polydev-ai polydev-login login      # Just login
 *   npx -p polydev-ai polydev-login status     # Show status
 *   npx -p polydev-ai polydev-login models     # Open models page
 *   npx -p polydev-ai polydev-login chatgpt login|logout|status   # ChatGPT plan (same as `polydev-ai chatgpt ...`)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const { execFile } = require('child_process');
const { CLIManager } = require('../lib/cliManager');
const { ChatGPTPlan, runChatGPTCli, constants: CHATGPT } = require('../lib/chatgptPlan');

// Local CLIs Polydev can ask on this machine (sign-in state comes from each CLI's own status command)
const CLI_TOOLS = [
  { id: 'claude_code', name: 'Claude Code', desc: 'Anthropic' },
  { id: 'codex_cli', name: 'Codex CLI', desc: 'OpenAI' }
];

const command = process.argv[2];

// Route commands
if (command === 'chatgpt') {
  runChatGPTCli(process.argv.slice(3)).then((code) => process.exit(code));
} else if (command === 'status') {
  showFullStatus();
} else if (command === 'login') {
  runLogin();
} else if (command === 'setup') {
  runFullSetup();
} else if (command === 'help' || command === '--help' || command === '-h') {
  showHelp();
} else if (command === 'models') {
  openModelsPage();
} else {
  smartOnboarding();
}

function showHelp() {
  console.log(`
Polydev - any model in any agent

Commands:
  npx -p polydev-ai polydev-login           Full setup (login + detect local CLIs)
  npx -p polydev-ai polydev-login login     Sign in via browser
  npx -p polydev-ai polydev-login status    Show current status
  npx -p polydev-ai polydev-login models    Open model and API key settings
  npx -y polydev-ai chatgpt login           Continue with ChatGPT: use your ChatGPT plan
                                            for OpenAI models (also: logout, status, models)
  npx -p polydev-ai polydev-login help      Show this help

Polydev is free. Each answer says what paid for it: your ChatGPT plan, Claude Code
or Codex on this machine, your own API keys, OpenRouter, or the 10 free requests
each account gets on Polydev's keys.

After login, restart your terminal or run: source ~/.zshrc

Links:
  Dashboard: https://www.polydev.ai/dashboard
  Docs:      https://www.polydev.ai/docs
`);
}

async function smartOnboarding() {
  const token = getExistingToken();
  if (token) {
    await showFullStatus();
  } else {
    await runFullSetup();
  }
}

async function runFullSetup() {
  printHeader();

  // Step 1: Authentication
  console.log('STEP 1 of 3: Authentication');
  console.log('─'.repeat(40));

  let token = getExistingToken();

  if (token) {
    console.log('[OK] Already authenticated');
    console.log(`    Token: ${token.slice(0, 12)}...${token.slice(-4)}\n`);
  } else {
    console.log('[..] Not authenticated - opening browser...\n');
    token = await runLoginFlow();

    if (!token) {
      console.log('\n[!] Login cancelled or timed out.');
      console.log('    Run: npx -p polydev-ai polydev-login login\n');
      return;
    }
  }

  // Step 2: Detect CLI tools
  console.log('\nSTEP 2 of 3: Local AI Tools');
  console.log('─'.repeat(40));

  const cliStatus = await detectAllCLIs();
  printCLIStatus(cliStatus);

  // Step 3: Verify API
  console.log('\nSTEP 3 of 3: API Connection');
  console.log('─'.repeat(40));

  const apiStatus = await verifyAPIConnection(token);
  printAPIStatus(apiStatus);

  // Summary
  printSetupComplete(token, cliStatus, apiStatus);
}

function printHeader() {
  console.log(`
 ___  ____ _   _ ___  ____ _  _
 |__] |  | |   |  |  | |__  |  |
 |    |__| |__ |  |  |___|   \\/

 Any model in any agent
${'─'.repeat(50)}
`);
}

async function runLogin() {
  console.log('\nPolydev Authentication\n');
  const token = await runLoginFlow();

  if (token) {
    console.log('\n[OK] Authentication successful!');
    console.log('     Restart your terminal or run: source ~/.zshrc\n');
  }
}

function runLoginFlow() {
  return new Promise((resolve) => {
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
          res.end(getSuccessHTML());

          console.log(`[OK] Token saved to ${savedTo}`);

          setTimeout(() => {
            server.close();
            resolve(token);
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
      const authUrl = `https://polydev.ai/auth?callback=${encodeURIComponent(callbackUrl)}&redirect=claude-code`;

      console.log('Opening browser for authentication...');
      console.log(`If browser doesn\'t open, visit:\n${authUrl}\n`);

      openBrowser(authUrl);

      setTimeout(() => {
        server.close();
        resolve(null);
      }, 5 * 60 * 1000);
    });

    server.on('error', (err) => {
      console.error('[!] Server error:', err.message);
      resolve(null);
    });
  });
}

async function detectAllCLIs() {
  const results = {};
  let detected = {};
  try {
    detected = await new CLIManager().forceCliDetection();
  } catch (e) {
    detected = {};
  }

  for (const tool of CLI_TOOLS) {
    const st = detected[tool.id] || {};
    if (st.available) {
      const version = (st.version || 'installed').split('\n')[0].substring(0, 30);
      results[tool.id] = { available: true, authenticated: !!st.authenticated, version, path: st.path, tool };
      console.log(`[OK] ${tool.name.padEnd(12)} ${version}${st.authenticated ? '' : ' (not signed in)'}`);
    } else {
      results[tool.id] = { available: false, authenticated: false, tool };
      console.log(`[--] ${tool.name.padEnd(12)} not installed`);
    }
  }

  const plan = new ChatGPTPlan().status();
  if (plan.planEnabled) {
    console.log(`[OK] ${'ChatGPT plan'.padEnd(12)} ${CHATGPT.TEXT.inUse} for OpenAI models (${CHATGPT.TEXT.manageUsage}: ${CHATGPT.MANAGE_USAGE_URL})`);
  } else if (plan.signedIn) {
    console.log(`[--] ${'ChatGPT plan'.padEnd(12)} signed in, plan usage off (run: npx -y polydev-ai chatgpt login)`);
  } else {
    console.log(`[--] ${'ChatGPT plan'.padEnd(12)} not connected (${CHATGPT.TEXT.action}: npx -y polydev-ai chatgpt login)`);
  }

  return results;
}

function printCLIStatus(cliStatus) {
  const available = Object.values(cliStatus).filter(s => s.available);
  const authenticated = available.filter(s => s.authenticated);

  if (available.length === 0) {
    console.log('\n    No local CLI tools detected.');
    console.log('    Install and sign in to Claude Code or Codex to use them through Polydev.');
    console.log('    Or connect your ChatGPT plan: npx -y polydev-ai chatgpt login');
  } else {
    console.log(`\n    ${available.length} tool(s) found, ${authenticated.length} authenticated`);
    console.log('    Polydev asks local tools first; calls count against your own plan.');
  }
}

async function verifyAPIConnection(token) {
  try {
    const response = await fetch('https://www.polydev.ai/api/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'polydev-cli/1.0.0'
      },
      body: JSON.stringify({ action: 'check_status' })
    });

    if (response.ok) {
      const data = await response.json();
      return {
        connected: true,
        email: data.email,
        credits: data.credits_remaining,
        tier: data.subscription_tier || 'Free',
        models: data.enabled_models || ['GPT-5', 'Gemini', 'Grok', 'GLM']
      };
    } else {
      return { connected: false, error: 'Invalid token' };
    }
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

function printAPIStatus(apiStatus) {
  if (apiStatus.connected) {
    console.log(`[OK] Connected to Polydev API`);
    console.log(`    Account: ${apiStatus.email || 'Connected'}`);
  } else {
    console.log(`[!] Could not verify API connection`);
    console.log(`    Error: ${apiStatus.error}`);
  }
}

function printSetupComplete(token, cliStatus, apiStatus) {
  const availableCLIs = Object.values(cliStatus).filter(s => s.available);

  console.log(`
${'═'.repeat(50)}
SETUP COMPLETE
${'═'.repeat(50)}

What's ready:`);

  if (availableCLIs.length > 0) {
    console.log('\n  Local tools (your own plan):');
    for (const cli of availableCLIs) {
      const status = cli.authenticated ? 'ready' : 'needs auth';
      console.log(`    - ${cli.tool.name} [${status}]`);
    }
  }

  if (apiStatus.connected) {
    console.log('\n  Polydev API:');
    console.log('    - Your own API keys, plus 10 free requests on Polydev\'s keys');
  }

  console.log(`
Next steps:

  1. Restart terminal or run: source ~/.zshrc
  2. Start your IDE (Claude Code, Cursor, Cline, etc.)
  3. Use the "ask_model" tool or the /polydev command
  4. Optional: connect your ChatGPT plan: npx -y polydev-ai chatgpt login

Links:
  Dashboard: https://www.polydev.ai/dashboard
  Models:    https://www.polydev.ai/dashboard/models
`);
}

async function showFullStatus() {
  console.log('\nPolydev Status');
  console.log('─'.repeat(40));

  const token = getExistingToken();

  console.log('\nAuthentication:');
  if (token) {
    const apiStatus = await verifyAPIConnection(token);
    if (apiStatus.connected) {
      console.log(`  [OK] ${apiStatus.email || 'Authenticated'}`);
    } else {
      console.log('  [!] Token found but invalid');
      console.log('      Run: npx -p polydev-ai polydev-login login');
    }
  } else {
    console.log('  [--] Not authenticated');
    console.log('       Run: npx -p polydev-ai polydev-login login');
  }

  console.log('\nLocal AI Tools (calls count against your own plan):');
  await detectAllCLIs();

  if (token) {
    console.log('\nAPI models (your own keys; 10 free requests on Polydev\'s keys):');
    console.log('  Configure: https://www.polydev.ai/dashboard/models');
  }

  console.log('');
}

function openModelsPage() {
  const url = 'https://www.polydev.ai/dashboard/models';
  console.log(`\nOpening: ${url}\n`);
  openBrowser(url);
}

// Utility functions
function getExistingToken() {
  if (process.env.POLYDEV_USER_TOKEN) {
    return process.env.POLYDEV_USER_TOKEN;
  }

  const locations = [
    path.join(os.homedir(), '.polydev.env'),
    path.join(os.homedir(), '.zshrc'),
    path.join(os.homedir(), '.bashrc')
  ];

  for (const loc of locations) {
    if (fs.existsSync(loc)) {
      const content = fs.readFileSync(loc, 'utf8');
      const match = content.match(/POLYDEV_USER_TOKEN[=\s]["']?([^"'\n]+)["']?/);
      if (match) return match[1];
    }
  }

  return null;
}

function saveToken(token) {
  const shell = process.env.SHELL || '/bin/zsh';
  const rcFile = shell.includes('zsh') ? path.join(os.homedir(), '.zshrc') :
                 shell.includes('bash') ? path.join(os.homedir(), '.bashrc') :
                 path.join(os.homedir(), '.profile');

  let content = '';
  try { content = fs.readFileSync(rcFile, 'utf8'); } catch (e) {}

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
      console.log('[!] Could not open browser automatically.');
      console.log(`    Please open: ${url}`);
    }
  });
}

function getSuccessHTML() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Polydev - Login Successful</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      display: flex; justify-content: center; align-items: center; 
      min-height: 100vh; background: #fafafa;
      padding: 20px;
    }
    .container { 
      text-align: center; padding: 40px; max-width: 480px; width: 100%;
      background: white; border-radius: 12px; 
      border: 1px solid #e5e5e5;
    }
    .logo { 
      width: 64px; height: 64px; margin: 0 auto 16px;
      background: #111; border-radius: 14px; 
      display: flex; align-items: center; justify-content: center;
    }
    .logo svg { width: 36px; height: 36px; }
    .brand { font-size: 24px; font-weight: 700; color: #111; margin-bottom: 4px; letter-spacing: -0.5px; }
    .tagline { color: #666; font-size: 13px; margin-bottom: 24px; }
    .success-badge {
      display: inline-flex; align-items: center; gap: 8px;
      background: #f0fdf4; color: #166534; padding: 10px 20px;
      border-radius: 6px; font-weight: 600; font-size: 14px;
      margin-bottom: 28px; border: 1px solid #bbf7d0;
    }
    .success-badge svg { width: 18px; height: 18px; }
    .section { text-align: left; margin-bottom: 20px; }
    .section-title { font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
    .api-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
    .api-item { 
      padding: 10px; background: #fafafa; border-radius: 6px; 
      font-size: 12px; color: #333; text-align: center; border: 1px solid #eee;
    }
    .steps {
      background: #fafafa; border-radius: 8px; padding: 14px;
      margin-bottom: 20px; text-align: left; border: 1px solid #eee;
    }
    .step { color: #333; font-size: 12px; margin-bottom: 8px; display: flex; gap: 10px; }
    .step:last-child { margin-bottom: 0; }
    .step-num { 
      width: 18px; height: 18px; background: #111; color: white; 
      border-radius: 50%; font-size: 10px; font-weight: 600;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    code { background: #eee; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
    .divider { height: 1px; background: #eee; margin: 24px 0; }
    .action-btn {
      display: block; width: 100%; padding: 12px 20px;
      background: #111; color: white; border: none; border-radius: 8px;
      font-size: 14px; font-weight: 600; cursor: pointer;
      text-decoration: none; margin-bottom: 10px;
      transition: background 0.2s;
    }
    .action-btn:hover { background: #333; }
    .secondary-btn {
      display: block; width: 100%; padding: 10px 20px;
      background: white; color: #333; border: 1px solid #ddd; border-radius: 8px;
      font-size: 13px; font-weight: 500; cursor: pointer; text-decoration: none;
    }
    .secondary-btn:hover { background: #fafafa; }
    .note { color: #999; font-size: 11px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M2 17L12 22L22 17" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M2 12L12 17L22 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="brand">Polydev</div>
    <div class="tagline">Any model in any agent</div>
    
    <div class="success-badge">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      Login Successful
    </div>

    <div class="section">
      <div class="section-title">Who pays for the tokens</div>
      <p class="note">Polydev is free. Your local CLIs and your own API keys pay; each account also gets 10 free requests on Polydev's keys.</p>
    </div>

    <div class="steps">
      <div class="step"><span class="step-num">1</span>Restart terminal or run <code>source ~/.zshrc</code></div>
      <div class="step"><span class="step-num">2</span>Start your IDE (Claude Code, Cursor, etc.)</div>
      <div class="step"><span class="step-num">3</span>Use <code>get_perspectives</code> tool</div>
    </div>

    <a href="https://www.polydev.ai/dashboard/models" target="_blank" class="action-btn">
      Configure API Keys
    </a>
    <button onclick="window.close()" class="secondary-btn">Close Window</button>
    
    <p class="note">Your token has been saved automatically</p>
  </div>
</body>
</html>`;
}
