/**
 * Master Controller Main Server
 * Central orchestration service for CLI Remote Tool system
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const logger = require('./utils/logger').module('server');
const { testConnection } = require('./db/supabase');

// Import routes
const userRoutes = require('./routes/users');
const vmRoutes = require('./routes/vms');
const authRoutes = require('./routes/auth');
const promptRoutes = require('./routes/prompts');
const adminRoutes = require('./routes/admin');
const metricsRoutes = require('./routes/metrics');

// Import background tasks
const backgroundTasks = require('./tasks/background');

const app = express();
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocket.Server({ server });

// CRITICAL: Log EVERY incoming request at the very entry point (before all middleware)
app.use((req, res, next) => {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId;
  logger.info('[REQUEST-ENTRY] Incoming request', {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip || req.socket.remoteAddress,
    timestamp: new Date().toISOString()
  });
  next();
});

// Middleware
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.apiLog(req.method, req.path, res.statusCode, duration);
  });
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: { error: 'Too many requests, please try again later' }
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Canary endpoint - minimal, no middleware dependencies
app.get('/api/debug/ping', (req, res) => {
  logger.info('[CANARY] /api/debug/ping hit', { requestId: req.requestId });
  res.status(200).json({
    success: true,
    message: 'pong',
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/vms', vmRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/admin', adminRoutes);

// Metrics (no rate limit)
app.use('/metrics', metricsRoutes);

// Error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });

  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error',
    ...(config.server.env === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  const clientIP = req.socket.remoteAddress;
  logger.info('WebSocket connected', { clientIP });

  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      handleWSMessage(ws, data);
    } catch (error) {
      logger.error('WebSocket message error', { error: error.message });
      ws.send(JSON.stringify({ error: 'Invalid message format' }));
    }
  });

  ws.on('close', () => {
    logger.info('WebSocket disconnected', { clientIP });
  });

  ws.on('error', (error) => {
    logger.error('WebSocket error', { error: error.message, clientIP });
  });
});

// WebSocket message handler
function handleWSMessage(ws, data) {
  const { type, payload } = data;

  switch (type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;

    case 'subscribe':
      // Subscribe to events (e.g., VM status, prompt updates)
      ws.subscriptions = ws.subscriptions || new Set();
      if (payload.channel) {
        ws.subscriptions.add(payload.channel);
        ws.send(JSON.stringify({
          type: 'subscribed',
          channel: payload.channel
        }));
      }
      break;

    case 'unsubscribe':
      if (ws.subscriptions && payload.channel) {
        ws.subscriptions.delete(payload.channel);
        ws.send(JSON.stringify({
          type: 'unsubscribed',
          channel: payload.channel
        }));
      }
      break;

    default:
      ws.send(JSON.stringify({ error: 'Unknown message type' }));
  }
}

// Broadcast to WebSocket clients
function broadcastToChannel(channel, message) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN &&
        client.subscriptions &&
        client.subscriptions.has(channel)) {
      client.send(JSON.stringify({
        type: 'event',
        channel,
        data: message
      }));
    }
  });
}

// Make broadcast available globally
global.broadcastToChannel = broadcastToChannel;

// WebSocket heartbeat
const wsHeartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      logger.warn('Terminating inactive WebSocket');
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  });
}, config.websocket.heartbeatInterval);

wss.on('close', () => {
  clearInterval(wsHeartbeat);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');

  server.close(() => {
    logger.info('HTTP server closed');

    wss.close(() => {
      logger.info('WebSocket server closed');
      process.exit(0);
    });
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
});

// Start server
async function start() {
  try {
    logger.info('Starting Master Controller...', {
      env: config.server.env,
      port: config.server.port,
      nodeVersion: process.version
    });

    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.error('Database connection failed, exiting...');
      process.exit(1);
    }

    // Start background tasks
    await backgroundTasks.start();

    // Start HTTP server
    server.listen(config.server.port, config.server.host, () => {
      logger.info('Master Controller started', {
        http: `http://${config.server.host}:${config.server.port}`,
        ws: `ws://${config.server.host}:${config.server.port}`
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

start();

module.exports = { app, server, wss };
