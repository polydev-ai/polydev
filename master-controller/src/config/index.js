/**
 * Configuration Management
 * Loads and validates environment variables
 */

const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '../../.env')
});

const config = {
  // Server
  server: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 4000,
    host: process.env.HOST || '0.0.0.0'
  },

  // Database
  database: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY
  },

  // Encryption
  encryption: {
    masterKey: process.env.ENCRYPTION_MASTER_KEY
  },

  // Decodo Proxy
  decodo: {
    user: process.env.DECODO_USER,
    password: process.env.DECODO_PASSWORD,
    host: process.env.DECODO_HOST || 'dc.decodo.com',
    portStart: parseInt(process.env.DECODO_PORT_START, 10) || 10001,
    portEnd: parseInt(process.env.DECODO_PORT_END, 10) || 10100
  },

  // Firecracker
  firecracker: {
    base: process.env.FIRECRACKER_BASE || '/var/lib/firecracker',
    binary: process.env.FIRECRACKER_BINARY || '/usr/bin/firecracker',
    jailer: process.env.JAILER_BINARY || '/usr/bin/jailer',
    goldenSnapshot: process.env.GOLDEN_SNAPSHOT,
    goldenMemory: process.env.GOLDEN_MEMORY,
    goldenKernel: process.env.GOLDEN_KERNEL,
    goldenRootfs: process.env.GOLDEN_ROOTFS,
    goldenBrowserRootfs: process.env.GOLDEN_BROWSER_ROOTFS || '/var/lib/firecracker/snapshots/base/golden-browser-rootfs.ext4',
    socketsDir: `${process.env.FIRECRACKER_BASE || '/var/lib/firecracker'}/sockets`,
    usersDir: `${process.env.FIRECRACKER_BASE || '/var/lib/firecracker'}/users`,
    jailDir: `${process.env.FIRECRACKER_BASE || '/var/lib/firecracker'}/jail`
  },

  // Network
  network: {
    internalNetwork: process.env.INTERNAL_NETWORK || '192.168.100.0/24',
    bridgeDevice: process.env.BRIDGE_DEVICE || 'fcbr0',
    bridgeIP: process.env.BRIDGE_IP || '192.168.100.1',
    ipPoolStart: process.env.IP_POOL_START || '192.168.100.2',
    ipPoolEnd: process.env.IP_POOL_END || '192.168.100.254'
  },

  // Performance
  performance: {
    vmIdleTimeout: parseInt(process.env.VM_IDLE_TIMEOUT, 10) || 1800000,
    vmDestroyTimeout: parseInt(process.env.VM_DESTROY_TIMEOUT, 10) || 1209600000,
    maxConcurrentVMs: parseInt(process.env.MAX_CONCURRENT_VMS, 10) || 180,
    maxBrowserVMs: parseInt(process.env.MAX_BROWSER_VMS, 10) || 2,
    browserVmHealthTimeoutMs: parseInt(process.env.BROWSER_VM_HEALTH_TIMEOUT_MS, 10) || 120000, // 2 minutes
    cliOAuthStartTimeoutMs: parseInt(process.env.CLI_OAUTH_START_TIMEOUT_MS, 10) || 10000 // 10 seconds - timeout for starting OAuth flow in VM
  },

  // VM Resources
  vm: {
    cli: {
      vcpu: parseInt(process.env.CLI_VM_VCPU, 10) || 1,  // Changed from parseFloat with default 0.5 to parseInt with default 1 (Firecracker requires integer vCPUs)
      memoryMB: parseInt(process.env.CLI_VM_MEMORY_MB, 10) || 256
    },
    browser: {
      vcpu: parseInt(process.env.BROWSER_VM_VCPU, 10) || 2,  // Changed from parseFloat to parseInt (Firecracker requires integer vCPUs)
      memoryMB: parseInt(process.env.BROWSER_VM_MEMORY_MB, 10) || 2048
    }
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000, // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 1000 // 1000 requests per minute
  },

  // Monitoring
  monitoring: {
    prometheusEnabled: process.env.PROMETHEUS_ENABLED === 'true',
    metricsInterval: parseInt(process.env.METRICS_COLLECTION_INTERVAL, 10) || 10000
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    logFile: process.env.LOG_FILE || '/var/log/polydev/master-controller.log',
    errorLogFile: process.env.ERROR_LOG_FILE || '/var/log/polydev/master-controller-error.log'
  },

  // Debug Options
  debug: {
    // Keep failed Browser VMs alive for debugging (don't destroy on health check failure)
    keepFailedBrowserVMs: process.env.DEBUG_KEEP_FAILED_BROWSER_VMS === 'true'
  },

  // WebSocket
  websocket: {
    heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL, 10) || 30000,
    connectionTimeout: parseInt(process.env.WS_CONNECTION_TIMEOUT, 10) || 120000
  },

  // Email (optional)
  email: {
    enabled: !!process.env.SMTP_HOST,
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM || 'noreply@polydev.ai'
  }
};

// Validation
function validateConfig() {
  const required = [
    'database.supabaseUrl',
    'database.supabaseServiceKey',
    'encryption.masterKey',
    'decodo.user',
    'decodo.password'
  ];

  const missing = [];

  for (const path of required) {
    const value = path.split('.').reduce((obj, key) => obj?.[key], config);
    if (!value) {
      missing.push(path);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }

  // Validate encryption key length (should be 32 bytes hex = 64 characters)
  if (config.encryption.masterKey.length !== 64) {
    console.warn('WARNING: ENCRYPTION_MASTER_KEY should be 64 hex characters (32 bytes)');
  }
}

// Validate on load
try {
  validateConfig();
} catch (error) {
  console.error('Configuration validation failed:', error.message);
  process.exit(1);
}

module.exports = config;
