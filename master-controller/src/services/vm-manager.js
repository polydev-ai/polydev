/**
 * VM Manager Service
 * Manages Firecracker VM lifecycle including creation, hibernation, and destruction
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const { db } = require('../db/supabase');
const logger = require('../utils/logger').module('vm-manager');
const proxyPortManager = require('./proxy-port-manager');

class VMManager {
  constructor() {
    this.activeVMs = new Map(); // vmId -> VM instance
    this.ipPool = new Set(); // Available IPs from pool
    this.usedIPs = new Map(); // vmId -> IP
    this.tapDevices = new Map(); // vmId -> tap device name
    this.sessionVMMap = new Map(); // sessionId -> { vmId, vmIP, created, lastHeartbeat }
    this.initPromise = this.initializeIPPool(); // Track initialization promise
  }

  /**
   * Initialize IP pool from config and database
   * Queries database to exclude IPs already allocated to running VMs
   */
  async initializeIPPool() {
    const [start, end] = this.parseIPRange(
      config.network.ipPoolStart,
      config.network.ipPoolEnd
    );

    // Add all IPs from range to pool
    for (let i = start; i <= end; i++) {
      const ip = this.intToIP(i);
      this.ipPool.add(ip);
    }

    const totalIPs = this.ipPool.size;

    // Query database for VMs with allocated IPs (running or hibernated)
    try {
      const runningVMs = await db.vms.list({
        status: 'running',
        excludeDestroyed: true
      });

      const hibernatedVMs = await db.vms.list({
        status: 'hibernated',
        excludeDestroyed: true
      });

      const allocatedVMs = [...runningVMs, ...hibernatedVMs];

      // Remove already-allocated IPs from pool and add to usedIPs map
      for (const vm of allocatedVMs) {
        if (vm.ip_address) {
          this.ipPool.delete(vm.ip_address);
          this.usedIPs.set(vm.vm_id, vm.ip_address);
        }
      }

      logger.info('IP pool initialized from database', {
        totalIPs,
        allocatedIPs: allocatedVMs.length,
        availableIPs: this.ipPool.size,
        range: `${config.network.ipPoolStart} - ${config.network.ipPoolEnd}`,
        allocatedVMIds: allocatedVMs.map(vm => `${vm.vm_id.substring(0, 8)} (${vm.ip_address})`).join(', ')
      });
    } catch (error) {
      logger.error('Failed to query existing VMs for IP allocation', {
        error: error.message,
        fallbackPoolSize: this.ipPool.size
      });
      // Continue with full IP pool on error - better than failing startup
    }
  }

  /**
   * Parse IP range into integers
   */
  parseIPRange(startIP, endIP) {
    return [this.ipToInt(startIP), this.ipToInt(endIP)];
  }

  /**
   * Convert IP string to integer
   */
  ipToInt(ip) {
    const parts = ip.split('.').map(Number);
    return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
  }

  /**
   * Convert integer to IP string
   */
  intToIP(int) {
    return [
      (int >>> 24) & 0xFF,
      (int >>> 16) & 0xFF,
      (int >>> 8) & 0xFF,
      int & 0xFF
    ].join('.');
  }

  /**
   * Allocate IP from pool
   * Waits for initialization to complete before allocating
   */
  async allocateIP(vmId) {
    // Wait for IP pool initialization to complete
    await this.initPromise;

    if (this.ipPool.size === 0) {
      throw new Error('IP pool exhausted');
    }

    const ip = this.ipPool.values().next().value;
    this.ipPool.delete(ip);
    this.usedIPs.set(vmId, ip);

    logger.debug('IP allocated', { vmId, ip, remaining: this.ipPool.size });
    return ip;
  }

  /**
   * Release IP back to pool
   */
  releaseIP(vmId) {
    const ip = this.usedIPs.get(vmId);
    if (ip) {
      this.usedIPs.delete(vmId);
      this.ipPool.add(ip);
      logger.debug('IP released', { vmId, ip, poolSize: this.ipPool.size });
    }
  }

  /**
   * Create TAP device for VM
   */
  async createTAPDevice(vmId, ipAddress) {
    const tapName = `fc-${vmId.substring(0, 8)}`;

    try {
      // Create TAP device
      execSync(`ip tuntap add ${tapName} mode tap`, { stdio: 'pipe' });

      // CRITICAL FIX: Enable vnet_hdr using helper (fixes "ARP works but IP fails")
      // This sets IFF_VNET_HDR via ioctl, required for Firecracker virtio-net offloads
      execSync(`/usr/local/bin/set-tap-vnet-hdr ${tapName} on`, { stdio: 'pipe' });
      logger.info('vnet_hdr enabled on TAP via helper', { tapName });

      // Add to bridge
      execSync(`ip link set ${tapName} master ${config.network.bridgeDevice}`, { stdio: 'pipe' });

      // Bring up
      execSync(`ip link set ${tapName} up`, { stdio: 'pipe' });

      // Disable rp_filter on this TAP (new TAPs inherit default which is often strict)
      execSync(`sysctl -w net.ipv4.conf.${tapName}.rp_filter=0`, { stdio: 'pipe' });

      this.tapDevices.set(vmId, tapName);
      logger.info('TAP device created with vnet_hdr', { vmId, tapName, ipAddress });

      return tapName;
    } catch (error) {
      logger.error('Failed to create TAP device', { vmId, error: error.message });
      throw new Error(`TAP device creation failed: ${error.message}`);
    }
  }

  /**
   * Remove TAP device
   */
  async removeTAPDevice(vmId) {
    const tapName = this.tapDevices.get(vmId);
    if (!tapName) return;

    try {
      execSync(`ip link delete ${tapName}`, { stdio: 'pipe' });
      this.tapDevices.delete(vmId);
      logger.info('TAP device removed', { vmId, tapName });
    } catch (error) {
      logger.warn('Failed to remove TAP device', { vmId, tapName, error: error.message });
    }
  }

  /**
   * Create VM configuration file
   */
  async createVMConfig(vmId, vmType, tapDevice, ipAddress, decodoPort = null) {
    const vcpu = vmType === 'browser' ? config.vm.browser.vcpu : config.vm.cli.vcpu;
    const memory = vmType === 'browser' ? config.vm.browser.memoryMB : config.vm.cli.memoryMB;
    const vmDir = path.join(config.firecracker.usersDir, vmId);

    const vmConfig = {
      'boot-source': {
        kernel_image_path: config.firecracker.goldenKernel,
        initrd_path: '/boot/initrd.img-5.15.0-157-generic',
        boot_args: `console=ttyS0 reboot=k panic=1 root=/dev/vda rw rootfstype=ext4 rootwait net.ifnames=0 biosdevname=0 random.trust_cpu=on ip=${ipAddress}::${config.network.bridgeIP}:255.255.255.0::eth0:on${decodoPort ? ' decodo_port=' + decodoPort : ''}`
      },
      'drives': [
        {
          drive_id: 'rootfs',
          path_on_host: path.join(vmDir, 'rootfs.ext4'),
          is_root_device: false,
          is_read_only: false
        }
      ],
      'network-interfaces': [
        {
          iface_id: tapDevice,
          guest_mac: this.generateMAC(vmId),
          host_dev_name: tapDevice
        }
      ],
      'machine-config': {
        vcpu_count: Math.floor(vcpu),
        mem_size_mib: memory,
        smt: false
      }
    };

    const configPath = path.join(vmDir, 'vm-config.json');
    await fs.writeFile(configPath, JSON.stringify(vmConfig, null, 2));

    return configPath;
  }

  /**
   * Generate MAC address for VM
   */
  generateMAC(vmId) {
    const hash = crypto.createHash('md5').update(vmId).digest('hex');
    return `02:fc:${hash.substring(0, 2)}:${hash.substring(2, 4)}:${hash.substring(4, 6)}:${hash.substring(6, 8)}`;
  }

  /**
   * Clone golden snapshot for new VM
   */
  async cloneGoldenSnapshot(vmId, vmType = 'cli', userId = null, sessionId = null) {
    const vmDir = path.join(config.firecracker.usersDir, vmId);
    await fs.mkdir(vmDir, { recursive: true });

    try {
      // CoW copy of rootfs - use different golden rootfs based on VM type
      const rootfsSrc = vmType === 'browser'
        ? config.firecracker.goldenBrowserRootfs || config.firecracker.goldenRootfs
        : config.firecracker.goldenRootfs;
      const rootfsDst = path.join(vmDir, 'rootfs.ext4');
      execSync(`cp --reflink=auto ${rootfsSrc} ${rootfsDst}`, { stdio: 'pipe' });

      // Copy snapshot and memory (for resume capability) only if files exist
      if (config.firecracker.goldenSnapshot && config.firecracker.goldenMemory) {
        if (fsSync.existsSync(config.firecracker.goldenSnapshot) &&
            fsSync.existsSync(config.firecracker.goldenMemory)) {
          execSync(`cp ${config.firecracker.goldenSnapshot} ${vmDir}/snapshot.snap`, { stdio: 'pipe' });
          execSync(`cp ${config.firecracker.goldenMemory} ${vmDir}/memory.mem`, { stdio: 'pipe' });
          logger.debug('Snapshot files copied for VM', { vmId });
        } else {
          logger.debug('Golden snapshot files not found, skipping snapshot copy', { vmId });
        }
      }

      // DIAGNOSTIC: Log vmType before injection check
      logger.info('[CLONE-SNAPSHOT] Checking vmType for OAuth agent injection', { vmId, vmType, vmTypeType: typeof vmType });

      // For Browser VMs, inject OAuth agent and WebRTC server
      if (vmType === 'browser') {
        logger.info('[CLONE-SNAPSHOT] vmType is "browser", proceeding with OAuth agent + WebRTC injection', { vmId });
        await this.injectOAuthAgent(vmId, rootfsDst, userId, sessionId);
      } else {
        logger.info('[CLONE-SNAPSHOT] vmType is NOT "browser", skipping OAuth agent injection', { vmId, vmType });
      }

      logger.info('Golden snapshot cloned', { vmId, vmDir });
    } catch (error) {
      logger.error('Failed to clone golden snapshot', { vmId, error: error.message });
      throw new Error(`Snapshot cloning failed: ${error.message}`);
    }
  }

  /**
   * Inject OAuth agent and WebRTC server into Browser VM rootfs
   * Mounts the ext4 image, copies agent files, and sets up systemd service
   * Also injects Decodo proxy configuration and SESSION_ID for WebRTC
   */
  async injectOAuthAgent(vmId, rootfsPath, userId = null, sessionId = null) {
    const mountPoint = `/tmp/vm-inject-${vmId}`;

    try {
      logger.info('[INJECT-AGENT] Starting OAuth agent injection', { vmId });

      // Create mount point
      execSync(`mkdir -p ${mountPoint}`, { stdio: 'pipe' });

      // Mount rootfs
      execSync(`mount -o loop ${rootfsPath} ${mountPoint}`, { stdio: 'pipe' });
      logger.info('[INJECT-AGENT] Rootfs mounted', { vmId, mountPoint });

      // Inject Decodo proxy configuration for Browser VM
      if (userId) {
        try {
          logger.info('[INJECT-AGENT] Injecting Decodo proxy configuration', { vmId, userId });
          const proxyEnv = await proxyPortManager.getProxyEnvVars(userId);

          // Create /etc/environment content with proxy settings + SESSION_ID
          // NO COMMENTS! systemd EnvironmentFile doesn't support them
          const envContent = `HTTP_PROXY=${proxyEnv.HTTP_PROXY}
HTTPS_PROXY=${proxyEnv.HTTPS_PROXY}
NO_PROXY=${proxyEnv.NO_PROXY}
http_proxy=${proxyEnv.HTTP_PROXY}
https_proxy=${proxyEnv.HTTPS_PROXY}
no_proxy=${proxyEnv.NO_PROXY}
${sessionId ? `SESSION_ID=${sessionId}` : ''}
MASTER_CONTROLLER_URL=http://192.168.100.1:4000
DISPLAY=:1
`;

          const envPath = path.join(mountPoint, 'etc/environment');
          await fs.writeFile(envPath, envContent);

          logger.info('[INJECT-AGENT] Decodo proxy + SESSION_ID injected successfully', {
            vmId,
            userId,
            sessionId,
            proxyPort: proxyEnv.HTTP_PROXY.match(/:(\d+)$/)?.[1],
            envPath
          });
        } catch (proxyError) {
          logger.error('[INJECT-AGENT] Failed to inject proxy configuration', {
            vmId,
            userId,
            error: proxyError.message
          });
          // Don't fail the whole injection if proxy fails - VM can still work with local proxy
        }
      } else {
        logger.warn('[INJECT-AGENT] No userId provided, skipping Decodo proxy injection', { vmId });
      }

      // Remove old agent directories if they exist (golden snapshot may have old paths)
      const oldAgentDir = path.join(mountPoint, 'opt/vm-agent');
      const agentDir = path.join(mountPoint, 'opt/vm-browser-agent');
      try {
        execSync(`rm -rf ${oldAgentDir} ${agentDir}`, { stdio: 'pipe' });
        logger.info('[INJECT-AGENT] Removed old agent directories', { vmId });
      } catch (err) {
        logger.debug('[INJECT-AGENT] No old directories to remove', { vmId });
      }

      // Create agent directory in VM
      execSync(`mkdir -p ${agentDir}`, { stdio: 'pipe' });

      // Copy agent files from master-controller repo
      const srcAgentDir = path.join(__dirname, '../../vm-browser-agent');

      // Check if agent files exist
      if (!fsSync.existsSync(path.join(srcAgentDir, 'server.js'))) {
        throw new Error('vm-browser-agent/server.js not found in repository');
      }

      if (!fsSync.existsSync(path.join(srcAgentDir, 'node'))) {
        throw new Error('vm-browser-agent/node binary not found in repository');
      }

      execSync(`cp ${srcAgentDir}/server.js ${agentDir}/`, { stdio: 'pipe' });
      execSync(`cp ${srcAgentDir}/webrtc-server.js ${agentDir}/`, { stdio: 'pipe' });
      execSync(`cp ${srcAgentDir}/package.json ${agentDir}/`, { stdio: 'pipe' });
      execSync(`cp ${srcAgentDir}/node ${agentDir}/`, { stdio: 'pipe' });
      execSync(`chmod +x ${agentDir}/node`, { stdio: 'pipe' });
      logger.info('[INJECT-AGENT] Agent files copied (OAuth agent + WebRTC server + bundled Node.js)', { vmId });

      // Create supervisor script to run both OAuth agent AND WebRTC server
      // FIXED: Don't manually parse /etc/environment (causes crash with comments)
      // systemd already loads it via EnvironmentFile
      const supervisorContent = `#!/bin/bash
set -Eeuo pipefail

cd /opt/vm-browser-agent

LOG_DIR=/var/log/vm-browser-agent
mkdir -p "$LOG_DIR"

echo "[SUPERVISOR] \\\$(date -Is) Starting OAuth agent and WebRTC server..." | tee -a "$LOG_DIR/supervisor.log"
echo "[SUPERVISOR] SESSION_ID=\\\${SESSION_ID:-<unset>} DISPLAY=\\\${DISPLAY:-<unset>} PORT=\\\${PORT:-8080} HOST=\\\${HOST:-0.0.0.0}" | tee -a "$LOG_DIR/supervisor.log"

# Ensure sane defaults
export PORT="\\\${PORT:-8080}"
export HOST="\\\${HOST:-0.0.0.0}"

# Start OAuth agent with logging
/opt/vm-browser-agent/node /opt/vm-browser-agent/server.js >> "$LOG_DIR/oauth.log" 2>&1 &
OAUTH_PID=$!
echo "[SUPERVISOR] OAuth agent PID: $OAUTH_PID" | tee -a "$LOG_DIR/supervisor.log"

# Start WebRTC server with logging
/opt/vm-browser-agent/node /opt/vm-browser-agent/webrtc-server.js >> "$LOG_DIR/webrtc.log" 2>&1 &
WEBRTC_PID=$!
echo "[SUPERVISOR] WebRTC server PID: $WEBRTC_PID" | tee -a "$LOG_DIR/supervisor.log"

cleanup() {
  echo "[SUPERVISOR] \\\$(date -Is) Shutting down..." | tee -a "$LOG_DIR/supervisor.log"
  kill "$OAUTH_PID" "$WEBRTC_PID" 2>/dev/null || true
  wait "$OAUTH_PID" "$WEBRTC_PID" 2>/dev/null || true
  echo "[SUPERVISOR] Stopped" | tee -a "$LOG_DIR/supervisor.log"
}

trap cleanup TERM INT

# Wait for either process to exit
wait -n "$OAUTH_PID" "$WEBRTC_PID"
echo "[SUPERVISOR] One child exited; stopping all..." | tee -a "$LOG_DIR/supervisor.log"
cleanup
`;

      const supervisorPath = path.join(agentDir, 'start-all.sh');
      await fs.writeFile(supervisorPath, supervisorContent);
      execSync(`chmod +x ${supervisorPath}`, { stdio: 'pipe' });
      logger.info('[INJECT-AGENT] Supervisor script created', { vmId });

      // Remove old systemd service if it exists (golden snapshot may have stale version)
      const oldServicePath = path.join(mountPoint, 'etc/systemd/system/vm-browser-agent.service');
      const oldSymlinkPath = path.join(mountPoint, 'etc/systemd/system/multi-user.target.wants/vm-browser-agent.service');
      try {
        execSync(`rm -f ${oldServicePath} ${oldSymlinkPath}`, { stdio: 'pipe' });
        logger.info('[INJECT-AGENT] Removed old service files', { vmId });
      } catch (err) {
        // Files may not exist, ignore
        logger.debug('[INJECT-AGENT] No old service to remove', { vmId });
      }

      // Create systemd service file (runs supervisor that manages both OAuth + WebRTC)
      // FIXED: Output to console so we can see errors, prefix EnvironmentFile with - to ignore if missing
      const serviceContent = `[Unit]
Description=VM Browser Services (OAuth Agent + WebRTC Server)
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/vm-browser-agent
Environment=HOST=0.0.0.0
Environment=PORT=8080
EnvironmentFile=-/etc/environment
ExecStart=/opt/vm-browser-agent/start-all.sh
Restart=always
RestartSec=3
StandardOutput=journal+console
StandardError=journal+console

[Install]
WantedBy=multi-user.target
`;

      const servicePath = path.join(mountPoint, 'etc/systemd/system/vm-browser-agent.service');
      await fs.writeFile(servicePath, serviceContent);
      logger.info('[INJECT-AGENT] Systemd service created', { vmId });

      // Enable service (create symlink)
      const symlinkTarget = '/etc/systemd/system/vm-browser-agent.service';
      const symlinkPath = path.join(mountPoint, 'etc/systemd/system/multi-user.target.wants/vm-browser-agent.service');
      execSync(`mkdir -p ${path.dirname(symlinkPath)}`, { stdio: 'pipe' });
      execSync(`ln -sf ${symlinkTarget} ${symlinkPath}`, { stdio: 'pipe' });
      logger.info('[INJECT-AGENT] Service enabled', { vmId });

      logger.info('[INJECT-AGENT] OAuth agent injection complete', { vmId });

    } catch (error) {
      logger.error('[INJECT-AGENT] Failed to inject OAuth agent', {
        vmId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      // Always unmount
      try {
        execSync(`umount ${mountPoint}`, { stdio: 'pipe' });
        execSync(`rmdir ${mountPoint}`, { stdio: 'pipe' });
        logger.info('[INJECT-AGENT] Rootfs unmounted', { vmId });
      } catch (unmountErr) {
        logger.warn('[INJECT-AGENT] Failed to unmount rootfs', {
          vmId,
          error: unmountErr.message
        });
      }
    }
  }

  /**
   * Helper: Timeout wrapper for promises
   */
  withTimeout(promise, ms, label) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
      )
    ]);
  }

  /**
   * Create and start a new VM
   */
  async createVM(userId, vmType, decodoPort = null, decodoIP = null, sessionId = null) {
    const vmId = `vm-${crypto.randomUUID()}`;
    const startTime = Date.now();

    try {
      logger.info('[VM-CREATE] Starting VM creation', { vmId, userId, vmType, startTime: new Date().toISOString() });

      // Get user's dedicated proxy configuration
      logger.info('[VM-CREATE] Step 0: Getting user proxy configuration', { vmId, userId });
      const proxyEnv = await this.withTimeout(
        proxyPortManager.getProxyEnvVars(userId),
        5000,
        `[${vmId}] getProxyEnvVars`
      );
      const proxyPort = proxyEnv.HTTP_PROXY.match(/:(\d+)$/)?.[1];

      // Get the user's Decodo fixed IP from database
      const proxyInfo = await proxyPortManager.getOrAssignPort(userId);

      logger.info('[VM-CREATE] Step 0: Proxy config retrieved', {
        vmId,
        userId,
        proxyPort,
        decodoExternalIP: proxyInfo.ip,
        proxyURL: proxyEnv.HTTP_PROXY,
        willInjectToVM: !!proxyPort
      });

      // Allocate resources (waits for IP pool init, then allocates)
      logger.info('[VM-CREATE] Step 1: Allocating IP', { vmId, userId });
      const ipAddress = await this.withTimeout(
        this.allocateIP(vmId),  // Already returns a promise
        5000,
        `[${vmId}] allocateIP`
      );
      logger.info('[VM-CREATE] Step 1: IP allocated', {
        vmId,
        userId,
        internalIP: ipAddress,
        decodoPort: proxyInfo.port,
        decodoExternalIP: proxyInfo.ip,
        elapsed: Date.now() - startTime
      });

      // Create TAP device
      logger.info('[VM-CREATE] Step 2: Creating TAP device', { vmId });
      const tapDevice = await this.withTimeout(
        this.createTAPDevice(vmId, ipAddress),
        5000,
        `[${vmId}] createTAPDevice`
      );
      logger.info('[VM-CREATE] Step 2: TAP device created', { vmId, tapDevice, elapsed: Date.now() - startTime });

      // Clone golden snapshot
      logger.info('[VM-CREATE] Step 3: Cloning golden snapshot', { vmId, vmType });
      await this.withTimeout(
        this.cloneGoldenSnapshot(vmId, vmType, userId, sessionId),
        15000,
        `[${vmId}] cloneGoldenSnapshot`
      );
      logger.info('[VM-CREATE] Step 3: Snapshot cloned', { vmId, elapsed: Date.now() - startTime });

      // Create VM config
      logger.info('[VM-CREATE] Step 4: Creating VM config', { vmId });
      const decodoPort = proxyEnv.HTTP_PROXY?.match(/:(\d+)$/)?.[1];
      const configPath = await this.withTimeout(
        this.createVMConfig(vmId, vmType, tapDevice, ipAddress, decodoPort),
        5000,
        `[${vmId}] createVMConfig`
      );
      logger.info('[VM-CREATE] Step 4: Config created', { vmId, configPath, elapsed: Date.now() - startTime });

      // Create database record
      const vcpu = vmType === 'browser' ? config.vm.browser.vcpu : config.vm.cli.vcpu;
      const memory = vmType === 'browser' ? config.vm.browser.memoryMB : config.vm.cli.memoryMB;

      logger.info('[VM-CREATE] Step 5: Creating database record', { vmId });
      await this.withTimeout(
        db.vms.create({
          vm_id: vmId,
          user_id: userId,
          type: vmType,        // NOT NULL column (legacy)
          vm_type: vmType,     // Nullable column (new)
          vcpu_count: vcpu,
          memory_mb: memory,
          ip_address: ipAddress,
          tap_device: tapDevice,
          status: 'running'
        }),
        5000,
        `[${vmId}] db.vms.create`
      );
      logger.info('[VM-CREATE] Step 5: Database record created', { vmId, elapsed: Date.now() - startTime });

      // Start Firecracker (this is the longest step)
      logger.info('[VM-CREATE] Step 6: Starting Firecracker', { vmId });
      const socketPath = path.join(config.firecracker.socketsDir, `${vmId}.sock`);
      await this.withTimeout(
        this.startFirecracker(vmId, configPath, socketPath, proxyEnv),
        25000,  // 25 seconds - just under the API timeout
        `[${vmId}] startFirecracker`
      );
      logger.info('[VM-CREATE] Step 6: Firecracker started', { vmId, elapsed: Date.now() - startTime });

      const totalTime = Date.now() - startTime;
      logger.info('[VM-CREATE] VM created successfully', { vmId, ipAddress, vmType, totalTime });

      return {
        vmId,
        ipAddress,
        tapDevice,
        socketPath,
        status: 'running'
      };
    } catch (error) {
      const elapsed = Date.now() - startTime;
      logger.error('[VM-CREATE] VM creation failed', {
        vmId,
        userId,
        vmType,
        error: error.message,
        stack: error.stack,
        elapsed,
        failedAt: new Date().toISOString()
      });

      // Cleanup on failure
      logger.info('[VM-CREATE] Cleaning up failed VM', { vmId });
      await this.cleanupVM(vmId, false).catch(cleanupErr =>
        logger.warn('[VM-CREATE] Cleanup failed', { vmId, error: cleanupErr.message })
      );

      throw error;
    }
  }

  /**
   * Start Firecracker process
   */
  async startFirecracker(vmId, configPath, socketPath, proxyEnv = null) {
    return new Promise((resolve, reject) => {
      const vmDir = path.join(config.firecracker.usersDir, vmId);
      const consolePath = path.join(vmDir, 'console.log');

      // Ensure socket directory exists and remove old socket if it exists
      const socketDir = path.dirname(socketPath);
      execSync(`mkdir -p ${socketDir}`, { stdio: 'pipe' });
      execSync(`rm -f ${socketPath}`, { stdio: 'pipe' });

      // Check if snapshot exists (will be loaded via API after Firecracker starts)
      const snapshotPath = path.join(vmDir, 'snapshot.snap');
      const memoryPath = path.join(vmDir, 'memory.mem');
      const hasSnapshot = fsSync.existsSync(snapshotPath) && fsSync.existsSync(memoryPath);

      // Build Firecracker command
      // IMPORTANT: When loading snapshot, do NOT use --config-file as it auto-starts the VM
      // The snapshot contains all configuration (network, drives, machine-config, etc.)
      const binary = config.firecracker.binary;
      const args = [
        '--api-sock', socketPath,
        '--log-path', '/dev/null',  // Disable firecracker internal logging
        '--level', 'Off',            // No internal log output
        '--enable-pci'              // Enable PCI support for VirtIO devices (v1.13.0+)
      ];

      // Only add config file if NOT loading snapshot (cold boot)
      if (!hasSnapshot) {
        args.push('--config-file', configPath);
      }

      // Build environment with user's dedicated Decodo proxy
      const env = { ...process.env };
      if (proxyEnv) {
        // Add all proxy environment variables from proxy-port-manager
        Object.assign(env, proxyEnv);
        logger.info('[FIRECRACKER-PROXY] User proxy configured', {
          vmId,
          proxyPort: proxyEnv.HTTP_PROXY?.match(/:(\d+)$/)?.[1] || 'unknown'
        });
      }

      // Open console.log file descriptor for writing VM serial console output (ttyS0)
      // Must use openSync to get file descriptor (integer) for spawn stdio
      const consoleFd = fsSync.openSync(consolePath, 'a');

      // Open firecracker-error.log for stderr output (Firecracker internal errors)
      const errorLogPath = path.join(vmDir, 'firecracker-error.log');
      const errorFd = fsSync.openSync(errorLogPath, 'a');

      // Log spawn details for debugging
      logger.info('[SPAWN-DEBUG] About to spawn Firecracker', {
        vmId,
        binary,
        args: args.join(' '),
        consoleFd,
        errorFd,
        consolePath,
        errorLogPath,
        vmDir,
        hasProxy: !!proxyEnv
      });

      // Check file descriptor validity
      try {
        const stats = fsSync.fstatSync(consoleFd);
        logger.info('[SPAWN-DEBUG] Console FD valid', { vmId, consoleFd, isFile: stats.isFile() });
      } catch (err) {
        logger.error('[SPAWN-DEBUG] Console FD invalid!', { vmId, consoleFd, error: err.message });
      }

      // Spawn Firecracker with stdout redirected to console.log (serial console / ttyS0)
      // stderr redirected to firecracker-error.log (Firecracker internal errors)
      logger.info('[SPAWN-DEBUG] Calling spawn()', { vmId });
      const proc = spawn(binary, args, {
        detached: true,
        stdio: ['ignore', consoleFd, errorFd],  // stdin=ignore, stdout=console.log, stderr=error.log
        env
      });

      logger.info('[SPAWN-DEBUG] spawn() returned', { vmId, pid: proc.pid, pidType: typeof proc.pid });

      proc.unref();

      // Wait for Firecracker to start (check socket creation)
      const startupTimeout = setTimeout(() => {
        proc.kill();
        reject(new Error('Firecracker startup timeout'));
      }, 30000); // 30 second timeout

      // Poll for socket file creation as startup indicator
      let pollCount = 0;
      const checkInterval = setInterval(async () => {
        pollCount++;
        const socketExists = fsSync.existsSync(socketPath);

        // Log every 10th check (once per second)
        if (pollCount % 10 === 0 || socketExists) {
          logger.info('[SOCKET-POLL] Checking for socket', {
            vmId,
            pollCount,
            socketPath,
            socketExists,
            elapsed: Date.now() - Date.now() // Will show elapsed if we add start timestamp
          });
        }

        if (socketExists) {
          clearInterval(checkInterval);
          clearTimeout(startupTimeout);

          this.activeVMs.set(vmId, { proc, socketPath });

          logger.info('[SOCKET-POLL] Socket detected! Setting up VM', { vmId, pollCount });

          // Update database with PID
          db.vms.update(vmId, {
            firecracker_pid: proc.pid,
            socket_path: socketPath,
            status: 'running'
          }).catch(err => logger.error('Failed to update VM status', { vmId, error: err.message }));

          logger.info('Firecracker started', { vmId, pid: proc.pid, consolePath });

          // Close FDs in parent process (child still has them open)
          try {
            fsSync.closeSync(consoleFd);
            fsSync.closeSync(errorFd);
          } catch (err) {
            logger.warn('Failed to close FDs', { vmId, error: err.message });
          }

          // Load snapshot via API if it exists
          // CRITICAL: Configure network interface BEFORE loading snapshot
          // Snapshots don't preserve network configuration - must be set via API
          if (hasSnapshot) {
            try {
              // Read VM config to get network interface details
              const vmConfig = JSON.parse(fsSync.readFileSync(configPath, 'utf8'));
              const networkInterface = vmConfig['network-interfaces']?.[0];

              if (networkInterface) {
                logger.info('Configuring network interface before snapshot load', {
                  vmId,
                  tapDevice: networkInterface.host_dev_name,
                  guestMAC: networkInterface.guest_mac
                });

                await this.configureNetworkInterface(socketPath, networkInterface);
                logger.info('Network interface configured successfully', { vmId });
              }

              logger.info('Loading snapshot via API', { vmId, snapshotPath, memoryPath });
              await this.loadSnapshot(socketPath, snapshotPath, memoryPath);
              logger.info('Snapshot loaded successfully', { vmId });
            } catch (error) {
              logger.error('Failed to load snapshot via API', { vmId, error: error.message });
              proc.kill();
              reject(new Error(`Snapshot loading failed: ${error.message}`));
              return;
            }
          }

          resolve({ pid: proc.pid, socketPath });
        }
      }, 100); // Check every 100ms

      proc.on('error', (error) => {
        clearInterval(checkInterval);
        clearTimeout(startupTimeout);
        // Close FDs on error
        try {
          fsSync.closeSync(consoleFd);
          fsSync.closeSync(errorFd);
        } catch (err) {
          // Ignore close errors
        }
        logger.error('[SPAWN-ERROR] Firecracker spawn error', {
          vmId,
          errorCode: error.code,
          errorErrno: error.errno,
          errorSyscall: error.syscall,
          errorPath: error.path,
          errorMessage: error.message,
          errorStack: error.stack
        });
        reject(error);
      });

      proc.on('exit', (code, signal) => {
        clearInterval(checkInterval);
        clearTimeout(startupTimeout);
        this.activeVMs.delete(vmId);

        logger.info('[SPAWN-EXIT] Firecracker process exited', {
          vmId,
          code,
          signal,
          pid: proc.pid,
          socketExists: fsSync.existsSync(socketPath),
          elapsed: Date.now() - Date.now() // Will show timing if we add start timestamp
        });

        // Close FDs when process exits
        try {
          fsSync.closeSync(consoleFd);
          fsSync.closeSync(errorFd);
        } catch (err) {
          // Ignore close errors (might already be closed)
        }

        // If exit code is non-zero, read error log before rejecting
        if (code !== 0 && code !== null) {
          try {
            const errorLog = fsSync.readFileSync(errorLogPath, 'utf8');
            const consoleLog = fsSync.readFileSync(consolePath, 'utf8');
            logger.error('[SPAWN-EXIT] Firecracker exited with error', {
              vmId,
              code,
              signal,
              errorLog: errorLog.slice(-500),
              consoleLog: consoleLog.slice(-500)
            });
            reject(new Error(`Firecracker exited with code ${code}: ${errorLog.trim().slice(-500)}`));
          } catch (readErr) {
            logger.error('[SPAWN-EXIT] Firecracker exited, log read failed', {
              vmId,
              code,
              signal,
              errorReadFailed: readErr.message
            });
            reject(new Error(`Firecracker exited with code ${code}`));
          }
        } else {
          logger.info('[SPAWN-EXIT] Firecracker exited normally', { vmId, code, signal });
        }
      });
    });
  }

  /**
   * Hibernate VM to snapshot
   */
  async hibernateVM(vmId) {
    try {
      logger.info('Hibernating VM', { vmId });

      const vm = this.activeVMs.get(vmId);
      if (!vm) {
        throw new Error('VM not found in active VMs');
      }

      const vmDir = path.join(config.firecracker.usersDir, vmId);
      const snapshotPath = path.join(vmDir, 'snapshot.snap');
      const memoryPath = path.join(vmDir, 'memory.mem');

      // Send pause command via API socket
      await this.sendFirecrackerCommand(vm.socketPath, {
        action_type: 'CreateSnapshot',
        snapshot_path: snapshotPath,
        mem_file_path: memoryPath,
        snapshot_type: 'Full'
      });

      // Kill Firecracker process
      vm.proc.kill();

      // Update database
      await db.vms.updateStatus(vmId, 'hibernated');

      logger.info('VM hibernated successfully', { vmId });
    } catch (error) {
      logger.error('Hibernation failed', { vmId, error: error.message });
      throw error;
    }
  }

  /**
   * Resume VM from snapshot
   */
  async resumeVM(vmId) {
    try {
      logger.info('Resuming VM', { vmId });

      const vmData = await db.vms.findById(vmId);
      if (!vmData) {
        throw new Error('VM not found in database');
      }

      const configPath = path.join(config.firecracker.usersDir, vmId, 'vm-config.json');
      const socketPath = path.join(config.firecracker.socketsDir, `${vmId}.sock`);

      // Get Decodo config from user
      const userData = await db.users.findById(vmData.user_id);
      const decodoPort = userData?.decodo_proxy_port;
      const decodoIP = userData?.decodo_fixed_ip;

      // Start Firecracker with snapshot
      await this.startFirecracker(vmId, configPath, socketPath, decodoPort, decodoIP);

      // Update database
      await db.vms.updateStatus(vmId, 'running');

      logger.info('VM resumed successfully', { vmId });
    } catch (error) {
      logger.error('Resume failed', { vmId, error: error.message });
      throw error;
    }
  }

  /**
   * Destroy VM and cleanup resources
   */
  async destroyVM(vmId, removeFromDB = true) {
    try {
      logger.info('Destroying VM', { vmId });

      // Kill Firecracker if running
      const vm = this.activeVMs.get(vmId);
      if (vm) {
        try {
          vm.proc.kill();
          this.activeVMs.delete(vmId);
        } catch (err) {
          logger.warn('Failed to kill Firecracker process', { vmId, error: err.message });
        }
      }

      // Cleanup resources
      await this.cleanupVM(vmId, removeFromDB);

      logger.info('VM destroyed successfully', { vmId });
    } catch (error) {
      logger.error('VM destruction failed', { vmId, error: error.message });
      throw error;
    }
  }

  /**
   * Cleanup VM resources
   */
  async cleanupVM(vmId, removeFromDB = true) {
    // Remove TAP device
    await this.removeTAPDevice(vmId);

    // Release IP
    this.releaseIP(vmId);

    // Remove VM directory
    const vmDir = path.join(config.firecracker.usersDir, vmId);
    try {
      await fs.rm(vmDir, { recursive: true, force: true });
    } catch (err) {
      logger.warn('Failed to remove VM directory', { vmId, error: err.message });
    }

    // Remove socket
    const socketPath = path.join(config.firecracker.socketsDir, `${vmId}.sock`);
    try {
      await fs.unlink(socketPath);
    } catch (err) {
      // Socket may not exist, ignore
    }

    // Update database
    if (removeFromDB) {
      await db.vms.update(vmId, {
        status: 'destroyed',
        destroyed_at: new Date().toISOString()
      });
    }
  }

  /**
   * Load snapshot via Firecracker API
   */
  async loadSnapshot(socketPath, snapshotPath, memoryPath) {
    const http = require('http');

    return new Promise((resolve, reject) => {
      const payload = JSON.stringify({
        snapshot_path: snapshotPath,
        mem_backend: {
          backend_path: memoryPath,
          backend_type: 'File'
        },
        enable_diff_snapshots: false,
        resume_vm: true
      });

      const options = {
        socketPath,
        path: '/snapshot/load',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 204 || res.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`Firecracker API error: ${res.statusCode} ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  /**
   * Configure network interface via Firecracker API
   * CRITICAL: Must be called BEFORE loading snapshot
   * Snapshots don't preserve network configuration
   */
  async configureNetworkInterface(socketPath, networkInterface) {
    const http = require('http');

    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(networkInterface);

      const options = {
        socketPath,
        path: `/network-interfaces/${networkInterface.iface_id}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 204 || res.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`Firecracker network config error: ${res.statusCode} ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  /**
   * Send command to Firecracker via API socket
   */
  async sendFirecrackerCommand(socketPath, command) {
    const http = require('http');

    return new Promise((resolve, reject) => {
      const options = {
        socketPath,
        path: '/actions',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 204 || res.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`Firecracker API error: ${res.statusCode} ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(JSON.stringify(command));
      req.end();
    });
  }

  /**
   * Get VM statistics
   */
  async getVMStats(vmId) {
    const vmData = await db.vms.findById(vmId);
    if (!vmData) {
      throw new Error('VM not found');
    }

    return {
      vmId,
      status: vmData.status,
      vmType: vmData.vm_type,
      ipAddress: vmData.ip_address,
      vcpu: vmData.vcpu_count,
      memoryMB: vmData.memory_mb,
      cpuUsage: vmData.cpu_usage_percent,
      memoryUsage: vmData.memory_usage_mb,
      lastHeartbeat: vmData.last_heartbeat,
      createdAt: vmData.created_at
    };
  }

  /**
   * List all VMs with optional filters
   */
  async listVMs(filters = {}) {
    return await db.vms.list(filters);
  }

  /**
   * Update VM heartbeat
   */
  async updateHeartbeat(vmId, cpuUsage, memoryUsage) {
    await db.vms.updateHeartbeat(vmId, cpuUsage, memoryUsage);
  }

  /**
   * Associate session with VM
   */
  async associateSessionWithVM(sessionId, vmId, vmIP) {
    const sessionInfo = {
      vmId,
      vmIP,
      created: Date.now(),
      lastHeartbeat: Date.now()
    };

    // Store in memory
    this.sessionVMMap.set(sessionId, sessionInfo);

    // Store in database
    try {
      await db.client
        .from('auth_sessions')
        .update({
          browser_vm_id: vmId,
          vm_ip: vmIP,
          last_heartbeat: new Date().toISOString()
        })
        .eq('session_id', sessionId);

      logger.info('[SESSION-MAPPING] Session associated with VM', {
        sessionId,
        vmId,
        vmIP
      });
    } catch (error) {
      logger.error('[SESSION-MAPPING] Failed to store session in database', {
        sessionId,
        vmId,
        error: error.message
      });
      // Keep in-memory mapping even if DB fails
    }

    return sessionInfo;
  }

  /**
   * Get VM info for session
   */
  async getVMForSession(sessionId) {
    // Try in-memory first
    let vmInfo = this.sessionVMMap.get(sessionId);

    if (vmInfo) {
      logger.debug('[SESSION-MAPPING] Session found in memory', { sessionId, vmId: vmInfo.vmId });
      return vmInfo;
    }

    // Fallback to database
    try {
      const { data, error } = await db.client
        .from('auth_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (error) {
        logger.error('[SESSION-MAPPING] Database query error', {
          sessionId,
          error: error.message
        });
        return null;
      }

      if (data) {
        vmInfo = {
          vmId: data.browser_vm_id || data.vm_id,
          vmIP: data.vm_ip,
          created: new Date(data.created_at || data.started_at).getTime(),
          lastHeartbeat: new Date(data.last_heartbeat || data.started_at).getTime()
        };

        // Update in-memory cache
        this.sessionVMMap.set(sessionId, vmInfo);

        logger.info('[SESSION-MAPPING] Session found in database, cached', {
          sessionId,
          vmId: vmInfo.vmId
        });

        return vmInfo;
      }
    } catch (error) {
      logger.error('[SESSION-MAPPING] Failed to query database for session', {
        sessionId,
        error: error.message,
        stack: error.stack
      });
    }

    logger.warn('[SESSION-MAPPING] Session not found', { sessionId });
    return null;
  }

  /**
   * Update session heartbeat
   */
  async updateSessionHeartbeat(sessionId) {
    const vmInfo = this.sessionVMMap.get(sessionId);
    if (vmInfo) {
      vmInfo.lastHeartbeat = Date.now();

      // Update database
      try {
        await db.client
          .from('auth_sessions')
          .update({ last_heartbeat: new Date().toISOString() })
          .eq('session_id', sessionId);

        logger.debug('[SESSION-MAPPING] Heartbeat updated', { sessionId });
      } catch (error) {
        logger.warn('[SESSION-MAPPING] Failed to update heartbeat in database', {
          sessionId,
          error: error.message
        });
      }
    }
  }

  /**
   * Remove session mapping
   */
  async removeSessionMapping(sessionId) {
    this.sessionVMMap.delete(sessionId);

    try {
      await db.client
        .from('auth_sessions')
        .update({ status: 'cancelled' })
        .eq('session_id', sessionId);

      logger.info('[SESSION-MAPPING] Session mapping removed', { sessionId });
    } catch (error) {
      logger.warn('[SESSION-MAPPING] Failed to update session status in database', {
        sessionId,
        error: error.message
      });
    }
  }

  /**
   * Check if session has active VM
   */
  hasActiveSession(vmId) {
    for (const [sessionId, vmInfo] of this.sessionVMMap.entries()) {
      if (vmInfo.vmId === vmId) {
        return true;
      }
    }
    return false;
  }

  /**
   * Schedule VM cleanup in database (survives restarts)
   */
  async scheduleVMCleanup(vmId, sessionId, delayMs) {
    const cleanupAt = new Date(Date.now() + delayMs);

    const { error } = await db.supabase.from('vm_cleanup_tasks').insert({
      vm_id: vmId,
      session_id: sessionId,
      cleanup_at: cleanupAt.toISOString(),
      status: 'pending'
    });

    if (error) {
      logger.error('Failed to schedule VM cleanup in database', {
        vmId,
        sessionId,
        error: error.message
      });
      throw error;
    }

    logger.info('Scheduled VM cleanup in database', {
      vmId,
      sessionId,
      cleanupAt: cleanupAt.toISOString()
    });
  }

  /**
   * Process pending VM cleanup tasks (called on startup and periodically)
   */
  async processCleanupTasks() {
    const now = new Date().toISOString();

    // Find all pending cleanup tasks that are due
    const { data: tasks, error } = await db.supabase
      .from('vm_cleanup_tasks')
      .select('*')
      .eq('status', 'pending')
      .lte('cleanup_at', now)
      .order('cleanup_at', { ascending: true });

    if (error) {
      logger.error('Failed to fetch cleanup tasks', { error: error.message });
      return;
    }

    if (!tasks || tasks.length === 0) {
      return;
    }

    logger.info(`Processing ${tasks.length} pending VM cleanup tasks`);

    for (const task of tasks) {
      try {
        // Mark as processing
        await db.supabase
          .from('vm_cleanup_tasks')
          .update({ status: 'processing' })
          .eq('id', task.id);

        // Destroy the VM
        await this.destroyVM(task.vm_id);

        // Remove session mapping
        if (task.session_id) {
          await this.removeSessionMapping(task.session_id);
        }

        // Mark as completed
        await db.supabase
          .from('vm_cleanup_tasks')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', task.id);

        logger.info('Completed cleanup task', {
          taskId: task.id,
          vmId: task.vm_id,
          sessionId: task.session_id
        });
      } catch (err) {
        logger.error('Failed to process cleanup task', {
          taskId: task.id,
          vmId: task.vm_id,
          error: err.message
        });

        // Mark as failed
        await db.supabase
          .from('vm_cleanup_tasks')
          .update({
            status: 'failed',
            error_message: err.message
          })
          .eq('id', task.id);
      }
    }
  }

  /**
   * Start periodic cleanup task processor
   */
  startCleanupTaskProcessor() {
    // Process cleanup tasks every 5 seconds
    setInterval(() => {
      this.processCleanupTasks().catch(err =>
        logger.error('Cleanup task processor error', { error: err.message })
      );
    }, 5000);

    // Also process on startup to handle tasks from before restart
    this.processCleanupTasks().catch(err =>
      logger.error('Startup cleanup task processing failed', { error: err.message })
    );

    logger.info('Started VM cleanup task processor (5s interval)');
  }
}

// Singleton instance
const vmManager = new VMManager();

module.exports = {
  VMManager,
  vmManager
};
