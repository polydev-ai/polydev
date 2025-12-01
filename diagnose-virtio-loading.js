import { polydev, exa } from '/Users/venkat/mcp-execution/dist/index.js';

async function diagnoseVirtioModuleLoading() {
  console.log('🔍 Diagnosing why virtio_net module is not loading in Firecracker VM...\n');

  await Promise.all([polydev.initialize(), exa.initialize()]);

  // Get expert perspectives on the module loading issue
  const perspectives = await polydev.getPerspectives(`
# Firecracker VM - virtio_net Module Not Auto-Loading Despite /etc/modules Configuration

## Current Situation:
- Golden rootfs has /etc/modules with:
  \`\`\`
  virtio_net
  virtio_blk
  virtio_pci
  \`\`\`
- Golden rootfs cloned using: \`cp /path/to/golden-rootfs.ext4 /path/to/vm/rootfs.ext4\`
- VM boots successfully (Ubuntu 22.04, kernel 5.15.0-161-generic)
- Console log shows:
  - ✅ virtio-pci 0000:00:01.0 and 0000:00:02.0 detected
  - ✅ virtio_blk loads and works (block device /dev/vda)
  - ❌ virtio_net NEVER loads - no mention in console log
  - ❌ NO eth0 interface created
  - ✅ systemd-networkd starts successfully but has no interface

## What Works:
- Block device works (virtio_blk loaded from same PCI bus)
- Other systemd services start normally
- VM reaches login prompt

## What Doesn't Work:
- virtio_net module not loading despite being in /etc/modules
- No network interface created
- VM completely unreachable on 192.168.100.x

## Questions:
1. Why does virtio_blk load automatically but virtio_net doesn't, when both are in /etc/modules?
2. Is /etc/modules the right place for module auto-loading in Ubuntu 22.04?
3. Should we use /etc/modules-load.d/virtio.conf instead?
4. Could this be related to how we're cloning the rootfs with cp?
5. Do we need to rebuild initramfs or use modprobe differently?
6. Is there a systemd service that reads /etc/modules that might not be enabled?

Please provide specific fixes for Ubuntu 22.04 Firecracker VMs.
  `);

  console.log('\n🤖 Expert Perspectives:\n');
  console.log('='.repeat(80));
  console.log(perspectives);
  console.log('='.repeat(80));

  // Research virtio-net auto-loading in Ubuntu
  console.log('\n\n📚 Researching Ubuntu module auto-loading...\\n');

  const research = await exa.search('Ubuntu 22.04 virtio_net module not loading /etc/modules systemd', {
    numResults: 5,
    type: 'deep'
  });

  console.log('Research Results:\n');
  console.log('='.repeat(80));
  for (let i = 0; i < Math.min(3, research.content.length); i++) {
    const result = research.content[i];
    console.log(`\n### ${i + 1}. ${result.title || 'Untitled'}`);
    console.log(`URL: ${result.url}`);
    console.log(`\n${result.text.substring(0, 700)}...\n`);
    console.log('-'.repeat(80));
  }

  console.log('\n✅ Diagnosis complete!');
}

diagnoseVirtioModuleLoading().catch(err => {
  console.error('❌ Diagnosis failed:', err);
  process.exit(1);
});
