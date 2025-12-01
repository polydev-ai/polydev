/**
 * Debug VM Network Connectivity Issues
 *
 * Problem: VMs have 100% packet loss to master controller (192.168.100.1)
 * Impact: UDP video streaming packets never reach destination
 *
 * This script uses Polydev and Exa to diagnose and fix the issue
 */

import { polydev, exa } from '../../mcp-execution/dist/index.js';

console.log('═══════════════════════════════════════════════════════════════');
console.log('🔍 VM NETWORK CONNECTIVITY DIAGNOSIS');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log('Problem: VMs cannot reach master controller (192.168.100.1)');
console.log('Symptom: 100% packet loss, UDP packets not received');
console.log('');

async function diagnoseNetworking() {
  try {
    // Initialize both services in parallel
    console.log('🚀 Initializing Polydev and Exa...');
    await Promise.all([
      polydev.initialize(),
      exa.initialize()
    ]);
    console.log('✅ Services initialized');
    console.log('');

    // 1. Get expert perspectives on Firecracker VM networking
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🤖 CONSULTING AI EXPERTS (Polydev)');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    const perspectives = await polydev.getPerspectives(`
Firecracker microVM networking issue - VMs cannot reach host:

**Setup:**
- Host (master controller): 192.168.100.1
- VM network: 192.168.100.0/24 (assigned via DHCP)
- Latest VM: 192.168.100.22
- TAP interfaces: Created for each VM
- Network mode: Bridge/NAT setup

**Problem:**
- VMs can boot successfully
- DHCP assigns IP addresses correctly (e.g., 192.168.100.22)
- BUT: 100% packet loss when pinging VMs from host
- GStreamer pipeline inside VM sends UDP packets to 192.168.100.1:5004
- Zero packets reach the master controller (verified with tcpdump)

**Boot arguments include:**
\`ip=192.168.100.22::192.168.100.1:255.255.255.0::eth0:off\`

**What could cause this networking isolation? What should I check?**
- TAP interface configuration?
- Bridge/routing setup on host?
- Firewall rules blocking packets?
- Kernel network stack issues in VM?
- Missing network initialization in VM boot process?

Please provide specific debugging steps and potential fixes.
    `);

    console.log('Expert Perspectives:');
    console.log('─────────────────────────────────────────────────────────────');
    console.log(perspectives);
    console.log('');

    // 2. Research Firecracker networking best practices
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔍 RESEARCHING SOLUTIONS (Exa)');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    console.log('📚 Query 1: Firecracker VM network connectivity troubleshooting');
    const networkingResearch = await exa.search(
      'Firecracker microVM network connectivity TAP interface routing troubleshooting',
      {
        numResults: 5,
        type: 'deep',
        livecrawl: 'preferred'
      }
    );

    console.log('Results:');
    if (networkingResearch.results && networkingResearch.results.length > 0) {
      networkingResearch.results.slice(0, 3).forEach((result, idx) => {
        console.log(`\n${idx + 1}. ${result.title}`);
        console.log(`   URL: ${result.url}`);
        if (result.text) {
          console.log(`   Summary: ${result.text.substring(0, 200)}...`);
        }
      });
    }
    console.log('');

    console.log('📚 Query 2: Linux bridge and TAP interface setup for VMs');
    const bridgeResearch = await exa.search(
      'Linux bridge TAP interface VM networking setup tutorial',
      {
        numResults: 5,
        type: 'deep'
      }
    );

    console.log('Results:');
    if (bridgeResearch.results && bridgeResearch.results.length > 0) {
      bridgeResearch.results.slice(0, 3).forEach((result, idx) => {
        console.log(`\n${idx + 1}. ${result.title}`);
        console.log(`   URL: ${result.url}`);
        if (result.text) {
          console.log(`   Summary: ${result.text.substring(0, 200)}...`);
        }
      });
    }
    console.log('');

    console.log('📚 Query 3: UDP packet loss debugging in virtualized environments');
    const udpResearch = await exa.search(
      'UDP packet loss VM host communication debugging firewall',
      {
        numResults: 5,
        type: 'deep'
      }
    );

    console.log('Results:');
    if (udpResearch.results && udpResearch.results.length > 0) {
      udpResearch.results.slice(0, 3).forEach((result, idx) => {
        console.log(`\n${idx + 1}. ${result.title}`);
        console.log(`   URL: ${result.url}`);
        if (result.text) {
          console.log(`   Summary: ${result.text.substring(0, 200)}...`);
        }
      });
    }
    console.log('');

    // 3. Get code examples for network debugging
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📖 CODE DOCUMENTATION (Exa)');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    const codeContext = await exa.getCodeContext(
      'Linux network debugging commands for VM connectivity issues ip route iptables',
      3000
    );

    console.log('Relevant Commands and Examples:');
    console.log('─────────────────────────────────────────────────────────────');
    if (codeContext.results && codeContext.results.length > 0) {
      console.log(codeContext.results[0].text?.substring(0, 2000) || 'No content');
    }
    console.log('');

    // 4. Summary and next steps
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📋 DIAGNOSIS SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');
    console.log('Based on AI consultation and research, check:');
    console.log('');
    console.log('1. TAP Interface Status:');
    console.log('   - Verify TAP interface is UP and configured');
    console.log('   - Check if TAP is added to bridge');
    console.log('   - Command: ip link show | grep tap');
    console.log('');
    console.log('2. Bridge Configuration:');
    console.log('   - Verify bridge exists and is UP');
    console.log('   - Check bridge members');
    console.log('   - Command: brctl show');
    console.log('');
    console.log('3. Routing Table:');
    console.log('   - Verify routes to VM subnet');
    console.log('   - Command: ip route show');
    console.log('');
    console.log('4. Firewall Rules:');
    console.log('   - Check iptables for blocking rules');
    console.log('   - Command: iptables -L -n -v');
    console.log('');
    console.log('5. VM Network Interface:');
    console.log('   - Verify eth0 is UP inside VM');
    console.log('   - Check routing table inside VM');
    console.log('   - Command (inside VM): ip addr show; ip route show');
    console.log('');
    console.log('6. ARP Table:');
    console.log('   - Check if host can resolve VM MAC address');
    console.log('   - Command: arp -a | grep 192.168.100');
    console.log('');

  } catch (error) {
    console.error('❌ Error during diagnosis:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run diagnosis
diagnoseNetworking().then(() => {
  console.log('✅ Diagnosis complete - proceeding with investigation');
  console.log('');
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
