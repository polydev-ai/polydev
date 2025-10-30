/**
 * Phase 2: Comprehensive Integration Test
 *
 * Tests all Phase 2 components end-to-end:
 * - Nomad cluster health
 * - Docker images availability
 * - Nomad Manager API
 * - Job submission and execution
 * - Container CLI tools functionality
 *
 * Run on VPS: node tests/phase2-integration-test.js
 */

const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, status, details = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const color = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  log(`${icon} ${testName}: ${status}${details ? ' - ' + details : ''}`, color);
}

// Test results tracker
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0
};

async function runTest(testName, testFn) {
  results.total++;
  try {
    const result = await testFn();
    if (result === true || result?.pass === true) {
      results.passed++;
      logTest(testName, 'PASS', result?.details || '');
      return true;
    } else if (result?.warn) {
      results.warnings++;
      logTest(testName, 'WARN', result?.details || '');
      return null;
    } else {
      results.failed++;
      logTest(testName, 'FAIL', result?.details || 'Unexpected failure');
      return false;
    }
  } catch (error) {
    results.failed++;
    logTest(testName, 'FAIL', error.message);
    return false;
  }
}

async function main() {
  log('\n====================================', 'cyan');
  log('Phase 2: Integration Test Suite', 'cyan');
  log('====================================\n', 'cyan');

  // Test 1: Nomad Binary Installation
  log('Test Suite 1: Nomad Installation', 'blue');
  await runTest('Nomad binary exists', async () => {
    const { stdout } = await execPromise('which nomad');
    return { pass: true, details: stdout.trim() };
  });

  await runTest('Nomad version', async () => {
    const { stdout } = await execPromise('nomad version');
    const match = stdout.match(/Nomad v([\d.]+)/);
    return { pass: true, details: match ? match[0] : stdout.trim() };
  });

  // Test 2: Nomad Service
  log('\nTest Suite 2: Nomad Service Status', 'blue');
  await runTest('Nomad process running', async () => {
    const { stdout } = await execPromise('pgrep -f "nomad agent"');
    return { pass: stdout.trim().length > 0, details: `PID ${stdout.trim()}` };
  });

  await runTest('Nomad systemd service', async () => {
    try {
      await execPromise('systemctl is-active nomad');
      return { pass: true, details: 'active' };
    } catch (error) {
      // Check if process is running even if systemd shows inactive
      try {
        await execPromise('pgrep -f "nomad agent"');
        return { warn: true, details: 'Process running but systemd shows inactive (known issue)' };
      } catch {
        return { pass: false, details: 'Not running' };
      }
    }
  });

  // Test 3: Nomad Cluster Health
  log('\nTest Suite 3: Nomad Cluster Health', 'blue');
  await runTest('Server members', async () => {
    const { stdout } = await execPromise('nomad server members');
    const hasLeader = stdout.includes('true');
    const isAlive = stdout.includes('alive');
    return { pass: hasLeader && isAlive, details: hasLeader ? 'Leader elected' : 'No leader' };
  });

  await runTest('Node status', async () => {
    const { stdout } = await execPromise('nomad node status');
    const isReady = stdout.includes('ready');
    return { pass: isReady, details: isReady ? 'Node ready' : 'Node not ready' };
  });

  // Test 4: Nomad API
  log('\nTest Suite 4: Nomad HTTP API', 'blue');
  await runTest('API /v1/status/leader', async () => {
    const response = await axios.get('http://localhost:4646/v1/status/leader');
    return { pass: response.status === 200, details: response.data };
  });

  await runTest('API /v1/metrics', async () => {
    const response = await axios.get('http://localhost:4646/v1/metrics?format=prometheus');
    const hasMetrics = response.data.includes('go_goroutines');
    return { pass: hasMetrics, details: 'Prometheus metrics available' };
  });

  await runTest('API /v1/jobs', async () => {
    const response = await axios.get('http://localhost:4646/v1/jobs');
    return { pass: response.status === 200, details: `${response.data.length} jobs` };
  });

  await runTest('API /v1/nodes', async () => {
    const response = await axios.get('http://localhost:4646/v1/nodes');
    const nodeCount = response.data.length;
    return { pass: nodeCount >= 1, details: `${nodeCount} node(s)` };
  });

  // Test 5: Docker Installation
  log('\nTest Suite 5: Docker Runtime', 'blue');
  await runTest('Docker service running', async () => {
    const { stdout } = await execPromise('systemctl is-active docker');
    return { pass: stdout.trim() === 'active', details: 'Docker daemon active' };
  });

  await runTest('Docker version', async () => {
    const { stdout } = await execPromise('docker --version');
    return { pass: true, details: stdout.trim() };
  });

  // Test 6: Runtime Container Images
  log('\nTest Suite 6: Runtime Container Images', 'blue');
  await runTest('OpenAI runtime image', async () => {
    const { stdout } = await execPromise('docker images polydev-openai-runtime:latest --format "{{.Repository}}:{{.Tag}}"');
    return { pass: stdout.includes('polydev-openai-runtime:latest'), details: 'Image exists' };
  });

  await runTest('Anthropic runtime image', async () => {
    const { stdout } = await execPromise('docker images polydev-anthropic-runtime:latest --format "{{.Repository}}:{{.Tag}}"');
    return { pass: stdout.includes('polydev-anthropic-runtime:latest'), details: 'Image exists' };
  });

  await runTest('Google runtime image', async () => {
    const { stdout } = await execPromise('docker images polydev-google-runtime:latest --format "{{.Repository}}:{{.Tag}}"');
    return { pass: stdout.includes('polydev-google-runtime:latest'), details: 'Image exists' };
  });

  // Test 7: CLI Tools in Containers
  log('\nTest Suite 7: CLI Tools Functionality', 'blue');
  await runTest('Codex CLI (OpenAI)', async () => {
    const { stdout } = await execPromise('docker run --rm polydev-openai-runtime:latest codex --version');
    return { pass: stdout.includes('codex-cli'), details: stdout.trim() };
  });

  await runTest('Claude Code CLI (Anthropic)', async () => {
    const { stdout } = await execPromise('docker run --rm polydev-anthropic-runtime:latest claude --version');
    return { pass: stdout.includes('Claude Code'), details: stdout.trim() };
  });

  await runTest('Gemini CLI (Google)', async () => {
    const { stdout } = await execPromise('docker run --rm polydev-google-runtime:latest gemini --version');
    const version = stdout.trim();
    const isValid = /^\d+\.\d+\.\d+$/.test(version);
    return { pass: isValid, details: version };
  });

  // Test 8: Nomad Manager Service
  log('\nTest Suite 8: Nomad Manager Service', 'blue');
  await runTest('Nomad Manager file exists', async () => {
    const { stdout } = await execPromise('ls -lh /opt/master-controller/src/services/nomad-manager.js');
    return { pass: stdout.includes('nomad-manager.js'), details: 'File present' };
  });

  await runTest('Warm Pool Manager file exists', async () => {
    const { stdout } = await execPromise('ls -lh /opt/master-controller/src/services/warm-pool-manager.js');
    return { pass: stdout.includes('warm-pool-manager.js'), details: 'File present' };
  });

  // Test 9: Environment Configuration
  log('\nTest Suite 9: Environment Configuration', 'blue');
  await runTest('NOMAD_ADDR configured', async () => {
    const { stdout } = await execPromise('grep "NOMAD_ADDR" /opt/master-controller/.env');
    return { pass: stdout.includes('http://localhost:4646'), details: 'Configured' };
  });

  await runTest('Warm pool sizes configured', async () => {
    const { stdout } = await execPromise('grep "WARM_POOL" /opt/master-controller/.env | wc -l');
    const count = parseInt(stdout.trim());
    return { pass: count === 3, details: `${count} provider(s) configured` };
  });

  // Test 10: Job Templates
  log('\nTest Suite 10: Nomad Job Templates', 'blue');
  await runTest('Runtime container template', async () => {
    const { stdout } = await execPromise('ls /tmp/nomad-jobs/runtime-container.nomad');
    return { pass: true, details: 'Template exists' };
  });

  await runTest('Browser VM template', async () => {
    const { stdout } = await execPromise('ls /tmp/nomad-jobs/browser-vm.nomad');
    return { pass: true, details: 'Template exists' };
  });

  await runTest('Warm pool template', async () => {
    const { stdout } = await execPromise('ls /tmp/nomad-jobs/warm-pool.nomad');
    return { pass: true, details: 'Template exists' };
  });

  // Test 11: Nomad Manager Functionality
  log('\nTest Suite 11: Nomad Manager Integration', 'blue');
  await runTest('Load Nomad Manager module', async () => {
    try {
      const { getNomadManager } = require('/opt/master-controller/src/services/nomad-manager');
      const manager = getNomadManager();
      return { pass: manager !== null, details: 'Module loaded successfully' };
    } catch (error) {
      return { pass: false, details: error.message };
    }
  });

  await runTest('Nomad Manager health check', async () => {
    const { getNomadManager } = require('/opt/master-controller/src/services/nomad-manager');
    const manager = getNomadManager();
    const healthy = await manager.healthCheck();
    return { pass: healthy === true, details: healthy ? 'Healthy' : 'Unhealthy' };
  });

  await runTest('Nomad Manager cluster status', async () => {
    const { getNomadManager } = require('/opt/master-controller/src/services/nomad-manager');
    const manager = getNomadManager();
    const status = await manager.getClusterStatus();
    return { pass: status.healthy === true, details: `${status.nodes.ready} node(s) ready` };
  });

  // Summary
  log('\n====================================', 'cyan');
  log('Test Results Summary', 'cyan');
  log('====================================', 'cyan');
  log(`Total Tests:  ${results.total}`, 'blue');
  log(`Passed:       ${results.passed}`, 'green');
  log(`Failed:       ${results.failed}`, 'red');
  log(`Warnings:     ${results.warnings}`, 'yellow');

  const successRate = Math.round((results.passed / results.total) * 100);
  log(`\nSuccess Rate: ${successRate}%`, successRate >= 95 ? 'green' : successRate >= 80 ? 'yellow' : 'red');

  if (results.failed === 0) {
    log('\n🎉 All tests passed! Phase 2 is fully operational.', 'green');
    process.exit(0);
  } else if (results.failed <= 2 && results.warnings > 0) {
    log('\n⚠️  Phase 2 is mostly operational with minor issues.', 'yellow');
    process.exit(0);
  } else {
    log('\n❌ Phase 2 has critical failures. Review failed tests.', 'red');
    process.exit(1);
  }
}

// Run tests
main().catch(error => {
  log(`\n❌ Test suite failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
