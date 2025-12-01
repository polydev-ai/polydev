/**
 * VM Process Monitor
 * Periodically checks Firecracker processes and updates database when VMs exit
 */

const { db } = require('../db/supabase');
const logger = require('../utils/logger').module('vm-process-monitor');
const { execSync } = require('child_process');
const fs = require('fs');
const config = require('../config');

class VMProcessMonitor {
  constructor() {
    this.monitorInterval = null;
    this.checkIntervalMs = 30000; // Check every 30 seconds
    this.isRunning = false;
  }

  /**
   * Start the VM process monitoring daemon
   */
  start() {
    if (this.isRunning) {
      logger.warn('VM process monitor already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting VM process monitor', {
      checkIntervalMs: this.checkIntervalMs
    });

    // Run initial check immediately
    this.checkVMProcesses().catch(err =>
      logger.error('Initial VM process check failed', { error: err.message })
    );

    // Then check periodically
    this.monitorInterval = setInterval(() => {
      this.checkVMProcesses().catch(err =>
        logger.error('VM process check failed', { error: err.message })
      );
    }, this.checkIntervalMs);
  }

  /**
   * Stop the VM process monitoring daemon
   */
  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.isRunning = false;
    logger.info('VM process monitor stopped');
  }

  /**
   * Check all VMs that database thinks are running
   * and verify their Firecracker processes are actually running
   */
  async checkVMProcesses() {
    try {
      // Get all VMs that database thinks are running
      const { data: runningVMs, error } = await db.supabase
        .from('vms')
        .select('vm_id, vm_type, user_id, created_at, status')
        .eq('status', 'running')
        .is('destroyed_at', null);

      if (error) {
        logger.error('Failed to query running VMs', { error: error.message });
        return;
      }

      if (!runningVMs || runningVMs.length === 0) {
        logger.debug('No running VMs in database');
        return;
      }

      logger.debug('Checking VM processes', { totalVMs: runningVMs.length });

      let checkedCount = 0;
      let deadCount = 0;
      let errorCount = 0;

      for (const vm of runningVMs) {
        try {
          const isRunning = await this.checkVMProcessRunning(vm.vm_id);
          checkedCount++;

          if (!isRunning) {
            // VM process is not running - update database
            deadCount++;
            await this.handleDeadVM(vm);
          }
        } catch (error) {
          errorCount++;
          logger.error('Error checking VM process', {
            vmId: vm.vm_id,
            error: error.message
          });
        }
      }

      if (deadCount > 0 || errorCount > 0) {
        logger.info('VM process check completed', {
          total: runningVMs.length,
          checked: checkedCount,
          dead: deadCount,
          errors: errorCount
        });
      }
    } catch (error) {
      logger.error('VM process check failed', { error: error.message });
    }
  }

  /**
   * Check if a specific VM's Firecracker process is running
   * @param {string} vmId - VM ID to check
   * @returns {Promise<boolean>} - True if process is running
   */
  async checkVMProcessRunning(vmId) {
    try {
      // Check if Firecracker process exists for this VM
      const result = execSync(
        `ps aux | grep ${vmId} | grep firecracker | grep -v grep || true`,
        {
          encoding: 'utf8',
          stdio: 'pipe',
          timeout: 5000
        }
      ).trim();

      return result.length > 0;
    } catch (error) {
      logger.error('Error checking process', {
        vmId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Handle a VM that has stopped running
   * Update database status and clean up resources
   */
  async handleDeadVM(vm) {
    try {
      logger.warn('VM process has exited', {
        vmId: vm.vm_id,
        vmType: vm.vm_type,
        userId: vm.user_id,
        wasRunningFor: Date.now() - new Date(vm.created_at).getTime()
      });

      // Check if VM directory still exists
      const vmDir = `${config.firecracker.usersDir}/${vm.vm_id}`;
      const dirExists = fs.existsSync(vmDir);

      // Update VM status in database
      await db.supabase
        .from('vms')
        .update({
          status: 'stopped',
          destroyed_at: new Date().toISOString()
        })
        .eq('vm_id', vm.vm_id);

      // Update user's VM reference if this was their active VM
      if (vm.user_id) {
        const { data: user } = await db.supabase
          .from('users')
          .select('vm_id')
          .eq('user_id', vm.user_id)
          .single();

        if (user && user.vm_id === vm.vm_id) {
          await db.supabase
            .from('users')
            .update({
              vm_id: null,
              vm_ip: null,
              status: 'vm_stopped'
            })
            .eq('user_id', vm.user_id);
        }
      }

      logger.info('Updated database for dead VM', {
        vmId: vm.vm_id,
        dirExists,
        newStatus: 'stopped'
      });

      // Optionally clean up VM directory if it exists
      // Uncomment if you want automatic cleanup:
      // if (dirExists) {
      //   execSync(`rm -rf ${vmDir}`, { stdio: 'pipe' });
      //   logger.info('Cleaned up VM directory', { vmId: vm.vm_id });
      // }
    } catch (error) {
      logger.error('Failed to handle dead VM', {
        vmId: vm.vm_id,
        error: error.message
      });
    }
  }

  /**
   * Check a specific VM (useful for manual checks)
   */
  async checkSpecificVM(vmId) {
    try {
      const { data: vm, error } = await db.supabase
        .from('vms')
        .select('*')
        .eq('vm_id', vmId)
        .single();

      if (error || !vm) {
        return {
          found: false,
          message: 'VM not found in database'
        };
      }

      const isRunning = await this.checkVMProcessRunning(vmId);

      return {
        found: true,
        vm,
        processRunning: isRunning,
        dbStatus: vm.status,
        statusMismatch: vm.status === 'running' && !isRunning
      };
    } catch (error) {
      logger.error('Check specific VM failed', {
        vmId,
        error: error.message
      });
      throw error;
    }
  }
}

// Singleton instance
const vmProcessMonitor = new VMProcessMonitor();

module.exports = {
  VMProcessMonitor,
  vmProcessMonitor
};
