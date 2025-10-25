# OAuth Credentials Fix - Ready for Testing

## Summary

Fixed the issue where Remote CLI OAuth credentials weren't being detected after successful authentication. The problem was that credentials were being stored in the database, but the Next.js endpoint wasn't retrieving them when the Browser VM was destroyed.

## What Was Fixed

### Problem
1. User completes OAuth in browser (sees "Authentication successful" page)
2. Browser VM destroyed after 30-second grace period
3. Frontend continues polling `/api/auth/session/{sessionId}/credentials`
4. Since VM destroyed, OAuth agent unreachable → timeout errors
5. Success screen never shown, credentials not detected

### Solution Implemented

#### **Master-Controller** (`/api/auth/session/:sessionId/credentials/status`)
- Already fixed in previous work
- When session status is `completed`, retrieves credentials from database
- Decrypts stored credentials using `credentialEncryption.decrypt()`
- Returns credentials in same format as OAuth agent

#### **Next.js Frontend** (`/api/auth/session/[sessionId]/credentials/route.ts`)
- **NEW FIX** - Lines 43-98
- Checks if `session.status === 'completed'`
- If yes, calls master-controller to get credentials from database
- Returns credentials with `status: 'ready'` to frontend
- Frontend shows success screen and stops polling

## Complete Flow After Fix

```
1. User completes OAuth → "Authentication successful" shown
2. Backend detects credentials, stores in DB encrypted
3. Session marked as status='completed' in database
4. Browser VM destroyed after 30 seconds
5. Frontend polls /api/auth/session/{sessionId}/credentials
6. Next.js checks session.status in database
7. If completed → calls master-controller
8. Master-controller retrieves from DB, decrypts
9. Returns credentials to Next.js
10. Next.js returns to frontend with status: 'ready'
11. Frontend shows success screen ✅
12. No more timeout errors ✅
```

## Deployment Status

✅ **Master-Controller**
- Service running and restarted
- Latest code deployed at `135.181.138.102:4000`
- Fix active in `/api/auth/session/:sessionId/credentials/status`

✅ **Next.js Frontend**
- Committed: `8b75434` - "Fix OAuth credentials retrieval after VM destruction"
- Pushed to GitHub main branch
- Vercel deployment triggered automatically
- Fix active in `/api/auth/session/[sessionId]/credentials/route.ts`

## Testing Instructions

### Test 1: Gemini OAuth Flow

1. **Navigate to Remote CLI**
   ```
   https://polydev-ai.vercel.app/dashboard/remote-cli
   ```

2. **Start OAuth Flow**
   - Click "Connect" on Google Gemini provider
   - Browser VM will be created
   - noVNC window should appear

3. **Complete OAuth**
   - Follow Gemini authentication in browser
   - Sign in with Google account
   - Grant permissions
   - Wait for "Authentication successful" page

4. **Verify Credentials Detection** (This is what was broken)
   - ✅ Frontend should detect credentials within 5 seconds
   - ✅ Success screen should appear
   - ✅ No timeout errors in console
   - ✅ Session marked as completed

5. **Check Logs** (Optional)
   ```bash
   # On master-controller server
   ssh root@135.181.138.102
   tail -f /opt/master-controller/logs/app.log | grep "credentials"
   ```

   Expected logs:
   ```
   [Credentials Proxy] Session completed, retrieving from master-controller database
   [Credentials Proxy] Successfully retrieved credentials from database
   ```

### Test 2: Verify Credentials Persisted

After completing Test 1:

1. **Refresh the page**
   - OAuth status should still show "Connected"
   - Completion date should be displayed

2. **Try to reconnect**
   - Click "Reconnect Gemini"
   - Should start new OAuth flow (existing creds replaced)

### Test 3: Database Verification

```bash
# SSH to master-controller
ssh root@135.181.138.102

# Check PostgreSQL for completed sessions
cd /opt/master-controller
node -e "
const db = require('./src/db');
(async () => {
  const sessions = await db.authSessions.findByStatus('completed');
  console.log('Completed Sessions:', JSON.stringify(sessions, null, 2));
  process.exit(0);
})();
"
```

Expected output: Should show completed Gemini sessions with timestamps

## Expected Behavior vs Previous Behavior

### ❌ Previous Behavior (Broken)
```
User completes OAuth
→ "Authentication successful" shown
→ VM destroyed after 30s
→ Frontend keeps polling forever
→ Timeout errors: "Agent not reachable"
→ Success screen never appears
```

### ✅ New Behavior (Fixed)
```
User completes OAuth
→ "Authentication successful" shown
→ Credentials stored in DB
→ VM destroyed after 30s
→ Frontend polls Next.js
→ Next.js retrieves from DB
→ Success screen appears within 5s
→ No timeout errors
```

## What to Watch For

### ✅ Success Indicators
- No `[Credentials Proxy] Agent not reachable` errors after OAuth completes
- Log message: `[Credentials Proxy] Session completed, retrieving from database`
- Log message: `[Credentials Proxy] Successfully retrieved credentials`
- Success screen appears quickly (< 5 seconds)
- Provider shows "Connected" badge

### ❌ Failure Indicators
- Continuous timeout errors after "Authentication successful"
- Success screen never appears
- Frontend keeps polling indefinitely
- Error: `Failed to retrieve stored credentials`

## Troubleshooting

### If credentials not detected:

1. **Check session status in database**
   ```bash
   ssh root@135.181.138.102 "cd /opt/master-controller && node -e \"
   const db = require('./src/db');
   (async () => {
     const session = await db.authSessions.findBySessionId('SESSION_ID_HERE');
     console.log(JSON.stringify(session, null, 2));
     process.exit(0);
   })();
   \""
   ```

2. **Check if credentials exist**
   ```bash
   ssh root@135.181.138.102 "cd /opt/master-controller && node -e \"
   const db = require('./src/db');
   (async () => {
     const creds = await db.credentials.find('USER_ID', 'gemini_cli');
     console.log('Credentials exist:', !!creds);
     process.exit(0);
   })();
   \""
   ```

3. **Check master-controller logs**
   ```bash
   ssh root@135.181.138.102 "tail -50 /opt/master-controller/logs/app.log"
   ```

4. **Check Next.js logs on Vercel**
   - Go to Vercel dashboard
   - Check deployment logs
   - Look for credentials proxy errors

## Files Modified

### Frontend (`/src/app/api/auth/session/[sessionId]/credentials/route.ts`)
- Lines 43-98: Added logic to retrieve from database when session completed
- Calls master-controller endpoint to get decrypted credentials
- Returns credentials with `status: 'ready'` to frontend

### Backend (`/master-controller/src/routes/auth.js`)
- Lines 146-254: Already fixed in previous work
- Retrieves credentials from database when session completed
- Decrypts using `credentialEncryption.decrypt()`
- Returns in same format as OAuth agent

## Git Commits

```bash
# Latest commit with the fix
git log --oneline -1
# 8b75434 Fix OAuth credentials retrieval after VM destruction

# View changes
git show 8b75434
```

## Ready to Test

The fix is now fully deployed and ready for testing. Please test the Gemini OAuth flow following the instructions above.

**Expected Result**: OAuth should complete successfully, credentials should be detected within 5 seconds, and the success screen should appear with no timeout errors.
