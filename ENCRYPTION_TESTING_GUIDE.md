# Encryption Phase 1 - Testing Guide

## Critical Fix Applied ✅

**Issue Fixed**: `ReferenceError: getEncryptionEngine is not defined`
**Location**: `src/lib/crypto/index.ts:22`
**Fix**: Added import statement for internal use of `getEncryptionEngine`

The application should now load without errors!

---

## Quick Verification Tests

### 1. Application Loads Successfully ✅

**What to test**: Verify the app loads without console errors

**Steps**:
1. Refresh your browser at `http://localhost:3000`
2. Open DevTools Console (F12)
3. Check for errors - you should NOT see:
   - ❌ `ReferenceError: getEncryptionEngine is not defined`
   - ❌ `EncryptionGuard initialization failed`

**Expected Result**:
- ✅ No console errors
- ✅ Page loads normally
- ✅ PostHog loads successfully

---

### 2. Encryption Status Indicator ✅

**What to test**: Visual encryption status in navigation bar

**Steps**:
1. Log in to your dashboard
2. Look at the top navigation bar
3. Find the encryption status icon (shield icon)

**Expected Result**:
- ✅ Shield icon appears next to user dropdown
- ✅ Icon shows "Encrypted" badge or shield with checkmark
- ✅ Hovering shows "Encryption Active" tooltip

**Location**: Navigation bar (top right, before user avatar)

---

### 3. Dashboard Encryption Badge ✅

**What to test**: Encryption status in dashboard header

**Steps**:
1. Navigate to `/dashboard`
2. Look at the page header (top right corner)

**Expected Result**:
- ✅ Green badge with "Encrypted" text appears
- ✅ Badge shows shield check icon

**Location**: Dashboard page header, right side

---

## Manual Testing Scenarios

### Test 1: Auto-Lock After Idle (15 Minutes)

**⚠️ WARNING**: Default timeout is 15 minutes. For faster testing, reduce timeout temporarily.

**Setup for Fast Testing**:
```typescript
// Temporarily add to src/components/EncryptionGuard.tsx
// In the useEffect, add:
setAutoLockTimeout(1); // Change to 1 minute for testing
```

**Steps**:
1. Log in and verify encryption is unlocked
2. Leave browser tab inactive for 1 minute (don't click, scroll, or type)
3. After timeout expires, you should be redirected to `/unlock`

**Expected Result**:
- ✅ After 1 minute idle, automatic redirect to unlock screen
- ✅ Unlock screen shows password input
- ✅ Return URL parameter is set (e.g., `/unlock?returnUrl=/dashboard`)

**Cleanup**: Remove the `setAutoLockTimeout(1)` line after testing

---

### Test 2: Unlock Screen Password Entry

**Prerequisites**: Trigger auto-lock (see Test 1) or navigate to `/unlock` manually

**Steps**:
1. Navigate to `/unlock` (or get auto-redirected)
2. Enter your password
3. Click "Unlock" button

**Expected Result**:
- ✅ Correct password → Redirects back to previous page
- ✅ Wrong password → Shows error message "Incorrect password"
- ✅ Show/hide password toggle works

---

### Test 3: Manual Lock Button

**Prerequisites**: You need to add a lock button somewhere in your UI

**Quick Test UI** (add to `/dashboard` temporarily):
```tsx
import { useEncryptionLock } from '@/components/EncryptionGuard'

function DashboardPage() {
  const { lockEncryption } = useEncryptionLock()

  return (
    <div>
      {/* Temporary test button */}
      <button onClick={lockEncryption} className="bg-red-500 text-white px-4 py-2">
        🔒 Lock Session (Test)
      </button>
    </div>
  )
}
```

**Steps**:
1. Click the lock button
2. Should immediately redirect to `/unlock`

**Expected Result**:
- ✅ Instant redirect to unlock screen
- ✅ Can unlock with password

---

### Test 4: Encryption Status Updates

**What to test**: Real-time status updates when locking/unlocking

**Steps**:
1. Observe encryption status badge (should show "Encrypted")
2. Trigger auto-lock or manual lock
3. Return to page after unlocking

**Expected Result**:
- ✅ Before lock: Badge shows "Encrypted" (green)
- ✅ After unlock: Badge updates back to "Encrypted" (green)
- ✅ Status changes happen in real-time (no page refresh needed)

---

## Advanced Testing (Coming in Phase 2)

### Test 5: End-to-End Chat Encryption

**⚠️ NOTE**: This requires integration with chat system (not yet implemented in Phase 1)

**Future Implementation**:
```typescript
import { encryptMessageContent, decryptMessageContent } from '@/lib/crypto'

// Before saving message
const encrypted = await encryptMessageContent("Hello, world!")

// After fetching message
const plaintext = await decryptMessageContent(encrypted)
```

**Steps** (once chat integration is done):
1. Send a chat message
2. Check database - should see encrypted ciphertext
3. View message in UI - should see decrypted plaintext
4. Lock session
5. Try to view message - should fail or redirect to unlock

---

## Troubleshooting

### Problem: Application still shows "getEncryptionEngine is not defined"

**Solution**:
1. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+F5)
2. Clear browser cache
3. Restart Next.js dev server: `npm run dev`
4. Check that `src/lib/crypto/index.ts` line 22 has:
   ```typescript
   import { getEncryptionEngine } from './encryption';
   ```

---

### Problem: Encryption status doesn't show in navigation

**Solution**:
1. Check `src/components/Navigation.tsx` line 154
2. Verify `<EncryptionStatus variant="icon" />` is present
3. Make sure you're logged in (status only shows for authenticated users)
4. Check browser console for component errors

---

### Problem: Auto-lock not triggering

**Solution**:
1. Verify `EncryptionGuard` is in `src/app/layout.tsx` (line 40)
2. Check browser console for initialization logs
3. Ensure you're truly idle (no mouse movement, clicks, scrolls, keyboard)
4. Try reducing timeout to 1 minute for testing (see Test 1)

---

### Problem: Unlock screen shows "No master key found"

**Solution**:
- This means encryption was never initialized for your account
- You need to implement signup integration (Phase 2)
- For now, encryption only works if you've initialized a master key

---

## Testing Checklist

Before marking Phase 1 as complete, verify:

- [ ] ✅ **Application loads without errors**
  - No console errors about `getEncryptionEngine`
  - PostHog initializes successfully
  - Pages render normally

- [ ] ✅ **UI Components Render**
  - Encryption status icon in navigation bar
  - Encryption status badge in dashboard
  - Unlock screen accessible at `/unlock`

- [ ] ⏳ **Session Management** (Optional - requires patience)
  - Auto-lock after 15 min idle (or 1 min if testing timeout reduced)
  - Manual lock button works (if implemented)
  - Unlock screen accepts password

- [ ] ⏳ **End-to-End Encryption** (Phase 2 - Not Yet Ready)
  - Messages encrypted before save
  - Messages decrypted after fetch
  - Cannot decrypt when locked

---

## Next Steps After Phase 1

Once basic testing is complete:

1. **Integrate with Signup Flow**
   - Call `initializeEncryption(password)` on signup
   - Store encryption_salt in user profile

2. **Integrate with Login Flow**
   - Call `unlockEncryption(password)` on login
   - Handle unlock failures

3. **Integrate with Chat System**
   - Encrypt messages before saving to DB
   - Decrypt messages after fetching from DB

4. **Add Password Change Flow**
   - Re-encrypt master key with new password
   - Update salt in database

5. **Add Account Recovery Warning**
   - Warn users that password loss = data loss
   - Implement recovery key export (optional)

---

## Quick Test Script

Copy-paste this into browser console to verify basic functionality:

```javascript
// Check if encryption engine is accessible
import('@/lib/crypto').then(crypto => {
  console.log('✅ Crypto module loaded')
  console.log('Encryption unlocked?', crypto.isEncryptionUnlocked())

  // Try to get engine (should not error)
  try {
    crypto.getEncryptionEngine()
    console.log('✅ Encryption engine accessible')
  } catch (e) {
    console.error('❌ Error getting engine:', e)
  }
})
```

---

**Phase 1 Status**: ✅ Ready for Basic Testing

**Critical Blocker**: ✅ RESOLVED (getEncryptionEngine import fixed)

**Production Ready**: ⏳ Pending integration with auth/chat flows
