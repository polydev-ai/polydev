"use strict";
/**
 * Zero-Knowledge Client-Side Encryption System
 * All encryption keys never leave the user's browser
 * Enterprise-grade AES-256-GCM encryption with automatic key rotation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.zkEncryption = exports.ZeroKnowledgeEncryption = void 0;
class ZeroKnowledgeEncryption {
    constructor() {
        this.db = null;
        this.activeKey = null;
    }
    /**
     * Initialize the encryption system
     */
    async initialize() {
        await this.initializeIndexedDB();
        await this.loadOrCreateActiveKey();
    }
    /**
     * Initialize IndexedDB for local key storage
     */
    async initializeIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(ZeroKnowledgeEncryption.DB_NAME, ZeroKnowledgeEncryption.DB_VERSION);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
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
    async generateKey() {
        const keyId = this.generateKeyId();
        const key = await window.crypto.subtle.generateKey({
            name: ZeroKnowledgeEncryption.ALGORITHM,
            length: ZeroKnowledgeEncryption.KEY_LENGTH,
        }, true, // extractable for storage
        ['encrypt', 'decrypt']);
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
    async loadOrCreateActiveKey() {
        if (!this.db)
            throw new Error('Database not initialized');
        const transaction = this.db.transaction(['keys'], 'readonly');
        const store = transaction.objectStore('keys');
        // Get the most recent key
        const index = store.index('created');
        const request = index.openCursor(null, 'prev');
        return new Promise((resolve) => {
            request.onsuccess = async (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const keyData = cursor.value;
                    // Check if key needs rotation
                    if (new Date() > new Date(keyData.rotationDue)) {
                        console.log('[ZK Encryption] Key rotation needed, generating new key');
                        await this.createAndStoreKey();
                    }
                    else {
                        // Import existing key
                        const keyBuffer = new Uint8Array(keyData.keyBuffer);
                        this.activeKey = {
                            keyId: keyData.keyId,
                            key: await window.crypto.subtle.importKey('raw', keyBuffer, { name: ZeroKnowledgeEncryption.ALGORITHM }, true, ['encrypt', 'decrypt']),
                            created: new Date(keyData.created),
                            rotationDue: new Date(keyData.rotationDue)
                        };
                    }
                }
                else {
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
    async createAndStoreKey() {
        this.activeKey = await this.generateKey();
        await this.storeKey(this.activeKey);
    }
    /**
     * Store key in IndexedDB
     */
    async storeKey(userKey) {
        if (!this.db)
            throw new Error('Database not initialized');
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
    async encrypt(plaintext) {
        if (!this.activeKey)
            throw new Error('Encryption key not available');
        const encoder = new TextEncoder();
        const data = encoder.encode(plaintext);
        const iv = window.crypto.getRandomValues(new Uint8Array(ZeroKnowledgeEncryption.IV_LENGTH));
        const encrypted = await window.crypto.subtle.encrypt({
            name: ZeroKnowledgeEncryption.ALGORITHM,
            iv: iv,
        }, this.activeKey.key, data);
        const encryptedArray = new Uint8Array(encrypted);
        const ciphertext = encryptedArray.slice(0, -ZeroKnowledgeEncryption.AUTH_TAG_LENGTH);
        const authTag = encryptedArray.slice(-ZeroKnowledgeEncryption.AUTH_TAG_LENGTH);
        return {
            ciphertext: this.arrayBufferToBase64(ciphertext.buffer),
            iv: this.arrayBufferToBase64(iv.buffer),
            authTag: this.arrayBufferToBase64(authTag.buffer),
            keyId: this.activeKey.keyId,
            version: 1
        };
    }
    /**
     * Decrypt sensitive data
     */
    async decrypt(encryptedData) {
        const key = await this.getKeyById(encryptedData.keyId);
        if (!key)
            throw new Error(`Encryption key ${encryptedData.keyId} not found`);
        const ciphertext = this.base64ToArrayBuffer(encryptedData.ciphertext);
        const iv = this.base64ToArrayBuffer(encryptedData.iv);
        const authTag = this.base64ToArrayBuffer(encryptedData.authTag);
        // Combine ciphertext and auth tag for Web Crypto API
        const combined = new Uint8Array(ciphertext.byteLength + authTag.byteLength);
        combined.set(new Uint8Array(ciphertext));
        combined.set(new Uint8Array(authTag), ciphertext.byteLength);
        const decrypted = await window.crypto.subtle.decrypt({
            name: ZeroKnowledgeEncryption.ALGORITHM,
            iv: new Uint8Array(iv),
        }, key, combined);
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    }
    /**
     * Get encryption key by ID
     */
    async getKeyById(keyId) {
        if (!this.db)
            return null;
        const transaction = this.db.transaction(['keys'], 'readonly');
        const store = transaction.objectStore('keys');
        const request = store.get(keyId);
        return new Promise((resolve) => {
            request.onsuccess = async () => {
                if (request.result) {
                    const keyBuffer = new Uint8Array(request.result.keyBuffer);
                    const key = await window.crypto.subtle.importKey('raw', keyBuffer, { name: ZeroKnowledgeEncryption.ALGORITHM }, true, ['encrypt', 'decrypt']);
                    resolve(key);
                }
                else {
                    resolve(null);
                }
            };
            request.onerror = () => resolve(null);
        });
    }
    /**
     * Create SHA-256 hash for content deduplication
     */
    async createContentHash(content) {
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        return this.arrayBufferToHex(hashBuffer);
    }
    /**
     * Check if key rotation is needed
     */
    isRotationDue() {
        return this.activeKey ? new Date() > this.activeKey.rotationDue : true;
    }
    /**
     * Force key rotation
     */
    async rotateKeys() {
        await this.createAndStoreKey();
        console.log('[ZK Encryption] Key rotation completed');
    }
    /**
     * Generate unique key ID
     */
    generateKeyId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        return `zk_${timestamp}_${random}`;
    }
    /**
     * Utility: ArrayBuffer to Base64
     */
    arrayBufferToBase64(buffer) {
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
    base64ToArrayBuffer(base64) {
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
    arrayBufferToHex(buffer) {
        const bytes = new Uint8Array(buffer);
        return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    /**
     * Get encryption status for dashboard
     */
    getEncryptionStatus() {
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
    async clearAllKeys() {
        if (!this.db)
            return;
        const transaction = this.db.transaction(['keys', 'cache'], 'readwrite');
        await transaction.objectStore('keys').clear();
        await transaction.objectStore('cache').clear();
        this.activeKey = null;
        console.log('[ZK Encryption] All keys cleared');
    }
}
exports.ZeroKnowledgeEncryption = ZeroKnowledgeEncryption;
ZeroKnowledgeEncryption.ALGORITHM = 'AES-GCM';
ZeroKnowledgeEncryption.KEY_LENGTH = 256;
ZeroKnowledgeEncryption.IV_LENGTH = 12;
ZeroKnowledgeEncryption.AUTH_TAG_LENGTH = 16;
ZeroKnowledgeEncryption.KEY_ROTATION_DAYS = 30;
ZeroKnowledgeEncryption.DB_NAME = 'PolydevZKMemory';
ZeroKnowledgeEncryption.DB_VERSION = 1;
// Export singleton instance
exports.zkEncryption = new ZeroKnowledgeEncryption();
