#!/usr/bin/env node

/**
 * Polydev AI - Pre-uninstall hook
 * Cleans up auth token file and shell config lines.
 * Never fails the uninstall — all best-effort.
 */

try {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');

  const home = os.homedir();

  // 1. Remove ~/.polydev.env
  const envPath = path.join(home, '.polydev.env');
  try {
    if (fs.existsSync(envPath)) {
      fs.unlinkSync(envPath);
    }
  } catch {}

  // 2. Remove POLYDEV_USER_TOKEN lines from shell configs
  const shellConfigs = ['.zshrc', '.bashrc', '.profile'].map(f => path.join(home, f));

  for (const configPath of shellConfigs) {
    try {
      if (!fs.existsSync(configPath)) continue;

      const content = fs.readFileSync(configPath, 'utf8');

      // Remove lines containing POLYDEV_USER_TOKEN (export and comments)
      const filtered = content
        .split('\n')
        .filter(line => !line.includes('POLYDEV_USER_TOKEN'))
        .join('\n');

      // Only write if changed
      if (filtered !== content) {
        fs.writeFileSync(configPath, filtered, 'utf8');
      }
    } catch {}
  }

  console.log('  Polydev AI credentials cleaned up.\n');

} catch {
  // Never fail the uninstall
  process.exit(0);
}
