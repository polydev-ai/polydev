/**
 * Server-Side Encryption for Provider API Keys
 * 
 * This is separate from the zero-knowledge encryption library because:
 * - The server needs to decrypt provider API keys to make LLM API calls
 * - Uses server-side master key (not user password)
 * - Encryption at rest for database security
 * 
 * Security Model:
 * - Uses AES-256-GCM with server-controlled master key
 * - Each API key encrypted with user-specific derived key
 * - Database breach doesn't expose keys immediately (requires master key)
 * - Master key stored in environment variables (not in code/database)
 */

import crypto from 'crypto'

// Master encryption key from environment
// Generate with: openssl rand -hex 32
const MASTER_KEY = process.env.API_KEY_ENCRYPTION_MASTER_KEY || ''

// Encryption configuration
const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16 // 128 bits
const AUTH_TAG_LENGTH = 16 // 128 bits
const SALT_LENGTH = 32 // 256 bits
const PBKDF2_ITERATIONS = 100000

// Current encryption version
const ENCRYPTION_VERSION = 1

/**
 * Metadata stored alongside encrypted API keys
 */
export interface ApiKeyEncryptionMetadata {
  version: number
  algorithm: string
  iv: string // base64
  authTag: string // base64
  salt: string // base64
  timestamp: string
}

/**
 * Result of API key encryption
 */
export interface EncryptedApiKey {
  encryptedData: string // base64
  metadata: ApiKeyEncryptionMetadata
}

/**
 * Derive user-specific encryption key from master key and user ID
 */
function deriveUserKey(userId: string, salt: Buffer): Buffer {
  if (!MASTER_KEY) {
    throw new Error(
      'API_KEY_ENCRYPTION_MASTER_KEY environment variable not set. ' +
      'Generate with: openssl rand -hex 32'
    )
  }

  if (MASTER_KEY.length < 32) {
    throw new Error(
      'API_KEY_ENCRYPTION_MASTER_KEY must be at least 32 characters'
    )
  }

  // Derive key using PBKDF2: combine master key with user ID
  const password = `${MASTER_KEY}:${userId}`
  
  return crypto.pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha256'
  )
}

/**
 * Encrypt a provider API key for storage in database
 * 
 * @param apiKey - The plaintext API key (e.g., sk-...)
 * @param userId - User ID who owns this API key
 * @returns Encrypted API key and metadata for database storage
 */
export function encryptApiKey(apiKey: string, userId: string): EncryptedApiKey {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('Cannot encrypt empty API key')
  }

  if (!userId) {
    throw new Error('User ID is required for API key encryption')
  }

  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH)
  const iv = crypto.randomBytes(IV_LENGTH)

  // Derive user-specific key
  const key = deriveUserKey(userId, salt)

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  // Encrypt
  let encrypted = cipher.update(apiKey, 'utf8', 'base64')
  encrypted += cipher.final('base64')

  // Get authentication tag
  const authTag = cipher.getAuthTag()

  return {
    encryptedData: encrypted,
    metadata: {
      version: ENCRYPTION_VERSION,
      algorithm: ALGORITHM,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      salt: salt.toString('base64'),
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Decrypt a provider API key from database
 * 
 * @param encryptedData - Base64-encoded encrypted API key
 * @param metadata - Encryption metadata from database
 * @param userId - User ID who owns this API key
 * @returns Decrypted plaintext API key
 */
export function decryptApiKey(
  encryptedData: string,
  metadata: ApiKeyEncryptionMetadata,
  userId: string
): string {
  if (!encryptedData || !metadata) {
    throw new Error('Cannot decrypt: missing encrypted data or metadata')
  }

  if (!userId) {
    throw new Error('User ID is required for API key decryption')
  }

  // Verify encryption version
  if (metadata.version !== ENCRYPTION_VERSION) {
    throw new Error(`Unsupported encryption version: ${metadata.version}`)
  }

  // Verify algorithm
  if (metadata.algorithm !== ALGORITHM) {
    throw new Error(`Unsupported encryption algorithm: ${metadata.algorithm}`)
  }

  // Parse metadata
  const iv = Buffer.from(metadata.iv, 'base64')
  const authTag = Buffer.from(metadata.authTag, 'base64')
  const salt = Buffer.from(metadata.salt, 'base64')

  // Derive user-specific key
  const key = deriveUserKey(userId, salt)

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  // Decrypt
  let decrypted = decipher.update(encryptedData, 'base64', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Verify encryption is properly configured
 * Throws an error if encryption cannot be performed
 */
export function verifyApiKeyEncryptionConfig(): void {
  if (!MASTER_KEY) {
    throw new Error(
      'API_KEY_ENCRYPTION_MASTER_KEY environment variable not set. ' +
      'Generate with: openssl rand -hex 32'
    )
  }

  if (MASTER_KEY.length < 32) {
    throw new Error(
      'API_KEY_ENCRYPTION_MASTER_KEY must be at least 32 characters'
    )
  }

  // Test encryption/decryption
  try {
    const testUserId = 'test-user-id'
    const testApiKey = 'sk-test-api-key-12345'
    
    const { encryptedData, metadata } = encryptApiKey(testApiKey, testUserId)
    const decrypted = decryptApiKey(encryptedData, metadata, testUserId)

    if (decrypted !== testApiKey) {
      throw new Error('Encryption verification failed: decrypted data does not match original')
    }
  } catch (error) {
    throw new Error(`API key encryption verification failed: ${error}`)
  }
}

/**
 * Check if API key data is already encrypted
 * 
 * @param plaintextField - Current value of api_key column (may be null)
 * @param encryptedField - Current value of encrypted_api_key column
 * @param metadata - Current value of encryption_metadata column
 * @returns True if already encrypted
 */
export function isApiKeyEncrypted(
  plaintextField: string | null,
  encryptedField: string | null,
  metadata: ApiKeyEncryptionMetadata | null
): boolean {
  return !!(encryptedField && metadata && metadata.version && metadata.iv)
}

/**
 * Migrate plaintext API key to encrypted format
 * 
 * @param plaintextKey - Existing plaintext API key
 * @param userId - User ID who owns this key
 * @returns Database update object with encrypted_api_key and encryption_metadata
 */
export function migrateApiKeyToEncrypted(
  plaintextKey: string,
  userId: string
): {
  encrypted_api_key: string
  encryption_metadata: ApiKeyEncryptionMetadata
  api_key: null // Clear plaintext column
} {
  const { encryptedData, metadata } = encryptApiKey(plaintextKey, userId)
  
  return {
    encrypted_api_key: encryptedData,
    encryption_metadata: metadata,
    api_key: null // Clear plaintext column for security
  }
}

/**
 * Get or decrypt API key (handles both plaintext and encrypted keys)
 * Use this for backward compatibility during migration
 * 
 * @param plaintextField - Value from api_key column
 * @param encryptedField - Value from encrypted_api_key column
 * @param metadata - Value from encryption_metadata column
 * @param userId - User ID who owns this key
 * @returns Decrypted API key (or plaintext if not yet encrypted)
 */
export function getApiKey(
  plaintextField: string | null,
  encryptedField: string | null,
  metadata: ApiKeyEncryptionMetadata | null,
  userId: string
): string | null {
  // If encrypted, decrypt it
  if (encryptedField && metadata) {
    try {
      return decryptApiKey(encryptedField, metadata, userId)
    } catch (error) {
      console.error(`[Crypto] Failed to decrypt API key for user ${userId}:`, error)
      throw new Error('Failed to decrypt API key')
    }
  }

  // Otherwise return plaintext (for backward compatibility)
  return plaintextField
}
