# User-Guided Authentication Implementation Summary

## Overview

Successfully transitioned from automated OAuth flow to user-guided terminal-first authentication approach. This implementation respects the natural flow of CLI tools (Claude Code, Codex, Gemini CLI) and avoids predicting their interactive prompts which vary by version.

## ✅ Frontend Changes Completed

### File Modified: `src/app/dashboard/remote-cli/auth/page.tsx`

#### State Management Changes
**Removed:**
- `oauthUrl` state - No longer extracting OAuth URLs programmatically
- `pollingOAuthUrl` state - No longer polling for OAuth URLs
- `pollingCredentials` state - Consolidated into single credential detection

**Added:**
- `credentialsDetected` state - Tracks when backend detects saved credentials after user completes auth

#### Logic Removed
1. **OAuth URL Polling (lines 62-93 original)**
   - Removed entire useEffect that polled `/api/vm/auth/session/${sessionId}/oauth-url`
   - This was trying to extract OAuth URL from CLI output

2. **Duplicate Credential Polling (lines 90-120 original)**
   - Removed old credential polling that depended on `showBrowser` and `pollingCredentials`
   - Consolidated into single credential detection useEffect

3. **Auto-Navigation Logic (lines 130-153 original)**
   - Removed automatic navigation to OAuth URL
   - Removed `/api/vm/auth/session/${sessionId}/open-url` POST calls
   - Firefox navigation now happens naturally through CLI tool

4. **handleOpenOAuth Function**
   - Removed function that opened OAuth URL in new window
   - No longer attempting to programmatically control browser

#### New Functionality Added

**1. Simple Credential Detection Polling**
```typescript
useEffect(() => {
  if (!vmInfo || !sessionId || credentialsDetected) return;

  const pollCredentials = async () => {
    try {
      const res = await fetch(`/api/vm/auth/session/${sessionId}/credentials-status`, {
        cache: 'no-store'
      });

      if (!res.ok) return;

      const data = await res.json().catch(() => null);
      if (data?.authenticated) {
        setCredentialsDetected(true);
        setTimeout(loadSession, 2000);
      }
    } catch (err) {
      // Silently continue polling
    }
  };

  pollCredentials();
  const interval = setInterval(pollCredentials, 5000); // Poll every 5s
  return () => clearInterval(interval);
}, [vmInfo, sessionId, credentialsDetected]);
```

**2. Helper Function for CLI Commands**
```typescript
const getCliCommand = (providerId: string) => {
  const commands: Record<string, string> = {
    claude_code: 'claude',
    codex: 'codex',
    gemini_cli: 'gemini',
  };
  return commands[providerId] || providerId;
};
```

**3. New Terminal-First UI (4-Step Process)**

**Step 1: Run CLI Command**
- Shows command in terminal-style box: `$ claude` / `$ codex` / `$ gemini`
- Copy button for easy clipboard access
- Clear instructions to type in terminal below

**Step 2: Follow Interactive Prompts**
- Lists what CLI will guide user through:
  - Theme selection
  - Login method (subscription or API key)
  - OAuth URL generation
  - Browser authentication

**Step 3: Embedded Terminal & Browser**
- Same noVNC iframe (600px height)
- Updated description: "Terminal and browser running in isolated VM"
- "Open in New Tab" button for better visibility
- **Removed**: OAuth URL copy button
- **Removed**: Auto-navigation logic

**Step 4: Automatic Credential Detection**
- Shows when `credentialsDetected` is true
- Green success banner: "Credentials detected and saved!"
- Automatically reloads session to advance to completion

### Build Verification
✅ TypeScript compilation passes
✅ Next.js build successful (exit code 0)
✅ No type errors related to removed OAuth logic

## 📋 Backend Work Required

### 1. Master Controller Credential Detection Endpoint

**File to Create/Update:** `/opt/master-controller/src/routes/auth.js`

**New Endpoint:** `GET /api/auth/session/:sessionId/credentials/status`

**Requirements:**
- Check for credential files in VM filesystem:
  - Claude Code: `~/.config/claude/*`
  - Codex CLI: `~/.openai/*` or `~/.codex/*`
  - Gemini CLI: `~/.config/gemini/*` or appropriate path
- Return JSON: `{ authenticated: boolean, credentialPath?: string }`
- If authenticated, trigger credential storage

**Integration Point:**
- Frontend already polling this endpoint via proxy: `/api/vm/auth/session/${sessionId}/credentials-status`
- Next.js proxy at: `src/app/api/vm/auth/session/[sessionId]/credentials-status/route.ts`

### 2. VM Browser Agent Credential Detection

**File to Modify:** `/opt/master-controller/vm-browser-agent/server.js`

**New Functionality Needed:**
- File system monitoring using Node.js `fs.watch()` or `chokidar`
- Watch directories:
  ```javascript
  const CREDENTIAL_PATHS = {
    claude_code: '/root/.config/claude/',
    codex: '/root/.openai/',
    gemini_cli: '/root/.config/gemini/'
  };
  ```
- When files appear in watched directories:
  1. Read credential files
  2. Encrypt using AES-256-GCM (symmetric encryption)
  3. Send to master-controller for database storage
  4. Update session status to 'completed'

**Encryption Example:**
```javascript
const crypto = require('crypto');

function encryptCredentials(credentialData, encryptionKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);

  let encrypted = cipher.update(JSON.stringify(credentialData), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}
```

### 3. Database Schema for Credential Storage

**Table to Create/Modify:** `cli_credentials`

```sql
CREATE TABLE IF NOT EXISTS public.cli_credentials (
  credential_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'claude_code', 'codex', 'gemini_cli'
  encrypted_data TEXT NOT NULL, -- Encrypted credential JSON
  encryption_iv TEXT NOT NULL, -- Initialization vector for decryption
  encryption_auth_tag TEXT NOT NULL, -- GCM auth tag for integrity
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  UNIQUE(user_id, provider)
);

-- RLS Policies
ALTER TABLE public.cli_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credentials"
  ON public.cli_credentials
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credentials"
  ON public.cli_credentials
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credentials"
  ON public.cli_credentials
  FOR UPDATE
  USING (auth.uid() = user_id);
```

### 4. Credential Retrieval for Existing Sessions

**When to Retrieve:**
- User starts new chat session with already-authenticated provider
- Check `cli_credentials` table for matching user_id + provider
- If found, decrypt and inject into VM before starting CLI

**VM Injection Process:**
1. Query database for credentials
2. Decrypt using stored IV and auth tag
3. Write decrypted files to appropriate VM paths
4. Set correct permissions (chmod 600)
5. Start CLI tool - credentials already present

**Code Location:** `/opt/master-controller/src/services/vm-manager.js`

**New Function Needed:**
```javascript
async function injectCredentialsIfAvailable(vmId, userId, provider) {
  // 1. Query database
  const credentials = await supabase
    .from('cli_credentials')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle();

  if (!credentials) return false; // No saved credentials

  // 2. Decrypt
  const decrypted = decryptCredentials(
    credentials.encrypted_data,
    credentials.encryption_iv,
    credentials.encryption_auth_tag
  );

  // 3. Inject into VM filesystem via vm-browser-agent
  await fetch(`http://${vmIp}:3000/inject-credentials`, {
    method: 'POST',
    body: JSON.stringify({
      provider,
      credentials: decrypted
    })
  });

  return true; // Credentials injected
}
```

### 5. VM Browser Agent Credential Injection Endpoint

**File to Modify:** `/opt/master-controller/vm-browser-agent/server.js`

**New Endpoint:** `POST /inject-credentials`

```javascript
app.post('/inject-credentials', async (req, res) => {
  try {
    const { provider, credentials } = req.body;

    const paths = {
      claude_code: '/root/.config/claude/',
      codex: '/root/.openai/',
      gemini_cli: '/root/.config/gemini/'
    };

    const targetDir = paths[provider];
    if (!targetDir) {
      return res.status(400).json({ error: 'Unknown provider' });
    }

    // Create directory if doesn't exist
    await fs.promises.mkdir(targetDir, { recursive: true });

    // Write credential files
    for (const [filename, content] of Object.entries(credentials)) {
      const filepath = path.join(targetDir, filename);
      await fs.promises.writeFile(filepath, content, { mode: 0o600 });
    }

    res.json({ success: true, injected: true });
  } catch (error) {
    console.error('Credential injection error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

## Architecture Benefits

### Before (Automated OAuth)
❌ Trying to extract OAuth URL from CLI stdout/stderr
❌ Predicting CLI tool flow (varies by version)
❌ Auto-navigating Firefox to extracted URL
❌ Complex state machine with timing dependencies
❌ Breaks when CLI tools update prompts

### After (User-Guided)
✅ User runs native CLI command in terminal
✅ CLI tool handles its own interactive flow
✅ Works with any CLI tool version
✅ Natural user experience (what they expect)
✅ Simple credential detection via filesystem monitoring
✅ Automatic credential reuse for future sessions

## Testing Checklist

### Frontend Testing
- [ ] Visit `/dashboard/remote-cli/auth?session=xxx&provider=claude_code`
- [ ] Verify 4-step UI displays correctly
- [ ] Check terminal command shows: `$ claude`
- [ ] Confirm noVNC iframe loads (600px height)
- [ ] Verify "Open in New Tab" button works
- [ ] Confirm no OAuth URL buttons appear
- [ ] Check credential detection polling starts when VM ready

### Backend Testing (After Implementation)
- [ ] Run `claude` command in VM terminal
- [ ] Follow interactive prompts (theme, login method)
- [ ] Complete OAuth in Firefox
- [ ] Verify credential files appear in `~/.config/claude/`
- [ ] Confirm credential detection endpoint returns `{ authenticated: true }`
- [ ] Check credentials encrypted in database
- [ ] Start new session - verify credentials auto-injected
- [ ] Confirm CLI starts immediately without re-auth

## Deployment Steps

1. ✅ Frontend changes (completed - ready to deploy)
2. ⏳ Database migration for `cli_credentials` table
3. ⏳ Master-controller credential detection endpoint
4. ⏳ VM browser-agent filesystem monitoring
5. ⏳ Master-controller credential injection logic
6. ⏳ VM browser-agent injection endpoint
7. ⏳ Golden snapshot rebuild with updated agent
8. ⏳ Integration testing with real CLI tools

## Security Considerations

### Encryption
- Using AES-256-GCM (authenticated encryption)
- Unique IV per credential set
- Auth tag validates integrity
- Encryption key stored securely (environment variable)

### Storage
- Credentials never stored in plaintext
- Row-Level Security (RLS) ensures users only access own credentials
- Database backups encrypted at rest

### VM Isolation
- Credentials only injected into user's own VM
- VMs destroyed after use
- No credential persistence in golden snapshot
- Network isolation prevents cross-VM access

## Performance Impact

### Reduced Complexity
- **Before**: 3 polling loops (session, OAuth URL, credentials)
- **After**: 2 polling loops (session, credentials)
- Eliminated OAuth URL extraction logic
- Simplified state machine

### Faster Auth Flow
- No waiting for OAuth URL parsing
- No artificial delays for auto-navigation
- User controls pacing (interactive prompts)
- Credential detection lightweight (filesystem check)

## Next Steps

Priority order for backend implementation:

1. **Implement database table** (5 min)
   - Run migration
   - Verify RLS policies

2. **Add filesystem monitoring to vm-browser-agent** (30 min)
   - Watch credential directories
   - Trigger on file creation
   - Encrypt and send to master-controller

3. **Create credential storage endpoint in master-controller** (20 min)
   - Receive encrypted credentials
   - Store in database
   - Update session status

4. **Implement credential detection endpoint** (15 min)
   - Check for credentials in database
   - Return authentication status

5. **Add credential injection logic** (45 min)
   - Query database for existing credentials
   - Decrypt using IV/auth tag
   - Inject into VM before CLI start
   - Handle file permissions

6. **Integration testing** (1-2 hours)
   - Test full flow with each CLI tool
   - Verify credential reuse works
   - Check encryption/decryption
   - Validate RLS policies

Total estimated time: **3-4 hours** for complete backend implementation and testing
