/**
 * Zero-Knowledge Client-Side Encryption System
 * All encryption keys never leave the user's browser
 * Enterprise-grade AES-256-GCM encryption with automatic key rotation
 */

interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyId: string;
  version: number;
}

interface UserKey {
  keyId: string;
  key: CryptoKey;
  created: Date;
  rotationDue: Date;
}

export class ZeroKnowledgeEncryption {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;
  private static readonly AUTH_TAG_LENGTH = 16;
  private static readonly KEY_ROTATION_DAYS = 30;
  private static readonly DB_NAME = 'PolydevZKMemory';
  private static readonly DB_VERSION = 1;
  
  private db: IDBDatabase | null = null;
  private activeKey: UserKey | null = null;

  /**
   * Initialize the encryption system
   */
  async initialize(): Promise<void> {
    await this.initializeIndexedDB();
    await this.loadOrCreateActiveKey();
  }

  /**
   * Initialize IndexedDB for local key storage
   */
  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(ZeroKnowledgeEncryption.DB_NAME, ZeroKnowledgeEncryption.DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Store for encryption keys (never synchronized)
        if (!db.objectStoreNames.contains('keys')) {
          const keyStore = db.createObjectStore('keys', { keyPath: 'keyId' });
          keyStore.createIndex('created', 'created', { unique: false });
        }
        
        // Cache for encrypted data
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'id' });
          cacheStore.createIndex('expires', 'expires', { unique: false });
        }
      };
    });
  }

  /**
   * Generate new AES-256-GCM encryption key
   */
  private async generateKey(): Promise<UserKey> {
    const keyId = this.generateKeyId();
    const key = await window.crypto.subtle.generateKey(
      {
        name: ZeroKnowledgeEncryption.ALGORITHM,
        length: ZeroKnowledgeEncryption.KEY_LENGTH,
      },
      true, // extractable for storage
      ['encrypt', 'decrypt']
    );

    const now = new Date();
    const rotationDue = new Date(now.getTime() + (ZeroKnowledgeEncryption.KEY_ROTATION_DAYS * 24 * 60 * 60 * 1000));

    return {
      keyId,
      key,
      created: now,
      rotationDue
    };
  }

  /**
   * Load active key or create new one
   */
  private async loadOrCreateActiveKey(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['keys'], 'readonly');
    const store = transaction.objectStore('keys');
    
    // Get the most recent key
    const index = store.index('created');
    const request = index.openCursor(null, 'prev');
    
    return new Promise((resolve) => {
      request.onsuccess = async (event) => {
        const cursor = (event.target as IDBRequest).result;
        
        if (cursor) {
          const keyData = cursor.value;
          
          // Check if key needs rotation
          if (new Date() > new Date(keyData.rotationDue)) {
            console.log('[ZK Encryption] Key rotation needed, generating new key');
            await this.createAndStoreKey();
          } else {
            // Import existing key
            const keyBuffer = new Uint8Array(keyData.keyBuffer);
            this.activeKey = {
              keyId: keyData.keyId,
              key: await window.crypto.subtle.importKey(
                'raw',
                keyBuffer,
                { name: ZeroKnowledgeEncryption.ALGORITHM },
                true,
                ['encrypt', 'decrypt']
              ),
              created: new Date(keyData.created),
              rotationDue: new Date(keyData.rotationDue)
            };
          }
        } else {
          // No keys exist, create first one
          await this.createAndStoreKey();
        }
        
        resolve();
      };
    });
  }

  /**
   * Create and store new key
   */
  private async createAndStoreKey(): Promise<void> {
    this.activeKey = await this.generateKey();
    await this.storeKey(this.activeKey);
  }

  /**
   * Store key in IndexedDB
   */
  private async storeKey(userKey: UserKey): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const keyBuffer = await window.crypto.subtle.exportKey('raw', userKey.key);
    
    const transaction = this.db.transaction(['keys'], 'readwrite');
    const store = transaction.objectStore('keys');
    
    await store.put({
      keyId: userKey.keyId,
      keyBuffer: Array.from(new Uint8Array(keyBuffer)),
      created: userKey.created.toISOString(),
      rotationDue: userKey.rotationDue.toISOString()
    });
  }

  /**
   * Encrypt sensitive data
   */
  async encrypt(plaintext: string): Promise<EncryptedData> {
    if (!this.activeKey) throw new Error('Encryption key not available');

    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    const iv = window.crypto.getRandomValues(new Uint8Array(ZeroKnowledgeEncryption.IV_LENGTH));
    
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: ZeroKnowledgeEncryption.ALGORITHM,
        iv: iv,
      },
      this.activeKey.key,
      data
    );

    const encryptedArray = new Uint8Array(encrypted);
    const ciphertext = encryptedArray.slice(0, -ZeroKnowledgeEncryption.AUTH_TAG_LENGTH);
    const authTag = encryptedArray.slice(-ZeroKnowledgeEncryption.AUTH_TAG_LENGTH);

    return {
      ciphertext: this.arrayBufferToBase64(ciphertext),
      iv: this.arrayBufferToBase64(iv),
      authTag: this.arrayBufferToBase64(authTag),
      keyId: this.activeKey.keyId,
      version: 1
    };
  }

  /**
   * Decrypt sensitive data
   */
  async decrypt(encryptedData: EncryptedData): Promise<string> {
    const key = await this.getKeyById(encryptedData.keyId);
    if (!key) throw new Error(`Encryption key ${encryptedData.keyId} not found`);

    const ciphertext = this.base64ToArrayBuffer(encryptedData.ciphertext);
    const iv = this.base64ToArrayBuffer(encryptedData.iv);
    const authTag = this.base64ToArrayBuffer(encryptedData.authTag);

    // Combine ciphertext and auth tag for Web Crypto API
    const combined = new Uint8Array(ciphertext.byteLength + authTag.byteLength);
    combined.set(new Uint8Array(ciphertext));
    combined.set(new Uint8Array(authTag), ciphertext.byteLength);

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: ZeroKnowledgeEncryption.ALGORITHM,
        iv: new Uint8Array(iv),
      },
      key,
      combined
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  /**
   * Get encryption key by ID
   */
  private async getKeyById(keyId: string): Promise<CryptoKey | null> {
    if (!this.db) return null;

    const transaction = this.db.transaction(['keys'], 'readonly');
    const store = transaction.objectStore('keys');
    const request = store.get(keyId);

    return new Promise((resolve) => {
      request.onsuccess = async () => {
        if (request.result) {
          const keyBuffer = new Uint8Array(request.result.keyBuffer);
          const key = await window.crypto.subtle.importKey(
            'raw',
            keyBuffer,
            { name: ZeroKnowledgeEncryption.ALGORITHM },
            true,
            ['encrypt', 'decrypt']
          );
          resolve(key);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  }

  /**
   * Create SHA-256 hash for content deduplication
   */
  async createContentHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    return this.arrayBufferToHex(hashBuffer);
  }

  /**
   * Check if key rotation is needed
   */
  isRotationDue(): boolean {
    return this.activeKey ? new Date() > this.activeKey.rotationDue : true;
  }

  /**
   * Force key rotation
   */
  async rotateKeys(): Promise<void> {
    await this.createAndStoreKey();
    console.log('[ZK Encryption] Key rotation completed');
  }

  /**
   * Generate unique key ID
   */
  private generateKeyId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `zk_${timestamp}_${random}`;
  }

  /**
   * Utility: ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Utility: Base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Utility: ArrayBuffer to Hex
   */
  private arrayBufferToHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get encryption status for dashboard
   */
  getEncryptionStatus(): {
    keyId: string | null;
    created: Date | null;
    rotationDue: Date | null;
    rotationNeeded: boolean;
  } {
    return {
      keyId: this.activeKey?.keyId || null,
      created: this.activeKey?.created || null,
      rotationDue: this.activeKey?.rotationDue || null,
      rotationNeeded: this.isRotationDue()
    };
  }

  /**
   * Clear all keys (for user logout/reset)
   */
  async clearAllKeys(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['keys', 'cache'], 'readwrite');
    await transaction.objectStore('keys').clear();
    await transaction.objectStore('cache').clear();
    
    this.activeKey = null;
    console.log('[ZK Encryption] All keys cleared');
  }
}

// Export singleton instance
export const zkEncryption = new ZeroKnowledgeEncryption();