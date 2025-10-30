/**
 * Polydev AI V2 - Database Encryption Helpers
 *
 * Purpose: High-level helpers for encrypting/decrypting data before database operations
 *
 * Architecture Integration:
 * - Frontend encrypts data before sending to API
 * - API stores encrypted blobs in Supabase (chat_messages, messages, etc.)
 * - Frontend decrypts data after fetching from API
 * - Server NEVER sees plaintext data
 *
 * Usage Example:
 * ```typescript
 * // Sending a message
 * const encrypted = await encryptMessageContent("Hello, world!");
 * await supabase.from('chat_messages').insert({
 *   session_id: sessionId,
 *   role: 'user',
 *   encrypted_content: encrypted.ciphertext,
 *   encryption_metadata: encrypted.metadata
 * });
 *
 * // Receiving a message
 * const { data } = await supabase.from('chat_messages').select('*');
 * const plaintext = await decryptMessageContent({
 *   ciphertext: data.encrypted_content,
 *   metadata: data.encryption_metadata
 * });
 * ```
 */

import { getEncryptionEngine, EncryptedData, EncryptionMetadata } from './encryption';

// ============================================================================
// Message Encryption (chat_messages, messages tables)
// ============================================================================

/**
 * Encrypt chat message content
 */
export async function encryptMessageContent(plaintext: string): Promise<EncryptedData> {
  const engine = getEncryptionEngine();
  return engine.encrypt(plaintext);
}

/**
 * Decrypt chat message content
 */
export async function decryptMessageContent(encryptedData: EncryptedData): Promise<string> {
  const engine = getEncryptionEngine();
  return engine.decrypt(encryptedData);
}

// ============================================================================
// Conversation Title Encryption (conversations table)
// ============================================================================

/**
 * Encrypt conversation title
 */
export async function encryptConversationTitle(title: string): Promise<EncryptedData> {
  const engine = getEncryptionEngine();
  return engine.encrypt(title);
}

/**
 * Decrypt conversation title
 */
export async function decryptConversationTitle(encryptedData: EncryptedData): Promise<string> {
  const engine = getEncryptionEngine();
  return engine.decrypt(encryptedData);
}

// ============================================================================
// Provider Credentials Encryption (provider_credentials table)
// ============================================================================

export interface ProviderCredentials {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  scopes?: string[];
  [key: string]: any; // Additional provider-specific fields
}

/**
 * Encrypt provider credentials (OAuth tokens)
 */
export async function encryptProviderCredentials(
  credentials: ProviderCredentials
): Promise<EncryptedData> {
  const engine = getEncryptionEngine();
  const json = JSON.stringify(credentials);
  return engine.encrypt(json);
}

/**
 * Decrypt provider credentials
 */
export async function decryptProviderCredentials(
  encryptedData: EncryptedData
): Promise<ProviderCredentials> {
  const engine = getEncryptionEngine();
  const json = await engine.decrypt(encryptedData);
  return JSON.parse(json);
}

// ============================================================================
// CLI Credentials Encryption (cli_credentials table)
// ============================================================================

export interface CLICredentials {
  provider: string;
  credentials: Record<string, any>;
  createdAt: string;
  [key: string]: any;
}

/**
 * Encrypt CLI credentials
 */
export async function encryptCLICredentials(
  credentials: CLICredentials
): Promise<EncryptedData> {
  const engine = getEncryptionEngine();
  const json = JSON.stringify(credentials);
  return engine.encrypt(json);
}

/**
 * Decrypt CLI credentials
 */
export async function decryptCLICredentials(
  encryptedData: EncryptedData
): Promise<CLICredentials> {
  const engine = getEncryptionEngine();
  const json = await engine.decrypt(encryptedData);
  return JSON.parse(json);
}

// ============================================================================
// Job Execution Encryption (job_executions table)
// ============================================================================

/**
 * Encrypt job command
 */
export async function encryptJobCommand(command: string): Promise<EncryptedData> {
  const engine = getEncryptionEngine();
  return engine.encrypt(command);
}

/**
 * Decrypt job command
 */
export async function decryptJobCommand(encryptedData: EncryptedData): Promise<string> {
  const engine = getEncryptionEngine();
  return engine.decrypt(encryptedData);
}

/**
 * Encrypt job output (stdout/stderr)
 */
export async function encryptJobOutput(output: string): Promise<EncryptedData> {
  const engine = getEncryptionEngine();
  return engine.encrypt(output);
}

/**
 * Decrypt job output
 */
export async function decryptJobOutput(encryptedData: EncryptedData): Promise<string> {
  const engine = getEncryptionEngine();
  return engine.decrypt(encryptedData);
}

// ============================================================================
// Master Key Hint Encryption (users table)
// ============================================================================

/**
 * Encrypt master key hint (for password recovery reminder)
 */
export async function encryptMasterKeyHint(hint: string): Promise<EncryptedData> {
  const engine = getEncryptionEngine();
  return engine.encrypt(hint);
}

/**
 * Decrypt master key hint
 */
export async function decryptMasterKeyHint(encryptedData: EncryptedData): Promise<string> {
  const engine = getEncryptionEngine();
  return engine.decrypt(encryptedData);
}

// ============================================================================
// Batch Encryption/Decryption
// ============================================================================

/**
 * Encrypt multiple messages in parallel
 */
export async function encryptMessages(plaintexts: string[]): Promise<EncryptedData[]> {
  return Promise.all(plaintexts.map(text => encryptMessageContent(text)));
}

/**
 * Decrypt multiple messages in parallel
 */
export async function decryptMessages(encryptedDataArray: EncryptedData[]): Promise<string[]> {
  return Promise.all(encryptedDataArray.map(data => decryptMessageContent(data)));
}

// ============================================================================
// Utility: Convert between database format and EncryptedData
// ============================================================================

/**
 * Convert database row to EncryptedData object
 */
export function dbRowToEncryptedData(row: {
  encrypted_content?: string;
  encryption_metadata?: EncryptionMetadata;
}): EncryptedData | null {
  if (!row.encrypted_content || !row.encryption_metadata) {
    return null;
  }

  return {
    ciphertext: row.encrypted_content,
    metadata: row.encryption_metadata,
  };
}

/**
 * Convert EncryptedData to database row format
 */
export function encryptedDataToDbRow(encryptedData: EncryptedData): {
  encrypted_content: string;
  encryption_metadata: EncryptionMetadata;
} {
  return {
    encrypted_content: encryptedData.ciphertext,
    encryption_metadata: encryptedData.metadata,
  };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate that encrypted data has correct structure
 */
export function isValidEncryptedData(data: any): data is EncryptedData {
  return (
    data &&
    typeof data === 'object' &&
    typeof data.ciphertext === 'string' &&
    data.metadata &&
    typeof data.metadata === 'object' &&
    typeof data.metadata.iv === 'string' &&
    typeof data.metadata.algorithm === 'string' &&
    typeof data.metadata.keyId === 'string' &&
    typeof data.metadata.version === 'number'
  );
}

/**
 * Validate encryption metadata structure
 */
export function isValidEncryptionMetadata(metadata: any): metadata is EncryptionMetadata {
  return (
    metadata &&
    typeof metadata === 'object' &&
    typeof metadata.iv === 'string' &&
    typeof metadata.algorithm === 'string' &&
    typeof metadata.keyId === 'string' &&
    typeof metadata.version === 'number'
  );
}
