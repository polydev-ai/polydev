# Polydev AI V2 - Zero-Knowledge Encryption Integration Plan

**Created**: 2025-10-28
**Status**: Analysis Complete, Ready for Implementation

---

## Current Architecture Analysis

### Server-Side Encryption (Current)

**File**: `master-controller/src/utils/encryption.js`

```javascript
// CURRENT: Server-side encryption with master key
class CredentialEncryption {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.masterKey = config.encryption.masterKey; // ❌ Server holds decryption key
  }

  encrypt(plaintext) {
    // Server can encrypt and decrypt all user data
    // NOT zero-knowledge
  }
}
```

**Problems**:
- ❌ Server has master key in config
- ❌ Server can decrypt all user credentials
- ❌ Database breach + server breach = total data exposure
- ❌ Not compliant with zero-knowledge architecture

### Frontend Architecture (Current)

**File**: `src/hooks/useChatSessions.ts`

```typescript
// Frontend makes unencrypted API calls
const response = await fetch('/api/chat/sessions', {
  credentials: 'include'
})

// Receives plaintext messages from server
const data = await response.json()
```

**Issues**:
- ❌ Chat messages sent as plaintext to server
- ❌ Server stores plaintext in database (or encrypts with its own key)
- ❌ Frontend has no encryption logic

### Database (Enhanced)

**Migration**: `supabase/migrations/002_add_zero_knowledge_encryption.sql` ✅

```sql
-- ENHANCED TABLES (dual-column strategy)
ALTER TABLE chat_messages
  ADD COLUMN encrypted_content TEXT,
  ADD COLUMN encryption_metadata JSONB;

ALTER TABLE users
  ADD COLUMN key_derivation_salt TEXT,
  ADD COLUMN zero_knowledge_enabled BOOLEAN DEFAULT TRUE;
```

**Status**: ✅ Complete - Database ready for encrypted data

---

## Target Architecture (Zero-Knowledge)

### Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                      BROWSER                             │
│  ┌──────────────────────────────────────────────────┐   │
│  │  User enters password                            │   │
│  │         ↓                                         │   │
│  │  PBKDF2 (100k iterations) → Derives key         │   │
│  │         ↓                                         │   │
│  │  Unlock master key from IndexedDB               │   │
│  │         ↓                                         │   │
│  │  Encrypt chat message with AES-GCM              │   │
│  │         ↓                                         │   │
│  │  { ciphertext: "...", metadata: {...} }         │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                        ↓ HTTPS
┌─────────────────────────────────────────────────────────┐
│                 MASTER-CONTROLLER API                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Receives encrypted blob                         │   │
│  │         ↓                                         │   │
│  │  NO DECRYPTION (server cannot decrypt)          │   │
│  │         ↓                                         │   │
│  │  Store encrypted blob + metadata in Supabase    │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                    SUPABASE DATABASE                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  chat_messages:                                  │   │
│  │    encrypted_content: "a7b9c2..."               │   │
│  │    encryption_metadata: {                        │   │
│  │      iv: "...",                                  │   │
│  │      keyId: "...",                               │   │
│  │      algorithm: "AES-GCM"                        │   │
│  │    }                                             │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Security Guarantees**:
- ✅ Password never leaves browser
- ✅ Master key never leaves browser unencrypted
- ✅ Server cannot decrypt user data (true zero-knowledge)
- ✅ Database breach + server breach = encrypted blobs only
- ✅ Password reset = data loss (by design)

---

## Implementation Plan

### Phase 1: Frontend Integration (Priority 1)

#### 1.1 Authentication & Key Management

**Create**: `src/lib/auth/encryption-auth.ts`

```typescript
import { initializeEncryption, unlockEncryption, lockEncryption } from '@/lib/crypto';

/**
 * Initialize encryption on user signup
 */
export async function setupUserEncryption(password: string) {
  const { keyId, salt } = await initializeEncryption(password);

  // Store salt in Supabase users table
  await supabase.from('users').update({
    key_derivation_salt: salt,
    zero_knowledge_enabled: true
  }).eq('id', userId);

  return { keyId, salt };
}

/**
 * Unlock encryption on user login
 */
export async function loginUserEncryption(password: string) {
  // Fetch user's salt from database
  const { data } = await supabase
    .from('users')
    .select('key_derivation_salt')
    .eq('id', userId)
    .single();

  // Unlock encryption with password
  const success = await unlockEncryption(password);

  if (!success) {
    throw new Error('Wrong password');
  }

  return true;
}

/**
 * Auto-lock on idle (15 minutes)
 */
export function setupIdleTimeout() {
  let idleTimer: NodeJS.Timeout;

  const resetTimer = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      lockEncryption();
      // Redirect to unlock screen
      window.location.href = '/unlock';
    }, 15 * 60 * 1000); // 15 minutes
  };

  // Reset timer on user activity
  ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, resetTimer, true);
  });

  resetTimer();
}
```

#### 1.2 Chat Message Encryption

**Update**: `src/hooks/useChatSessions.ts`

```typescript
import { encryptMessageContent, decryptMessageContent, dbRowToEncryptedData } from '@/lib/crypto';

export function useChatSessions() {
  // ... existing code ...

  const sendMessage = async (sessionId: string, content: string) => {
    try {
      // Encrypt message on client-side
      const encrypted = await encryptMessageContent(content);

      // Send encrypted blob to server
      const response = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          role: 'user',
          encrypted_content: encrypted.ciphertext,
          encryption_metadata: encrypted.metadata
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const fetchMessages = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const { messages } = await response.json();

      // Decrypt messages on client-side
      const decryptedMessages = await Promise.all(
        messages.map(async (msg: any) => {
          const encryptedData = dbRowToEncryptedData(msg);
          if (encryptedData) {
            const plaintext = await decryptMessageContent(encryptedData);
            return { ...msg, content: plaintext };
          }
          return msg; // Fallback for unencrypted messages
        })
      );

      return decryptedMessages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  };

  return {
    sessions,
    loading,
    error,
    fetchSessions,
    createSession,
    sendMessage,      // NEW
    fetchMessages     // NEW
  };
}
```

#### 1.3 UI Components

**Create**: `src/components/auth/UnlockScreen.tsx`

```typescript
import { useState } from 'react';
import { loginUserEncryption } from '@/lib/auth/encryption-auth';

export function UnlockScreen() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlocking(true);
    setError('');

    try {
      await loginUserEncryption(password);
      window.location.href = '/dashboard'; // Redirect on success
    } catch (err) {
      setError('Wrong password. Try again.');
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-xl">
        <h1 className="text-2xl font-bold text-white mb-6">Unlock Polydev AI</h1>
        <form onSubmit={handleUnlock}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your master password"
            className="w-full px-4 py-2 rounded bg-gray-700 text-white"
            autoFocus
          />
          {error && <p className="text-red-500 mt-2">{error}</p>}
          <button
            type="submit"
            disabled={unlocking || !password}
            className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {unlocking ? 'Unlocking...' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

### Phase 2: Backend Integration (Priority 2)

#### 2.1 Create Chat API Routes

**Create**: `master-controller/src/routes/chat.js`

```javascript
const express = require('express');
const router = express.Router();
const { supabase } = require('../db/supabase');
const logger = require('../utils/logger').module('routes:chat');

/**
 * GET /api/chat/sessions
 * Fetch all chat sessions for authenticated user
 */
router.get('/sessions', async (req, res) => {
  try {
    const userId = req.user.id; // From JWT middleware

    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    res.json({ sessions: data });
  } catch (error) {
    logger.error('Failed to fetch sessions', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/chat/sessions/:sessionId/messages
 * Create new encrypted message (server stores encrypted blob)
 */
router.post('/sessions/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { role, encrypted_content, encryption_metadata } = req.body;

    // Validation
    if (!encrypted_content || !encryption_metadata) {
      return res.status(400).json({
        error: 'encrypted_content and encryption_metadata required'
      });
    }

    // ✅ Server does NOT decrypt - just stores encrypted blob
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role,
        encrypted_content,      // Store encrypted blob
        encryption_metadata,    // Store encryption metadata
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    logger.info('Encrypted message stored', {
      sessionId,
      messageId: data.id,
      encrypted: true
    });

    res.json({ message: data });
  } catch (error) {
    logger.error('Failed to create message', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/chat/sessions/:sessionId/messages
 * Fetch encrypted messages (client-side decryption)
 */
router.get('/sessions/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Fetch encrypted messages
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // ✅ Server returns encrypted blobs - frontend decrypts
    res.json({ messages: data });
  } catch (error) {
    logger.error('Failed to fetch messages', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

#### 2.2 Update Main Server

**Update**: `master-controller/src/index.js`

```javascript
// Add to existing routes
const chatRouter = require('./routes/chat');

// ... existing middleware ...

// Chat routes (AFTER authentication middleware)
app.use('/api/chat', authMiddleware, chatRouter);
```

#### 2.3 Remove Server-Side Encryption

**Update**: `master-controller/src/utils/encryption.js`

```javascript
/**
 * DEPRECATED: Server-side encryption (kept for backwards compatibility)
 *
 * NOTE: This class is deprecated for zero-knowledge architecture.
 * New code should use client-side encryption via @/lib/crypto.
 *
 * Only used for:
 * - Legacy data migration
 * - Non-sensitive server-side operations (e.g., file encryption)
 */
class CredentialEncryption {
  // ... keep existing implementation for backwards compatibility ...

  /**
   * @deprecated Use client-side encryption instead
   */
  encrypt(plaintext) {
    console.warn('DEPRECATED: Server-side encryption should not be used for user data');
    // ... existing implementation ...
  }
}

module.exports = {
  CredentialEncryption,
  credentialEncryption,
  generateKey: CredentialEncryption.generateKey
};
```

### Phase 3: Migration Strategy (Priority 3)

#### 3.1 Gradual Migration

**Approach**: Dual-column strategy

```javascript
// Backend reads from BOTH columns
function getMessage(row) {
  // Try encrypted column first
  if (row.encrypted_content && row.encryption_metadata) {
    return {
      content: row.encrypted_content,
      metadata: row.encryption_metadata,
      encrypted: true
    };
  }

  // Fallback to plaintext (old data)
  if (row.content) {
    return {
      content: row.content,
      encrypted: false
    };
  }

  throw new Error('No message content found');
}
```

#### 3.2 Data Migration Script

**Create**: `scripts/migrate-to-zero-knowledge.js`

```javascript
/**
 * One-time migration: Encrypt existing plaintext data
 *
 * NOTE: This script requires user passwords to re-encrypt data.
 * Users must login and trigger re-encryption themselves.
 */

async function migrateUserData(userId, masterPassword) {
  // 1. Initialize user's encryption
  const { keyId, salt } = await initializeEncryption(masterPassword);

  // 2. Fetch user's old plaintext messages
  const { data: messages } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId)
    .is('encrypted_content', null);

  // 3. Encrypt each message
  for (const msg of messages) {
    const encrypted = await encryptMessageContent(msg.content);

    await supabase
      .from('chat_messages')
      .update({
        encrypted_content: encrypted.ciphertext,
        encryption_metadata: encrypted.metadata
      })
      .eq('id', msg.id);
  }

  console.log(`Migrated ${messages.length} messages for user ${userId}`);
}
```

---

## Rollout Strategy

### Week 1: Foundation
- ✅ Database migration (DONE)
- ✅ Client-side encryption library (DONE)
- ⏳ Frontend authentication integration
- ⏳ Backend chat API routes

### Week 2: Integration
- ⏳ Update frontend hooks to use encryption
- ⏳ Create unlock screen UI
- ⏳ Test end-to-end encrypted flow
- ⏳ Deploy to staging

### Week 3: Migration
- ⏳ Add migration banner for existing users
- ⏳ Trigger re-encryption on first login
- ⏳ Monitor migration progress
- ⏳ Deploy to production

### Week 4: Cleanup
- ⏳ Remove old plaintext columns (after 100% migration)
- ⏳ Remove server-side encryption (deprecate)
- ⏳ Update documentation
- ⏳ Security audit

---

## Testing Checklist

### Unit Tests
- [ ] Encryption library (PBKDF2, AES-GCM)
- [ ] Database helpers (dbRowToEncryptedData, etc.)
- [ ] Chat API routes (message storage/retrieval)

### Integration Tests
- [ ] User signup → encryption initialization
- [ ] User login → encryption unlock
- [ ] Send message → encrypt → store → fetch → decrypt
- [ ] Session lock → auto-timeout → unlock
- [ ] Password reset → data loss warning

### Security Tests
- [ ] Server cannot decrypt user messages
- [ ] Database breach simulation (encrypted blobs only)
- [ ] Password brute-force resistance (PBKDF2 iterations)
- [ ] Idle timeout enforcement
- [ ] Master key never leaves browser

---

## Current Status

✅ **COMPLETED**:
- Database migration with encryption columns
- Client-side encryption library (Option B)
- Comprehensive documentation

⏳ **IN PROGRESS**:
- Codebase analysis (this document)

📋 **NEXT STEPS**:
1. Implement frontend authentication integration
2. Create chat API routes in master-controller
3. Update frontend hooks to use encryption
4. Build unlock screen UI
5. Test end-to-end encrypted flow

---

## Key Files Reference

### Frontend
- `src/lib/crypto/encryption.ts` - Core encryption engine ✅
- `src/lib/crypto/database-crypto.ts` - Database helpers ✅
- `src/lib/crypto/index.ts` - Public API ✅
- `src/lib/auth/encryption-auth.ts` - Authentication integration ⏳
- `src/hooks/useChatSessions.ts` - Chat hooks (needs update) ⏳
- `src/components/auth/UnlockScreen.tsx` - Unlock UI ⏳

### Backend
- `master-controller/src/routes/chat.js` - Chat API routes ⏳
- `master-controller/src/utils/encryption.js` - Server encryption (deprecate) ⏳
- `master-controller/src/index.js` - Main server (add chat routes) ⏳

### Database
- `supabase/migrations/002_add_zero_knowledge_encryption.sql` - Schema ✅

### Documentation
- `src/lib/crypto/README.md` - Encryption library docs ✅
- `docs/ZERO_KNOWLEDGE_INTEGRATION_PLAN.md` - This document ✅

---

*Last Updated: 2025-10-28*
