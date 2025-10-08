/**
 * VM Manager Service
 * Manages Firecracker VM lifecycle including creation, hibernation, and destruction
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const config = require('../config');
const { db } = require('../db/supabase');
const logger = require('../utils/logger').module('vm-manager');

class VMManager {
  constructor() {
    this.activeVMs = new Map(); // vmId -> VM instance
    this.ipPool = new Set(); // Available IPs from pool
    this.usedIPs = new Map(); // vmId -> IP
    this.tapDevices = new Map(); // vmId -> tap device name

    this.initializeIPPool();
  }

  /**
   * Initialize IP pool from config
   */
  initializeIPPool() {
    const [start, end] = this.parseIPRange(
      config.network.ipPoolStart,
      config.network.ipPoolEnd
    );

    for (let i = start; i <= end; i++) {
      const ip = this.intToIP(i);
      this.ipPool.add(ip);
    }

    logger.info('IP pool initialized', {
      poolSize: this.ipPool.size,
      range: `${config.network.ipPoolStart} - ${config.network.ipPoolEnd}`
    });
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
   */
  allocateIP(vmId) {
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

      // Add to bridge
      execSync(`ip link set ${tapName} master ${config.network.bridgeDevice}`, { stdio: 'pipe' });

      // Bring up
      execSync(`ip link set ${tapName} up`, { stdio: 'pipe' });

      this.tapDevices.set(vmId, tapName);
      logger.info('TAP device created', { vmId, tapName, ipAddress });

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
  async createVMConfig(vmId, vmType, tapDevice, ipAddress) {
    const vcpu = vmType === 'browser' ? config.vm.browser.vcpu : config.vm.cli.vcpu;
    const memory = vmType === 'browser' ? config.vm.browser.memoryMB : config.vm.cli.memoryMB;

    const vmConfig = {
      'boot-source': {
        kernel_image_path: config.firecracker.goldenKernel,
        boot_args: `console=ttyS0 reboot=k panic=1 pci=off ip=${ipAddress}::${config.network.bridgeIP}:255.255.255.0::eth0:off`
      },
      'drives': [
        {
          drive_id: 'rootfs',
          path_on_host: path.join(config.firecracker.usersDir, vmId, 'rootfs.ext4'),
          is_root_device: true,
          is_read_only: false
        }
      ],
      'network-interfaces': [
        {
          iface_id: 'eth0',
          guest_mac: this.generateMAC(vmId),
          host_dev_name: tapDevice
        }
      ],
      'machine-config': {
        vcpu_count: Math.floor(vcpu),
        mem_size_mib: memory,
        ht_enabled: false
      }
    };

    const configPath = path.join(config.firecracker.usersDir, vmId, 'vm-config.json');
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
  async cloneGoldenSnapshot(vmId) {
    const vmDir = path.join(config.firecracker.usersDir, vmId);
    await fs.mkdir(vmDir, { recursive: true });

    try {
      // CoW copy of rootfs
      const rootfsSrc = config.firecracker.goldenRootfs;
      const rootfsDst = path.join(vmDir, 'rootfs.ext4');
      execSync(`cp --reflink=auto ${rootfsSrc} ${rootfsDst}`, { stdio: 'pipe' });

      // Copy snapshot and memory (for resume capability)
      if (config.firecracker.goldenSnapshot && config.firecracker.goldenMemory) {
        execSync(`cp ${config.firecracker.goldenSnapshot} ${vmDir}/snapshot.snap`, { stdio: 'pipe' });
        execSync(`cp ${config.firecracker.goldenMemory} ${vmDir}/memory.mem`, { stdio: 'pipe' });
      }

      logger.info('Golden snapshot cloned', { vmId, vmDir });
    } catch (error) {
      logger.error('Failed to clone golden snapshot', { vmId, error: error.message });
      throw new Error(`Snapshot cloning failed: ${error.message}`);
    }
  }

  /**
   * Create and start a new VM
   */
  async createVM(userId, vmType, decodoPort = null, decodoIP = null) {
    const vmId = `vm-${crypto.randomUUID()}`;

    try {
      logger.info('Creating VM', { vmId, userId, vmType });

      // Allocate resources
      const ipAddress = this.allocateIP(vmId);
      const tapDevice = await this.createTAPDevice(vmId, ipAddress);

      // Clone golden snapshot
      await this.cloneGoldenSnapshot(vmId);

      // Create VM config
      const configPath = await this.createVMConfig(vmId, vmType, tapDevice, ipAddress);

      // Create database record
      const vcpu = vmType === 'browser' ? config.vm.browser.vcpu : config.vm.cli.vcpu;
      const memory = vmType === 'browser' ? config.vm.browser.memoryMB : config.vm.cli.memoryMB;

      await db.vms.create({
        vm_id: vmId,
        user_id: userId,
        vm_type: vmType,
        vcpu_count: vcpu,
        memory_mb: memory,
        ip_address: ipAddress,
        tap_device: tapDevice,
        status: 'created'
      });

      // Start Firecracker
      const socketPath = path.join(config.firecracker.socketsDir, `${vmId}.sock`);
      await this.startFirecracker(vmId, configPath, socketPath, decodoPort, decodoIP);

      logger.info('VM created successfully', { vmId, ipAddress, vmType });

      return {
        vmId,
        ipAddress,
        tapDevice,
        socketPath,
        status: 'running'
      };
    } catch (error) {
      logger.error('VM creation failed', { vmId, userId, error: error.message });

      // Cleanup on failure
      await this.cleanupVM(vmId, false);

      throw error;
    }
  }

  /**
   * Start Firecracker process
   */
  async startFirecracker(vmId, configPath, socketPath, decodoPort, decodoIP) {
    return new Promise((resolve, reject) => {
      const vmDir = path.join(config.firecracker.usersDir, vmId);
      const logPath = path.join(vmDir, 'firecracker.log');

      // Ensure socket directory exists
      const socketDir = path.dirname(socketPath);
      execSync(`mkdir -p ${socketDir}`, { stdio: 'pipe' });

      // Build Firecracker command
      const args = [
        '--api-sock', socketPath,
        '--config-file', configPath,
        '--log-path', logPath,
        '--level', 'Info',
        '--show-level',
        '--show-log-origin'
      ];

      // Add snapshot resume if available
      const snapshotPath = path.join(vmDir, 'snapshot.snap');
      const memoryPath = path.join(vmDir, 'memory.mem');
      if (fs.existsSync(snapshotPath) && fs.existsSync(memoryPath)) {
        args.push('--snapshot-path', snapshotPath);
        args.push('--mem-path', memoryPath);
      }

      // Build environment with Decodo proxy if provided
      const env = { ...process.env };
      if (decodoPort && decodoIP) {
        const proxyURL = `http://${config.decodo.user}:${config.decodo.password}@${config.decodo.host}:${decodoPort}`;
        env.HTTP_PROXY = proxyURL;
        env.HTTPS_PROXY = proxyURL;
        env.DECODO_FIXED_IP = decodoIP;
      }

      // Spawn Firecracker
      const proc = spawn(config.firecracker.binary, args, {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env
      });

      proc.unref();

      let startupOutput = '';
      const startupTimeout = setTimeout(() => {
        proc.kill();
        reject(new Error('Firecracker startup timeout'));
      }, 30000); // 30 second timeout

      proc.stdout.on('data', (data) => {
        startupOutput += data.toString();
        // Look for successful boot indicators
        if (startupOutput.includes('Guest started')) {
          clearTimeout(startupTimeout);
          this.activeVMs.set(vmId, { proc, socketPath });

          // Update database with PID
          db.vms.update(vmId, {
            firecracker_pid: proc.pid,
            socket_path: socketPath,
            status: 'running'
          }).catch(err => logger.error('Failed to update VM status', { vmId, error: err.message }));

          logger.info('Firecracker started', { vmId, pid: proc.pid });
          resolve({ pid: proc.pid, socketPath });
        }
      });

      proc.stderr.on('data', (data) => {
        logger.debug('Firecracker stderr', { vmId, output: data.toString() });
      });

      proc.on('error', (error) => {
        clearTimeout(startupTimeout);
        logger.error('Firecracker process error', { vmId, error: error.message });
        reject(error);
      });

      proc.on('exit', (code, signal) => {
        clearTimeout(startupTimeout);
        this.activeVMs.delete(vmId);
        logger.info('Firecracker exited', { vmId, code, signal });

        if (code !== 0 && code !== null) {
          reject(new Error(`Firecracker exited with code ${code}`));
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
}

// Singleton instance
const vmManager = new VMManager();

module.exports = {
  VMManager,
  vmManager
};
