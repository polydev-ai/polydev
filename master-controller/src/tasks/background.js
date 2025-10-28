/**
 * Background Tasks
 * Automated VM lifecycle management, cleanup, and monitoring
 */

const cron = require('node-cron');
const { db } = require('../db/supabase');
const { vmManager } = require('../services/vm-manager');
const { cliStreamingService } = require('../services/cli-streaming');
const config = require('../config');
const logger = require('../utils/logger').module('background');

let tasks = [];

/**
 * Hibernate idle VMs
 * Runs every 5 minutes, hibernates VMs idle > 30 minutes
 */
function scheduleVMHibernation() {
  const task = cron.schedule('*/5 * * * *', async () => {
    try {
      logger.info('Running VM hibernation check...');

      const idleThreshold = new Date(Date.now() - config.performance.vmIdleTimeout);

      // Find users with active VMs but no recent activity
      const { data: idleUsers } = await db.supabase
        .from('users')
        .select('user_id, email, last_active_at, vm_id')
        .eq('status', 'active')
        .not('vm_id', 'is', null)
        .lt('last_active_at', idleThreshold.toISOString());

      let hibernated = 0;

      for (const user of idleUsers || []) {
        try {
          // Check if VM is running
          const vm = await db.vms.findById(user.vm_id);
          if (vm && vm.status === 'running') {
            await cliStreamingService.hibernateIdleVM(user.user_id);
            hibernated++;
          }
        } catch (err) {
          logger.error('Failed to hibernate VM', {
            userId: user.user_id,
            error: err.message
          });
        }
      }

      logger.info('VM hibernation check complete', {
        idleUsers: idleUsers?.length || 0,
        hibernated
      });
    } catch (error) {
      logger.error('VM hibernation task failed', { error: error.message });
    }
  });

  tasks.push(task);
  logger.info('VM hibernation task scheduled (every 5 minutes)');
}

/**
 * Destroy inactive VMs
 * Runs daily, destroys VMs inactive > 2 weeks
 */
function scheduleVMDestruction() {
  const task = cron.schedule('0 2 * * *', async () => {
    try {
      logger.info('Running VM destruction check...');

      const destroyThreshold = new Date(Date.now() - config.performance.vmDestroyTimeout);

      const { data: inactiveUsers } = await db.supabase
        .from('users')
        .select('user_id, email, last_active_at, vm_id')
        .not('vm_id', 'is', null)
        .lt('last_active_at', destroyThreshold.toISOString());

      let destroyed = 0;

      for (const user of inactiveUsers || []) {
        try {
          await cliStreamingService.destroyInactiveVM(user.user_id);
          destroyed++;
        } catch (err) {
          logger.error('Failed to destroy VM', {
            userId: user.user_id,
            error: err.message
          });
        }
      }

      logger.info('VM destruction check complete', {
        inactiveUsers: inactiveUsers?.length || 0,
        destroyed
      });
    } catch (error) {
      logger.error('VM destruction task failed', { error: error.message });
    }
  });

  tasks.push(task);
  logger.info('VM destruction task scheduled (daily at 2 AM)');
}

/**
 * Collect system metrics
 * Runs every 10 minutes
 */
function scheduleMetricsCollection() {
  const task = cron.schedule('*/10 * * * *', async () => {
    try {
      logger.debug('Collecting system metrics...');

      const vmStats = await db.vms.getStatistics();

      const { data: userCount } = await db.supabase
        .from('users')
        .select('count');

      const { data: activePrompts } = await db.supabase
        .from('prompts')
        .select('count')
        .eq('status', 'running');

      // Get IP pool stats from vmManager
      const ipPoolSize = vmManager.ipPool.size;
      const usedIPs = vmManager.usedIPs.size;

      // Record metrics
      await db.metrics.record({
        total_users: userCount?.[0]?.count || 0,
        total_vms: vmStats.total_vms || 0,
        running_vms: vmStats.running_vms || 0,
        hibernated_vms: vmStats.hibernated_vms || 0,
        active_prompts: activePrompts?.[0]?.count || 0,
        available_ips: ipPoolSize,
        used_ips: usedIPs,
        recorded_at: new Date().toISOString()
      });

      logger.debug('System metrics collected', {
        totalVMs: vmStats.total_vms,
        runningVMs: vmStats.running_vms
      });
    } catch (error) {
      logger.error('Metrics collection task failed', { error: error.message });
    }
  });

  tasks.push(task);
  logger.info('Metrics collection task scheduled (every 10 minutes)');
}

/**
 * Cleanup stale auth sessions
 * Runs hourly
 */
function scheduleAuthSessionCleanup() {
  const task = cron.schedule('0 * * * *', async () => {
    try {
      logger.info('Running auth session cleanup...');

      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      const { data: staleSessions } = await db.supabase
        .from('auth_sessions')
        .select('session_id, user_id, vm_id')
        .in('status', ['started', 'vm_created'])
        .lt('created_at', twoHoursAgo.toISOString());

      let cleaned = 0;

      for (const session of staleSessions || []) {
        try {
          // Destroy browser VM if exists
          if (session.vm_id) {
            await vmManager.destroyVM(session.vm_id).catch(err =>
              logger.warn('Failed to destroy stale browser VM', {
                vmId: session.vm_id,
                error: err.message
              })
            );
          }

          // Update session status
          await db.authSessions.updateStatus(session.session_id, 'timeout');
          cleaned++;
        } catch (err) {
          logger.error('Failed to cleanup auth session', {
            sessionId: session.session_id,
            error: err.message
          });
        }
      }

      logger.info('Auth session cleanup complete', {
        staleSessions: staleSessions?.length || 0,
        cleaned
      });
    } catch (error) {
      logger.error('Auth session cleanup task failed', { error: error.message });
    }
  });

  tasks.push(task);
  logger.info('Auth session cleanup task scheduled (hourly)');
}

/**
 * Validate credentials
 * Runs every 6 hours
 */
function scheduleCredentialValidation() {
  const task = cron.schedule('0 */6 * * *', async () => {
    try {
      logger.info('Running credential validation...');

      const { data: credentials } = await db.supabase
        .from('provider_credentials')
        .select('credential_id, user_id, provider, is_valid, last_verified');

      let validated = 0;
      let invalid = 0;

      for (const cred of credentials || []) {
        try {
          const { browserVMAuth } = require('../services/browser-vm-auth');
          const result = await browserVMAuth.validateCredentials(
            cred.user_id,
            cred.provider
          );

          if (result.valid) {
            validated++;
          } else {
            invalid++;
          }
        } catch (err) {
          logger.error('Credential validation failed', {
            credentialId: cred.credential_id,
            error: err.message
          });
        }
      }

      logger.info('Credential validation complete', {
        total: credentials?.length || 0,
        validated,
        invalid
      });
    } catch (error) {
      logger.error('Credential validation task failed', { error: error.message });
    }
  });

  tasks.push(task);
  logger.info('Credential validation task scheduled (every 6 hours)');
}

/**
 * Monitor VM health
 * Runs every minute, checks for crashed VMs
 */
function scheduleVMHealthCheck() {
  const task = cron.schedule('* * * * *', async () => {
    try {
      logger.debug('Running VM health check...');

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      // Find VMs marked as running but no heartbeat
      const { data: staleVMs } = await db.supabase
        .from('vms')
        .select('vm_id, user_id, last_heartbeat')
        .eq('status', 'running')
        .lt('last_heartbeat', fiveMinutesAgo.toISOString());

      let crashed = 0;

      for (const vm of staleVMs || []) {
        try {
          // Check if process still exists
          const vmData = vmManager.activeVMs.get(vm.vm_id);

          if (!vmData || !vmData.proc || vmData.proc.killed) {
            // Before marking as failed, check if VM has active sessions
            const hasActiveSessions = vmManager.hasActiveSession(vm.vm_id);

            if (hasActiveSessions) {
              logger.warn('VM appears crashed but has active sessions, keeping alive', {
                vmId: vm.vm_id,
                userId: vm.user_id
              });
              continue;
            }

            // VM crashed and no active sessions, mark as failed
            await db.vms.updateStatus(vm.vm_id, 'failed');
            vmManager.activeVMs.delete(vm.vm_id);

            // Notify user (via WebSocket if connected)
            if (global.broadcastToChannel) {
              global.broadcastToChannel(`user:${vm.user_id}`, {
                type: 'vm_crashed',
                vmId: vm.vm_id,
                timestamp: new Date().toISOString()
              });
            }

            crashed++;
            logger.warn('VM crash detected', { vmId: vm.vm_id, userId: vm.user_id });
          }
        } catch (err) {
          logger.error('VM health check failed', {
            vmId: vm.vm_id,
            error: err.message
          });
        }
      }

      if (crashed > 0) {
        logger.info('VM health check complete', {
          staleVMs: staleVMs?.length || 0,
          crashed
        });
      }
    } catch (error) {
      logger.error('VM health check task failed', { error: error.message });
    }
  });

  tasks.push(task);
  logger.info('VM health check task scheduled (every minute)');
}

/**
 * Start all background tasks
 */
async function start() {
  logger.info('Starting background tasks...');

  scheduleVMHibernation();
  scheduleVMDestruction();
  scheduleMetricsCollection();
  scheduleAuthSessionCleanup();
  scheduleCredentialValidation();
  scheduleVMHealthCheck();

  logger.info('All background tasks started', { totalTasks: tasks.length });
}

/**
 * Stop all background tasks
 */
function stop() {
  logger.info('Stopping background tasks...');

  for (const task of tasks) {
    task.stop();
  }

  tasks = [];
  logger.info('All background tasks stopped');
}

module.exports = {
  start,
  stop
};
