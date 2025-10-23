# Codex CLI TTY Requirement Fix

**Date**: October 16, 2025 01:25 UTC
**Issue**: Codex OAuth failing with "stdout is not a terminal" error
**Status**: ROOT CAUSE IDENTIFIED

---

## Root Cause

The Codex CLI (`codex signin`) requires a TTY (terminal) to run, similar to Claude CLI. When spawned with regular pipes (`stdio: ['pipe', 'pipe', 'pipe']`), it fails with:

```
Error: stdout is not a terminal
Exit code: 1
```

## Evidence

From Browser VM logs (`/var/log/vm-browser-agent.log`):
```json
{"level":"info","msg":"Starting CLI auth","provider":"codex","sessionId":"e33d8009..."}
{"level":"info","msg":"CLI output","provider":"codex","text":"Error: "}
{"level":"info","msg":"CLI output","provider":"codex","text":"stdout is not a terminal\n"}
{"level":"info","msg":"CLI process exited","code":1,"signal":null}
```

## Current Code

**File**: `master-controller/vm-browser-agent/server.js:542-565`

The server.js currently has special PTY handling **only** for Claude Code:

```javascript
// Use a pseudo-terminal for Claude CLI so it behaves like an interactive session
if (provider === 'claude_code') {
  scriptLogPath = `/tmp/claude-login-${sessionId}.log`;
  const joinedArgs = [cliCommand, ...cliArgs].join(' ') || 'claude';
  commandParts = ['script', '-q', '--return', '-c', joinedArgs, scriptLogPath];
}

let command = commandParts[0];
let args = commandParts.slice(1);

// Spawn CLI process
const cliProcess = spawn(command, args, {
  env: {
    ...process.env,
    HOME: process.env.HOME || '/root',
    BROWSER: captureScriptPath
  },
  stdio: ['pipe', 'pipe', 'pipe']  // ❌ No PTY for Codex!
});
```

## Solution

Add the same `script` command wrapper for Codex CLI to provide a pseudo-terminal:

```javascript
let scriptLogPath = null;
let straceLogPath = null;
let commandParts = [cliCommand, ...cliArgs];

// Use a pseudo-terminal for Claude CLI and Codex CLI
if (provider === 'claude_code' || provider === 'codex' || provider === 'codex_cli') {
  scriptLogPath = `/tmp/${provider}-login-${sessionId}.log`;
  const joinedArgs = [cliCommand, ...cliArgs].join(' ');
  commandParts = ['script', '-q', '--return', '-c', joinedArgs, scriptLogPath];
}
```

## Files to Update

1. **`master-controller/vm-browser-agent/server.js`** (lines 542-546):
   - Change the `if (provider === 'claude_code')` condition
   - Add `provider === 'codex'` and `provider === 'codex_cli'` to the condition
   - This will wrap Codex with the `script` command to provide a PTY

## Deployment Steps

1. Update `master-controller/vm-browser-agent/server.js` locally
2. Commit the fix to git
3. Deploy to master-controller:
   ```bash
   # Changes will auto-inject on next Browser VM creation
   systemctl restart master-controller
   ```
4. Test OAuth flow again (existing Browser VMs won't have the fix - need new VM)

## Expected Behavior After Fix

### Successful Flow
1. User clicks "Connect Codex"
2. Browser VM created with fixed OAuth agent
3. Codex CLI spawned with PTY via `script` command
4. Codex outputs OAuth URL (no TTY error)
5. OAuth flow completes successfully

---

## Related Files

- `master-controller/vm-browser-agent/server.js:542-565` - CLI spawning logic
- `/var/log/vm-browser-agent.log` (in Browser VM) - OAuth agent logs showing the error

---

**Next Action**: Update server.js to add PTY support for Codex CLI
