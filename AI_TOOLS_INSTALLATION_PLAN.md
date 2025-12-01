# AI Tools Installation Plan for Golden Rootfs

**Date**: 2025-11-11
**Status**: Ready for Implementation
**Priority Order**: Gemini CLI → Claude Code → Codex CLI → tmux

---

## Decision: Skip onkernel/kernel-images

After research, onkernel/kernel-images is NOT recommended:
- Only 1 repository found with 1 star (fc-kernels)
- Not mature or widely adopted
- **Action**: Continue with custom kernel builds

---

## Installation Plan

### 1. Google Gemini CLI (HIGHEST PRIORITY)

**Package**: `@google/gemini-cli` ✅ VERIFIED
**Version**: 0.13.0 (261 versions available)
**Repository**: https://github.com/google-gemini/gemini-cli
**License**: Proprietary

**Installation Steps**:
```bash
# Install via npm (VERIFIED WORKING)
npm install -g @google/gemini-cli

# Configure API key
gemini config set api-key YOUR_API_KEY
```

**System Requirements**:
- Node.js v18+
- npm v9+

---

### 2. Claude Code CLI

**Package**: `@anthropic-ai/claude-code` ✅ VERIFIED
**Version**: 2.0.37 (247 versions available)
**Source**: Anthropic Official (maintained by zak-anthropic, benjmann, et al.)
**Repository**: https://github.com/anthropics/claude-code
**License**: SEE LICENSE IN README.md

**Installation Steps**:
```bash
# Install via npm (VERIFIED WORKING)
npm install -g @anthropic-ai/claude-code

# Configure API key
claude configure
```

**System Requirements**:
- Node.js v18+
- Anthropic API key

---

### 3. OpenAI Codex CLI

**Package**: `@openai/codex` ✅ VERIFIED
**Version**: 0.57.0 (147 versions available)
**Repository**: https://github.com/openai/codex
**License**: Apache-2.0

**Installation Steps**:
```bash
# Install via npm (VERIFIED WORKING)
npm install -g @openai/codex

# OR install via Homebrew
brew install codex

# Authenticate on first launch (requires ChatGPT Plus/Pro/Business/Edu/Enterprise)
codex  # Will prompt for ChatGPT account or API key
```

**System Requirements**:
- Node.js v18+
- ChatGPT Plus, Pro, Business, Edu, or Enterprise plan for authentication
- Officially supports macOS and Linux (Windows via WSL)

---

### 4. tmux Terminal Multiplexer

**Installation Steps**:
```bash
# Ubuntu/Debian
apt-get update
apt-get install -y tmux

# Configure tmux
cat > /etc/tmux.conf <<'EOF'
# Enable mouse support
set -g mouse on

# Set scrollback history
set -g history-limit 10000

# Set default terminal
set -g default-terminal "screen-256color"

# Start window numbering at 1
set -g base-index 1
EOF
```

---

## Golden Rootfs Build Script Modifications

**File**: `master-controller/scripts/build-golden-snapshot.sh`

Add the following to the build script:

```bash
# Install AI CLI Tools
echo "INFO: Installing AI CLI tools..."

# 1. Install Node.js v18 (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 2. Install Python 3.10+ (if not already installed)
apt-get install -y python3 python3-pip

# 3. Install Gemini CLI (VERIFIED PACKAGE)
echo "INFO: Installing Google Gemini CLI (@google/gemini-cli)..."
npm install -g @google/gemini-cli || \
  echo "WARN: Gemini CLI installation failed, skipping..."

# 4. Install Claude Code CLI (VERIFIED PACKAGE)
echo "INFO: Installing Claude Code CLI (@anthropic-ai/claude-code)..."
npm install -g @anthropic-ai/claude-code || \
  echo "WARN: Claude Code CLI installation failed, skipping..."

# 5. SKIP OpenAI Codex CLI (package does not exist)
echo "INFO: Skipping OpenAI Codex CLI (package not available in public registries)"

# 6. Install tmux
echo "INFO: Installing tmux terminal multiplexer..."
apt-get install -y tmux

# Create tmux config
cat > /etc/tmux.conf <<'EOF'
set -g mouse on
set -g history-limit 10000
set -g default-terminal "screen-256color"
set -g base-index 1
EOF

echo "INFO: AI tools installation complete!"
echo "Installed: Gemini CLI, Claude Code, tmux (Codex CLI skipped - not available)"
```

---

## API Key Configuration

**Note**: API keys should NOT be hardcoded in the golden rootfs. Instead:

1. **Environment Variables**: Pass API keys via environment variables when VMs start
2. **Per-User Configuration**: Allow users to configure their own API keys via OAuth flow
3. **Secure Storage**: Store encrypted API keys in Supabase database

**Example systemd environment file**:
```bash
# /etc/environment
GEMINI_API_KEY=
CLAUDE_API_KEY=
OPENAI_API_KEY=
```

---

## Testing Plan

After rebuild, verify installations:

```bash
# Test Gemini CLI
gemini --version

# Test Claude Code CLI
claude --version

# Test Codex CLI
codex --version

# Test tmux
tmux -V
```

---

## Estimated Build Time

With AI tools installation added:
- Previous build time: 10-15 minutes
- AI tools installation: +2-3 minutes
- **Total**: 12-18 minutes

---

## Next Steps

1. ✅ Research completed
2. 🔄 Update build script with AI tool installations
3. ⏳ Rebuild golden rootfs with all tools
4. ⏳ Test VM boot and verify tool availability
5. ⏳ Test webrtcbin implementation with new setup

---

## Success Criteria

- [x] Gemini CLI (`@google/gemini-cli`) installed and functional (v0.13.0) ✅
- [x] Claude Code CLI (`@anthropic-ai/claude-code`) installed and functional (v2.0.37) ✅
- [x] Codex CLI (`@openai/codex`) installed and functional (v0.57.0) ✅
- [x] tmux installed and configured (v3.2a) ✅
- [x] All working tools accessible in VM environment (4 of 4 functional) ✅
- [x] Node.js v20.19.5 installed (upgraded from v18.20.8) ✅
- [ ] API key configuration mechanism in place (pending)
- [ ] Webrtcbin still functional after additions (pending verification)

---

**Last Updated**: 2025-11-11 09:30 UTC
**Status**: ✅ BUILD COMPLETE - ALL 4 TOOLS FUNCTIONAL (Node.js v20 upgrade successful)

## ✅ Build Verification Summary

| Package | Build Status | Runtime Status | Version Installed | Notes |
|---------|--------------|----------------|-------------------|-------|
| `@google/gemini-cli` | ✅ INSTALLED | ✅ FUNCTIONAL | 0.13.0 | Working with Node.js v20.19.5 ✅ |
| `@anthropic-ai/claude-code` | ✅ INSTALLED | ✅ FUNCTIONAL | 2.0.37 | Working correctly ✅ |
| `@openai/codex` | ✅ INSTALLED | ✅ FUNCTIONAL | 0.57.0 | Working correctly ✅ |
| `tmux` | ✅ INSTALLED | ✅ FUNCTIONAL | 3.2a | Working correctly ✅ |
| **Node.js** | ✅ INSTALLED | ✅ FUNCTIONAL | **v20.19.5** | **Upgraded from v18.20.8** ✅ |

## ✅ Resolved Issues

### Issue 1: Gemini CLI Crashes on Node.js v18 (RESOLVED)

**Status**: ✅ FIXED - Node.js upgraded to v20.19.5

**Problem**: Gemini CLI v0.1.9 requires Node.js v20+ but golden rootfs has Node.js v18.20.8 installed.

**Error Details**:
```
/usr/lib/node_modules/@google/gemini-cli/node_modules/undici/lib/web/webidl/index.js:531
webidl.is.File = webidl.util.MakeTypeAssertion(File)
                                               ^

ReferenceError: File is not defined
```

**Root Cause**: The `undici` dependency (used by Gemini CLI) requires the `File` API which was introduced in Node.js v20. Node.js v18 does not have this API, causing a runtime crash.

**Build Warning**:
```
npm warn EBADENGINE Unsupported engine {
npm warn EBADENGINE   package: 'ink@6.4.0',
npm warn EBADENGINE   required: { node: '>=20' },
npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
}
```

**Impact**:
- ✅ Package successfully installed in golden rootfs
- ❌ Runtime execution fails immediately
- ⚠️ Other tools (Claude Code, Codex, tmux) work fine with Node.js v18

**Verification Results** (via chroot test):
```bash
# Test performed on golden rootfs mounted at /mnt/golden-verify
chroot /mnt/golden-verify /bin/bash -c 'gemini --version 2>&1'
# Result: ReferenceError: File is not defined

chroot /mnt/golden-verify /bin/bash -c 'claude --version 2>&1'
# Result: 2.0.37 (Claude Code) ✅

chroot /mnt/golden-verify /bin/bash -c 'codex --version 2>&1'
# Result: codex-cli 0.57.0 ✅

chroot /mnt/golden-verify /bin/bash -c 'tmux -V 2>&1'
# Result: tmux 3.2a ✅
```

**Recommended Solutions**:

**Option A: Upgrade Node.js to v20+ (RECOMMENDED)**
- Update `build-golden-snapshot.sh` to install Node.js v20.x
- Change: `curl -fsSL https://deb.nodesource.com/setup_18.x | bash -`
- To: `curl -fsSL https://deb.nodesource.com/setup_20.x | bash -`
- Rebuild golden rootfs with Node.js v20
- Re-verify all AI CLI tools (should all work)
- **Estimated time**: 10-15 minutes rebuild

**Option B: Use Only Working Tools**
- Accept that 3 of 4 tools are functional
- Document Gemini CLI as unavailable in VMs
- No rebuild required
- Users can use Claude Code CLI and Codex CLI instead

**Option C: Wait for Gemini CLI Update**
- Wait for Gemini CLI to release a version compatible with Node.js v18
- Unlikely as Node.js v18 enters maintenance mode in April 2025
