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
    let cliVM = null;
    let browserVM = null;

    try {
      logger.info('Starting authentication', { userId, provider });

      // Create auth session in database
      const authSession = await db.authSessions.create(userId, provider);
      const sessionId = authSession.session_id;

      // STEP 1: Create CLI VM first (user will need this to chat)
      // Don't wait for CLI VM - it doesn't have the health service and we don't need it until after OAuth
      logger.info('Creating CLI VM before authentication', { userId, provider });
      cliVM = await vmManager.createVM(userId, 'cli');
      logger.info('CLI VM created successfully', {
        userId,
        vmId: cliVM.vmId,
        ipAddress: cliVM.ipAddress
      });

      // Note: VM info is already stored in vms table by createVM(), no need to update users table

      // STEP 2: Create browser VM for OAuth
      logger.info('Creating browser VM for OAuth', { userId, provider });
      browserVM = await vmManager.createVM(userId, 'browser');

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

      // Cleanup on failure - destroy both VMs
      if (browserVM?.vmId) {
        await vmManager.destroyVM(browserVM.vmId).catch(err =>
          logger.warn('Failed to cleanup browser VM', { error: err.message })
        );
      }

      if (cliVM?.vmId) {
        await vmManager.destroyVM(cliVM.vmId).catch(err =>
          logger.warn('Failed to cleanup CLI VM', { error: err.message })
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

    logger.info('[WAIT-VM-READY] Starting health check', { vmIP, maxWaitMs });

    while (Date.now() - startTime < maxWaitMs) {
      try {
        logger.info('[WAIT-VM-READY] Attempting health check', {
          vmIP,
          elapsed: Date.now() - startTime,
          url: `http://${vmIP}:8080/health`
        });

        // Try to connect to HTTP server on VM (should be running in golden snapshot)
        const response = await fetch(`http://${vmIP}:8080/health`, {
          signal: AbortSignal.timeout(5000)
        });

        logger.info('[WAIT-VM-READY] Got response', {
          vmIP,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });

        const body = await response.text();
        logger.info('[WAIT-VM-READY] Response body', { vmIP, body });

        if (response.ok) {
          logger.info('[WAIT-VM-READY] VM ready!', { vmIP });
          return true;
        }

        logger.warn('[WAIT-VM-READY] Response not OK', {
          vmIP,
          status: response.status,
          body
        });
      } catch (err) {
        logger.warn('[WAIT-VM-READY] Health check failed', {
          vmIP,
          error: err.message,
          code: err.code,
          elapsed: Date.now() - startTime
        });
      }

      logger.info('[WAIT-VM-READY] Waiting before retry', {
        vmIP,
        waitMs: checkInterval,
        totalElapsed: Date.now() - startTime
      });

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    logger.error('[WAIT-VM-READY] Timeout exceeded', { vmIP, maxWaitMs });
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
   * Authenticate Codex - Starts CLI OAuth flow in VM
   * User completes OAuth in frontend iframe, credentials saved to VM
   */
  async authenticateCodex(sessionId, vmIP) {
    return await this.authenticateCLI(sessionId, vmIP, 'codex');
  }

  /**
   * Authenticate Claude Code - Starts CLI OAuth flow in VM
   */
  async authenticateClaudeCode(sessionId, vmIP) {
    return await this.authenticateCLI(sessionId, vmIP, 'claude_code');
  }

  /**
   * Authenticate Gemini CLI - Starts CLI OAuth flow in VM
   */
  async authenticateGeminiCLI(sessionId, vmIP) {
    return await this.authenticateCLI(sessionId, vmIP, 'gemini_cli');
  }

  /**
   * Generic CLI OAuth flow
   * 1. Start CLI tool in VM (spawns OAuth callback server on localhost:1455)
   * 2. Return immediately - frontend will poll /oauth-url and show in iframe
   * 3. User logs in via iframe → OAuth callback proxied to VM's localhost:1455
   * 4. CLI saves credentials to file
   * 5. Frontend polls /credentials/status until ready
   */
  async authenticateCLI(sessionId, vmIP, provider) {
    logger.info('Starting CLI OAuth flow', { sessionId, vmIP, provider });

    // Start CLI tool - this spawns OAuth server and captures OAuth URL
    const startResponse = await fetch(`http://${vmIP}:8080/auth/${provider}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
      signal: AbortSignal.timeout(10000)
    });

    if (!startResponse.ok) {
      throw new Error(`Failed to start ${provider} CLI: ${startResponse.statusText}`);
    }

    const startResult = await startResponse.json();

    if (!startResult.success) {
      throw new Error(`Failed to start ${provider} OAuth flow`);
    }

    logger.info('CLI OAuth flow started', {
      sessionId,
      provider,
      hasOAuthUrl: !!startResult.oauthUrl
    });

    // Return success - frontend will handle the rest
    // Frontend polls /oauth-url to get OAuth URL
    // Frontend shows OAuth URL in iframe
    // User logs in → callback proxied to VM
    // Frontend polls /credentials/status until ready
    return { started: true, sessionId, provider, oauthUrl: startResult.oauthUrl };
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
   * CLI VM should already exist (created in startAuthentication)
   */
  async transferCredentialsToCLIVM(userId, provider, credentials) {
    try {
      logger.info('Transferring credentials to CLI VM', { userId, provider });

      // Get user's CLI VM (should exist - created in startAuthentication)
      logger.info('[TRANSFER] About to call findByUserId', { userId });
      let cliVM;
      try {
        cliVM = await db.vms.findByUserId(userId);
        logger.info('[TRANSFER] findByUserId returned', { found: !!cliVM, vmId: cliVM?.vm_id });
      } catch (err) {
        logger.error('[TRANSFER] findByUserId threw error', { error: err.message, stack: err.stack });
        throw err;
      }

      if (!cliVM) {
        logger.error('CLI VM not found - this should not happen!', { userId, provider });
        throw new Error('CLI VM not found after authentication');
      }

      logger.info('CLI VM found - transferring credentials', {
        userId,
        provider,
        vmId: cliVM.vm_id,
        vmStatus: cliVM.status
      });

      if (cliVM.status !== 'running') {
        // Resume VM if hibernated
        await vmManager.resumeVM(cliVM.vm_id);
      }

      // Determine credential file path inside VM based on provider
      let vmCredentialPath;
      switch (provider) {
        case 'codex':
          vmCredentialPath = '/root/.codex/credentials.json';
          break;
        case 'claude_code':
          vmCredentialPath = '/root/.claude/credentials.json';
          break;
        case 'gemini_cli':
          vmCredentialPath = '/root/.gemini/credentials.json';
          break;
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }

      // Write credentials directly to VM rootfs via filesystem
      // CLI VM doesn't have HTTP service, so we write directly to its ext4 image
      const { execSync } = require('child_process');
      const config = require('../config');
      const path = require('path');
      const fs = require('fs').promises;

      // Path to VM's rootfs on host
      const vmDir = path.join(config.firecracker.usersDir, cliVM.vm_id);
      const rootfsPath = path.join(vmDir, 'rootfs.ext4');

      // Create temporary directory for mounting
      const mountPoint = path.join('/tmp', `vm-mount-${cliVM.vm_id}`);

      try {
        // Create mount point
        execSync(`mkdir -p ${mountPoint}`, { stdio: 'pipe' });

        // Mount the rootfs (ext4 image)
        execSync(`mount -o loop ${rootfsPath} ${mountPoint}`, { stdio: 'pipe' });

        // Create credential directory inside VM filesystem if it doesn't exist
        const credDir = path.dirname(vmCredentialPath);
        const hostCredDir = path.join(mountPoint, credDir.slice(1)); // Remove leading /
        execSync(`mkdir -p ${hostCredDir}`, { stdio: 'pipe' });

        // Write credentials file
        const hostCredPath = path.join(mountPoint, vmCredentialPath.slice(1));
        await fs.writeFile(hostCredPath, JSON.stringify(credentials, null, 2));

        // Set secure permissions (600 = rw-------)
        execSync(`chmod 600 ${hostCredPath}`, { stdio: 'pipe' });
        execSync(`chown root:root ${hostCredPath}`, { stdio: 'pipe' });

        logger.info('Credentials written directly to VM filesystem', {
          userId,
          provider,
          vmId: cliVM.vm_id,
          vmPath: vmCredentialPath,
          hostPath: hostCredPath
        });
      } finally {
        // Always unmount, even if write failed
        try {
          execSync(`umount ${mountPoint}`, { stdio: 'pipe' });
          execSync(`rmdir ${mountPoint}`, { stdio: 'pipe' });
        } catch (unmountErr) {
          logger.warn('Failed to unmount VM rootfs', {
            vmId: cliVM.vm_id,
            error: unmountErr.message
          });
        }
      }

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
        encrypted: credData.encrypted_credentials,
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
