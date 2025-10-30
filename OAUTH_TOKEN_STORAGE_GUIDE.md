# OAuth Token Storage - Complete Documentation

## Local Machine (macOS) Verified Locations

### 1. OpenAI Codex
**Location**: `~/.codex/auth.json`
**Format**: JSON file (plaintext)
**Permissions**: 600 (read/write owner only)

**Structure**:
```json
{
  "OPENAI_API_KEY": null,
  "tokens": {
    "id_token": "eyJ... (JWT)",
    "access_token": "eyJ... (JWT)",
    "refresh_token": "rt_...",
    "account_id": "8ad1f838-391a-4e43-9313-..."
  },
  "last_refresh": "2025-10-27T20:25:06.006080Z"
}
```

**Key Fields**:
- `tokens.access_token`: OAuth JWT for API access
- `tokens.refresh_token`: For token renewal
- `tokens.account_id`: ChatGPT account ID

**Subscription**: ChatGPT Pro ($20/month)

---

### 2. Anthropic Claude Code
**Location (macOS)**: macOS Keychain
**Service Name**: `Claude Code-credentials`
**Account**: Current user (e.g., "venkat")

**Access via**:
```bash
security find-generic-password -s "Claude Code-credentials" -w
```

**Location (Linux)**: `~/.claude/.credentials.json`

**Structure**:
```json
{
  "claudeAiOauth": {
    "accessToken": "sk-ant-oat01-...",
    "refreshToken": "sk-ant-ort01-...",
    "expiresAt": 1761871395539,
    "scopes": ["user:inference", "user:profile"],
    "subscriptionType": "max"
  },
  "mcpOAuth": {
    "vercel|...": { ... },
    "exa|...": { ... },
    "stripe|...": { ... }
  }
}
```

**Key Fields**:
- `claudeAiOauth.accessToken`: OAuth access token (sk-ant-oat01-...)
- `claudeAiOauth.refreshToken`: For token renewal (sk-ant-ort01-...)
- `claudeAiOauth.scopes`: ["user:inference", "user:profile"]
- `claudeAiOauth.subscriptionType`: "max" or "pro"
- `mcpOAuth`: MCP server OAuth tokens (Vercel, Stripe, Exa, etc.)

**Subscription**: Claude Max ($60/month)

---

### 3. Google Gemini CLI
**Location**: `~/.gemini/oauth_creds.json`
**Format**: JSON file (plaintext)
**Permissions**: 600 (read/write owner only)

**Structure**:
```json
{
  "access_token": "ya29.a0...",
  "expiry_date": 1730409494863,
  "id_token": "eyJ...",
  "refresh_token": "1//0e...",
  "scope": "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/cloudcode profile",
  "token_type": "Bearer"
}
```

**Key Fields**:
- `access_token`: OAuth 2.0 access token
- `refresh_token`: For token renewal
- `expiry_date`: Unix timestamp (milliseconds)
- `scope`: Granted permissions

**Subscription**: FREE with personal Google account!

---

## VPS (Linux) Credential Paths

### For Browser VMs (OAuth Capture):
```bash
/root/.codex/auth.json           # Codex
/root/.config/claude/credentials.json  # Claude Code
/root/.gemini/oauth_creds.json   # Gemini
```

### For Runtime Containers (Execution):
```bash
# Mount these files into containers
/runtime-creds/user-{userId}/codex/auth.json
/runtime-creds/user-{userId}/claude/credentials.json
/runtime-creds/user-{userId}/gemini/oauth_creds.json
```

---

## Token Characteristics

### All 3 Use OAuth (NOT API Keys!)

| Provider | Token Prefix | Type | Scopes | Expiry |
|----------|--------------|------|--------|--------|
| OpenAI | `eyJ...` | JWT | CLI-specific | Expires, refreshable |
| Anthropic | `sk-ant-oat01-...` | OAuth token | user:inference, user:profile | Expires, refreshable |
| Google | `ya29.a0...` | OAuth 2.0 | cloudcode, profile | Expires, refreshable |

### Why SDK Clients Don't Work:

**OpenAI SDK Test**:
```javascript
const openai = new OpenAI({ apiKey: codexOAuthToken });
Result: 401 Missing scopes: model.request
```

**Reason**: OAuth tokens have **CLI-specific scopes**, not API scopes!

---

## Credential Injection in Containers

### During Container Start:

```bash
# Create volume with user credentials
docker volume create user-123-creds

# Copy credential files to volume
docker cp /encrypted-storage/user-123/codex-auth.json \
  user-123-creds:/root/.codex/auth.json

docker cp /encrypted-storage/user-123/claude-creds.json \
  user-123-creds:/root/.config/claude/credentials.json

docker cp /encrypted-storage/user-123/gemini-creds.json \
  user-123-creds:/root/.gemini/oauth_creds.json

# Start container with volume mounted
docker run -v user-123-creds:/root polydev-openai-runtime:latest
```

### Container Reads Automatically:

```bash
# Inside container, CLI tools automatically find credentials
codex exec "prompt"  # Reads ~/.codex/auth.json
claude "prompt"      # Reads ~/.config/claude/credentials.json
gemini -p "prompt"   # Reads ~/.gemini/oauth_creds.json
```

---

## Security Considerations

### At Rest (Database):
```
1. User completes OAuth in Browser VM
2. Credentials captured from VM
3. Encrypted with AES-256-GCM (master key)
4. Stored in database as encrypted blob
5. Browser VM destroyed
```

### In Transit (Container Execution):
```
1. Master-controller decrypts credentials
2. Creates temp volume with credential files
3. Container mounts volume (read-only)
4. Executes CLI command
5. Container destroyed
6. Volume destroyed
```

### Token Refresh:

All 3 CLI tools handle token refresh automatically:
- Codex: Checks expiry, refreshes if needed
- Claude: Auto-refreshes before expiry
- Gemini: Refreshes when expired

---

## Credential File Permissions

### On Filesystem:
```bash
# All credential files should be 600 (owner read/write only)
chmod 600 ~/.codex/auth.json
chmod 600 ~/.config/claude/credentials.json
chmod 600 ~/.gemini/oauth_creds.json
```

### In Containers:
```bash
# Mount as read-only for security
docker run -v creds:/root:ro polydev-runtime:latest
```

---

## Testing Credential Files

### Test if credentials are valid:

```bash
# OpenAI Codex
codex exec "echo test"  # Will fail if creds invalid

# Anthropic Claude
claude "echo test"  # Will fail if creds invalid

# Google Gemini
gemini -p "echo test" -y  # Will fail if creds invalid
```

### Check expiry:

```bash
# Codex
cat ~/.codex/auth.json | jq '.last_refresh'

# Claude (macOS)
security find-generic-password -s "Claude Code-credentials" -w | jq '.claudeAiOauth.expiresAt'

# Gemini
cat ~/.gemini/oauth_creds.json | jq '.expiry_date'
```

---

## Summary

✅ **All 3 credential locations verified**
✅ **Token formats documented**
✅ **macOS Keychain for Claude confirmed**
✅ **File-based storage for Codex and Gemini**
✅ **Container injection strategy defined**
✅ **Security model documented**

**Ready for**: Phase 5 implementation with proper credential handling
