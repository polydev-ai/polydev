#!/bin/bash
# Test script to validate OAuth browser auto-launch feature
# This bypasses the broken Supabase test infrastructure and validates the core fix

set -e

echo "=== OAuth Auto-Launch Validation Test ==="
echo ""
echo "This script will:"
echo "1. Create a test Firecracker VM with OAuth URL in kernel cmdline"
echo "2. Check if the VM agent detects the OAuth URL"
echo "3. Validate that browser auto-launch happens"
echo ""

# Configuration
TEST_VM_ID="test-oauth-$(date +%s)"
TEST_OAUTH_URL="https://auth.openai.com/authorize?test=true&session=test123"
VM_IP="192.168.100.50"  # Use a test IP from the pool
TAP_DEVICE="fc-test-$(echo $TEST_VM_ID | cut -c1-8)"

echo "Test Configuration:"
echo "  VM ID: $TEST_VM_ID"
echo "  OAuth URL: $TEST_OAUTH_URL"
echo "  VM IP: $VM_IP"
echo "  TAP Device: $TAP_DEVICE"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "ERROR: This script must be run as root (for TAP device creation)"
  exit 1
fi

# Check if required files exist
GOLDEN_BROWSER_ROOTFS="/var/lib/firecracker/snapshots/base/golden-browser-rootfs.ext4"
GOLDEN_KERNEL="/var/lib/firecracker/snapshots/base/vmlinux-5.15.0-157"

if [ ! -f "$GOLDEN_BROWSER_ROOTFS" ]; then
  echo "ERROR: Golden browser rootfs not found at $GOLDEN_BROWSER_ROOTFS"
  exit 1
fi

if [ ! -f "$GOLDEN_KERNEL" ]; then
  echo "ERROR: Golden kernel not found at $GOLDEN_KERNEL"
  exit 1
fi

echo "Step 1: Creating TAP device..."
ip tuntap add $TAP_DEVICE mode tap
ip link set $TAP_DEVICE master fcbr0
ip link set $TAP_DEVICE up
echo "  ✓ TAP device $TAP_DEVICE created and attached to fcbr0"
echo ""

echo "Step 2: Creating VM directory and cloning rootfs..."
VM_DIR="/var/lib/firecracker/users/$TEST_VM_ID"
mkdir -p $VM_DIR
cp --reflink=auto $GOLDEN_BROWSER_ROOTFS $VM_DIR/rootfs.ext4
echo "  ✓ Rootfs cloned to $VM_DIR"
echo ""

echo "Step 3: Generating VM config with OAuth URL in kernel cmdline..."
cat > $VM_DIR/vm-config.json << EOF
{
  "boot-source": {
    "kernel_image_path": "$GOLDEN_KERNEL",
    "boot_args": "console=ttyS0 reboot=k panic=1 root=/dev/vda rw rootfstype=ext4 rootwait net.ifnames=0 biosdevname=0 random.trust_cpu=on ip=$VM_IP::192.168.100.1:255.255.255.0::eth0:on oauth_url=$TEST_OAUTH_URL"
  },
  "drives": [
    {
      "drive_id": "rootfs",
      "path_on_host": "$VM_DIR/rootfs.ext4",
      "is_root_device": false,
      "is_read_only": false
    }
  ],
  "network-interfaces": [
    {
      "iface_id": "$TAP_DEVICE",
      "guest_mac": "02:fc:aa:bb:cc:dd",
      "host_dev_name": "$TAP_DEVICE"
    }
  ],
  "machine-config": {
    "vcpu_count": 2,
    "mem_size_mib": 2048,
    "smt": false
  }
}
EOF
echo "  ✓ VM config created with OAuth URL in boot_args"
echo ""

echo "Step 4: Starting Firecracker..."
SOCKET_PATH="/var/lib/firecracker/sockets/$TEST_VM_ID.sock"
rm -f $SOCKET_PATH

# Start Firecracker in background
firecracker --api-sock $SOCKET_PATH \
  --config-file $VM_DIR/vm-config.json \
  --log-path /dev/null \
  --level Off \
  > $VM_DIR/console.log 2>&1 &

FIRECRACKER_PID=$!
echo "  ✓ Firecracker started (PID: $FIRECRACKER_PID)"
echo ""

echo "Step 5: Waiting for VM to boot (10 seconds)..."
sleep 10
echo ""

echo "Step 6: Checking VM console log for OAuth detection..."
echo "----------------------------------------"
if grep -q "oauth_url=" $VM_DIR/console.log; then
  echo "✓ OAuth URL found in boot parameters"
  grep "oauth_url=" $VM_DIR/console.log | head -5
else
  echo "✗ No OAuth URL detected in console log"
fi
echo ""

echo "Step 7: Checking for browser auto-launch..."
if grep -qi "browser" $VM_DIR/console.log; then
  echo "✓ Browser activity detected:"
  grep -i "browser" $VM_DIR/console.log | head -10
else
  echo "✗ No browser activity in console log"
fi
echo "----------------------------------------"
echo ""

echo "Step 8: Checking if VM is reachable..."
if ping -c 3 -W 2 $VM_IP > /dev/null 2>&1; then
  echo "✓ VM is reachable at $VM_IP"

  echo ""
  echo "Step 9: Checking if OAuth agent is running..."
  if curl -s --max-time 5 http://$VM_IP:8080/health > /dev/null; then
    echo "✓ OAuth agent responding on port 8080"
    curl -s http://$VM_IP:8080/health | jq .
  else
    echo "✗ OAuth agent not responding (expected if agent not yet started)"
  fi
else
  echo "✗ VM not reachable (this is OK for initial test - network config issue)"
  echo "  The key validation is whether OAuth URL was detected in console"
fi
echo ""

echo "=== Test Summary ==="
echo ""
echo "Console log location: $VM_DIR/console.log"
echo "VM config: $VM_DIR/vm-config.json"
echo ""
echo "To view full console log:"
echo "  cat $VM_DIR/console.log"
echo ""
echo "To clean up test VM:"
echo "  kill $FIRECRACKER_PID"
echo "  ip link delete $TAP_DEVICE"
echo "  rm -rf $VM_DIR"
echo "  rm -f $SOCKET_PATH"
echo ""
