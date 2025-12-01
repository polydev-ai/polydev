/**
 * Comprehensive diagnosis with AI experts - VM stability and VNC issues
 */

import { polydev, exa } from './mcp-execution/dist/index.js';

const question = `
CRITICAL VM INFRASTRUCTURE ISSUE - 4 Weeks of Failures

CONTEXT:
I'm running a Firecracker VM-based browser sandbox similar to Daytona (github.com/daytonaio/daytona) and OnKernel.
Both of those services work reliably, but mine has critical issues.

CURRENT STATE (After 4 Weeks):
1. ✅ VMs boot successfully
2. ✅ WebRTC server starts and streams video
3. ✅ OAuth agent starts on port 8080
4. ❌ VMs crash/terminate unexpectedly (no Firecracker process remains)
5. ❌ VNC server (x11vnc) doesn't bind to port 5901 even though it starts
6. ❌ Terminal (xfce4-terminal) shows "command not found"
7. ❌ Cannot interact with VM desktop (no mouse/keyboard input)

EVIDENCE FROM LATEST VM:
- x11vnc starts: "x11vnc version: 0.9.16... Using X display :1"
- But then: "nc: connect to VM_IP port 5901 (tcp) failed: Connection refused"
- Terminal fails: "xfce4-terminal: command not found"
- VM console log disappears → VM terminated

WHAT I'VE TRIED:
1. Filesystem modifications (terminal autostart, VNC services) - don't persist in VMs
2. Changed from cp --reflink to dd for full copy - still doesn't work
3. Added VNC/terminal to supervisor script - x11vnc starts but doesn't listen on port
4. Multiple restarts, e2fsck, aggressive syncing - no effect

SYSTEMS THAT WORK (for reference):
- Daytona: https://github.com/daytonaio/daytona
- OnKernel: https://github.com/onkernel/kernel-images

QUESTIONS:
1. Why would x11vnc start but not listen on port 5901?
2. Why would xfce4-terminal not be in PATH if it's in the golden rootfs?
3. Why do VMs terminate/crash shortly after boot?
4. What are Daytona/OnKernel doing differently that makes their VMs stable?
5. How do they handle VNC/remote desktop input reliably?

Please provide:
- Root cause analysis from first principles
- Specific debugging steps
- How production systems (Daytona, OnKernel) solve this
`;

async function main() {
  try {
    console.log('🔍 Consulting AI experts and researching production systems...\n');

    // Initialize both services
    await Promise.all([
      polydev.initialize(),
      exa.initialize()
    ]);

    // Get expert perspectives
    console.log('🤖 Getting multi-model AI perspectives...\n');
    const perspectives = await polydev.getPerspectives(question);

    // Research Daytona and OnKernel
    console.log('\n📚 Researching how Daytona and OnKernel handle VMs...\n');
    const [daytonaResearch, onkernelResearch] = await Promise.all([
      exa.search('Daytona Firecracker VM VNC remote desktop implementation', { numResults: 3, type: 'deep' }),
      exa.search('OnKernel Firecracker VM stability x11vnc terminal', { numResults: 3, type: 'deep' })
    ]);

    console.log('═══════════════════════════════════════');
    console.log('AI EXPERT ANALYSIS');
    console.log('═══════════════════════════════════════\n');
    console.log(perspectives);

    console.log('\n═══════════════════════════════════════');
    console.log('DAYTONA RESEARCH');
    console.log('═══════════════════════════════════════\n');
    console.log(daytonaResearch.content[0]?.text?.substring(0, 2000) || 'No results');

    console.log('\n═══════════════════════════════════════');
    console.log('ONKERNEL RESEARCH');
    console.log('═══════════════════════════════════════\n');
    console.log(onkernelResearch.content[0]?.text?.substring(0, 2000) || 'No results');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
