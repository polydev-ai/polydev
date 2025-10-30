# Critical Architecture Findings - CLI Tools & OAuth Tokens

**Date**: October 30, 2025
**Tests Performed**: Actual execution with OAuth tokens

---

## 🎯 KEY DISCOVERY: Why We Need Full CLI Tools

### Question Asked:
Can we use lightweight SDK clients (openai, @anthropic-ai/sdk) with CLI-captured OAuth tokens?

### Answer: NO! ❌

**Test Performed**:
```javascript
// Tried using Codex OAuth token with OpenAI SDK
const openai = new OpenAI({ apiKey: codexOAuthToken });
await openai.chat.completions.create({...});

Result: 401 Unauthorized
Error: "Missing scopes: model.request"
```

**Why it fails**:
- OAuth tokens from CLI tools have **CLI-specific scopes**
- Example: Codex token scopes = `["chatgpt.inference"]` (CLI access only)
- SDK clients need different scopes = `["model.request"]` (API access)
- **Cannot interchange them!**

---

## ✅ What DOES Work: Full CLI Tools Non-Interactively

### Test Results (Prompt: "calculate 3*67"):

**1. OpenAI Codex**
```bash
$ codex exec "calculate 3*67 and respond with just the number"
Result: 201 ✅ CORRECT

OAuth token location: ~/.codex/auth.json
Token format: {
  "OPENAI_API_KEY": null,
  "tokens": {
    "access_token": "eyJ..." (JWT),
    "refresh_token": "rt_...",
    "account_id": "8ad1f838-..."
  }
}
Subscription: ChatGPT Pro
```

**2. Anthropic Claude Code**
```bash
$ claude "calculate 3*67 and respond with just the number"
Result: 201 ✅ CORRECT

OAuth token location: macOS Keychain (service: "Claude Code-credentials")
Token format: {
  "claudeAiOauth": {
    "accessToken": "sk-ant-oat01-...",
    "refreshToken": "sk-ant-ort01-...",
    "scopes": ["user:inference", "user:profile"],
    "subscriptionType": "max"
  }
}
Subscription: Claude Max
```

**3. Google Gemini**
```bash
$ gemini -p "calculate 3*67 and respond with just the number" -y
Result: 429 Rate Limit (but auth succeeded! ✅)

OAuth token location: ~/.gemini/oauth_creds.json
Token format: {
  "access_token": "...",
  "refresh_token": "...",
  "expiry_date": ...,
  "scope": "...",
  "token_type": "Bearer"
}
```

---

## 🏗️ Correct Architecture

### Phase 1: OAuth Capture (Browser VMs)

**Already implemented and working**:

```
1. User clicks "Connect OpenAI" in Polydev
2. Browser VM created (Firecracker + Chromium + VNC)
3. Inside VM: Run `codex auth login`
4. CLI spawns OAuth server on http://localhost:1455
5. Browser redirects to localhost:1455/callback (INSIDE VM)
6. CLI saves tokens to ~/.codex/auth.json
7. VM Agent reads file via HTTP endpoint
8. Master-controller receives and encrypts tokens
9. Browser VM destroyed
10. Tokens stored in database (encrypted)
```

**Why Browser VMs needed**: OAuth redirects to `localhost:1455` - requires browser + CLI tool!

---

### Phase 5: Execution (Runtime Containers)

**MUST include**:

```dockerfile
# REQUIRED for execution
FROM node:20-slim  # OR node:20-alpine

# Install FULL CLI tools (not SDK clients!)
RUN npm install -g @openai/codex          # 378MB (unavoidable)
RUN npm install -g @anthropic-ai/claude-code  # Size TBD
RUN npm install -g @google/gemini-cli     # Size TBD

# Mount OAuth credential files
COPY auth.json /root/.codex/auth.json
COPY credentials.json /root/.config/claude/credentials.json
COPY oauth_creds.json /root/.gemini/oauth_creds.json

# Execute non-interactively
CMD codex exec "$PROMPT"
# OR
CMD claude "$PROMPT"
# OR
CMD gemini -p "$PROMPT" -y
```

**Why full CLI tools needed**:
- OAuth tokens have CLI-specific scopes
- SDK clients cannot use these tokens
- CLI tools handle token management, refresh, etc.

---

## 📊 Capacity Reality Check

### Original Target: 200+ containers @ 256MB RAM each

**Reality Check**: CLI tools are 400-700MB images

### Actual Capacity on 62GB RAM, 20 cores:

**Container Sizes** (measured):
- OpenAI (codex): 683MB
- Anthropic (claude-code): 444MB
- Google (gemini-cli): 745MB
- **Average**: ~600MB

**With 600MB containers**:
```
Available RAM: 62GB - 10GB (system) = 52GB
Containers: 52GB / 600MB = ~86 containers

With 256MB RAM allocation per container:
52GB / 256MB = 203 containers

But disk/layer size is 600MB!
Realistic concurrent: ~100 containers
```

**Still GREAT improvement**:
- Current (Firecracker VMs): 10-15 concurrent
- With containers: ~100 concurrent
- **Improvement**: 6-10x more capacity! ✅

---

## 🎯 V1 vs V2 Container Design

### V1 (Separate Images): CORRECT Approach ✅
```
polydev-openai-runtime:latest      683MB  (codex CLI)
polydev-anthropic-runtime:latest   444MB  (claude-code CLI)
polydev-google-runtime:latest      745MB  (gemini-cli CLI)

Total: 1.87GB for 3 images
Concurrent: ~100 (limited by RAM allocation, not image size)
```

**Pros**:
- ✅ Works with OAuth tokens
- ✅ Each provider isolated
- ✅ Proven to work

**Cons**:
- ❌ Large image sizes
- ❌ 3 images to maintain

### V2 (Unified SDK): WRONG Approach ❌
```
polydev-runtime:latest  155MB  (SDK clients only)

Concurrent: Would be 200+ if it worked
```

**Problems**:
- ❌ SDK clients can't use CLI OAuth tokens
- ❌ 401 errors due to scope mismatch
- ❌ Doesn't work!

---

## 🔄 Optimization Options

### Option A: Accept V1 (~100 concurrent)
**Pros**: Already built, tested, works
**Cons**: Half original target

### Option B: Optimize with Alpine
```
Try Alpine base instead of Debian
FROM node:20-alpine  # ~100MB smaller base
Result: Maybe 300-500MB per image
Concurrent: ~100-120 (marginal improvement)
```

### Option C: Multi-stage Build
```
# Build stage
FROM node:20-slim as builder
RUN npm install -g @openai/codex

# Runtime stage
FROM node:20-alpine
COPY --from=builder /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=builder /usr/local/bin/codex /usr/local/bin/codex

Result: Possibly 200-400MB
Concurrent: ~130-150
```

---

## 🎯 Recommendation

**Use V1 containers (separate, ~600MB each)**

**Rationale**:
1. ✅ Proven to work with OAuth
2. ✅ Already built and tested
3. ✅ 100 concurrent is 6-10x better than current
4. ✅ Simple architecture
5. ⚠️ Optimization yields marginal gains (100 → 130 concurrent)

**Phase 2 Status**: ✅ COMPLETE (with correct understanding)

**Next**: Move to Phase 3 (WebRTC) with confidence in container design

---

## 📝 Credential File Locations

### Codex (OpenAI)
- **macOS/Linux**: `~/.codex/auth.json`
- **Format**: JSON with `tokens.access_token`, `tokens.refresh_token`
- **Size**: ~4KB

### Claude Code (Anthropic)
- **macOS**: Keychain (`Claude Code-credentials`)
- **Linux**: `~/.claude/.credentials.json`
- **Format**: JSON with `claudeAiOauth.accessToken`, `claudeAiOauth.refreshToken`
- **Size**: ~2KB

### Gemini (Google)
- **macOS/Linux**: `~/.gemini/oauth_creds.json`
- **Format**: JSON with `access_token`, `refresh_token`, `expiry_date`
- **Size**: ~1.5KB

---

## 🚀 Container Execution Flow

```
1. User sends prompt via Polydev frontend
2. Master-controller:
   - Decrypts user OAuth tokens from database
   - Allocates warm container from pool
   - Injects tokens as credential files
3. Container starts with mounted credentials:
   - /root/.codex/auth.json (for OpenAI)
   - /root/.config/claude/credentials.json (for Anthropic)
   - /root/.gemini/oauth_creds.json (for Google)
4. Executes: codex exec "$PROMPT" (or claude/gemini equivalent)
5. CLI tool:
   - Reads credential file
   - Uses OAuth token to call API
   - Streams response
6. Container streams output back to master-controller
7. Container destroyed after completion
```

---

## ✅ Conclusion

**Phase 2: COMPLETE** with correct architecture understanding:
- Nomad operational ✅
- V1 containers are the CORRECT design ✅
- OAuth token flow confirmed ✅
- ~100 concurrent capacity realistic ✅
- 6-10x improvement over current ✅

**Ready for Phase 3**: WebRTC Streaming
