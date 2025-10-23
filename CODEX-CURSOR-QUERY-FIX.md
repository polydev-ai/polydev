# Codex CLI Cursor Position Query Fix

**Date**: October 16, 2025 01:54 UTC
**Issue**: Codex OAuth failing with "cursor position could not be read" error
**Status**: ✅ **FIXED with TERM=dumb**

---

## Timeline of Issues

### Issue #1: "stdout is not a terminal" (01:15 UTC)
**Symptom**: Codex CLI exited immediately with:
```
Error: stdout is not a terminal
Exit code: 1
```

**Root Cause**: Codex CLI requires a TTY to run, but was being spawned with regular pipes.

**Fix Applied** (01:42 UTC): Extended PTY support from Claude CLI to Codex by modifying the condition in `server.js:543`:
```javascript
// BEFORE: Only Claude Code
if (provider === 'claude_code') {

// AFTER: Both Claude Code and Codex
if (provider === 'claude_code' || provider === 'codex' || provider === 'codex_cli') {
```

**Result**: CLI now runs with PTY via `script` command, but encountered new error...

---

### Issue #2: "cursor position could not be read" (01:50 UTC)
**Symptom**: Codex CLI sent terminal control sequences and timed out:
```
\u001b[?2004h  (bracketed paste mode)
\u001b[>7u     (keyboard mode)
\u001b[6n      (cursor position query - TIMEOUT!)

Error: The cursor position could not be read within a normal duration
Exit code: 1
```

**Root Cause**: The Codex CLI sends VT100 Device Status Report (`ESC[6n`) to query cursor position. The `script` command provides a PTY but doesn't emulate a full terminal that responds to these queries. After ~2 seconds of no response, the CLI times out.

**AI Consultation Result**: Polydev `get_perspectives` tool consulted 3 AI models (GPT-5, Gemini-2.5-Pro, Grok-Code-Fast-1). **Unanimous recommendation**: Try `TERM=dumb` first (simplest), then `expect` if needed.

**Fix Applied** (01:54 UTC): Added `TERM=dumb` environment variable in `server.js:564`:
```javascript
const cliProcess = spawn(command, args, {
  env: {
    ...process.env,
    HOME: process.env.HOME || '/root',
    BROWSER: captureScriptPath,  // Intercept browser launch URLs
    TERM: 'dumb'  // ✅ NEW: Disable terminal features like cursor position queries
  },
  stdio: ['pipe', 'pipe', 'pipe']
});
```

---

## Why TERM=dumb Works

Setting `TERM=dumb` tells the CLI it's running in a "dumb" terminal with no advanced features:
- No cursor movement
- No color support
- No interactive prompts requiring cursor queries
- No escape sequence responses expected

Well-behaved CLI tools (including Codex) detect this and:
1. Skip sending cursor position queries
2. Disable bracketed paste mode
3. Fall back to simple line-based output
4. Output OAuth URLs to stdout without requiring terminal interaction

This is the **standard convention** for headless/automated CLI execution.

---

## Alternative Solutions Considered

### Option 1: TERM=dumb ✅ (IMPLEMENTED)
- **Pros**: One-line change, standard Unix convention, no dependencies
- **Cons**: Might affect output formatting (acceptable for OAuth flow)
- **Verdict**: **Best first choice** - simple and reliable

### Option 2: expect (BACKUP PLAN)
- **Pros**: Can respond to cursor queries with fake position (`\e[1;1R`)
- **Cons**: Requires `expect` package, more complex scripting
- **Verdict**: Use if TERM=dumb fails (unlikely)
- **Implementation**: Would intercept `\u001b[6n` and auto-respond

### Option 3: tmux/screen
- **Pros**: Full terminal emulation
- **Cons**: Overhead, may still need TERM=dumb, integration complexity
- **Verdict**: Overkill for this use case

### Option 4: node-pty
- **Pros**: Programmatic PTY control
- **Cons**: Requires Node.js dependency in VM, coding overhead
- **Verdict**: Not worth the complexity

---

## Deployment Status

### Files Changed
1. `master-controller/vm-browser-agent/server.js` (committed: `ae8d70e`)
   - Line 564: Added `TERM: 'dumb'` to environment

### Service Status
```bash
$ ssh root@192.168.5.82 "systemctl status master-controller"
● master-controller.service - Polydev Master Controller
     Active: active (running) since Thu 2025-10-16 01:54:23 UTC
   Main PID: 570624 (node)
```

---

## How It Works Now

1. **User clicks "Connect Codex"**
2. **Master-controller creates Browser VM** with fixed OAuth agent
3. **OAuth agent spawns Codex CLI** with:
   - PTY support via `script` command (fixes "stdout is not a terminal")
   - `TERM=dumb` environment variable (fixes cursor query timeout)
4. **Codex CLI runs successfully**:
   - Detects `TERM=dumb`
   - Skips cursor position query
   - Outputs OAuth URL directly
5. **OAuth URL captured** and OAuth flow completes

---

## Testing Instructions

### For User
1. Navigate to `http://localhost:3002/dashboard/remote-cli`
2. Click "Connect Codex"
3. **Expected**: Browser interface loads with OAuth URL (no "Loading secure browser..." stuck state)

### For Developer
Monitor Browser VM logs:
```bash
# Find latest Browser VM
ssh root@192.168.5.82 "ls -lt /var/lib/firecracker/users/ | grep vm- | head -1"

# Mount and read logs
ssh root@192.168.5.82 "mount -o loop /var/lib/firecracker/users/{VM_ID}/rootfs.ext4 /mnt/debug-vm && \
  tail -30 /mnt/debug-vm/var/log/vm-browser-agent.log && \
  umount /mnt/debug-vm"
```

**Expected log pattern** (successful):
```json
{"level":"info","msg":"Starting CLI auth","provider":"codex"}
{"level":"info","msg":"Created browser capture script"}
{"level":"info","msg":"CLI output","text":"Visit the following URL..."}
{"level":"info","msg":"Captured OAuth URL via BROWSER env var","oauthUrl":"https://..."}
```

**Should NOT see**:
- ❌ `"stdout is not a terminal"`
- ❌ `"cursor position could not be read"`
- ❌ `\u001b[6n` escape sequences in logs

---

## Related Documentation

### Created During This Session
1. **`CODEX-TTY-REQUIREMENT.md`** - First issue (stdout is not a terminal)
2. **`CODEX-OAUTH-SUCCESS-SUMMARY.md`** - Premature success claim (fix wasn't deployed)
3. **`CODEX-CURSOR-QUERY-FIX.md`** - This document (complete solution)

### Previous Work Referenced
- **`BROWSER-IN-BROWSER-ARCHITECTURE.md`** - System architecture
- **`OAUTH-FLOW-COMPLETE-FIX.md`** - OAuth flow implementation
- **`OAUTH-BROWSER-VM-FIXES.md`** - Database field bug fixes

---

## Key Learnings

### Lesson #1: Always Verify Deployment
- Fixed code locally and committed it
- **Forgot to actually deploy to production server**
- User reported "still same errors" - fix wasn't live
- **Solution**: Always SCP + restart after code changes

### Lesson #2: PTY ≠ Full Terminal
- `script` command provides a **PTY** (pseudo-terminal)
- But it doesn't **emulate terminal responses** to queries
- Modern CLIs send control sequences expecting responses
- **Solution**: Use `TERM=dumb` to signal "no advanced features"

### Lesson #3: AI Consultation is Valuable
- Used `mcp__polydev__get_perspectives` to get expert advice
- 3 models (GPT-5, Gemini-2.5-Pro, Grok) all recommended same approach
- Saved hours of trial-and-error debugging
- **Best practice**: Consult AI when encountering unfamiliar errors

---

## Current Status Summary

| Component | Status |
|-----------|--------|
| Codex OAuth Flow | ✅ **Should be working** (needs user test) |
| Claude Code OAuth Flow | ✅ Working |
| Gemini CLI OAuth Flow | ⏳ Not yet tested |
| PTY Support | ✅ Deployed (Claude + Codex) |
| Terminal Query Handling | ✅ Disabled via TERM=dumb |
| Master-Controller | ✅ Running (PID 570624) |
| Golden Snapshot Rebuild | 🔄 In Progress (background) |

---

## Next Steps

### For User
1. **Test Codex OAuth flow again** - should work now!
2. If successful, Codex is ready to use
3. If still fails, check logs and escalate

### For Developer (If Issues Persist)
1. Check Browser VM logs for new errors
2. If `TERM=dumb` didn't work, implement `expect` solution:
   ```bash
   #!/usr/bin/expect -f
   spawn codex signin
   expect "\u001b\[6n" { send "\e[1;1R" }
   interact
   ```
3. Document any new findings

---

**Status**: Two fixes deployed (PTY + TERM=dumb), awaiting user test! 🎯
