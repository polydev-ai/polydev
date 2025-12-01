/**
 * Diagnose GStreamer in VMs
 *
 * Tests GStreamer commands directly inside a VM to identify the syntax error
 */

const http = require('http');
const { spawn } = require('child_process');

const MASTER_CONTROLLER = '135.181.138.102';

async function createTestVM() {
  console.log('='.repeat(80));
  console.log('Creating Test VM for GStreamer Diagnostics');
  console.log('='.repeat(80));
  console.log('');

  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      userId: '5abacdd1-6a9b-48ce-b723-ca8056324c7a',
      provider: 'claude_code'
    });

    const options = {
      hostname: MASTER_CONTROLLER,
      port: 4000,
      path: '/api/auth/start',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const result = JSON.parse(data);
          console.log('✅ VM Created');
          console.log('Session ID:', result.sessionId);
          console.log('VM IP:', result.vmIp || 'Pending...');
          console.log('');
          resolve(result);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => req.destroy());
    req.write(payload);
    req.end();
  });
}

async function waitForVMBoot(vmIp, maxAttempts = 40) {
  console.log(`Waiting for VM ${vmIp} to boot...`);

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const result = await testVMConnection(vmIp);
      if (result) {
        console.log(`✅ VM is ready! (${i * 2}s elapsed)`);
        console.log('');
        return true;
      }
    } catch (error) {
      // Expected during boot
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
    if (i % 5 === 0 && i > 0) {
      console.log(`  Still waiting... (${i * 2}s elapsed)`);
    }
  }

  throw new Error('VM boot timeout');
}

async function testVMConnection(vmIp) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: vmIp,
      port: 8080,
      path: '/health',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
    });

    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => req.destroy());
    req.end();
  });
}

async function runGStreamerDiagnostics(vmIp) {
  console.log('='.repeat(80));
  console.log('Running GStreamer Diagnostics via SSH');
  console.log('='.repeat(80));
  console.log('');

  const tests = [
    {
      name: 'Test 1: Check GStreamer Installation',
      command: `sshpass -p "Venkatesh4158198303" ssh -o StrictHostKeyChecking=no root@${vmIp} "which gst-launch-1.0 && gst-launch-1.0 --version"`
    },
    {
      name: 'Test 2: List Available GStreamer Plugins',
      command: `sshpass -p "Venkatesh4158198303" ssh -o StrictHostKeyChecking=no root@${vmIp} "gst-inspect-1.0 ximagesrc 2>&1 | head -50"`
    },
    {
      name: 'Test 3: Minimal Pipeline (ximagesrc → fakesink)',
      command: `sshpass -p "Venkatesh4158198303" ssh -o StrictHostKeyChecking=no root@${vmIp} "DISPLAY=:1 gst-launch-1.0 ximagesrc ! fakesink 2>&1"`
    },
    {
      name: 'Test 4: With Video Caps',
      command: `sshpass -p "Venkatesh4158198303" ssh -o StrictHostKeyChecking=no root@${vmIp} "DISPLAY=:1 gst-launch-1.0 ximagesrc ! video/x-raw,framerate=30/1 ! fakesink 2>&1"`
    },
    {
      name: 'Test 5: Full Pipeline (ximagesrc → VP8 → fakesink)',
      command: `sshpass -p "Venkatesh4158198303" ssh -o StrictHostKeyChecking=no root@${vmIp} "DISPLAY=:1 gst-launch-1.0 ximagesrc ! video/x-raw,framerate=30/1 ! videoscale ! video/x-raw,width=1280,height=720 ! vp8enc target-bitrate=2000000 deadline=1 cpu-used=4 ! rtpvp8pay ! fakesink 2>&1"`
    },
    {
      name: 'Test 6: Check X Display',
      command: `sshpass -p "Venkatesh4158198303" ssh -o StrictHostKeyChecking=no root@${vmIp} "DISPLAY=:1 xdpyinfo 2>&1 | head -20"`
    }
  ];

  for (const test of tests) {
    console.log('-'.repeat(80));
    console.log(`Running: ${test.name}`);
    console.log('-'.repeat(80));
    console.log('');

    try {
      const result = await runCommand(test.command);
      console.log(result);
      console.log('');
    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
      console.log('');
    }

    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

function runCommand(command) {
  return new Promise((resolve, reject) => {
    const child = spawn('bash', ['-c', command]);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('exit', (code) => {
      const output = stdout + stderr;
      if (code === 0) {
        resolve(output || '✅ Command succeeded (no output)');
      } else {
        resolve(`Exit code ${code}:\n${output || '(no output)'}`);
      }
    });

    child.on('error', (error) => {
      reject(error);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Command timeout (30s)'));
    }, 30000);
  });
}

async function main() {
  try {
    // Step 1: Create test VM
    const vm = await createTestVM();
    const vmIp = vm.vmIp || '192.168.100.2';  // Default if not returned

    // Step 2: Wait for VM to boot
    await waitForVMBoot(vmIp);

    // Wait extra 10s for services to start
    console.log('Waiting 10s for VM services to initialize...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    console.log('');

    // Step 3: Run GStreamer diagnostics
    await runGStreamerDiagnostics(vmIp);

    console.log('='.repeat(80));
    console.log('✅ Diagnostics Complete');
    console.log('='.repeat(80));
    console.log('');
    console.log('Next steps based on results:');
    console.log('1. If gst-launch-1.0 not found → GStreamer not installed');
    console.log('2. If ximagesrc plugin not found → Missing gstreamer1.0-x package');
    console.log('3. If minimal pipeline fails → X display issue');
    console.log('4. If specific syntax fails → Identify exact problematic element');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('='.repeat(80));
    console.error('❌ Diagnostics Failed:', error.message);
    console.error('='.repeat(80));
    console.error('');
    process.exit(1);
  }
}

main();
