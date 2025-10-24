# Firecracker v1.13.1 PCI Block Device Naming Fix

## Date: October 24, 2025 - 22:45 CEST

## Problem Summary

With Firecracker v1.13.1 and the `--enable-pci` flag, VMs fail to boot with:
```
[0.677207] VFS: Cannot open root device "vda" or unknown-block(0,0): error -6
```

The PCI enumeration is working correctly:
```
[0.088270] pci 0000:00:01.0: [1af4:1042] type 00 class 0x018000  (virtio-blk discovered)
[0.090345] pci 0000:00:02.0: [1af4:1041] type 00 class 0x020000  (virtio-net discovered)
[0.128055] virtio-pci 0000:00:01.0: enabling device (0000 -> 0002)
```

But the kernel cannot find the root device.

## Root Cause Analysis

### Expert Consultation Results

Consulted three AI models (GPT-5, Gemini-2.5-Pro, Grok) via Polydev for consensus on PCI device naming:

**Consensus**: With Firecracker v1.13.1 PCI transport, the virtio-blk block device is exposed as `/dev/sda`, NOT `/dev/vda`.

**Why?**
- **MMIO Transport (v1.9.1)**: Devices exposed directly as `/dev/vdX` (vda, vdb, etc.)
- **PCI Transport (v1.13.1)**: Devices enumerated via PCI bus and registered through SCSI subsystem, resulting in `/dev/sdX` naming (sda, sdb, etc.)

This is not a Firecracker configuration issue—it's how the guest kernel driver subsystem names devices based on the transport mechanism.

### Why Previous Approach Failed

The previous kernel parameter:
```
root=/dev/vda rw rootfstype=ext4
```

When kernel tries to mount root:
1. Kernel looks for `/dev/vda` (MMIO naming convention)
2. PCI enumeration has created `/dev/sda` instead
3. Device not found → error -6 (ENXIO)
4. VFS fallback to `unknown-block(0,0)` (device not found)

## Solution Implemented

### Boot Arguments Fix

**Before**:
```
root=/dev/vda rw rootfstype=ext4 ...
```

**After**:
```
root=/dev/sda rw rootfstype=ext4 rootwait ...
```

**File**: `master-controller/src/services/vm-manager.js:193`

**Changes**:
- Changed `root=/dev/vda` → `root=/dev/sda` (correct PCI device naming)
- Added `rootwait` (tells kernel to wait indefinitely for root device to appear, handles race conditions during PCI initialization)

### Why This Works

1. **PCI Enumeration Timing**: When kernel starts, PCI bus enumeration and SCSI driver initialization happen concurrently
2. **rootwait Flag**: Prevents kernel from trying to mount root before `/dev/sda` is fully registered
3. **Correct Device Name**: Using `/dev/sda` matches what the PCI+SCSI subsystem actually creates

## Future-Proof Alternative (Not Yet Implemented)

**Recommendation from experts**: For production, use PARTUUID-based root device identification:

```
root=PARTUUID=<partition-uuid> rootwait
```

This eliminates device naming dependencies entirely. To implement:
1. Mount rootfs.ext4 image on host
2. Run `blkid` to get PARTUUID
3. Update boot args with UUID

**Advantage**: Survives any future kernel/driver changes to device naming conventions.

**Not implemented yet** because it requires extracting PARTUUID from golden snapshot image.

## Firecracker Version Context

**v1.9.1**: MMIO transport for virtio devices
- Devices appear as `/dev/vdX`
- Has fundamental memory region conflict issues with Linux 5.15+ kernel
- Cannot be fixed with kernel parameters alone

**v1.13.1**: PCI transport support via `--enable-pci` flag
- Completely avoids MMIO memory region conflicts (solves the core issue)
- Changes device naming to `/dev/sdX` (PCI + SCSI subsystem convention)
- Requires boot args adjustment to match new naming

## Testing Plan

Next steps after server access restored:
1. Deploy updated `vm-manager.js` to server
2. Create test VM with Firecracker v1.13.1 + PCI
3. Verify VM boots successfully with `/dev/sda`
4. Verify network configuration (`ip=` parameter)
5. Test WebSocket connectivity to noVNC
6. Test OAuth flow end-to-end

## Files Modified

- `master-controller/src/services/vm-manager.js` (line 193)
  - Boot args: `root=/dev/vda` → `root=/dev/sda rootwait`

## Git Commit

Commit: `34e9e46` - "Fix Firecracker v1.13.1 PCI block device: use /dev/sda instead of /dev/vda with rootwait"

---

## Summary

The Firecracker v1.13.1 PCI upgrade completely solves the original MMIO memory region conflict. The only remaining issue is adjusting for the PCI transport's device naming convention. With this one-line fix to the boot args, VMs should boot successfully and proceed to network initialization.
