/**
 * CLI Streaming Service
 * Manages prompt execution on CLI VMs and streams responses back
 */

const { vmManager } = require('./vm-manager');
const { db } = require('../db/supabase');
const logger = require('../utils/logger').module('cli-streaming');

class CLIStreamingService {
  constructor() {
    this.activePrompts = new Map(); // promptId -> execution data
  }

  /**
   * Execute a prompt on user's CLI VM
   * Streams response back via callback
   */
  async executePrompt(userId, provider, promptText, onChunk, onComplete, onError) {
    let promptId;
    let startTime = Date.now();

    try {
      logger.info('Executing prompt', { userId, provider, promptLength: promptText.length });

      // Get user's CLI VM
      let cliVM = await db.vms.findByUserId(userId);

      // Create CLI VM if doesn't exist
      if (!cliVM) {
        cliVM = await this.ensureCLIVM(userId);
      }

      // Resume VM if hibernated
      if (cliVM.status === 'hibernated') {
        await vmManager.resumeVM(cliVM.vm_id);
        cliVM = await db.vms.findById(cliVM.vm_id); // Refresh
      }

      // Create prompt record
      const promptRecord = await db.prompts.create(
        userId,
        cliVM.vm_id,
        provider,
        promptText
      );
      promptId = promptRecord.prompt_id;

      // Store active prompt
      this.activePrompts.set(promptId, {
        userId,
        provider,
        vmId: cliVM.vm_id,
        vmIP: cliVM.ip_address,
        startedAt: new Date(),
        status: 'running'
      });

      // Update prompt status
      await db.prompts.update(promptId, {
        status: 'running',
        started_at: new Date().toISOString()
      });

      // Stream prompt to CLI VM
      await this.streamPromptToVM(
        cliVM.ip_address,
        provider,
        promptText,
        promptId,
        onChunk,
        async (result) => {
          const duration = Date.now() - startTime;

          // Complete prompt record
          await db.prompts.complete(
            promptId,
            result.responseText,
            result.exitCode,
            duration
          );

          // Update user last active
          await db.users.updateLastActive(userId);

          // Cleanup
          this.activePrompts.delete(promptId);

          logger.info('Prompt completed', {
            userId,
            provider,
            promptId,
            durationMs: duration,
            exitCode: result.exitCode
          });

          onComplete(result);
        },
        async (error) => {
          const duration = Date.now() - startTime;

          // Mark prompt as failed
          await db.prompts.fail(promptId, error.message);

          // Cleanup
          this.activePrompts.delete(promptId);

          logger.error('Prompt failed', {
            userId,
            provider,
            promptId,
            error: error.message,
            durationMs: duration
          });

          onError(error);
        }
      );
    } catch (error) {
      logger.error('Execute prompt error', {
        userId,
        provider,
        error: error.message
      });

      if (promptId) {
        await db.prompts.fail(promptId, error.message).catch(err =>
          logger.warn('Failed to update prompt status', { error: err.message })
        );
        this.activePrompts.delete(promptId);
      }

      onError(error);
    }
  }

  /**
   * Ensure user has a CLI VM
   */
  async ensureCLIVM(userId) {
    logger.info('Creating CLI VM for user', { userId });

    // Get user's Decodo proxy configuration
    const user = await db.users.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Allocate Decodo port if not assigned
    let decodoPort = user.decodo_proxy_port;
    let decodoIP = user.decodo_fixed_ip;

    if (!decodoPort) {
      decodoPort = await this.allocateDecodoPort(userId);
      decodoIP = await this.getDecodoFixedIP(decodoPort);

      await db.users.assignDecodoPort(userId, decodoPort, decodoIP);
    }

    // Create CLI VM
    const vmResult = await vmManager.createVM(userId, 'cli', decodoPort, decodoIP);

    // Assign VM to user
    await db.users.assignVM(userId, vmResult.vmId, vmResult.ipAddress);

    // Wait for VM to be ready
    await this.waitForVMReady(vmResult.ipAddress);

    return await db.vms.findById(vmResult.vmId);
  }

  /**
   * Allocate next available Decodo port
   */
  async allocateDecodoPort(userId) {
    // Call database function to get next port
    const { data, error } = await db.supabase.rpc('get_next_decodo_port');
    if (error) throw error;

    const nextPort = data;

    logger.info('Allocated Decodo port', { userId, port: nextPort });
    return nextPort;
  }

  /**
   * Get fixed IP for Decodo port by testing
   */
  async getDecodoFixedIP(port) {
    const config = require('../config');

    // Make test request through proxy
    const proxyURL = `http://${config.decodo.user}:${config.decodo.password}@${config.decodo.host}:${port}`;

    try {
      const response = await fetch('https://api.ipify.org?format=json', {
        signal: AbortSignal.timeout(10000),
        agent: new (require('https-proxy-agent').HttpsProxyAgent)(proxyURL)
      });

      const data = await response.json();
      const fixedIP = data.ip;

      logger.info('Got Decodo fixed IP', { port, fixedIP });
      return fixedIP;
    } catch (error) {
      logger.error('Failed to get Decodo fixed IP', { port, error: error.message });
      throw error;
    }
  }

  /**
   * Wait for VM HTTP API to be ready
   */
  async waitForVMReady(vmIP, maxWaitMs = 60000) {
    const startTime = Date.now();
    const checkInterval = 2000;

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const response = await fetch(`http://${vmIP}:8080/health`, {
          signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
          logger.info('VM ready', { vmIP });
          return true;
        }
      } catch (err) {
        // Not ready, continue
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    throw new Error(`VM not ready after ${maxWaitMs}ms`);
  }

  /**
   * Stream prompt to VM and handle response streaming
   */
  async streamPromptToVM(vmIP, provider, prompt, promptId, onChunk, onComplete, onError) {
    try {
      // Send prompt execution request to CLI VM
      const response = await fetch(`http://${vmIP}:8080/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          provider,
          prompt,
          promptId
        })
      });

      if (!response.ok) {
        throw new Error(`VM execution failed: ${response.statusText}`);
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.substring(6));

              // Handle different event types
              if (eventData.type === 'content') {
                fullResponse += eventData.content;
                onChunk({
                  type: 'content',
                  content: eventData.content
                });
              } else if (eventData.type === 'error') {
                onError(new Error(eventData.message));
                return;
              } else if (eventData.type === 'done') {
                onComplete({
                  responseText: fullResponse,
                  exitCode: eventData.exitCode || 0
                });
                return;
              } else if (eventData.type === 'metadata') {
                onChunk({
                  type: 'metadata',
                  metadata: eventData.data
                });
              }
            } catch (err) {
              logger.warn('Failed to parse SSE event', { line, error: err.message });
            }
          }
        }
      }

      // If stream ended without 'done' event
      onComplete({
        responseText: fullResponse,
        exitCode: 0
      });
    } catch (error) {
      onError(error);
    }
  }

  /**
   * Cancel running prompt
   */
  async cancelPrompt(promptId) {
    const prompt = this.activePrompts.get(promptId);
    if (!prompt) {
      throw new Error('Prompt not found or already completed');
    }

    try {
      // Send cancel request to VM
      await fetch(`http://${prompt.vmIP}:8080/cancel/${promptId}`, {
        method: 'POST',
        signal: AbortSignal.timeout(5000)
      });

      // Update database
      await db.prompts.update(promptId, {
        status: 'cancelled',
        completed_at: new Date().toISOString()
      });

      this.activePrompts.delete(promptId);

      logger.info('Prompt cancelled', { promptId });
    } catch (error) {
      logger.error('Failed to cancel prompt', { promptId, error: error.message });
      throw error;
    }
  }

  /**
   * Get prompt execution status
   */
  async getPromptStatus(promptId) {
    const active = this.activePrompts.get(promptId);
    if (active) {
      return {
        ...active,
        status: 'running'
      };
    }

    // Check database
    const dbPrompt = await db.prompts.findById(promptId);
    return dbPrompt;
  }

  /**
   * Hibernate user's CLI VM after idle period
   */
  async hibernateIdleVM(userId) {
    try {
      const cliVM = await db.vms.findByUserId(userId);
      if (!cliVM || cliVM.status !== 'running') {
        return;
      }

      // Check if VM has active prompts
      const hasActivePrompts = Array.from(this.activePrompts.values())
        .some(p => p.userId === userId);

      if (hasActivePrompts) {
        logger.debug('VM has active prompts, skipping hibernation', { userId });
        return;
      }

      // Hibernate VM
      await vmManager.hibernateVM(cliVM.vm_id);

      // Update user status
      await db.users.update(userId, { status: 'hibernated' });

      logger.info('CLI VM hibernated', { userId, vmId: cliVM.vm_id });
    } catch (error) {
      logger.error('Failed to hibernate VM', { userId, error: error.message });
    }
  }

  /**
   * Destroy inactive user VMs
   */
  async destroyInactiveVM(userId) {
    try {
      const cliVM = await db.vms.findByUserId(userId);
      if (!cliVM) {
        return;
      }

      // Destroy VM
      await vmManager.destroyVM(cliVM.vm_id);

      // Update user status
      await db.users.update(userId, {
        status: 'vm_destroyed',
        vm_id: null,
        vm_ip: null,
        vm_destroyed_at: new Date().toISOString()
      });

      logger.info('CLI VM destroyed due to inactivity', { userId, vmId: cliVM.vm_id });
    } catch (error) {
      logger.error('Failed to destroy inactive VM', { userId, error: error.message });
    }
  }

  /**
   * Get user's prompt statistics
   */
  async getUserStats(userId) {
    return await db.prompts.getStatsByUser(userId);
  }

  /**
   * List user's recent prompts
   */
  async listUserPrompts(userId, limit = 20) {
    const { data, error } = await db.supabase
      .from('prompts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }
}

// Singleton instance
const cliStreamingService = new CLIStreamingService();

module.exports = {
  CLIStreamingService,
  cliStreamingService
};
