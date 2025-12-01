import { polydev, exa } from '/Users/venkat/mcp-execution/dist/index.js';

async function diagnoseVirtioNet() {
  console.log('🔍 Diagnosing virtio-net kernel module issue...\n');

  await Promise.all([polydev.initialize(), exa.initialize()]);

  // Get expert perspectives
  const perspectives = await polydev.getPerspectives(`
# Firecracker VM - virtio-net Driver Not Loading

## Boot Log Analysis:
- Kernel: 5.15.0-161-generic (Ubuntu 22.04)
- Two PCI devices detected: virtio-pci 0000:00:01.0 and 0000:00:02.0
- virtio_blk loaded successfully (block device works)
- virtio_net driver NEVER loads (no log entry)
- Kernel says "Unknown kernel command line parameters ip=..."

## Questions:
1. Why doesn't virtio-net load when virtio-pci detects TWO devices?
2. Is virtio-net missing from the kernel or just not loading?
3. How do I force load virtio-net module in Firecracker VM?
4. Should I use systemd-networkd configuration instead of kernel ip= boot args?
5. Do I need to add "modules-load=virtio_net" to kernel boot args?

## Goal:
Get network interface eth0 to appear in the guest VM so it can reach 192.168.100.1.
  `);

  console.log('\n🤖 Expert Perspectives:\n');
  console.log('='.repeat(80));
  console.log(perspectives);
  console.log('='.repeat(80));

  // Research virtio-net module loading
  console.log('\n\n📚 Researching virtio-net module loading...\n');

  const research = await exa.search('Ubuntu Firecracker virtio-net module not loading force load', {
    numResults: 3,
    type: 'deep'
  });

  console.log('Research Results:\n');
  console.log('='.repeat(80));
  for (let i = 0; i < Math.min(2, research.content.length); i++) {
    const result = research.content[i];
    console.log(`\n### ${i + 1}. ${result.title || 'Untitled'}`);
    console.log(`URL: ${result.url}`);
    console.log(`\n${result.text.substring(0, 600)}...\n`);
    console.log('-'.repeat(80));
  }

  console.log('\n✅ Diagnosis complete!');
}

diagnoseVirtioNet().catch(err => {
  console.error('❌ Diagnosis failed:', err);
  process.exit(1);
});
