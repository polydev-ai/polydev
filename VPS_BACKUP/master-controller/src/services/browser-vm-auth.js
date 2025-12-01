/**
 * Browser VM Authentication Handler
 * Manages Browser VMs for CLI tool OAuth automation using Puppeteer
 *
 * ARCH-1 FIX: Uses Redis for ephemeral session state with automatic TTL expiration
 * - Sessions auto-expire after config.redis.sessionTTL (default 10 minutes)
 * - No more stale sessions persisting indefinitely in database
 * - Frontend queries Redis → if session missing → VM is dead → show "Start New Session"
 */

const { vmManager } = require('./vm-manager');
const { db } = require('../db/supabase');
const { credentialEncryption } = require('../utils/encryption');
const logger = require('../utils/logger').module('browser-auth');
const config = require('../config');
const { cliStreamingService } = require('./cli-streaming');
const redisClient = require('./redis-client');

class BrowserVMAuth {
  constructor() {
    this.authSessions = new Map(); // sessionId -> session data (fast in-memory cache)
    this.redisConnected = false;
  }

  /**
   * Initialize Redis connection
   * Called during service startup
   */
  async initialize() {
    try {
      await redisClient.connect();
      this.redisConnected = true;
      logger.info('[REDIS] BrowserVMAuth service connected to Redis');
    } catch (error) {
      logger.error('[REDIS] Failed to connect to Redis', {
        error: error.message
      });
      // Continue without Redis - will fall back to in-memory Map
      this.redisConnected = false;
    }
  }

  /**
   * Start authentication process for a user
   * Creates browser VM, runs OAuth flow, captures credentials
   *
   * CRITICAL FIX: Returns sessionId immediately (before VM creation)
   * This fixes the race condition where VMs poll for offers before frontend creates them
   *
   * RACE CONDITION FIX: Accepts optional webrtcOffer and stores it BEFORE VM creation
   * This ensures the offer exists when the VM boots and starts polling
   */
  async startAuthentication(userId, provider, webrtcOffer = null) {
    let authSession = null;

    try {
      logger.info('Starting authentication', { userId, provider, hasWebrtcOffer: !!webrtcOffer });

      // Create auth session in database FIRST
      authSession = await db.authSessions.create(userId, provider);
      const sessionId = authSession.session_id;

      logger.info('[RACE-CONDITION-FIX] Returning sessionId immediately before VM creation', {
        sessionId,
        userId,
        provider,
        hasWebrtcOffer: !!webrtcOffer
      });

      // CRITICAL: If webrtcOffer was provided, store it BEFORE VM creation
      if (webrtcOffer) {
        logger.info('[RACE-FIX] Storing WebRTC offer before VM creation', {
          sessionId,
          hasOffer: !!webrtcOffer.offer,
          candidateCount: webrtcOffer.candidates?.length || 0
        });

        try {
          const { getWebRTCSignalingService } = require('./webrtc-signaling');
          const signalingService = getWebRTCSignalingService();

          await signalingService.storeOffer(
            sessionId,
            webrtcOffer.offer,
            webrtcOffer.candidates || []
          );

          logger.info('[RACE-FIX] WebRTC offer stored successfully before VM creation', {
            sessionId
          });
        } catch (offerError) {
          logger.error('[RACE-FIX] Failed to store WebRTC offer', {
            sessionId,
            error: offerError.message
          });
          // Don't fail the entire auth start - VM can still boot without offer
        }
      }

      // Store initial session data
      this.authSessions.set(sessionId, {
        userId,
        provider,
        status: 'initializing',
        startedAt: new Date()
      });

      // Start VM creation and OAuth flow in background (don't await)
      this.createVMAndStartOAuth(sessionId, userId, provider).catch(error => {
        logger.error('Background VM creation and OAuth flow failed', {
          sessionId,
          userId,
          provider,
          error: error.message
        });
      });

      // Return immediately - API responds in <1 second
      return {
        success: true,
        sessionId,
        provider,
        novncURL: null,  // Will be updated when VM is ready
        browserIP: null  // Will be updated when VM is ready
      };
    } catch (error) {
      logger.error('Failed to create auth session', { userId, provider, error: error.message });
      throw error;
    }
  }

  /**
   * Create VM and start OAuth flow in background
   * This runs asynchronously AFTER sessionId is returned to frontend
   */
  async createVMAndStartOAuth(sessionId, userId, provider) {
    let cliVM = null;
    let cliVMInfo = null;
    let browserVM = null;

    try {
      logger.info('[BACKGROUND] Starting VM creation for session', { sessionId, userId, provider });

      // STEP 1: Ensure user has an active CLI VM (with Decodo proxy assigned)
      logger.info('Ensuring CLI VM exists before authentication', { userId, provider });
      cliVM = await db.vms.findByUserId(userId);
      if (!cliVM) {
        logger.info('No active CLI VM found, provisioning via CLI streaming service', { userId });
        cliVM = await cliStreamingService.ensureCLIVM(userId);
      } else {
        logger.info('Reusing existing CLI VM', {
          userId,
          vmId: cliVM.vm_id,
          status: cliVM.status,
          vmIP: cliVM.ip_address
        });
      }

      cliVMInfo = {
        vmId: cliVM?.vm_id || cliVM?.vmId,
        ipAddress: cliVM?.ip_address || cliVM?.ipAddress,
        status: cliVM?.status
      };

      // STEP 2: Create browser VM for OAuth (this takes ~11 seconds)
      logger.info('[BACKGROUND] Creating browser VM for OAuth', {
        userId,
        provider,
        sessionId
      });

      try {
        browserVM = await vmManager.createVM(userId, 'browser', null, null, sessionId);
        logger.info('Browser VM created successfully with WebRTC', {
          userId,
          provider,
          sessionId,
          browserVMId: browserVM.vmId,
          browserVMIP: browserVM.ipAddress
        });

        // Associate session with VM for stability tracking
        await vmManager.associateSessionWithVM(sessionId, browserVM.vmId, browserVM.ipAddress);
        logger.info('Session associated with browser VM', {
          sessionId,
          browserVMId: browserVM.vmId,
          browserVMIP: browserVM.ipAddress
        });
      } catch (vmCreateError) {
        logger.error('BROWSER VM CREATION FAILED', {
          userId,
          provider,
          sessionId,
          error: vmCreateError.message,
          stack: vmCreateError.stack
        });

        // Update session status to failed
        await db.authSessions.update(sessionId, {
          status: 'failed',
          error_message: `Browser VM creation failed: ${vmCreateError.message}`
        }).catch(err => logger.error('Failed to update session status', { error: err.message }));

        throw vmCreateError;  // Re-throw to trigger cleanup
      }

      const novncURL = this.buildNoVNCUrl(sessionId, browserVM.ipAddress);

      // Session data object
      const sessionData = {
        userId,
        provider,
        browserVMId: browserVM.vmId,
        browserIP: browserVM.ipAddress,
        novncURL,
        status: 'vm_created',
        startedAt: new Date()
      };

      // Update session in memory (fast cache)
      this.authSessions.set(sessionId, sessionData);

      // ARCH-1 FIX: Save to Redis with TTL for automatic expiration
      if (this.redisConnected) {
        try {
          await redisClient.setSession(sessionId, sessionData);
          logger.info('[REDIS] Session saved with automatic TTL', {
            sessionId,
            vmIP: browserVM.ipAddress
          });
        } catch (error) {
          logger.error('[REDIS] Failed to save session (continuing with in-memory)', {
            sessionId,
            error: error.message
          });
        }
      }

      // Update session in database with Browser VM details
      logger.info('Updating session with Browser VM details', {
        userId,
        provider,
        sessionId,
        browserVMId: browserVM.vmId,
        browserVMIP: browserVM.ipAddress
      });

      await db.authSessions.update(sessionId, {
        browser_vm_id: browserVM.vmId,
        vm_ip: browserVM.ipAddress,
        vnc_url: novncURL,
        status: 'vm_created'
      });

      logger.info('Session updated successfully', {
        userId,
        provider,
        sessionId,
        status: 'vm_created'
      });

      // Start VM readiness check, then start OAuth flow when ready
      logger.info('Starting VM readiness check', { sessionId, vmIP: browserVM.ipAddress });

      await this.waitForVMReady(browserVM.ipAddress);

      logger.info('VM is ready, updating session status and starting OAuth flow', { sessionId });
      await db.authSessions.updateStatus(sessionId, 'ready');

      // Update in-memory cache
      const updatedSession = {
        ...this.authSessions.get(sessionId),
        status: 'ready'
      };
      this.authSessions.set(sessionId, updatedSession);

      // ARCH-1 FIX: Update Redis session with new status
      if (this.redisConnected) {
        try {
          await redisClient.setSession(sessionId, updatedSession);
          logger.debug('[REDIS] Session status updated to ready', { sessionId });
        } catch (error) {
          logger.error('[REDIS] Failed to update session status', {
            sessionId,
            error: error.message
          });
        }
      }

      // NOW start OAuth flow - VM is actually ready
      this.runAsyncOAuthFlow({
        sessionId,
        provider,
        userId,
        browserVM,
        cliVMInfo,
        alreadyReady: true  // VM is ready, skip additional health check
      });

      logger.info('OAuth flow started successfully', {
        userId,
        provider,
        sessionId,
        browserVMId: browserVM.vmId,
        browserIP: browserVM.ipAddress
      });
    } catch (error) {
      logger.error('[BACKGROUND] VM creation and OAuth flow failed', {
        sessionId,
        userId,
        provider,
        error: error.message
      });

      // Cleanup on failure - destroy VMs
      if (browserVM?.vmId) {
        if (config.debug.keepFailedBrowserVMs) {
          logger.warn('[DEBUG] Keeping failed Browser VM alive for debugging', {
            vmId: browserVM.vmId,
            vmIP: browserVM.ipAddress,
            provider,
            debugFlag: 'DEBUG_KEEP_FAILED_BROWSER_VMS=true'
          });
        } else {
          await vmManager.destroyVM(browserVM.vmId, true, true).catch(err =>
            logger.warn('Failed to cleanup browser VM', { error: err.message })
          );

          // Remove session mapping after VM is destroyed
          await vmManager.removeSessionMapping(sessionId).catch(err =>
            logger.warn('Failed to remove session mapping on error cleanup', { error: err.message })
          );
        }
      }

      if (cliVMInfo?.vmId) {
        await vmManager.destroyVM(cliVMInfo.vmId, true, true).catch(err =>
          logger.warn('Failed to cleanup CLI VM', { error: err.message })
        );
      }

      throw error;
    }
  }

  /**
   * Continue OAuth flow asynchronously so HTTP request can return immediately
   */
  runAsyncOAuthFlow({ sessionId, provider, userId, browserVM, cliVMInfo, alreadyReady = false }) {
    (async () => {
      let finalStatus = 'completed';
      try {
        // Only wait for VM if not already ready (for backwards compatibility with CLI VMs)
        if (!alreadyReady) {
          await this.waitForVMReady(browserVM.ipAddress);

          // Update status to 'ready' so frontend knows it can start polling
          await db.authSessions.updateStatus(sessionId, 'ready');
          const readySession = {
            ...this.authSessions.get(sessionId),
            status: 'ready'
          };
          this.authSessions.set(sessionId, readySession);

          // ARCH-1 FIX: Update Redis session with ready status
          if (this.redisConnected) {
            try {
              await redisClient.setSession(sessionId, readySession);
              logger.debug('[REDIS] Session status updated to ready (async flow)', { sessionId });
            } catch (error) {
              logger.error('[REDIS] Failed to update session status', {
                sessionId,
                error: error.message
              });
            }
          }
        }

        const credentials = await this.executeOAuthFlow(sessionId, provider, browserVM.ipAddress);
        await this.storeCredentials(userId, provider, credentials);
        await this.transferCredentialsToCLIVM(userId, provider, credentials);

        await db.authSessions.updateStatus(sessionId, 'completed');

        // ARCH-1 FIX: Update Redis session with completed status
        if (this.redisConnected) {
          try {
            const completedSession = {
              ...this.authSessions.get(sessionId),
              status: 'completed'
            };
            this.authSessions.set(sessionId, completedSession);
            await redisClient.setSession(sessionId, completedSession);
            logger.debug('[REDIS] Session status updated to completed', { sessionId });
          } catch (error) {
            logger.error('[REDIS] Failed to update session to completed', {
              sessionId,
              error: error.message
            });
          }
        }

        logger.info('Authentication completed', { userId, provider, sessionId });
      } catch (error) {
        finalStatus = error.message?.startsWith('OAuth timeout') ? 'timeout' : 'failed';

        logger.error('Authentication flow failed', {
          userId,
          provider,
          sessionId,
          error: error.message
        });

        await db.authSessions.updateStatus(sessionId, finalStatus, {
          error_message: error.message
        }).catch(err =>
          logger.warn('Failed to persist auth session failure status', {
            sessionId,
            error: err.message
          })
        );

        // ARCH-1 FIX: Update Redis session with failed/timeout status
        if (this.redisConnected) {
          try {
            const failedSession = {
              ...this.authSessions.get(sessionId),
              status: finalStatus,
              error_message: error.message
            };
            this.authSessions.set(sessionId, failedSession);
            await redisClient.setSession(sessionId, failedSession);
            logger.debug('[REDIS] Session status updated to ' + finalStatus, { sessionId });
          } catch (redisError) {
            logger.error('[REDIS] Failed to update session to ' + finalStatus, {
              sessionId,
              error: redisError.message
            });
          }
        }
      } finally {
        // Cleanup browser VM unless we're debugging
        if (browserVM?.vmId) {
          const keepFailedVM = config.debug.keepFailedBrowserVMs && finalStatus !== 'completed';

          if (keepFailedVM) {
            logger.warn('[DEBUG] Keeping failed browser VM alive for debugging', {
              sessionId,
              vmId: browserVM.vmId,
              vmIP: browserVM.ipAddress,
              finalStatus
            });
          } else {
            // Browser VMs should be destroyed IMMEDIATELY after OAuth completes
            // No more long grace periods - VMs are expensive
            const gracePeriodMs = finalStatus === 'completed' ? 5000 : 10000; // 5s for completed, 10s for failed

            logger.info('Destroying browser VM immediately', {
              sessionId,
              vmId: browserVM.vmId,
              finalStatus,
              gracePeriodMs
            });

            // Destroy VM immediately (short grace period for any final cleanup)
            setTimeout(async () => {
              await vmManager.destroyVM(browserVM.vmId, true, true).catch(err =>
                logger.warn('Failed to cleanup browser VM', {
                  sessionId,
                  vmId: browserVM.vmId,
                  error: err.message
                })
              );

              // Remove session mapping and Redis session after VM is destroyed
              await vmManager.removeSessionMapping(sessionId).catch(err =>
                logger.warn('Failed to remove session mapping', {
                  sessionId,
                  error: err.message
                })
              );

              // Also delete from Redis to clean up immediately
              try {
                const redisClient = require('./redis-client');
                await redisClient.deleteSession(sessionId);
                logger.debug('[CLEANUP] Redis session deleted', { sessionId });
              } catch (redisErr) {
                logger.warn('[CLEANUP] Failed to delete Redis session', {
                  sessionId,
                  error: redisErr.message
                });
              }

              logger.info('Browser VM destroyed immediately', {
                sessionId,
                vmId: browserVM.vmId
              });
            }, gracePeriodMs);
          }
        }

        // ARCH-1 FIX: Delete session from Redis when cleaning up
        if (this.redisConnected) {
          try {
            await redisClient.deleteSession(sessionId);
            logger.debug('[REDIS] Session deleted from Redis on cleanup', { sessionId });
          } catch (error) {
            logger.error('[REDIS] Failed to delete session from Redis', {
              sessionId,
              error: error.message
            });
          }
        }

        this.authSessions.delete(sessionId);
      }
    })().catch(err =>
      logger.error('Async authentication runner crashed', {
        sessionId,
        provider,
        error: err.message
      })
    );
  }

  /**
   * Verify VNC is ready by checking RFB protocol response
   * STRUCTURAL FIX: This ensures VNC is actually serving RFB, not just port open
   *
   * @param {string} vmIP - VM IP address
   * @param {number} port - VNC port (default 5901)
   * @returns {Promise<{ready: boolean, rfbVersion?: string, error?: string}>}
   */
  async verifyVNCProtocol(vmIP, port = 5901) {
    const net = require('net');

    return new Promise((resolve) => {
      const socket = new net.Socket();
      let dataReceived = false;

      socket.setTimeout(5000); // 5 second timeout

      socket.on('connect', () => {
        logger.debug('[VNC-VERIFY] Connected to VNC port, waiting for RFB handshake', { vmIP, port });
        // Don't resolve yet - wait for RFB data
      });

      socket.on('data', (data) => {
        dataReceived = true;
        const response = data.toString('utf8', 0, 12);
        logger.debug('[VNC-VERIFY] Received data', { vmIP, data: response });

        // RFB protocol version string should be "RFB 003.008\n" or similar
        if (response.startsWith('RFB')) {
          socket.destroy();
          resolve({ ready: true, rfbVersion: response.trim() });
        } else {
          socket.destroy();
          resolve({ ready: false, error: `Unexpected response: ${response}` });
        }
      });

      socket.on('error', (err) => {
        socket.destroy();
        resolve({ ready: false, error: err.message });
      });

      socket.on('timeout', () => {
        socket.destroy();
        if (!dataReceived) {
          resolve({ ready: false, error: 'Timeout waiting for RFB handshake' });
        }
      });

      socket.on('close', () => {
        if (!dataReceived) {
          resolve({ ready: false, error: 'Connection closed before receiving data' });
        }
      });

      socket.connect(port, vmIP);
    });
  }

  /**
   * Wait for VM to be network-ready
   */
  async waitForVMReady(vmIP, maxWaitMs = config.performance.browserVmHealthTimeoutMs) {
    const http = require('http');
    const startTime = Date.now();
    const checkInterval = 2000; // 2 seconds
    const initialDelayMs = 45000; // 45 seconds - INCREASED to accommodate OAuth agent Express server startup

    logger.info('[WAIT-VM-READY] Starting health check', { vmIP, maxWaitMs, initialDelayMs });

    // Wait for guest OS to boot and start services (network config, OAuth agent, etc.)
    // CRITICAL FIX: Increased from 15s to 45s because OAuth agent Express server
    // takes ~38 seconds to start accepting connections (observed in production logs)
    logger.info('[WAIT-VM-READY] Waiting for guest OS services to start', {
      vmIP,
      waitMs: initialDelayMs,
      reason: 'OAuth agent Express server needs time to bind to port 8080'
    });
    await new Promise(resolve => setTimeout(resolve, initialDelayMs));

    while (Date.now() - startTime < maxWaitMs) {
      try {
        logger.info('[WAIT-VM-READY] Attempting health check', {
          vmIP,
          elapsed: Date.now() - startTime,
          url: `http://${vmIP}:8080/health`
        });

        // Use http.get instead of fetch to avoid Node.js fetch() EHOSTUNREACH issues with private IPs
        const response = await new Promise((resolve, reject) => {
          const req = http.get({
            hostname: vmIP,
            port: 8080,
            path: '/health',
            timeout: 5000
          }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ ok: res.statusCode === 200, status: res.statusCode, body }));
          });
          req.on('error', reject);
          req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
          });
        });

        logger.info('[WAIT-VM-READY] Got response', {
          vmIP,
          status: response.status,
          ok: response.ok
        });

        logger.info('[WAIT-VM-READY] Response body', { vmIP, body: response.body });

        if (response.ok) {
          // OAuth agent is ready, NOW verify VNC with ACTUAL RFB protocol handshake
          // STRUCTURAL FIX: Don't just check port is open - verify RFB protocol responds
          logger.info('[WAIT-VM-READY] OAuth ready, verifying VNC RFB protocol on port 5901', { vmIP });

          const vncResult = await this.verifyVNCProtocol(vmIP, 5901);

          if (vncResult.ready) {
            logger.info('[WAIT-VM-READY] VNC RFB protocol verified!', {
              vmIP,
              rfbVersion: vncResult.rfbVersion
            });

            // Extra delay to ensure XFCE desktop has started (ExecStartPost runs after Xtigervnc)
            logger.info('[WAIT-VM-READY] Waiting 5s for XFCE desktop to initialize', { vmIP });
            await new Promise(resolve => setTimeout(resolve, 5000));

            logger.info('[WAIT-VM-READY] VM fully ready!', { vmIP });
            return true;
          } else {
            logger.warn('[WAIT-VM-READY] OAuth ready but VNC not responding with RFB protocol yet', {
              vmIP,
              error: vncResult.error
            });
          }
        }

        logger.warn('[WAIT-VM-READY] Response not OK', {
          vmIP,
          status: response.status,
          body: response.body
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
   * 2. Store OAuth URL in database for frontend to display
   * 3. Wait for user to complete OAuth in frontend iframe
   * 4. CLI saves credentials to file after OAuth callback
   * 5. Backend polls /credentials/status until ready
   * 6. Retrieve actual credentials from /credentials/get
   */
  async authenticateCLI(sessionId, vmIP, provider) {
    logger.info('Starting CLI OAuth flow', { sessionId, vmIP, provider });

    const debugPayload = {};
    if (config.debug.enableStrace) {
      debugPayload.runStrace = true;
    }
    if (config.debug.skipConnectivityDiagnostics) {
      debugPayload.skipConnectivityChecks = true;
    }

    // Get user ID from session to fetch proxy config
    const session = this.authSessions.get(sessionId);
    const userId = session?.userId;

    // Note: Decodo proxy is now injected directly into the Browser VM's /etc/environment
    // by vm-manager.injectOAuthAgent(). All processes (including Chromium) will
    // automatically use the user's dedicated proxy without needing explicit configuration.
    logger.info('Browser VM proxy config injected at boot time via /etc/environment', {
      sessionId,
      userId,
      note: 'Using per-user Decodo proxy from environment'
    });

    const requestPayload = { sessionId };
    if (Object.keys(debugPayload).length > 0) {
      requestPayload.debug = debugPayload;
    }
    // No need to send proxy in payload - it's in VM environment

    // Start CLI tool - this spawns OAuth server and captures OAuth URL
    // Use http.request instead of fetch to avoid Node.js fetch() EHOSTUNREACH issues
    const http = require('http');
    const startResult = await new Promise((resolve, reject) => {
      const payload = JSON.stringify(requestPayload);
      const req = http.request({
        hostname: vmIP,
        port: 8080,
        path: `/auth/${provider}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: config.performance.cliOAuthStartTimeoutMs
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`Failed to start ${provider} CLI: HTTP ${res.statusCode} ${res.statusMessage}`));
          } else {
            try {
              resolve(JSON.parse(body));
            } catch (err) {
              reject(new Error(`Invalid JSON response from VM: ${err.message}`));
            }
          }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${config.performance.cliOAuthStartTimeoutMs}ms`));
      });
      req.write(payload);
      req.end();
    });

    if (!startResult.success) {
      throw new Error(`Failed to start ${provider} OAuth flow`);
    }

    logger.info('CLI OAuth flow started', {
      sessionId,
      provider,
      hasOAuthUrl: !!startResult.oauthUrl
    });

    // Store OAuth URL in database for frontend to display
    if (startResult.oauthUrl) {
      await db.authSessions.update(sessionId, {
        auth_url: startResult.oauthUrl,
        status: 'awaiting_user_auth'
      });
      logger.info('OAuth URL stored in database', { sessionId, provider });
    }

    // Wait for user to complete OAuth and credentials to be saved
    logger.info('Waiting for user to complete OAuth flow', { sessionId, provider });
    const maxWaitMs = 300000; // 5 minutes for user to complete OAuth
    const pollIntervalMs = 2000; // Poll every 2 seconds
    const credStartTime = Date.now();

    while (Date.now() - credStartTime < maxWaitMs) {
      try {
        // Use http.get instead of fetch to avoid EHOSTUNREACH issues
        const status = await new Promise((resolve, reject) => {
          const req = http.get({
            hostname: vmIP,
            port: 8080,
            path: `/credentials/status?sessionId=${sessionId}`,
            timeout: 5000
          }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
              if (res.statusCode === 200) {
                try {
                  resolve(JSON.parse(body));
                } catch {
                  reject(new Error('Invalid JSON response'));
                }
              } else {
                reject(new Error(`HTTP ${res.statusCode}`));
              }
            });
          });
          req.on('error', reject);
          req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
          });
        });

        logger.info('Credentials status check', {
          sessionId,
          provider,
          authenticated: status.authenticated,
          elapsed: Date.now() - credStartTime
        });

        if (status.authenticated) {
          logger.info('OAuth completed, retrieving credentials', { sessionId, provider });
          break;
        }
      } catch (err) {
        // Ignore polling errors, keep waiting
        logger.debug('Status check failed, continuing to wait', {
          sessionId,
          error: err.message
        });
      }

      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    // Check if we timed out
    if (Date.now() - credStartTime >= maxWaitMs) {
      throw new Error(`OAuth timeout: User did not complete authentication within ${maxWaitMs / 1000} seconds`);
    }

    // Retrieve actual credentials from OAuth agent
    logger.info('Retrieving credentials from OAuth agent', { sessionId, provider });
    const credsResult = await new Promise((resolve, reject) => {
      const req = http.get({
        hostname: vmIP,
        port: 8080,
        path: `/credentials/get?sessionId=${sessionId}`,
        timeout: 10000
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`Failed to retrieve credentials: HTTP ${res.statusCode} ${res.statusMessage}`));
          } else {
            try {
              resolve(JSON.parse(body));
            } catch (err) {
              reject(new Error(`Invalid JSON response: ${err.message}`));
            }
          }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout after 10000ms'));
      });
    });

    if (!credsResult.success || !credsResult.credentials) {
      throw new Error('Failed to retrieve credentials from OAuth agent');
    }

    logger.info('Credentials retrieved successfully', {
      sessionId,
      provider,
      hasCredentials: !!credsResult.credentials
    });

    // Return ACTUAL credentials, not metadata
    return credsResult.credentials;
  }

  /**
   * Store encrypted credentials in database
   * For Claude Code: If subscription is "max", store for both claude_code_pro and claude_code_max
   */
  async storeCredentials(userId, provider, credentials) {
    try {
      // For Claude Code, check subscription type and store accordingly
      if (provider === 'claude_code' && credentials?.claudeAiOauth?.subscriptionType) {
        const subscriptionType = credentials.claudeAiOauth.subscriptionType;

        logger.info('Detected Claude Code subscription', {
          userId,
          subscriptionType
        });

        // If user has Max subscription, store for BOTH Pro and Max
        // (Max includes all Pro features)
        if (subscriptionType === 'max') {
          // Store as claude_code_max
          const encryptedMax = credentialEncryption.encrypt(credentials);
          await db.credentials.create(userId, 'claude_code_max', encryptedMax);
          logger.info('Credentials stored for claude_code_max', { userId });

          // ALSO store as claude_code_pro (Max includes Pro)
          const encryptedPro = credentialEncryption.encrypt(credentials);
          await db.credentials.create(userId, 'claude_code_pro', encryptedPro);
          logger.info('Credentials stored for claude_code_pro (Max includes Pro)', { userId });
        } else if (subscriptionType === 'pro') {
          // Only store as claude_code_pro
          const encryptedPro = credentialEncryption.encrypt(credentials);
          await db.credentials.create(userId, 'claude_code_pro', encryptedPro);
          logger.info('Credentials stored for claude_code_pro', { userId });
        } else {
          logger.warn('Unknown Claude Code subscription type, storing as claude_code', {
            userId,
            subscriptionType
          });
          const encryptedData = credentialEncryption.encrypt(credentials);
          await db.credentials.create(userId, provider, encryptedData);
        }
      } else {
        // Non-Claude Code providers or missing subscription info: store normally
        const encryptedData = credentialEncryption.encrypt(credentials);
        await db.credentials.create(userId, provider, encryptedData);
        logger.info('Credentials stored', { userId, provider });
      }
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
      // These paths MUST match what's expected by the OAuth agent
      let vmCredentialPath;
      switch (provider) {
        case 'codex':
          vmCredentialPath = '/root/.codex/auth.json';  // ✅ Fixed: was credentials.json
          break;
        case 'claude_code':
          vmCredentialPath = '/root/.config/claude/credentials.json';  // ✅ Fixed: was /root/.claude
          break;
        case 'gemini_cli':
          vmCredentialPath = '/root/.gemini/oauth_creds.json';  // ✅ Fixed: was credentials.json
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

  buildNoVNCUrl(sessionId, vmIP) {
    const explicitBase = config.browser?.novncBaseUrl || process.env.NOVNC_BASE_URL;

    if (explicitBase) {
      try {
        const resolved = explicitBase
          .replace(/{{\s*SESSION_ID\s*}}/gi, sessionId)
          .replace(/{{\s*VM_IP\s*}}/gi, vmIP)
          .replace(/:sessionId/gi, sessionId)
          .replace(/:vmIp/gi, vmIP);

        if (resolved.startsWith('http')) {
          return resolved;
        }

        const base = process.env.MASTER_CONTROLLER_PUBLIC_URL || process.env.MASTER_CONTROLLER_URL || `http://localhost:${config.server.port || 4000}`;
        return `${base.replace(/\/$/, '')}${resolved.startsWith('/') ? '' : '/'}${resolved}`;
      } catch (error) {
        logger.warn('Failed to build noVNC URL from NOVNC_BASE_URL, falling back to controller route', {
          vmIP,
          sessionId,
          error: error.message,
          explicitBase
        });
      }
    }

    const base = process.env.MASTER_CONTROLLER_PUBLIC_URL || process.env.MASTER_CONTROLLER_URL || `http://localhost:${config.server.port || 4000}`;
    return `${base.replace(/\/$/, '')}/api/auth/session/${sessionId}/novnc`;
  }

  /**
   * Get authentication session status
   */
  async getSessionStatus(sessionId) {
    // ARCH-1 FIX: Check Redis first (source of truth with TTL)
    // If session is not in Redis, it means it has expired and VM is dead
    if (this.redisConnected) {
      try {
        const redisSession = await redisClient.getSession(sessionId);
        if (redisSession) {
          // Update in-memory cache for consistency
          this.authSessions.set(sessionId, redisSession);

          logger.debug('[REDIS] Session retrieved from Redis', {
            sessionId,
            status: redisSession.status
          });

          return redisSession;
        }

        // Session not in Redis = expired/dead VM
        logger.debug('[REDIS] Session not found in Redis (expired)', { sessionId });
        return null;
      } catch (error) {
        logger.error('[REDIS] Failed to get session from Redis, falling back', {
          sessionId,
          error: error.message
        });
      }
    }

    // Fall back to in-memory cache
    const cachedSession = this.authSessions.get(sessionId);
    if (cachedSession) {
      logger.debug('[FALLBACK] Session retrieved from in-memory cache', { sessionId });
      return cachedSession;
    }

    // Last resort: check database
    const dbSession = await db.authSessions.findById(sessionId);
    if (dbSession) {
      logger.debug('[FALLBACK] Session retrieved from database', { sessionId });
    }
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

    // ARCH-1 FIX: Delete session from Redis when cancelling
    if (this.redisConnected) {
      try {
        await redisClient.deleteSession(sessionId);
        logger.debug('[REDIS] Session deleted from Redis on cancellation', { sessionId });
      } catch (error) {
        logger.error('[REDIS] Failed to delete session from Redis', {
          sessionId,
          error: error.message
        });
      }
    }

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
