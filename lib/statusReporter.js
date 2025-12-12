/**
 * StatusReporter - Reports CLI status to polydev.ai server
 *
 * This module enables the NPM package to report CLI tool status back to the
 * polydev.ai server, allowing users to see their CLI status on the dashboard.
 *
 * Key Features:
 * 1. Automatic reporting on CLI detection
 * 2. Heartbeat system for periodic updates
 * 3. Event-triggered updates (auth change, install/uninstall)
 * 4. Retry logic with exponential backoff
 * 5. Offline queue for failed reports
 * 6. Deduplication to avoid redundant calls
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class StatusReporter {
  constructor(options = {}) {
    // Server configuration
    this.serverUrl = options.serverUrl || process.env.POLYDEV_STATUS_SERVER || 'https://www.polydev.ai/api/mcp';
    this.userToken = options.userToken || process.env.POLYDEV_USER_TOKEN;

    // Feature flags
    this.reportingEnabled = options.reportingEnabled !== false && process.env.POLYDEV_REPORTING_ENABLED !== 'false';

    // Timing configuration
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ||
      parseInt(process.env.POLYDEV_HEARTBEAT_INTERVAL || '900000', 10); // Default: 15 minutes

    // Retry configuration
    this.maxRetries = options.maxRetries || 3;
    this.retryDelayMs = options.retryDelayMs || 1000;
    this.requestTimeoutMs = options.requestTimeoutMs || 10000; // 10 seconds

    // State management
    this.pendingReports = [];
    this.isOnline = true;
    this.lastReportedStatus = new Map();
    this.heartbeatTimer = null;
    this.reportHistory = [];
    this.maxHistorySize = 100;

    // Debug mode
    this.debug = options.debug || process.env.POLYDEV_CLI_DEBUG === 'true';

    // Persistence for offline queue
    this.queueFilePath = path.join(os.tmpdir(), '.polydev-pending-reports.json');
    this.loadPendingReports();
  }

  /**
   * Log debug messages
   */
  log(message, ...args) {
    if (this.debug) {
      console.log(`[StatusReporter] ${message}`, ...args);
    }
  }

  /**
   * Log errors (always shown)
   */
  error(message, ...args) {
    console.error(`[StatusReporter] ${message}`, ...args);
  }

  /**
   * Check if reporting is properly configured
   */
  isConfigured() {
    return this.reportingEnabled && !!this.userToken;
  }

  /**
   * Report status for a single provider
   * @param {string} provider - Provider ID (claude_code, codex_cli, gemini_cli)
   * @param {object} status - Status object with available, authenticated, version, error fields
   * @returns {Promise<object>} - Report result
   */
  async reportStatus(provider, status) {
    if (!this.isConfigured()) {
      return {
        success: false,
        reason: this.reportingEnabled ? 'No user token configured' : 'Reporting disabled',
        skipped: true
      };
    }

    // Validate provider
    if (!['claude_code', 'codex_cli', 'gemini_cli'].includes(provider)) {
      return { success: false, reason: `Invalid provider: ${provider}` };
    }

    // Deduplicate - don't report if status unchanged within last 5 minutes
    const statusKey = this.generateStatusKey(provider, status);
    const lastReported = this.lastReportedStatus.get(provider);

    if (lastReported && lastReported.key === statusKey) {
      const timeSinceLastReport = Date.now() - lastReported.timestamp;
      if (timeSinceLastReport < 5 * 60 * 1000) { // 5 minutes
        this.log(`Skipping duplicate report for ${provider} (unchanged for ${Math.round(timeSinceLastReport/1000)}s)`);
        return { success: true, reason: 'Status unchanged, skipped', skipped: true };
      }
    }

    // Build payload
    const payload = {
      provider,
      status: this.mapStatusToServerFormat(status),
      authenticated: status.authenticated || false,
      version: status.version || null,
      message: this.buildStatusMessage(status)
    };

    this.log(`Reporting status for ${provider}:`, payload);

    try {
      const result = await this.sendReport(payload);

      if (result.success) {
        // Update last reported status
        this.lastReportedStatus.set(provider, {
          key: statusKey,
          timestamp: Date.now()
        });

        // Record in history
        this.addToHistory({
          provider,
          status: payload.status,
          success: true,
          timestamp: new Date().toISOString()
        });
      }

      return result;

    } catch (error) {
      this.error(`Failed to report status for ${provider}:`, error.message);

      // Queue for retry
      this.queueReport({ payload, timestamp: Date.now(), retries: 0 });

      // Record failure in history
      this.addToHistory({
        provider,
        status: payload.status,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      return { success: false, error: error.message, queued: true };
    }
  }

  /**
   * Report all CLI statuses at once
   * @param {object} statuses - Map of provider ID to status object
   * @returns {Promise<object>} - Results for each provider
   */
  async reportAllStatuses(statuses) {
    if (!this.isConfigured()) {
      return {
        success: false,
        reason: 'Not configured',
        results: {}
      };
    }

    const results = {};
    const promises = [];

    for (const [provider, status] of Object.entries(statuses)) {
      promises.push(
        this.reportStatus(provider, status)
          .then(result => { results[provider] = result; })
          .catch(error => { results[provider] = { success: false, error: error.message }; })
      );
    }

    await Promise.all(promises);

    const successCount = Object.values(results).filter(r => r.success).length;
    const totalCount = Object.keys(results).length;

    this.log(`Reported ${successCount}/${totalCount} statuses successfully`);

    return {
      success: successCount > 0,
      successCount,
      totalCount,
      results
    };
  }

  /**
   * Send report to server with retry logic
   */
  async sendReport(payload, retryCount = 0) {
    const body = JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'report_cli_status',
        arguments: payload
      },
      id: `status-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });

    this.log(`Sending report to ${this.serverUrl} (attempt ${retryCount + 1}/${this.maxRetries + 1})`);

    try {
      // Use native fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

      const response = await fetch(this.serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.userToken}`,
          'User-Agent': 'polydev-ai-npm/1.4.0'
        },
        body,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error.message || 'Server returned error');
      }

      this.isOnline = true;
      return { success: true, response: result };

    } catch (error) {
      // Handle abort (timeout)
      if (error.name === 'AbortError') {
        throw new Error(`Request timed out after ${this.requestTimeoutMs}ms`);
      }

      // Check if we should retry
      if (retryCount < this.maxRetries) {
        const delay = this.retryDelayMs * Math.pow(2, retryCount); // Exponential backoff
        this.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.sendReport(payload, retryCount + 1);
      }

      // Mark as offline if we've exhausted retries
      this.isOnline = false;
      throw error;
    }
  }

  /**
   * Generate a unique key for status deduplication
   */
  generateStatusKey(provider, status) {
    return `${provider}:${status.available}:${status.authenticated}:${status.version || 'none'}`;
  }

  /**
   * Map local status object to server-expected format
   */
  mapStatusToServerFormat(status) {
    if (!status.available) return 'not_installed';
    if (status.error?.includes('Compatibility Issue')) return 'error';
    if (!status.authenticated) return 'unavailable';
    return 'available';
  }

  /**
   * Build a human-readable status message
   */
  buildStatusMessage(status) {
    const parts = [];

    if (status.error) {
      parts.push(status.error);
    } else if (status.available && status.authenticated) {
      parts.push('CLI is installed and authenticated');
    } else if (status.available && !status.authenticated) {
      parts.push('CLI is installed but not authenticated');
    } else {
      parts.push('CLI is not installed');
    }

    parts.push(`(reported by polydev-ai NPM package)`);

    return parts.join(' ');
  }

  /**
   * Start the heartbeat system for periodic status updates
   * @param {CLIManager} cliManager - Reference to CLIManager instance
   */
  startHeartbeat(cliManager) {
    if (this.heartbeatTimer) {
      this.log('Heartbeat already running');
      return;
    }

    if (!this.isConfigured()) {
      this.log('Heartbeat not started - not configured');
      return;
    }

    this.log(`Starting heartbeat (interval: ${this.heartbeatIntervalMs}ms)`);

    // Initial report
    this.runHeartbeat(cliManager);

    // Set up periodic heartbeat
    this.heartbeatTimer = setInterval(() => {
      this.runHeartbeat(cliManager);
    }, this.heartbeatIntervalMs);

    // Make sure interval doesn't prevent process exit
    if (this.heartbeatTimer.unref) {
      this.heartbeatTimer.unref();
    }
  }

  /**
   * Run a single heartbeat iteration
   */
  async runHeartbeat(cliManager) {
    try {
      this.log('Running heartbeat...');

      // Force fresh detection
      const statuses = await cliManager.forceCliDetection();

      // Report all statuses
      await this.reportAllStatuses(statuses);

      // Process any queued reports
      await this.processQueue();

      this.log('Heartbeat complete');
    } catch (error) {
      this.error('Heartbeat failed:', error.message);
    }
  }

  /**
   * Stop the heartbeat system
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      this.log('Stopping heartbeat');
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Queue a report for later retry
   */
  queueReport(report) {
    this.pendingReports.push(report);
    this.savePendingReports();
    this.log(`Queued report for ${report.payload.provider} (queue size: ${this.pendingReports.length})`);
  }

  /**
   * Process queued reports (for offline handling)
   */
  async processQueue() {
    if (this.pendingReports.length === 0) return;

    this.log(`Processing ${this.pendingReports.length} queued reports...`);

    const queue = [...this.pendingReports];
    this.pendingReports = [];

    for (const item of queue) {
      // Skip if too many retries
      if (item.retries >= this.maxRetries) {
        this.log(`Dropping report for ${item.payload.provider} after ${item.retries} retries`);
        continue;
      }

      // Skip if report is too old (> 24 hours)
      if (Date.now() - item.timestamp > 24 * 60 * 60 * 1000) {
        this.log(`Dropping stale report for ${item.payload.provider}`);
        continue;
      }

      try {
        await this.sendReport(item.payload);
        this.log(`Successfully sent queued report for ${item.payload.provider}`);
      } catch (error) {
        item.retries++;
        this.pendingReports.push(item);
        this.log(`Re-queued report for ${item.payload.provider} (retry ${item.retries})`);
      }
    }

    this.savePendingReports();
  }

  /**
   * Save pending reports to disk for persistence across sessions
   */
  savePendingReports() {
    try {
      fs.writeFileSync(this.queueFilePath, JSON.stringify(this.pendingReports, null, 2));
    } catch (error) {
      // Silently fail - not critical
    }
  }

  /**
   * Load pending reports from disk
   */
  loadPendingReports() {
    try {
      if (fs.existsSync(this.queueFilePath)) {
        const data = fs.readFileSync(this.queueFilePath, 'utf8');
        this.pendingReports = JSON.parse(data);
        this.log(`Loaded ${this.pendingReports.length} pending reports from disk`);
      }
    } catch (error) {
      this.pendingReports = [];
    }
  }

  /**
   * Add entry to history
   */
  addToHistory(entry) {
    this.reportHistory.push(entry);
    if (this.reportHistory.length > this.maxHistorySize) {
      this.reportHistory.shift();
    }
  }

  /**
   * Get report history
   */
  getHistory() {
    return [...this.reportHistory];
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      serverUrl: this.serverUrl,
      reportingEnabled: this.reportingEnabled,
      heartbeatIntervalMs: this.heartbeatIntervalMs,
      maxRetries: this.maxRetries,
      isConfigured: this.isConfigured(),
      isOnline: this.isOnline,
      pendingReportsCount: this.pendingReports.length,
      heartbeatRunning: !!this.heartbeatTimer
    };
  }

  /**
   * Update configuration
   */
  configure(options) {
    if (options.userToken !== undefined) {
      this.userToken = options.userToken;
    }
    if (options.reportingEnabled !== undefined) {
      this.reportingEnabled = options.reportingEnabled;
    }
    if (options.heartbeatIntervalMs !== undefined) {
      this.heartbeatIntervalMs = options.heartbeatIntervalMs;
    }
    if (options.debug !== undefined) {
      this.debug = options.debug;
    }

    this.log('Configuration updated:', this.getConfig());
  }

  /**
   * Report status change event (for immediate updates)
   */
  async reportStatusChange(provider, previousStatus, newStatus) {
    // Skip if status hasn't actually changed
    if (this.generateStatusKey(provider, previousStatus) === this.generateStatusKey(provider, newStatus)) {
      return { success: true, reason: 'No actual change', skipped: true };
    }

    this.log(`Status change detected for ${provider}:`, {
      from: this.mapStatusToServerFormat(previousStatus),
      to: this.mapStatusToServerFormat(newStatus)
    });

    // Force report (bypass deduplication)
    this.lastReportedStatus.delete(provider);

    return this.reportStatus(provider, newStatus);
  }
}

module.exports = { StatusReporter, default: StatusReporter };
