# Polydev AI V2 - Zero-Knowledge Encryption Library

## Overview

This is a **zero-knowledge** client-side encryption library that ensures the Polydev AI server **cannot decrypt user data**. All encryption and decryption happens in the browser using the Web Crypto API.

### Architecture: Option B

- **Random 256-bit master key** generated in browser
- **Master key stored in IndexedDB**, encrypted with password-derived key
- **PBKDF2** (100,000 iterations) for password → key derivation
- **AES-GCM 256-bit** for all data encryption
- **Zero external dependencies** (browser-native crypto only)

## Security Guarantees

✅ **Password never leaves browser**
✅ **Master key never leaves browser unencrypted**
✅ **Server compromise does NOT expose user data**
✅ **Password reset = data loss** (by design, true zero-knowledge)

## Quick Start

### 1. New User Signup

```typescript
import { initializeEncryption } from '@/lib/crypto';

// User creates account and sets master password
const { keyId, salt } = await initializeEncryption(userPassword);

// Store salt in Supabase users table (NOT the password!)
await supabase.from('users').insert({
  email: userEmail,
  key_derivation_salt: salt,
  zero_knowledge_enabled: true
});
```

### 2. Existing User Login

```typescript
import { unlockEncryption } from '@/lib/crypto';

// Fetch user's salt from database
const { data } = await supabase
  .from('users')
  .select('key_derivation_salt')
  .eq('email', userEmail)
  .single();

// Unlock encryption with password
const success = await unlockEncryption(userPassword);

if (!success) {
  alert('Wrong password!');
}
```

### 3. Encrypt Data Before Saving

```typescript
import { encryptMessageContent } from '@/lib/crypto';

const encrypted = await encryptMessageContent("Hello, world!");

// Save to database
await supabase.from('chat_messages').insert({
  session_id: sessionId,
  role: 'user',
  encrypted_content: encrypted.ciphertext,
  encryption_metadata: encrypted.metadata
});
```

### 4. Decrypt Data After Fetching

```typescript
import { decryptMessageContent, dbRowToEncryptedData } from '@/lib/crypto';

const { data } = await supabase
  .from('chat_messages')
  .select('*')
  .eq('session_id', sessionId);

for (const row of data) {
  const encryptedData = dbRowToEncryptedData(row);
  if (encryptedData) {
    const plaintext = await decryptMessageContent(encryptedData);
    console.log(plaintext); // "Hello, world!"
  }
}
```

## API Reference

### High-Level API

#### `initializeEncryption(password: string)`
Initialize encryption for a new user. Generates master key, encrypts it with password, stores in IndexedDB.

**Parameters:**
- `password` - User's master password

**Returns:** `Promise<{ keyId: string, salt: string }>`
- `keyId` - Unique identifier for the master key
- `salt` - Base64-encoded salt for PBKDF2 (store in database)

**Usage:**
```typescript
const { keyId, salt } = await initializeEncryption("my-secure-password");
```

---

#### `unlockEncryption(password: string)`
Unlock encryption for existing user. Decrypts master key from IndexedDB using password.

**Parameters:**
- `password` - User's master password

**Returns:** `Promise<boolean>`
- `true` if password is correct and encryption unlocked
- `false` if password is wrong or no master key found

**Usage:**
```typescript
const success = await unlockEncryption("my-secure-password");
if (!success) throw new Error('Wrong password');
```

---

#### `isEncryptionUnlocked()`
Check if encryption is currently unlocked (master key loaded in memory).

**Returns:** `boolean`

**Usage:**
```typescript
if (!isEncryptionUnlocked()) {
  // Redirect to login
}
```

---

#### `lockEncryption()`
Lock encryption session (clear master key from memory). Call when user locks app or goes idle.

**Usage:**
```typescript
// On user idle timeout
lockEncryption();
```

---

#### `logoutEncryption()`
Logout: clear all encryption keys from IndexedDB. Call when user logs out.

**Returns:** `Promise<void>`

**Usage:**
```typescript
await logoutEncryption();
```

### Database Encryption Helpers

#### `encryptMessageContent(plaintext: string)`
Encrypt chat message content.

**Returns:** `Promise<EncryptedData>`

**Usage:**
```typescript
const encrypted = await encryptMessageContent("Hello!");
```

---

#### `decryptMessageContent(encryptedData: EncryptedData)`
Decrypt chat message content.

**Returns:** `Promise<string>`

**Usage:**
```typescript
const plaintext = await decryptMessageContent(encrypted);
```

---

#### `encryptProviderCredentials(credentials: ProviderCredentials)`
Encrypt OAuth provider credentials (access token, refresh token, etc.).

**Returns:** `Promise<EncryptedData>`

**Usage:**
```typescript
const encrypted = await encryptProviderCredentials({
  accessToken: "sk-...",
  refreshToken: "refresh_...",
  expiresAt: "2025-01-01T00:00:00Z",
  scopes: ["chat", "completion"]
});
```

---

#### `decryptProviderCredentials(encryptedData: EncryptedData)`
Decrypt OAuth provider credentials.

**Returns:** `Promise<ProviderCredentials>`

**Usage:**
```typescript
const credentials = await decryptProviderCredentials(encrypted);
console.log(credentials.accessToken); // "sk-..."
```

---

#### `encryptJobCommand(command: string)`
Encrypt CLI/tool command for job execution.

**Returns:** `Promise<EncryptedData>`

---

#### `decryptJobOutput(encryptedData: EncryptedData)`
Decrypt CLI/tool output (stdout/stderr).

**Returns:** `Promise<string>`

---

### Utility Functions

#### `dbRowToEncryptedData(row: DbRow)`
Convert database row to EncryptedData object.

**Parameters:**
```typescript
row: {
  encrypted_content?: string;
  encryption_metadata?: EncryptionMetadata;
}
```

**Returns:** `EncryptedData | null`

**Usage:**
```typescript
const encryptedData = dbRowToEncryptedData(row);
if (encryptedData) {
  const plaintext = await decryptMessageContent(encryptedData);
}
```

---

#### `encryptedDataToDbRow(encryptedData: EncryptedData)`
Convert EncryptedData to database row format.

**Returns:**
```typescript
{
  encrypted_content: string;
  encryption_metadata: EncryptionMetadata;
}
```

**Usage:**
```typescript
const dbRow = encryptedDataToDbRow(encrypted);
await supabase.from('messages').insert(dbRow);
```

---

#### `isValidEncryptedData(data: any)`
Validate encrypted data structure.

**Returns:** `boolean`

**Usage:**
```typescript
if (!isValidEncryptedData(data)) {
  throw new Error('Invalid encrypted data');
}
```

## Data Types

### `EncryptedData`
```typescript
interface EncryptedData {
  ciphertext: string;          // Base64-encoded encrypted data
  metadata: EncryptionMetadata;
}
```

### `EncryptionMetadata`
```typescript
interface EncryptionMetadata {
  iv: string;              // Base64-encoded initialization vector
  algorithm: string;       // Always 'AES-GCM'
  keyId: string;           // Master key identifier
  version: number;         // Encryption version (for future migrations)
}
```

### `ProviderCredentials`
```typescript
interface ProviderCredentials {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  scopes?: string[];
  [key: string]: any;
}
```

## Database Schema

The encryption library expects the following columns in Supabase:

### Users Table
```sql
ALTER TABLE users
  ADD COLUMN encrypted_master_key_hint TEXT,
  ADD COLUMN key_derivation_salt TEXT,
  ADD COLUMN zero_knowledge_enabled BOOLEAN DEFAULT TRUE;
```

### Chat Messages Table
```sql
ALTER TABLE chat_messages
  ADD COLUMN encrypted_content TEXT,
  ADD COLUMN encryption_metadata JSONB;
```

### Provider Credentials Table
```sql
ALTER TABLE provider_credentials
  ADD COLUMN client_side_encrypted BOOLEAN DEFAULT FALSE;
```

## Security Best Practices

### ✅ DO:
- **Always** check `isEncryptionUnlocked()` before encrypting/decrypting
- **Always** lock encryption on user idle (e.g., 15 minutes)
- **Always** logout encryption when user logs out
- **Always** validate encrypted data with `isValidEncryptedData()`
- **Always** use HTTPS in production
- **Always** clear sensitive data from memory when done

### ❌ DON'T:
- **Never** send master password to server
- **Never** send unencrypted master key to server
- **Never** log passwords or keys to console/disk
- **Never** store password in localStorage/sessionStorage
- **Never** skip password validation on client side
- **Never** use weak passwords (enforce minimum strength)

## Error Handling

```typescript
import { unlockEncryption, encryptMessageContent } from '@/lib/crypto';

try {
  const success = await unlockEncryption(password);
  if (!success) {
    throw new Error('Wrong password');
  }

  const encrypted = await encryptMessageContent(message);
  await saveToDatabase(encrypted);
} catch (error) {
  if (error.message === 'Session locked') {
    // User needs to unlock encryption
    redirectToLogin();
  } else {
    // Other error
    console.error('Encryption error:', error);
  }
}
```

## Testing

```typescript
import { initializeEncryption, unlockEncryption, encryptMessageContent, decryptMessageContent } from '@/lib/crypto';

// Test full flow
const password = "test-password-123";
const message = "Hello, world!";

// Initialize
const { keyId, salt } = await initializeEncryption(password);
console.log('Initialized:', { keyId, salt });

// Encrypt
const encrypted = await encryptMessageContent(message);
console.log('Encrypted:', encrypted);

// Decrypt
const decrypted = await decryptMessageContent(encrypted);
console.assert(decrypted === message, 'Decryption failed!');

// Lock and unlock
lockEncryption();
const unlocked = await unlockEncryption(password);
console.assert(unlocked === true, 'Unlock failed!');

// Verify decryption still works after unlock
const decrypted2 = await decryptMessageContent(encrypted);
console.assert(decrypted2 === message, 'Decryption after unlock failed!');
```

## Implementation Details

### PBKDF2 Configuration
- **Iterations**: 100,000 (OWASP recommended minimum)
- **Hash**: SHA-256
- **Key Length**: 256 bits
- **Salt Length**: 128 bits (16 bytes)

### AES-GCM Configuration
- **Key Length**: 256 bits
- **IV Length**: 96 bits (12 bytes)
- **Tag Length**: 128 bits (default, embedded in ciphertext)

### IndexedDB Schema
```
Database: polydev_crypto
Version: 1
Object Store: master_keys
  - keyPath: keyId
  - Index: createdAt (for getting latest key)
```

## Troubleshooting

### "Session locked" error
**Cause**: Trying to encrypt/decrypt without unlocking first
**Fix**: Call `unlockEncryption(password)` before encrypting/decrypting

### "No master key found" error
**Cause**: User never initialized encryption
**Fix**: Call `initializeEncryption(password)` on first signup

### Wrong password error
**Cause**: Invalid password provided to `unlockEncryption()`
**Fix**: Ask user to retry or reset account (data loss warning!)

### Decryption fails after page refresh
**Cause**: Master key cleared from memory
**Fix**: Call `unlockEncryption(password)` on page load

## Migration from Server-Side Encryption

If migrating existing data from server-side encryption:

```typescript
// 1. Fetch old server-encrypted data
const oldData = await fetchOldCredentials();

// 2. Decrypt on server (one-time migration)
const plaintext = serverDecrypt(oldData);

// 3. Re-encrypt with client-side encryption
const encrypted = await encryptProviderCredentials(plaintext);

// 4. Save to database with client_side_encrypted = true
await supabase.from('provider_credentials').update({
  encrypted_credentials: encrypted.ciphertext,
  encryption_metadata: encrypted.metadata,
  client_side_encrypted: true,
  migration_completed_at: new Date().toISOString()
});
```

## License

Part of Polydev AI V2 - Zero-Knowledge Architecture
