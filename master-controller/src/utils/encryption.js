/**
 * Credential Encryption Utilities
 * Implements AES-256-GCM encryption for sensitive credentials
 */

const crypto = require('crypto');
const config = require('../config');
const logger = require('./logger').module('encryption');

class CredentialEncryption {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.masterKey = config.encryption.masterKey;

    if (!this.masterKey || this.masterKey.length !== 64) {
      throw new Error('Invalid master key: must be 64 hex characters (32 bytes)');
    }
  }

  /**
   * Encrypt credentials before database storage
   * @param {Object|String} plaintext - Credentials to encrypt
   * @returns {Object} Encrypted data with IV, tag, and salt
   */
  encrypt(plaintext) {
    try {
      // Generate random salt
      const salt = crypto.randomBytes(16);

      // Derive key from master key using scrypt
      const key = crypto.scryptSync(
        Buffer.from(this.masterKey, 'hex'),
        salt,
        32
      );

      // Generate random IV
      const iv = crypto.randomBytes(16);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      // Convert plaintext to JSON if it's an object
      const plaintextString = typeof plaintext === 'string'
        ? plaintext
        : JSON.stringify(plaintext);

      // Encrypt
      let encrypted = cipher.update(plaintextString, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      logger.debug('Credentials encrypted successfully');

      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        salt: salt.toString('hex'),
        algorithm: this.algorithm
      };
    } catch (error) {
      logger.error('Encryption failed', { error: error.message });
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt credentials from database
   * @param {Object} encryptedData - Object with encrypted, iv, authTag, salt
   * @returns {Object|String} Decrypted credentials
   */
  decrypt(encryptedData) {
    try {
      const { encrypted, iv, authTag, salt } = encryptedData;

      // Validate input
      if (!encrypted || !iv || !authTag || !salt) {
        throw new Error('Missing required encryption parameters');
      }

      // Derive key from master key using the same salt
      const key = crypto.scryptSync(
        Buffer.from(this.masterKey, 'hex'),
        Buffer.from(salt, 'hex'),
        32
      );

      // Create decipher
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        key,
        Buffer.from(iv, 'hex')
      );

      // Set authentication tag
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      // Decrypt
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      logger.debug('Credentials decrypted successfully');

      // Try to parse as JSON, return as string if it fails
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      logger.error('Decryption failed', { error: error.message });
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate a new encryption key (for initial setup)
   * @returns {String} 64-character hex string (32 bytes)
   */
  static generateKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash a string (for non-reversible hashing, e.g., API keys)
   * @param {String} data - Data to hash
   * @returns {String} SHA-256 hash
   */
  hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify a hash
   * @param {String} data - Original data
   * @param {String} hash - Hash to verify against
   * @returns {Boolean} Whether the hash matches
   */
  verifyHash(data, hash) {
    return this.hash(data) === hash;
  }

  /**
   * Encrypt file content (for VM rootfs encryption)
   * @param {Buffer} fileBuffer - File content as buffer
   * @param {String} password - Password for encryption
   * @returns {Buffer} Encrypted buffer
   */
  encryptFile(fileBuffer, password) {
    const salt = crypto.randomBytes(16);
    const key = crypto.scryptSync(password, salt, 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(fileBuffer),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    // Combine salt + iv + authTag + encrypted data
    return Buffer.concat([salt, iv, authTag, encrypted]);
  }

  /**
   * Decrypt file content
   * @param {Buffer} encryptedBuffer - Encrypted file buffer
   * @param {String} password - Password for decryption
   * @returns {Buffer} Decrypted buffer
   */
  decryptFile(encryptedBuffer, password) {
    // Extract components
    const salt = encryptedBuffer.slice(0, 16);
    const iv = encryptedBuffer.slice(16, 32);
    const authTag = encryptedBuffer.slice(32, 48);
    const encrypted = encryptedBuffer.slice(48);

    const key = crypto.scryptSync(password, salt, 32);
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
  }

  /**
   * Generate a secure random token
   * @param {Number} bytes - Number of bytes (default: 32)
   * @returns {String} Hex-encoded token
   */
  generateToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString('hex');
  }
}

// Singleton instance
const credentialEncryption = new CredentialEncryption();

module.exports = {
  CredentialEncryption,
  credentialEncryption,
  generateKey: CredentialEncryption.generateKey
};
