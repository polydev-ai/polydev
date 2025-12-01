import { polydev, exa } from '/Users/venkat/mcp-execution/dist/index.js';

async function investigateOAuthFailure() {
  console.log('🔍 Investigating OAuth Agent Failure in Firecracker VMs\n');
  
  // Initialize both services
  await Promise.all([
    polydev.initialize(),
    exa.initialize()
  ]);

  // 1. Get expert perspectives on the OAuth agent failure
  console.log('🤖 Consulting AI experts about OAuth agent failure...\n');
  const oauthPerspectives = await polydev.getPerspectives(`
    I'm running a Firecracker VM system where VMs boot from a golden rootfs snapshot.
    
    PROBLEM: OAuth agent service on port 8080 never starts inside VMs
    
    EVIDENCE:
    - VM boots successfully (kernel loads, network initializes)
    - VM can make HTTP requests to host (WebRTC answer was POSTed successfully)
    - VM→Host network connectivity works (proven by HTTP requests)
    - But OAuth agent service on port 8080 is UNREACHABLE (EHOSTUNREACH)
    - Console log is completely empty (0 bytes) - no boot messages captured
    - VM gets cleaned up/terminated quickly after creation
    
    SETUP:
    - Golden rootfs.ext4 created with supervisor script to start OAuth agent
    - Supervisor script should start: /opt/vm-browser-agent/start-all.sh
    - Network uses ip=192.168.100.X::192.168.100.1:255.255.255.0::eth0:off
    - Systemd service: vm-browser-agent.service
    
    QUESTIONS:
    1. Why would console log be empty (0 bytes) if VM is booting?
    2. Why would OAuth agent not start even though network is working?
    3. Could this be a systemd service ordering issue?
    4. Could supervisor script be failing silently?
    5. How can I debug services that should start but don't in a snapshot-based VM?
  `);

  console.log('📊 Expert Analysis:\n');
  console.log(oauthPerspectives);
  console.log('\n' + '='.repeat(80) + '\n');

  // 2. Research Modal.com and OnKernel.com implementations
  console.log('🔍 Researching Modal.com implementation...\n');
  const modalResearch = await exa.search('Modal.com coding sandbox implementation architecture challenges', {
    numResults: 5,
    type: 'deep',
    livecrawl: 'preferred'
  });

  console.log('📚 Modal.com Research:\n');
  if (modalResearch.content && modalResearch.content[0]) {
    console.log(modalResearch.content[0].text.substring(0, 2000));
  }
  console.log('\n' + '='.repeat(80) + '\n');

  console.log('🔍 Researching OnKernel.com implementation...\n');
  const onkernelResearch = await exa.search('OnKernel.com coding sandbox VM implementation', {
    numResults: 5,
    type: 'deep',
    livecrawl: 'preferred'
  });

  console.log('📚 OnKernel.com Research:\n');
  if (onkernelResearch.content && onkernelResearch.content[0]) {
    console.log(onkernelResearch.content[0].text.substring(0, 2000));
  }
  console.log('\n' + '='.repeat(80) + '\n');

  // 3. Research Firecracker VM console logging issues
  console.log('🔍 Researching Firecracker console logging issues...\n');
  const consoleResearch = await exa.search('Firecracker VM console log empty snapshot boot', {
    numResults: 3,
    type: 'deep'
  });

  console.log('📚 Console Logging Research:\n');
  if (consoleResearch.content && consoleResearch.content[0]) {
    console.log(consoleResearch.content[0].text.substring(0, 1500));
  }
  console.log('\n' + '='.repeat(80) + '\n');

  // 4. Get specific debugging recommendations
  console.log('🤖 Getting debugging recommendations...\n');
  const debugRecommendations = await polydev.getPerspectives(`
    Based on this evidence:
    - Firecracker VM boots (process starts, PID assigned)
    - VM makes HTTP requests to host (WebRTC answer POSTed)
    - Console log is 0 bytes (completely empty)
    - OAuth agent on port 8080 never starts (EHOSTUNREACH)
    - Systemd service: vm-browser-agent.service should auto-start
    
    What are the TOP 3 most likely root causes and how to debug each one?
    
    Provide specific debugging commands I can run to diagnose this issue.
  `);

  console.log('🔧 Debugging Recommendations:\n');
  console.log(debugRecommendations);
  console.log('\n' + '='.repeat(80) + '\n');

  // 5. Research systemd service debugging in snapshot-based VMs
  console.log('🔍 Researching systemd debugging in Firecracker...\n');
  const systemdResearch = await exa.search('Firecracker systemd service not starting debugging snapshot', {
    numResults: 3,
    type: 'deep'
  });

  console.log('📚 Systemd Debugging Research:\n');
  if (systemdResearch.content && systemdResearch.content[0]) {
    console.log(systemdResearch.content[0].text.substring(0, 1500));
  }
}

investigateOAuthFailure().catch(console.error);
