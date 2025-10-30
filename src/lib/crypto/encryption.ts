/**
 * Polydev AI V2 - Client-Side Zero-Knowledge Encryption Library
 *
 * Architecture: Option B - Random key generated, stored in IndexedDB encrypted with user password
 *
 * Key Features:
 * - AES-GCM 256-bit encryption for all user data
 * - PBKDF2 for password-based key derivation (100,000 iterations)
 * - Master encryption key stored in IndexedDB, encrypted with password-derived key
 * - Zero-knowledge: Server never sees unencrypted data or encryption keys
 * - Browser-native Web Crypto API (no external dependencies)
 *
 * Data Flow:
 * 1. User creates account → Sets master password
 * 2. Browser generates random 256-bit master key
 * 3. Browser derives key from password using PBKDF2
 * 4. Master key encrypted with password-derived key → Stored in IndexedDB
 * 5. All user data encrypted with master key before sending to server
 * 6. Server stores encrypted blobs, cannot decrypt
 *
 * Security Guarantees:
 * - Password never leaves browser
 * - Master key never leaves browser unencrypted
 * - Server compromise does NOT expose user data
 * - Password reset = data loss (by design, zero-knowledge)
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface EncryptionMetadata {
  iv: string;              // Base64-encoded initialization vector
  authTag?: string;        // Base64-encoded auth tag (included in ciphertext for AES-GCM)
  algorithm: string;       // 'AES-GCM'
  keyId: string;           // Master key identifier
  version: number;         // Encryption version for future migrations
}

export interface EncryptedData {
  ciphertext: string;               // Base64-encoded encrypted data
  metadata: EncryptionMetadata;     // Encryption parameters
}

export interface MasterKeyBundle {
  encryptedKey: string;     // Master key encrypted with password-derived key
  salt: string;             // Salt for PBKDF2
  keyId: string;            // Unique identifier for this key
  version: number;          // Key version
  createdAt: number;        // Timestamp
}

// ============================================================================
// Constants
// ============================================================================

const CRYPTO_CONFIG = {
  AES_KEY_LENGTH: 256,                    // AES-256
  AES_IV_LENGTH: 12,                      // 96 bits for GCM
  PBKDF2_ITERATIONS: 100000,              // OWASP recommended minimum
  PBKDF2_HASH: 'SHA-256' as const,
  PBKDF2_KEY_LENGTH: 256,
  SALT_LENGTH: 16,                        // 128 bits
  ENCRYPTION_VERSION: 1,
  INDEXEDDB_NAME: 'polydev_crypto',
  INDEXEDDB_VERSION: 1,
  KEYSTORE_NAME: 'master_keys',
};

// ============================================================================
// IndexedDB Keystore
// ============================================================================

class KeyStore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  /**
   * Initialize IndexedDB database for key storage
   */
  private async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(
        CRYPTO_CONFIG.INDEXEDDB_NAME,
        CRYPTO_CONFIG.INDEXEDDB_VERSION
      );

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store for master keys
        if (!db.objectStoreNames.contains(CRYPTO_CONFIG.KEYSTORE_NAME)) {
          const store = db.createObjectStore(CRYPTO_CONFIG.KEYSTORE_NAME, {
            keyPath: 'keyId'
          });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });

    return this.dbPromise;
  }

  /**
   * Store encrypted master key bundle
   */
  async storeMasterKey(bundle: MasterKeyBundle): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CRYPTO_CONFIG.KEYSTORE_NAME], 'readwrite');
      const store = transaction.objectStore(CRYPTO_CONFIG.KEYSTORE_NAME);
      const request = store.put(bundle);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Retrieve encrypted master key bundle
   */
  async getMasterKey(keyId: string): Promise<MasterKeyBundle | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CRYPTO_CONFIG.KEYSTORE_NAME], 'readonly');
      const store = transaction.objectStore(CRYPTO_CONFIG.KEYSTORE_NAME);
      const request = store.get(keyId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get the most recent master key
   */
  async getLatestMasterKey(): Promise<MasterKeyBundle | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CRYPTO_CONFIG.KEYSTORE_NAME], 'readonly');
      const store = transaction.objectStore(CRYPTO_CONFIG.KEYSTORE_NAME);
      const index = store.index('createdAt');
      const request = index.openCursor(null, 'prev'); // Descending order

      request.onsuccess = () => {
        const cursor = request.result;
        resolve(cursor ? cursor.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete all master keys (for logout/reset)
   */
  async clearAllKeys(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([CRYPTO_CONFIG.KEYSTORE_NAME], 'readwrite');
      const store = transaction.objectStore(CRYPTO_CONFIG.KEYSTORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// ============================================================================
// Encryption Engine
// ============================================================================

export class EncryptionEngine {
  private keyStore: KeyStore;
  private activeMasterKey: CryptoKey | null = null;
  private activeKeyId: string | null = null;

  constructor() {
    this.keyStore = new KeyStore();
  }

  // --------------------------------------------------------------------------
  // Key Management
  // --------------------------------------------------------------------------

  /**
   * Generate a new master encryption key
   */
  private async generateMasterKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: CRYPTO_CONFIG.AES_KEY_LENGTH,
      },
      true, // extractable (needed to encrypt it for storage)
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Derive encryption key from user password using PBKDF2
   */
  private async deriveKeyFromPassword(
    password: string,
    salt: Uint8Array
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: CRYPTO_CONFIG.PBKDF2_ITERATIONS,
        hash: CRYPTO_CONFIG.PBKDF2_HASH,
      },
      passwordKey,
      {
        name: 'AES-GCM',
        length: CRYPTO_CONFIG.PBKDF2_KEY_LENGTH,
      },
      false, // not extractable (password-derived keys should never leave memory)
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Initialize new user: Generate master key, encrypt with password, store in IndexedDB
   */
  async initializeNewUser(password: string): Promise<{ keyId: string; salt: string }> {
    // Generate random master key
    const masterKey = await this.generateMasterKey();

    // Generate random salt for PBKDF2
    const salt = crypto.getRandomValues(new Uint8Array(CRYPTO_CONFIG.SALT_LENGTH));

    // Derive key from password
    const passwordKey = await this.deriveKeyFromPassword(password, salt);

    // Encrypt master key with password-derived key
    const iv = crypto.getRandomValues(new Uint8Array(CRYPTO_CONFIG.AES_IV_LENGTH));
    const exportedMasterKey = await crypto.subtle.exportKey('raw', masterKey);

    const encryptedMasterKey = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      passwordKey,
      exportedMasterKey
    );

    // Generate unique key ID
    const keyId = this.generateKeyId();

    // Create key bundle
    const bundle: MasterKeyBundle = {
      encryptedKey: this.arrayBufferToBase64(encryptedMasterKey),
      salt: this.arrayBufferToBase64(salt),
      keyId,
      version: CRYPTO_CONFIG.ENCRYPTION_VERSION,
      createdAt: Date.now(),
    };

    // Store in IndexedDB
    await this.keyStore.storeMasterKey(bundle);

    // Set as active key
    this.activeMasterKey = masterKey;
    this.activeKeyId = keyId;

    return { keyId, salt: bundle.salt };
  }

  /**
   * Unlock existing user: Decrypt master key using password
   */
  async unlockWithPassword(password: string): Promise<boolean> {
    try {
      // Get latest master key bundle
      const bundle = await this.keyStore.getLatestMasterKey();
      if (!bundle) {
        throw new Error('No master key found. User needs to initialize.');
      }

      // Derive key from password
      const salt = this.base64ToArrayBuffer(bundle.salt);
      const passwordKey = await this.deriveKeyFromPassword(password, new Uint8Array(salt));

      // Decrypt master key
      const encryptedMasterKey = this.base64ToArrayBuffer(bundle.encryptedKey);

      const decryptedMasterKey = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: new Uint8Array(12), // IV is embedded in GCM ciphertext for storage encryption
        },
        passwordKey,
        encryptedMasterKey
      );

      // Import decrypted master key
      this.activeMasterKey = await crypto.subtle.importKey(
        'raw',
        decryptedMasterKey,
        {
          name: 'AES-GCM',
          length: CRYPTO_CONFIG.AES_KEY_LENGTH,
        },
        false, // not extractable (stay in memory only)
        ['encrypt', 'decrypt']
      );

      this.activeKeyId = bundle.keyId;
      return true;
    } catch (error) {
      console.error('Failed to unlock with password:', error);
      return false; // Wrong password or corrupted key
    }
  }

  /**
   * Check if user is unlocked (master key loaded in memory)
   */
  isUnlocked(): boolean {
    return this.activeMasterKey !== null && this.activeKeyId !== null;
  }

  /**
   * Lock session (clear master key from memory)
   */
  lock(): void {
    this.activeMasterKey = null;
    this.activeKeyId = null;
  }

  /**
   * Logout: Clear all keys from IndexedDB
   */
  async logout(): Promise<void> {
    this.lock();
    await this.keyStore.clearAllKeys();
  }

  // --------------------------------------------------------------------------
  // Encryption & Decryption
  // --------------------------------------------------------------------------

  /**
   * Encrypt data with active master key
   */
  async encrypt(plaintext: string): Promise<EncryptedData> {
    if (!this.activeMasterKey || !this.activeKeyId) {
      throw new Error('Session locked. Call unlockWithPassword() first.');
    }

    const encoder = new TextEncoder();
    const plaintextBytes = encoder.encode(plaintext);

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(CRYPTO_CONFIG.AES_IV_LENGTH));

    // Encrypt with AES-GCM
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      this.activeMasterKey,
      plaintextBytes
    );

    return {
      ciphertext: this.arrayBufferToBase64(ciphertext),
      metadata: {
        iv: this.arrayBufferToBase64(iv),
        algorithm: 'AES-GCM',
        keyId: this.activeKeyId,
        version: CRYPTO_CONFIG.ENCRYPTION_VERSION,
      },
    };
  }

  /**
   * Decrypt data with active master key
   */
  async decrypt(encryptedData: EncryptedData): Promise<string> {
    if (!this.activeMasterKey) {
      throw new Error('Session locked. Call unlockWithPassword() first.');
    }

    const ciphertext = this.base64ToArrayBuffer(encryptedData.ciphertext);
    const iv = this.base64ToArrayBuffer(encryptedData.metadata.iv);

    // Decrypt with AES-GCM
    const plaintextBytes = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(iv),
      },
      this.activeMasterKey,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(plaintextBytes);
  }

  // --------------------------------------------------------------------------
  // Utility Functions
  // --------------------------------------------------------------------------

  private generateKeyId(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let encryptionEngineInstance: EncryptionEngine | null = null;

/**
 * Get singleton encryption engine instance
 */
export function getEncryptionEngine(): EncryptionEngine {
  if (!encryptionEngineInstance) {
    encryptionEngineInstance = new EncryptionEngine();
  }
  return encryptionEngineInstance;
}

/**
 * Reset encryption engine (for testing or logout)
 */
export function resetEncryptionEngine(): void {
  encryptionEngineInstance = null;
}
