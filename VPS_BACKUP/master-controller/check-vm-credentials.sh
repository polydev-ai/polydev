#!/bin/bash
# Check if credentials were written to CLI VM filesystem

VM_ID="vm-71d7f139-6c40-4cdb-836e-c74c7d7b70e0"
ROOTFS="/var/lib/firecracker/users/$VM_ID/rootfs.ext4"
MOUNT="/tmp/check-creds-$$"

echo "=== CHECKING VM FILESYSTEM FOR CREDENTIALS ==="
echo ""
echo "VM ID: $VM_ID"
echo "Rootfs: $ROOTFS"
echo ""

# Check if rootfs exists
if [ ! -f "$ROOTFS" ]; then
  echo "ERROR: Rootfs file not found at $ROOTFS"
  exit 1
fi

echo "Rootfs size: $(du -h "$ROOTFS" | cut -f1)"
echo ""

# Create mount point
sudo mkdir -p "$MOUNT"

# Mount the filesystem
echo "Mounting rootfs..."
if ! sudo mount -o loop,ro "$ROOTFS" "$MOUNT"; then
  echo "ERROR: Failed to mount rootfs"
  sudo rmdir "$MOUNT"
  exit 1
fi

echo "✓ Mounted successfully"
echo ""

# Check for .claude directory
echo "Checking for .claude directory..."
if [ -d "$MOUNT/root/.claude" ]; then
  echo "✓ .claude directory exists"
  echo ""

  echo "Directory contents:"
  sudo ls -lha "$MOUNT/root/.claude/"
  echo ""

  # Check for credentials file
  if [ -f "$MOUNT/root/.claude/credentials.json" ]; then
    echo "✓ credentials.json exists"
    echo ""

    echo "File size: $(sudo stat -c%s "$MOUNT/root/.claude/credentials.json") bytes"
    echo ""

    echo "First 10 lines of credentials.json:"
    sudo head -10 "$MOUNT/root/.claude/credentials.json"
    echo ""

    echo "Checking JSON validity..."
    if sudo cat "$MOUNT/root/.claude/credentials.json" | jq . > /dev/null 2>&1; then
      echo "✓ Valid JSON"
      echo ""

      echo "Credential structure:"
      sudo cat "$MOUNT/root/.claude/credentials.json" | jq 'keys'
    else
      echo "✗ Invalid JSON"
    fi
  else
    echo "✗ credentials.json does not exist"
  fi
else
  echo "✗ .claude directory does not exist"
  echo ""
  echo "Checking /root directory contents:"
  sudo ls -lha "$MOUNT/root/" | head -20
fi

echo ""

# Unmount
echo "Unmounting..."
sudo umount "$MOUNT"
sudo rmdir "$MOUNT"

echo "✓ Done"
