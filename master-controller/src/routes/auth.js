/**
 * Authentication API Routes
 * Handles CLI tool authentication via Browser VMs
 */

const express = require('express');
const WebSocket = require('ws');
const net = require('net');
const router = express.Router();
const { browserVMAuth } = require('../services/browser-vm-auth');
const logger = require('../utils/logger').module('routes:auth');

function sanitizeVMIP(session) {
  return session?.browserIP || session?.vm_ip || session?.vmIp || session?.vm_ip_address;
}

/**
 * POST /api/auth/start
 * Start authentication process for a CLI provider
 */
router.post('/start', async (req, res) => {
  try {
    const { userId, provider } = req.body;

    if (!userId || !provider) {
      return res.status(400).json({ error: 'userId and provider are required' });
    }

    const validProviders = ['codex', 'claude_code', 'gemini_cli'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({
        error: 'Invalid provider',
        validProviders
      });
    }

    logger.info('Starting authentication', { userId, provider });

    const result = await browserVMAuth.startAuthentication(userId, provider);

    res.json({
      success: true,
      sessionId: result.sessionId,
      provider: result.provider,
      novncURL: result.novncURL,
      browserIP: result.browserIP
    });
  } catch (error) {
    logger.error('Start authentication failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth/session/:sessionId
 * Get authentication session status
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await browserVMAuth.getSessionStatus(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ session });
  } catch (error) {
    logger.error('Get session status failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth/session/:sessionId/vm
 * Get VM information for a session (session-to-VM mapping)
 */
router.get('/session/:sessionId/vm', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { vmManager } = require('../services/vm-manager');

    logger.info('[SESSION-VM-LOOKUP] Looking up VM for session', { sessionId });

    const vmInfo = await vmManager.getVMForSession(sessionId);

    if (!vmInfo) {
      logger.warn('[SESSION-VM-LOOKUP] Session not found', { sessionId });
      return res.status(404).json({ error: 'Session not found' });
    }

    // Verify VM still exists
    const vmData = await vmManager.listVMs({ vm_id: vmInfo.vmId });
    if (!vmData || vmData.length === 0 || vmData[0].status === 'destroyed') {
      logger.warn('[SESSION-VM-LOOKUP] VM no longer exists', {
        sessionId,
        vmId: vmInfo.vmId
      });
      return res.status(410).json({ error: 'VM no longer exists' });
    }

    logger.info('[SESSION-VM-LOOKUP] Session found', {
      sessionId,
      vmId: vmInfo.vmId,
      vmIP: vmInfo.vmIP
    });

    res.json(vmInfo);
  } catch (error) {
    logger.error('[SESSION-VM-LOOKUP] Failed to lookup VM for session', {
      sessionId: req.params.sessionId,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/session/:sessionId/heartbeat
 * Update session heartbeat to keep VM alive
 */
router.post('/session/:sessionId/heartbeat', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { vmManager } = require('../services/vm-manager');

    await vmManager.updateSessionHeartbeat(sessionId);

    res.json({ success: true });
  } catch (error) {
    logger.error('[SESSION-HEARTBEAT] Failed to update heartbeat', {
      sessionId: req.params.sessionId,
      error: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth/session/:sessionId/oauth-url
 * Proxy OAuth URL requests through the master controller
 */
router.get('/session/:sessionId/oauth-url', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const session = await browserVMAuth.getSessionStatus(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Optional user ownership validation via header
    const requesterUserId = req.header('x-user-id');
    if (requesterUserId && session.user_id && session.user_id !== requesterUserId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const vmIP = sanitizeVMIP(session);
    if (!vmIP) {
      return res.status(409).json({ error: 'Browser VM IP not yet available' });
    }

    // Use http.get with retry logic to handle VM startup race conditions
    const http = require('http');
    const maxRetries = 3;
    const retryDelays = [500, 1000, 2000]; // ms - exponential backoff

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await new Promise((resolve, reject) => {
          const req = http.get({
            hostname: vmIP,
            port: 8080,
            path: `/oauth-url?sessionId=${sessionId}`,
            timeout: 3000
          }, (response) => {
            let text = '';
            response.on('data', chunk => text += chunk);
            response.on('end', () => resolve({
              status: response.statusCode,
              contentType: response.headers['content-type'] || 'application/json',
              text
            }));
          });
          req.on('error', reject);
          req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
          });
        });

        // Success - return immediately
        return res.status(result.status).set('Content-Type', result.contentType).send(result.text);

      } catch (error) {
        const isLastAttempt = attempt === maxRetries - 1;
        const isConnectError = error.code === 'EHOSTUNREACH' || error.code === 'ECONNREFUSED';

        if (isLastAttempt || !isConnectError) {
          // Don't retry on last attempt or non-connection errors
          logger.error('OAuth URL proxy HTTP request failed', {
            sessionId,
            vmIP,
            attempt: attempt + 1,
            error: error.message,
            code: error.code
          });
          throw error;
        }

        // Retry after delay
        logger.warn('OAuth URL proxy failed, retrying', {
          sessionId,
          vmIP,
          attempt: attempt + 1,
          nextRetryMs: retryDelays[attempt],
          error: error.message
        });
        await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
      }
    }
  } catch (error) {
    logger.error('OAuth URL proxy failed', { sessionId, error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth/session/:sessionId/credentials/status
 * Proxy credential status polling through the master controller
 */
router.get('/session/:sessionId/credentials/status', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const session = await browserVMAuth.getSessionStatus(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const requesterUserId = req.header('x-user-id');
    if (requesterUserId && session.user_id && session.user_id !== requesterUserId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // CRITICAL FIX: If session is completed, return credentials from database
    // This allows frontend to retrieve credentials even after Browser VM is destroyed
    if (session.status === 'completed') {
      logger.info('Session completed, retrieving credentials from database', {
        sessionId,
        provider: session.provider,
        userId: session.user_id
      });

      try {
        const credData = await db.credentials.find(session.user_id, session.provider);
        if (!credData) {
          logger.error('Credentials not found in database despite completed status', {
            sessionId,
            provider: session.provider,
            userId: session.user_id
          });
          return res.status(404).json({
            status: 'error',
            error: 'Credentials not found despite completed session'
          });
        }

        // Decrypt credentials using the same method as validateCredentials
        const credentials = credentialEncryption.decrypt({
          encrypted: credData.encrypted_credentials,
          iv: credData.encryption_iv,
          authTag: credData.encryption_tag,
          salt: credData.encryption_salt
        });

        logger.info('Successfully retrieved credentials from database', {
          sessionId,
          provider: session.provider
        });

        // Return credentials in the same format as OAuth agent would return
        return res.status(200).json({
          status: 'ready',
          credentials,
          source: 'database'  // Debug info to distinguish from VM source
        });
      } catch (dbError) {
        logger.error('Failed to retrieve credentials from database', {
          sessionId,
          error: dbError.message
        });
        return res.status(500).json({
          status: 'error',
          error: 'Failed to decrypt stored credentials'
        });
      }
    }

    // If not completed, proxy to OAuth agent on Browser VM (existing logic)
    const vmIP = sanitizeVMIP(session);
    if (!vmIP) {
      return res.status(409).json({ error: 'Browser VM IP not yet available' });
    }

    // Use http.get instead of fetch to avoid Node.js fetch() EHOSTUNREACH issues with private IPs
    const http = require('http');
    try {
      const result = await new Promise((resolve, reject) => {
        const req = http.get({
          hostname: vmIP,
          port: 8080,
          path: `/credentials/status?sessionId=${sessionId}`,
          timeout: 5000
        }, (response) => {
          let text = '';
          response.on('data', chunk => text += chunk);
          response.on('end', () => resolve({
            status: response.statusCode,
            contentType: response.headers['content-type'] || 'application/json',
            text
          }));
        });
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });
      });

      res.status(result.status).set('Content-Type', result.contentType).send(result.text);
    } catch (error) {
      logger.error('Credential status proxy HTTP request failed', { sessionId, vmIP, error: error.message });
      throw error;
    }
  } catch (error) {
    logger.error('Credential status proxy failed', { sessionId, error: error.message });
    res.status(500).json({ error: error.message });
  }
});

router.get('/session/:sessionId/novnc', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const session = await browserVMAuth.getSessionStatus(sessionId);
    if (!session) {
      return res.status(404).send('Session not found');
    }

    const requesterUserId = req.header('x-user-id');
    if (requesterUserId && session.user_id && session.user_id !== requesterUserId) {
      return res.status(403).send('Forbidden');
    }

    const vmIP = sanitizeVMIP(session);
    if (!vmIP) {
      return res.status(409).send('Browser VM IP not ready');
    }

    const hostHeader = req.headers['x-forwarded-host'] || req.get('host');
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const wsProtocol = proto === 'https' ? 'wss' : 'ws';
    const wsUrl = `${wsProtocol}://${hostHeader}/api/auth/session/${sessionId}/novnc/websock`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Security-Policy', `default-src 'self' https://cdn.jsdelivr.net; connect-src 'self' ${wsProtocol}://${hostHeader}; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data:`);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Polydev VM Browser</title>
  <style>
    html, body { height: 100%; margin: 0; background: #0f172a; color: #f8fafc; font-family: 'Inter', sans-serif; overflow: hidden; }
    #status { position: absolute; top: 12px; left: 12px; background: rgba(15,23,42,0.75); padding: 8px 12px; border-radius: 8px; font-size: 12px; z-index: 10; box-shadow: 0 4px 16px rgba(0,0,0,0.25); }
    #screen { width: 100%; height: 100%; outline: none; }
    a { color: inherit; }
  </style>
</head>
<body>
  <div id="screen" tabindex="0"></div>
  <div id="status">Connecting to VM browser...</div>
  <script type="module">
    import RFB from 'https://cdn.jsdelivr.net/gh/novnc/noVNC@v1.4.0/core/rfb.js';

    const statusEl = document.getElementById('status');
    const screenEl = document.getElementById('screen');

    function updateStatus(text, level) {
      statusEl.textContent = text;
      if (level === 'error') {
        statusEl.style.background = 'rgba(220,38,38,0.75)';
      } else {
        statusEl.style.background = 'rgba(15,23,42,0.75)';
      }
    }

    // Wait for VM to be fully ready before connecting
    async function waitForVMReady() {
      const maxAttempts = 30; // 30 seconds max
      const delayMs = 1000; // 1 second between attempts

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        updateStatus(\`Waiting for VM to boot (\${attempt}/\${maxAttempts})...\`);

        try {
          // Try to establish a test WebSocket connection
          const testWs = new WebSocket('${wsUrl}');

          const result = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              testWs.close();
              reject(new Error('Connection timeout'));
            }, 3000);

            testWs.onopen = () => {
              clearTimeout(timeout);
              testWs.close();
              resolve(true);
            };

            testWs.onerror = () => {
              clearTimeout(timeout);
              reject(new Error('Connection failed'));
            };
          });

          if (result) {
            updateStatus('VM ready, connecting...');
            return true;
          }
        } catch (error) {
          // Connection failed, retry after delay
          if (attempt < maxAttempts) {
            await new Promise(r => setTimeout(r, delayMs));
          }
        }
      }

      throw new Error('VM failed to become ready after 30 seconds');
    }

    try {
      // Wait for VM to be ready before connecting
      await waitForVMReady();

      const rfb = new RFB(screenEl, '${wsUrl}', {
        credentials: { password: 'polydev123' }
      });
      rfb.viewOnly = false;
      rfb.scaleViewport = true;
      rfb.resizeSession = true;

      rfb.addEventListener('connect', () => {
        updateStatus('Connected. You can interact with the VM browser.');
        setTimeout(() => { statusEl.style.display = 'none'; }, 2000);
      });

      rfb.addEventListener('disconnect', (e) => {
        updateStatus('Disconnected: ' + (e.detail.clean ? 'normal' : 'error'), 'error');
        statusEl.style.display = 'block';
      });

      rfb.addEventListener('credentialsrequired', (e) => {
        updateStatus('VNC authentication in progress...', 'info');
        rfb.sendCredentials({ password: 'polydev123' });
      });

      screenEl.focus();
      window.rfb = rfb;
    } catch (error) {
      updateStatus('Failed to start VNC session: ' + error.message, 'error');
    }
  </script>
</body>
</html>`;

    res.send(html);
  } catch (error) {
    logger.error('Failed to serve noVNC page', { sessionId, error: error.message });
    res.status(500).send('Failed to load VM browser');
  }
});


/**
 * POST /api/auth/session/:sessionId/open-url
 * Trigger automatic navigation to URL in VM browser
 */
router.post('/session/:sessionId/open-url', async (req, res) => {
  const { sessionId } = req.params;
  const { url } = req.body;

  try {
    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }

    const session = await browserVMAuth.getSessionStatus(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const requesterUserId = req.header('x-user-id');
    if (requesterUserId && session.user_id && session.user_id !== requesterUserId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const vmIP = sanitizeVMIP(session);
    if (!vmIP) {
      return res.status(409).json({ error: 'Browser VM IP not yet available' });
    }

    // Use http.post to send request to VM's OAuth agent
    const http = require('http');
    const postData = JSON.stringify({ url, sessionId });

    try {
      const result = await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: vmIP,
          port: 8080,
          path: '/open-url',
          method: 'POST',
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        }, (response) => {
          let text = '';
          response.on('data', chunk => text += chunk);
          response.on('end', () => resolve({
            status: response.statusCode,
            contentType: response.headers['content-type'] || 'application/json',
            text
          }));
        });
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });
        req.write(postData);
        req.end();
      });

      res.status(result.status).set('Content-Type', result.contentType).send(result.text);
    } catch (error) {
      logger.error('Open URL proxy HTTP request failed', { sessionId, vmIP, error: error.message });
      throw error;
    }
  } catch (error) {
    logger.error('Open URL proxy failed', { sessionId, error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/session/:sessionId/cancel
 * Cancel an ongoing authentication session
 */
router.post('/session/:sessionId/cancel', async (req, res) => {
  try {
    const { sessionId } = req.params;

    await browserVMAuth.cancelSession(sessionId);

    logger.info('Auth session cancelled', { sessionId });

    res.json({
      success: true,
      message: 'Session cancelled'
    });
  } catch (error) {
    logger.error('Cancel session failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/rotate
 * Rotate credentials for a provider (re-authenticate)
 */
router.post('/rotate', async (req, res) => {
  try {
    const { userId, provider } = req.body;

    if (!userId || !provider) {
      return res.status(400).json({ error: 'userId and provider are required' });
    }

    logger.info('Rotating credentials', { userId, provider });

    const result = await browserVMAuth.rotateCredentials(userId, provider);

    res.json({
      success: true,
      sessionId: result.sessionId,
      provider: result.provider
    });
  } catch (error) {
    logger.error('Rotate credentials failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth/credentials/:userId
 * List user's credentials
 */
router.get('/credentials/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const credentials = await browserVMAuth.listCredentials(userId);

    res.json({ credentials });
  } catch (error) {
    logger.error('List credentials failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth/validate/:userId/:provider
 * Validate stored credentials for a provider
 */
router.get('/validate/:userId/:provider', async (req, res) => {
  try {
    const { userId, provider } = req.params;

    const result = await browserVMAuth.validateCredentials(userId, provider);

    res.json(result);
  } catch (error) {
    logger.error('Validate credentials failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

async function handleNoVNCUpgrade(req, socket, head) {
  try {
    const match = req.url.match(/^\/api\/auth\/session\/([^/]+)\/novnc\/websock(.*)$/);
    if (!match) {
      return false; // Not a noVNC request
    }

    const sessionId = match[1];

    logger.info('noVNC auth check', { sessionId });

    const session = await browserVMAuth.getSessionStatus(sessionId);
    if (!session) {
      logger.warn('noVNC auth failed - session not found', { sessionId });
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return null; // Auth failed, socket destroyed
    }

    const vmIP = sanitizeVMIP(session);
    if (!vmIP) {
      logger.warn('noVNC auth failed - no VM IP', { sessionId });
      socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
      socket.destroy();
      return null; // Auth failed, socket destroyed
    }

    logger.info('noVNC WebSocket upgrade - authenticated', {
      sessionId,
      vmIP
    });

    // Store the session and VM info for the WebSocket connection handler
    req._novncSession = { sessionId, vmIP };

    return true; // Authenticated, proceed with upgrade
  } catch (error) {
    logger.error('noVNC upgrade failed', { url: req.url, error: error.message });
    try {
      socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
      socket.destroy();
    } catch (err) {
      logger.warn('Failed to destroy socket after noVNC upgrade error', { error: err.message });
    }
    return null; // Error, socket destroyed
  }
}

module.exports = {
  router,
  handleNoVNCUpgrade
};
