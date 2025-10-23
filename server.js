const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const http = require('http');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const BACKEND_HOST = '135.181.138.102';
const BACKEND_PORT = 4000;

/**
 * Retry helper for WebSocket connections
 * Handles 502 errors during VM/backend startup
 */
async function retryWebSocketConnection(fn, options = {}) {
  const {
    maxAttempts = 5,
    initialDelayMs = 500,
    maxDelayMs = 3000,
    backoffFactor = 1.5,
    retryOnCodes = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'E502']
  } = options;

  let lastError;
  let delayMs = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;

      // Only retry on specific error codes
      if (!retryOnCodes.includes(error.code)) {
        throw error;
      }

      // Don't wait after last attempt
      if (attempt === maxAttempts) {
        break;
      }

      console.log('[WebSocket Retry] Connection failed, retrying...', {
        attempt: `${attempt}/${maxAttempts}`,
        errorCode: error.code,
        errorMessage: error.message,
        nextRetryInMs: delayMs
      });

      await new Promise(resolve => setTimeout(resolve, delayMs));
      delayMs = Math.min(delayMs * backoffFactor, maxDelayMs);
    }
  }

  throw lastError;
}

/**
 * Native WebSocket Proxy Implementation with Retry Logic
 * Manually handles WebSocket upgrade to backend server
 * This replaces http-proxy which has issues with remote WebSocket connections
 */
async function proxyWebSocket(clientReq, clientSocket, head) {
  try {
    await retryWebSocketConnection(async (attempt) => {
      return new Promise((resolve, reject) => {
        console.log('[Native WS Proxy] Attempting WebSocket proxy:', {
          attempt,
          timestamp: new Date().toISOString(),
          url: clientReq.url,
          headers: {
            upgrade: clientReq.headers.upgrade,
            connection: clientReq.headers.connection,
            'sec-websocket-version': clientReq.headers['sec-websocket-version'],
            'sec-websocket-key': clientReq.headers['sec-websocket-key'],
            'sec-websocket-protocol': clientReq.headers['sec-websocket-protocol']
          }
        });

        // Create backend connection
        const backendReq = http.request({
          host: BACKEND_HOST,
          port: BACKEND_PORT,
          path: clientReq.url,
          method: 'GET',
          headers: {
            'Host': `${BACKEND_HOST}:${BACKEND_PORT}`,
            'Connection': 'Upgrade',
            'Upgrade': 'websocket',
            'Sec-WebSocket-Version': clientReq.headers['sec-websocket-version'] || '13',
            'Sec-WebSocket-Key': clientReq.headers['sec-websocket-key'],
            'Sec-WebSocket-Protocol': clientReq.headers['sec-websocket-protocol'] || 'binary'
          },
          timeout: 5000
        });

        // Handle upgrade response from backend
        backendReq.on('upgrade', (backendRes, backendSocket, backendHead) => {
          console.log('[Native WS Proxy] Backend upgrade successful:', {
            attempt,
            statusCode: backendRes.statusCode,
            headers: backendRes.headers
          });

          if (!clientSocket.writable) {
            reject(new Error('Client socket not writable'));
            return;
          }

          // Send upgrade response to client
          clientSocket.write('HTTP/1.1 101 Switching Protocols\r\n');
          Object.keys(backendRes.headers).forEach(key => {
            clientSocket.write(`${key}: ${backendRes.headers[key]}\r\n`);
          });
          clientSocket.write('\r\n');

          // Write any head data from backend
          if (backendHead.length > 0) {
            clientSocket.write(backendHead);
          }

          // Write any head data from client
          if (head.length > 0) {
            backendSocket.write(head);
          }

          // Bidirectional pipe
          backendSocket.pipe(clientSocket);
          clientSocket.pipe(backendSocket);

          // Handle errors and closures
          backendSocket.on('error', (err) => {
            console.error('[Native WS Proxy] Backend socket error:', err.message);
            if (clientSocket.writable) clientSocket.destroy();
          });

          clientSocket.on('error', (err) => {
            console.error('[Native WS Proxy] Client socket error:', err.message);
            backendSocket.destroy();
          });

          backendSocket.on('end', () => {
            console.log('[Native WS Proxy] Backend socket ended');
            if (clientSocket.writable) clientSocket.end();
          });

          clientSocket.on('end', () => {
            console.log('[Native WS Proxy] Client socket ended');
            backendSocket.end();
          });

          resolve();
        });

        // Handle backend connection errors - these trigger retries
        backendReq.on('error', (err) => {
          console.error('[Native WS Proxy] Backend request error:', {
            attempt,
            message: err.message,
            code: err.code,
            errno: err.errno
          });

          backendReq.destroy();
          reject(err);
        });

        // Handle unexpected HTTP response (should be upgrade) - this triggers retry for 502
        backendReq.on('response', (res) => {
          console.error('[Native WS Proxy] Unexpected HTTP response:', {
            attempt,
            statusCode: res.statusCode,
            headers: res.headers
          });

          backendReq.destroy();
          const error = new Error(`HTTP ${res.statusCode} response from backend`);
          error.code = res.statusCode === 502 ? 'E502' : 'EHTTP';
          reject(error);
        });

        // Handle timeout
        backendReq.on('timeout', () => {
          console.error('[Native WS Proxy] Backend request timeout:', { attempt });
          backendReq.destroy();
          const error = new Error('Backend request timeout');
          error.code = 'ETIMEDOUT';
          reject(error);
        });

        // Send the upgrade request to backend
        backendReq.end();
      });
    }, {
      maxAttempts: 5,
      initialDelayMs: 500,
      maxDelayMs: 3000,
      backoffFactor: 1.5,
      retryOnCodes: ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'E502']
    });
  } catch (err) {
    console.error('[Native WS Proxy] All retry attempts failed:', {
      message: err.message,
      code: err.code
    });

    // Send 502 Bad Gateway to client after all retries exhausted
    if (clientSocket.writable) {
      clientSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
      clientSocket.destroy();
    }
  }
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  // Handle WebSocket upgrade requests
  server.on('upgrade', (req, socket, head) => {
    const { pathname } = parse(req.url);

    // Proxy noVNC WebSocket requests to master-controller
    if (pathname && pathname.startsWith('/api/auth/session/') && pathname.includes('/novnc/websock')) {
      console.log('[WebSocket Upgrade] Handling noVNC connection:', {
        pathname,
        url: req.url,
        headers: {
          upgrade: req.headers.upgrade,
          connection: req.headers.connection,
          host: req.headers.host
        }
      });

      // Use native WebSocket proxy
      proxyWebSocket(req, socket, head);
    } else {
      console.log('[WebSocket Upgrade] Rejecting non-noVNC connection:', pathname);
      socket.destroy();
    }
  });

  server.once('error', (err) => {
    console.error(err);
    process.exit(1);
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Native WebSocket proxy enabled for noVNC connections`);
    console.log(`> Proxying to: ${BACKEND_HOST}:${BACKEND_PORT}`);
  });
});
