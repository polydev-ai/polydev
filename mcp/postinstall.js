#!/usr/bin/env node

/**
 * Polydev AI - Post-install hook
 * Shows install success message and optionally prompts for login.
 * Never fails install — all wrapped in try/catch.
 */

try {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');

  // Skip in CI environments
  const CI_VARS = ['CI', 'CONTINUOUS_INTEGRATION', 'BUILD_NUMBER', 'GITHUB_ACTIONS', 'GITLAB_CI', 'CIRCLECI', 'TRAVIS', 'JENKINS_URL', 'CODEBUILD_BUILD_ID'];
  if (CI_VARS.some(v => process.env[v])) {
    process.exit(0);
  }

  // Skip if running as part of a larger npm install (not direct install)
  if (process.env.npm_config_global === 'false' && process.env.INIT_CWD && !process.env.INIT_CWD.includes('polydev-ai')) {
    // Being installed as a dependency of another project, not directly
    process.exit(0);
  }

  // Check if already authenticated
  const envPath = path.join(os.homedir(), '.polydev.env');
  const hasToken = (() => {
    try {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        return content.includes('POLYDEV_USER_TOKEN=') && content.match(/POLYDEV_USER_TOKEN=\S+/);
      }
    } catch {}
    return false;
  })();

  if (hasToken) {
    // Already authenticated — short success message
    console.log('\n  \x1b[32m✓\x1b[0m Polydev AI updated successfully\n');
    process.exit(0);
  }

  // Show install success box
  const width = 52;
  const line = '─'.repeat(width);
  console.log(`
  \x1b[1m┌${line}┐\x1b[0m
  \x1b[1m│\x1b[0m  \x1b[32m✓\x1b[0m \x1b[1mPolydev AI installed successfully!\x1b[0m${' '.repeat(width - 39)}\x1b[1m│\x1b[0m
  \x1b[1m│\x1b[0m${' '.repeat(width)}\x1b[1m│\x1b[0m
  \x1b[1m│\x1b[0m  To get started, authenticate:${' '.repeat(width - 32)}\x1b[1m│\x1b[0m
  \x1b[1m│\x1b[0m${' '.repeat(width)}\x1b[1m│\x1b[0m
  \x1b[1m│\x1b[0m    \x1b[36mnpx -p polydev-ai polydev-login\x1b[0m${' '.repeat(width - 35)}\x1b[1m│\x1b[0m
  \x1b[1m│\x1b[0m${' '.repeat(width)}\x1b[1m│\x1b[0m
  \x1b[1m│\x1b[0m  This opens your browser for one-click auth.${' '.repeat(width - 47)}\x1b[1m│\x1b[0m
  \x1b[1m└${line}┘\x1b[0m
`);

  // Only prompt in interactive terminals
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    process.exit(0);
  }

  // Prompt for login with 15s timeout
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const timeout = setTimeout(() => {
    console.log('\n  (Skipped — run \x1b[36mnpx -p polydev-ai polydev-login\x1b[0m anytime)\n');
    rl.close();
    process.exit(0);
  }, 15000);

  rl.question('  Login now? (Y/n) ', (answer) => {
    clearTimeout(timeout);
    rl.close();

    if (answer && answer.toLowerCase() === 'n') {
      console.log('\n  Run \x1b[36mnpx -p polydev-ai polydev-login\x1b[0m when ready.\n');
      process.exit(0);
    }

    // Fork login.js for browser-based auth
    const { fork } = require('child_process');
    const loginScript = path.join(__dirname, 'login.js');

    if (fs.existsSync(loginScript)) {
      const child = fork(loginScript, ['login'], { stdio: 'inherit' });
      child.on('exit', (code) => process.exit(code || 0));
    } else {
      console.log('  Login script not found. Run \x1b[36mnpx -p polydev-ai polydev-login\x1b[0m manually.\n');
      process.exit(0);
    }
  });

} catch (err) {
  // Never fail the install
  process.exit(0);
}
