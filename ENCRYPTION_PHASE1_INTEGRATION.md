# Zero-Knowledge Encryption - Phase 1 Integration Guide

## Overview

Phase 1 of the zero-knowledge encryption system is now complete! This document explains how to integrate the encryption components into your application.

## What's Included

### 1. Core Components Created

- ✅ **Unlock Screen** (`src/app/unlock/page.tsx`)
  - Full-screen unlock UI
  - Password input with show/hide toggle
  - Error handling for wrong passwords
  - Automatic redirection after unlock

- ✅ **Encryption Guard** (`src/components/EncryptionGuard.tsx`)
  - Monitors encryption session state
  - Automatically redirects to unlock screen on timeout
  - Provides `useEncryptionLock` hook for manual locking

- ✅ **Encryption Status** (`src/components/EncryptionStatus.tsx`)
  - Visual indicators for encryption state
  - Multiple variants: badge, full card, icon
  - Real-time status updates

### 2. Features Implemented

- ✅ **Idle Timeout & Session Management** (`src/lib/auth/encryption-auth.ts`)
  - Auto-lock after 15 minutes of inactivity
  - Activity monitoring (mouse, keyboard, clicks, scrolls)
  - Configurable timeout duration
  - Event system for lock notifications

- ✅ **Zero-Knowledge Encryption** (`src/lib/crypto/encryption.ts`)
  - AES-256-GCM encryption
  - PBKDF2 key derivation (100,000 iterations)
  - Master key stored in IndexedDB (encrypted)
  - Password never sent to server

## Integration Steps

### Step 1: Add EncryptionGuard to Root Layout

Add the `EncryptionGuard` component to your root layout to enable auto-lock functionality:

```tsx
// src/app/layout.tsx
import { EncryptionGuard } from '@/components/EncryptionGuard'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <EncryptionGuard />
        {children}
      </body>
    </html>
  )
}
```

### Step 2: Add Encryption Status to Dashboard

Show encryption status to users in your dashboard or navigation:

```tsx
// src/app/dashboard/page.tsx or src/components/Navigation.tsx
import { EncryptionStatus } from '@/components/EncryptionStatus'

export default function Dashboard() {
  return (
    <div>
      {/* Badge variant for navigation */}
      <nav>
        <EncryptionStatus variant="badge" />
      </nav>

      {/* Full card variant for dashboard */}
      <div className="dashboard">
        <EncryptionStatus variant="full" showDetails />
      </div>
    </div>
  )
}
```

### Step 3: Add Manual Lock Button (Optional)

Allow users to manually lock their session:

```tsx
import { useEncryptionLock } from '@/components/EncryptionGuard'
import { Lock } from 'lucide-react'

function SecuritySettings() {
  const { lockEncryption } = useEncryptionLock()

  return (
    <button onClick={lockEncryption} className="flex items-center gap-2">
      <Lock className="h-4 w-4" />
      Lock Session
    </button>
  )
}
```

### Step 4: Initialize Encryption on Signup

When a new user signs up, initialize their encryption:

```tsx
import { signupWithEncryption } from '@/lib/auth/encryption-auth'

async function handleSignup(email: string, password: string) {
  // 1. Create Supabase user account
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) throw error

  // 2. Initialize encryption (generates master key)
  const { keyId, salt } = await signupWithEncryption(password)

  // 3. Store salt in user profile (for future unlocks)
  await supabase
    .from('profiles')
    .update({
      encryption_salt: salt,
      encryption_key_id: keyId,
    })
    .eq('id', data.user.id)
}
```

### Step 5: Unlock Encryption on Login

When an existing user logs in, unlock their encryption:

```tsx
import { loginWithEncryption } from '@/lib/auth/encryption-auth'

async function handleLogin(email: string, password: string) {
  // 1. Authenticate with Supabase
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error

  // 2. Unlock encryption with same password
  const unlocked = await loginWithEncryption(password)

  if (!unlocked) {
    console.error('Failed to unlock encryption')
    // Handle encryption unlock failure
  }
}
```

### Step 6: Encrypt/Decrypt Chat Messages

Use encryption when saving and retrieving chat messages:

```tsx
import { encryptMessageContent, decryptMessageContent } from '@/lib/crypto'

// Encrypt before saving
async function saveMessage(content: string) {
  const encrypted = await encryptMessageContent(content)

  await supabase
    .from('messages')
    .insert({
      encrypted_content: encrypted.ciphertext,
      encryption_metadata: encrypted.metadata,
    })
}

// Decrypt after fetching
async function loadMessages() {
  const { data } = await supabase
    .from('messages')
    .select('encrypted_content, encryption_metadata')

  const messages = await Promise.all(
    data.map(async (msg) => {
      const content = await decryptMessageContent({
        ciphertext: msg.encrypted_content,
        metadata: msg.encryption_metadata,
      })

      return { ...msg, content }
    })
  )

  return messages
}
```

## User Flow

### Normal Flow
1. User signs up → Encryption initialized
2. User sets password → Master key generated and encrypted
3. User logs in → Encryption unlocked automatically
4. User chats → Messages encrypted before sending
5. User goes idle (15 min) → Session auto-locks
6. User returns → Redirected to unlock screen
7. User unlocks → Returns to previous page

### Lock/Unlock Flow
1. **Auto-lock triggers** (15 min idle)
2. `encryption:locked` event fires
3. `EncryptionGuard` catches event
4. User redirected to `/unlock?returnUrl=/current-page`
5. User enters password
6. Encryption unlocked
7. User redirected back to `returnUrl`

## Testing Checklist

Use this checklist to verify Phase 1 implementation:

- [ ] **Unlock Screen**
  - [ ] Navigate to `/unlock` and verify UI renders
  - [ ] Enter wrong password → Shows error
  - [ ] Enter correct password → Redirects to dashboard
  - [ ] Return URL parameter works (`/unlock?returnUrl=/chat`)

- [ ] **Auto-Lock**
  - [ ] Set timeout to 1 minute for testing: `setAutoLockTimeout(1)`
  - [ ] Wait 1 minute idle → Auto-redirect to unlock screen
  - [ ] Unlock → Return to previous page

- [ ] **Encryption Status**
  - [ ] Badge shows "Encrypted" when unlocked
  - [ ] Badge shows "Locked" when locked
  - [ ] Full card shows encryption details
  - [ ] Status updates when lock state changes

- [ ] **Manual Lock**
  - [ ] Click lock button → Redirects to unlock screen
  - [ ] Unlock → Returns to previous page

- [ ] **End-to-End Encryption**
  - [ ] Send message → Encrypted before saving to DB
  - [ ] Fetch message → Decrypted after loading from DB
  - [ ] Lock session → Cannot decrypt messages
  - [ ] Unlock session → Can decrypt messages again

## Configuration

### Change Auto-Lock Timeout

Default is 15 minutes. To change:

```tsx
import { setAutoLockTimeout } from '@/lib/auth/encryption-auth'

// Set to 30 minutes
setAutoLockTimeout(30)

// Set to 5 minutes
setAutoLockTimeout(5)
```

### Custom Unlock Page Styling

The unlock page uses Tailwind CSS. Customize colors in:
`src/app/unlock/page.tsx`

## Security Guarantees

✅ **Password never sent to server** - Only used client-side for key derivation
✅ **Master key never sent to server** - Stored encrypted in IndexedDB
✅ **Server compromise does NOT expose data** - Server only sees encrypted blobs
✅ **Zero-knowledge architecture** - We cannot decrypt user data
✅ **Auto-lock protects against idle sessions** - 15-minute inactivity timeout

## Next Steps (Phase 2)

Future enhancements not yet implemented:

- [ ] Password strength indicator during signup
- [ ] Master password change flow
- [ ] Account recovery (warning: data loss by design)
- [ ] Multi-device sync (challenging with zero-knowledge)
- [ ] Encrypted file attachments
- [ ] Encrypted voice memos

## Troubleshooting

### "Session locked" error when trying to encrypt
- User needs to unlock their session first
- Redirect them to `/unlock`

### Encryption unlocks successfully but messages still encrypted
- Check that `encryptMessageContent` is being called before saving
- Check that `decryptMessageContent` is being called after loading

### Auto-lock not working
- Ensure `EncryptionGuard` is added to root layout
- Check browser console for initialization logs
- Verify `initializeEncryptionAuth()` is being called

### Wrong password error persists
- User may have entered wrong password during signup
- No password reset = data loss (by design for zero-knowledge)
- User must create new account

## API Reference

### Encryption Auth Functions

```typescript
// Initialize encryption for new user
signupWithEncryption(password: string): Promise<{ keyId: string; salt: string }>

// Unlock encryption for existing user
loginWithEncryption(password: string): Promise<boolean>

// Check if session is unlocked
isSessionUnlocked(): boolean

// Lock session
lockEncryptionSession(): void

// Logout and clear all keys
logoutWithEncryption(): Promise<void>

// Set auto-lock timeout (minutes)
setAutoLockTimeout(minutes: number): void
```

### Encryption Functions

```typescript
// Encrypt message content
encryptMessageContent(content: string): Promise<EncryptedData>

// Decrypt message content
decryptMessageContent(data: EncryptedData): Promise<string>
```

### Components

```typescript
// Encryption guard (add to layout)
<EncryptionGuard />

// Encryption status display
<EncryptionStatus variant="badge" | "full" | "icon" showDetails={boolean} />

// Encryption indicator
<EncryptionIndicator />
```

## Database Schema

Add these columns to your `profiles` table:

```sql
ALTER TABLE profiles ADD COLUMN encryption_salt TEXT;
ALTER TABLE profiles ADD COLUMN encryption_key_id TEXT;
```

Add these columns to your `messages` table:

```sql
ALTER TABLE messages ADD COLUMN encrypted_content TEXT;
ALTER TABLE messages ADD COLUMN encryption_metadata JSONB;
```

---

**Phase 1 Status:** ✅ Complete

**Ready for Testing:** Yes

**Ready for Production:** Pending end-to-end testing
