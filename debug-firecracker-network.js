import { polydev, exa } from '/Users/venkat/mcp-execution/dist/index.js';

async function debugFirecrackerNetworking() {
  console.log('🔍 Debugging Firecracker VM networking issue...\n');

  await Promise.all([polydev.initialize(), exa.initialize()]);

  // 1. Get expert perspectives on the issue
  const perspectives = await polydev.getPerspectives(`
# Firecracker VM Network Device Not Detected in Guest

## Current Situation:
- Running Firecracker v1.13+ with --enable-pci flag
- TAP device (fc-vm-84143) exists on host, UP, connected to bridge fcbr0
- VM config JSON correctly defines network-interfaces with iface_id, guest_mac, host_dev_name
- Kernel boot args include: ip=192.168.100.3::192.168.100.1:255.255.255.0::eth0:off

## The Problem:
- Guest kernel boots successfully (Ubuntu 22.04, kernel 5.15.0-161-generic)
- NO virtio-net device appears in guest kernel logs
- NO eth0 interface created
- Guest is completely unreachable from host (ping fails)

## VM Config (vm-config.json):
\`\`\`json
{
  "boot-source": {
    "kernel_image_path": "/var/lib/firecracker/vmlinux",
    "initrd_path": "/boot/initrd.img-5.15.0-161-generic",
    "boot_args": "console=ttyS0 reboot=k panic=1 root=/dev/vda rw rootfstype=ext4 rootwait ip=192.168.100.3::192.168.100.1:255.255.255.0::eth0:off net.ifnames=0 biosdevname=0 random.trust_cpu=on gso_max_size=0 decodo_port=10001"
  },
  "drives": [{
    "drive_id": "rootfs",
    "path_on_host": "/var/lib/firecracker/users/vm-xxx/rootfs.ext4",
    "is_root_device": false,
    "is_read_only": false
  }],
  "network-interfaces": [{
    "iface_id": "fc-vm-84143",
    "guest_mac": "02:fc:7d:23:9d:45",
    "host_dev_name": "fc-vm-84143"
  }],
  "machine-config": {
    "vcpu_count": 2,
    "mem_size_mib": 4096,
    "smt": false
  }
}
\`\`\`

## Firecracker Startup Command:
\`\`\`
/usr/local/bin/firecracker --api-sock /path/to/socket.sock --log-path /dev/null --level Off --enable-pci --config-file /path/to/vm-config.json
\`\`\`

## Questions:
1. Why isn't the virtio-net device appearing in the guest kernel?
2. Is there a bug in how we're configuring the network-interfaces in the JSON?
3. Do we need to use the Firecracker API to attach the network AFTER boot instead of in config file?
4. Is "is_root_device": false correct for the rootfs drive?
5. Are there any known issues with Firecracker PCI mode and virtio-net?

Please provide specific fixes for this Firecracker networking configuration.
  `);

  console.log('\n🤖 Expert Perspectives:\n');
  console.log('='.repeat(80));
  console.log(perspectives);
  console.log('='.repeat(80));

  // 2. Research Firecracker networking best practices
  console.log('\n\n📚 Researching Firecracker networking documentation...\n');

  const firecrackerDocs = await exa.search('Firecracker virtio-net network interface not detected guest kernel', {
    numResults: 5,
    type: 'deep',
    livecrawl: 'preferred'
  });

  console.log('Research Results:\n');
  console.log('='.repeat(80));
  for (let i = 0; i < Math.min(3, firecrackerDocs.content.length); i++) {
    const result = firecrackerDocs.content[i];
    console.log(`\n### ${i + 1}. ${result.title || 'Untitled'}`);
    console.log(`URL: ${result.url}`);
    console.log(`\n${result.text.substring(0, 600)}...\n`);
    console.log('-'.repeat(80));
  }

  // 3. Get code examples for Firecracker network setup
  console.log('\n\n💻 Looking for Firecracker network configuration examples...\n');

  const codeExamples = await exa.getCodeContext('Firecracker network-interfaces configuration example', 3000);

  console.log('Code Examples:\n');
  console.log('='.repeat(80));
  for (let i = 0; i < Math.min(2, codeExamples.content.length); i++) {
    const example = codeExamples.content[i];
    console.log(`\n### Example ${i + 1}: ${example.title || 'Untitled'}`);
    console.log(`\n${example.text.substring(0, 800)}...\n`);
    console.log('-'.repeat(80));
  }

  console.log('\n✅ Research complete!');
}

debugFirecrackerNetworking().catch(err => {
  console.error('❌ Debug research failed:', err);
  process.exit(1);
});
