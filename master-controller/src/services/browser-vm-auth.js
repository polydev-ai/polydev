/**
 * Browser VM Authentication Handler
 * Manages Browser VMs for CLI tool OAuth automation using Puppeteer
 */

const { vmManager } = require('./vm-manager');
const { db } = require('../db/supabase');
const { credentialEncryption } = require('../utils/encryption');
const logger = require('../utils/logger').module('browser-auth');

class BrowserVMAuth {
  constructor() {
    this.authSessions = new Map(); // sessionId -> session data
  }

  /**
   * Start authentication process for a user
   * Creates browser VM, runs OAuth flow, captures credentials
   */
  async startAuthentication(userId, provider) {
    try {
      logger.info('Starting authentication', { userId, provider });

      // Create auth session in database
      const authSession = await db.authSessions.create(userId, provider);
      const sessionId = authSession.session_id;

      // Create browser VM
      const browserVM = await vmManager.createVM(userId, 'browser');

      // Store session data
      this.authSessions.set(sessionId, {
        userId,
        provider,
        browserVMId: browserVM.vmId,
        browserIP: browserVM.ipAddress,
        status: 'vm_created',
        startedAt: new Date()
      });

      // Update session in database
      await db.authSessions.update(sessionId, {
        vm_id: browserVM.vmId,
        vm_ip: browserVM.ipAddress,
        status: 'vm_created'
      });

      // Wait for VM to be ready, then start OAuth flow
      await this.waitForVMReady(browserVM.ipAddress);

      // Execute OAuth automation based on provider
      const credentials = await this.executeOAuthFlow(
        sessionId,
        provider,
        browserVM.ipAddress
      );

      // Store encrypted credentials
      await this.storeCredentials(userId, provider, credentials);

      // Transfer credentials to CLI VM
      await this.transferCredentialsToCLIVM(userId, provider, credentials);

      // Destroy browser VM
      await vmManager.destroyVM(browserVM.vmId);

      // Update session status
      await db.authSessions.updateStatus(sessionId, 'completed');
      this.authSessions.delete(sessionId);

      logger.info('Authentication completed', { userId, provider, sessionId });

      return {
        success: true,
        sessionId,
        provider
      };
    } catch (error) {
      logger.error('Authentication failed', { userId, provider, error: error.message });

      // Cleanup on failure
      const session = this.authSessions.get(sessionId);
      if (session?.browserVMId) {
        await vmManager.destroyVM(session.browserVMId).catch(err =>
          logger.warn('Failed to cleanup browser VM', { error: err.message })
        );
      }

      throw error;
    }
  }

  /**
   * Wait for VM to be network-ready
   */
  async waitForVMReady(vmIP, maxWaitMs = 60000) {
    const startTime = Date.now();
    const checkInterval = 2000; // 2 seconds

    while (Date.now() - startTime < maxWaitMs) {
      try {
        // Try to connect to HTTP server on VM (should be running in golden snapshot)
        const response = await fetch(`http://${vmIP}:8080/health`, {
          signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
          logger.info('VM ready', { vmIP });
          return true;
        }
      } catch (err) {
        // VM not ready yet, continue waiting
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    throw new Error(`VM not ready after ${maxWaitMs}ms`);
  }

  /**
   * Execute OAuth flow based on provider
   */
  async executeOAuthFlow(sessionId, provider, vmIP) {
    logger.info('Executing OAuth flow', { sessionId, provider, vmIP });

    switch (provider) {
      case 'codex':
        return await this.authenticateCodex(sessionId, vmIP);
      case 'claude_code':
        return await this.authenticateClaudeCode(sessionId, vmIP);
      case 'gemini_cli':
        return await this.authenticateGeminiCLI(sessionId, vmIP);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Authenticate Codex via Puppeteer
   * Codex OAuth flow: browser redirects to localhost:1455/success?id_token=...
   */
  async authenticateCodex(sessionId, vmIP) {
    logger.info('Authenticating Codex', { sessionId, vmIP });

    // Call Puppeteer script on Browser VM via HTTP API
    const response = await fetch(`http://${vmIP}:8080/auth/codex`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
      signal: AbortSignal.timeout(120000) // 2 min timeout
    });

    if (!response.ok) {
      throw new Error(`Codex auth failed: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success || !result.credentials) {
      throw new Error('Codex authentication failed');
    }

    return result.credentials;
  }

  /**
   * Authenticate Claude Code via Puppeteer
   * Claude Code uses device code flow
   */
  async authenticateClaudeCode(sessionId, vmIP) {
    logger.info('Authenticating Claude Code', { sessionId, vmIP });

    const response = await fetch(`http://${vmIP}:8080/auth/claude_code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
      signal: AbortSignal.timeout(120000)
    });

    if (!response.ok) {
      throw new Error(`Claude Code auth failed: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success || !result.credentials) {
      throw new Error('Claude Code authentication failed');
    }

    return result.credentials;
  }

  /**
   * Authenticate Gemini CLI via Puppeteer
   * Gemini CLI uses Google OAuth
   */
  async authenticateGeminiCLI(sessionId, vmIP) {
    logger.info('Authenticating Gemini CLI', { sessionId, vmIP });

    const response = await fetch(`http://${vmIP}:8080/auth/gemini_cli`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
      signal: AbortSignal.timeout(120000)
    });

    if (!response.ok) {
      throw new Error(`Gemini CLI auth failed: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success || !result.credentials) {
      throw new Error('Gemini CLI authentication failed');
    }

    return result.credentials;
  }

  /**
   * Store encrypted credentials in database
   */
  async storeCredentials(userId, provider, credentials) {
    try {
      // Encrypt credentials
      const encryptedData = credentialEncryption.encrypt(credentials);

      // Store in database (upsert)
      await db.credentials.create(userId, provider, encryptedData);

      logger.info('Credentials stored', { userId, provider });
    } catch (error) {
      logger.error('Failed to store credentials', {
        userId,
        provider,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Transfer credentials to CLI VM
   * Writes credential files to CLI VM's filesystem
   */
  async transferCredentialsToCLIVM(userId, provider, credentials) {
    try {
      logger.info('Transferring credentials to CLI VM', { userId, provider });

      // Get user's CLI VM
      const cliVM = await db.vms.findByUserId(userId);
      if (!cliVM) {
        throw new Error('CLI VM not found for user');
      }

      if (cliVM.status !== 'running') {
        // Resume VM if hibernated
        await vmManager.resumeVM(cliVM.vm_id);
      }

      // Determine credential file path based on provider
      let credentialPath;
      switch (provider) {
        case 'codex':
          credentialPath = '/root/.codex/credentials.json';
          break;
        case 'claude_code':
          credentialPath = '/root/.claude/credentials.json';
          break;
        case 'gemini_cli':
          credentialPath = '/root/.gemini/credentials.json';
          break;
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }

      // Write credentials via API to CLI VM
      const response = await fetch(`http://${cliVM.ip_address}:8080/credentials/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: credentialPath,
          content: JSON.stringify(credentials),
          mode: '0600' // Secure file permissions
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`Failed to write credentials: ${response.statusText}`);
      }

      // Update user status
      await db.users.update(userId, { status: 'authenticated' });

      logger.info('Credentials transferred successfully', {
        userId,
        provider,
        vmId: cliVM.vm_id
      });
    } catch (error) {
      logger.error('Credential transfer failed', {
        userId,
        provider,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get authentication session status
   */
  async getSessionStatus(sessionId) {
    const session = this.authSessions.get(sessionId);
    if (session) {
      return session;
    }

    // Check database
    const dbSession = await db.authSessions.findById(sessionId);
    return dbSession;
  }

  /**
   * Cancel authentication session
   */
  async cancelSession(sessionId) {
    const session = this.authSessions.get(sessionId);
    if (session?.browserVMId) {
      await vmManager.destroyVM(session.browserVMId);
    }

    await db.authSessions.updateStatus(sessionId, 'cancelled');
    this.authSessions.delete(sessionId);

    logger.info('Auth session cancelled', { sessionId });
  }

  /**
   * Rotate credentials for a provider
   * Re-runs authentication flow
   */
  async rotateCredentials(userId, provider) {
    logger.info('Rotating credentials', { userId, provider });

    // Start new authentication
    return await this.startAuthentication(userId, provider);
  }

  /**
   * Validate stored credentials
   * Checks if credentials are still valid
   */
  async validateCredentials(userId, provider) {
    try {
      const credData = await db.credentials.find(userId, provider);
      if (!credData) {
        return { valid: false, reason: 'not_found' };
      }

      // Decrypt credentials
      const credentials = credentialEncryption.decrypt({
        encrypted: credData.encrypted_data,
        iv: credData.encryption_iv,
        authTag: credData.encryption_tag,
        salt: credData.encryption_salt
      });

      // Check expiry if present
      if (credentials.expires_at) {
        const expiryDate = new Date(credentials.expires_at);
        if (expiryDate < new Date()) {
          await db.credentials.updateValidation(credData.credential_id, false);
          return { valid: false, reason: 'expired' };
        }
      }

      // Test credentials by making a simple API call to CLI VM
      const cliVM = await db.vms.findByUserId(userId);
      if (!cliVM || cliVM.status !== 'running') {
        return { valid: true, untested: true };
      }

      const response = await fetch(`http://${cliVM.ip_address}:8080/test-auth/${provider}`, {
        signal: AbortSignal.timeout(10000)
      }).catch(() => null);

      const valid = response?.ok || false;

      // Update validation status
      await db.credentials.updateValidation(credData.credential_id, valid);

      return {
        valid,
        lastVerified: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Credential validation failed', {
        userId,
        provider,
        error: error.message
      });

      return {
        valid: false,
        reason: 'validation_error',
        error: error.message
      };
    }
  }

  /**
   * List all credentials for a user
   */
  async listCredentials(userId) {
    return await db.credentials.listByUser(userId);
  }
}

// Singleton instance
const browserVMAuth = new BrowserVMAuth();

module.exports = {
  BrowserVMAuth,
  browserVMAuth
};
