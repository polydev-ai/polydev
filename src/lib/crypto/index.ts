/**
 * Polydev AI V2 - Client-Side Encryption Library
 *
 * Public API for zero-knowledge encryption
 *
 * Usage:
 * ```typescript
 * import { initializeEncryption, encryptMessageContent, decryptMessageContent } from '@/lib/crypto';
 *
 * // On signup/login
 * await initializeEncryption(userPassword);
 *
 * // Encrypt before saving to database
 * const encrypted = await encryptMessageContent("Hello, world!");
 *
 * // Decrypt after fetching from database
 * const plaintext = await decryptMessageContent(encrypted);
 * ```
 */

// Import for internal use
import { getEncryptionEngine } from './encryption';

// Re-export core encryption engine
export {
  EncryptionEngine,
  getEncryptionEngine as getEncryptionEngineExport,
  resetEncryptionEngine,
  type EncryptionMetadata,
  type EncryptedData,
  type MasterKeyBundle,
} from './encryption';

// Also re-export under original name for backward compatibility
export { getEncryptionEngine };

// Re-export auth helpers
export { hasEncryptionInitialized } from '../auth/encryption-auth';

// Re-export database helpers
export {
  encryptMessageContent,
  decryptMessageContent,
  encryptConversationTitle,
  decryptConversationTitle,
  encryptProviderCredentials,
  decryptProviderCredentials,
  encryptCLICredentials,
  decryptCLICredentials,
  encryptJobCommand,
  decryptJobCommand,
  encryptJobOutput,
  decryptJobOutput,
  encryptMasterKeyHint,
  decryptMasterKeyHint,
  encryptMessages,
  decryptMessages,
  dbRowToEncryptedData,
  encryptedDataToDbRow,
  isValidEncryptedData,
  isValidEncryptionMetadata,
  type ProviderCredentials,
  type CLICredentials,
} from './database-crypto';

// ============================================================================
// High-Level API
// ============================================================================

/**
 * Initialize encryption for a new user
 * Call this on signup after user sets their master password
 */
export async function initializeEncryption(password: string): Promise<{ keyId: string; salt: string }> {
  const engine = getEncryptionEngine();
  return engine.initializeNewUser(password);
}

/**
 * Unlock encryption with user password
 * Call this on login after user enters their password
 */
export async function unlockEncryption(password: string): Promise<boolean> {
  const engine = getEncryptionEngine();
  return engine.unlockWithPassword(password);
}

/**
 * Check if encryption is currently unlocked
 */
export function isEncryptionUnlocked(): boolean {
  const engine = getEncryptionEngine();
  return engine.isUnlocked();
}

/**
 * Lock encryption session
 * Call this when user locks the app or goes idle
 */
export function lockEncryption(): void {
  const engine = getEncryptionEngine();
  engine.lock();
}

/**
 * Logout: Clear all encryption keys
 * Call this when user logs out
 */
export async function logoutEncryption(): Promise<void> {
  const engine = getEncryptionEngine();
  await engine.logout();
}
