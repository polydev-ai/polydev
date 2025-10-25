# SWIOTLB=force Boot Parameter Test - FAILED

## Date: October 24, 2025 - 23:23 CEST

## Status: ❌ **FAILED - KERNEL UPGRADE REQUIRED**

## Summary

Tested adding `swiotlb=force` boot parameter to Firecracker VM configuration as recommended by AI expert consultation. The test FAILED because Linux kernel 4.14.174 lacks CONFIG_SWIOTLB support entirely.

## What Was Tested

### Local Changes
**File**: `master-controller/src/services/vm-manager.js:193`

**Modified boot_args**:
```javascript
boot_args: `console=ttyS0 reboot=k panic=1 root=/dev/vda rw rootfstype=ext4 net.ifnames=0 biosdevname=0 random.trust_cpu=on iommu=off swiotlb=force ip=${ipAddress}::${config.network.bridgeIP}:255.255.255.0::eth0:off`
```

### Server Deployment
- Deployed change to `/opt/master-controller/src/services/vm-manager.js`
- Backup created: `vm-manager.js.backup-before-swiotlb`
- Restarted master-controller service (PID: 819620)

## Test Results

### VM: vm-2c223c72-5776-4d11-ac9d-7d5a81f9bdbf
**Created**: After vm-manager.js change

**Console Log Analysis**:
```
Command line: console=ttyS0 reboot=k panic=1 root=/dev/vda rw rootfstype=ext4 net.ifnames=0 biosdevname=0 random.trust_cpu=on iommu=off ip=192.168.100.3::192.168.100.1:255.255.255.0::eth0:off
```

**❌ `swiotlb=force` NOT present in command line!**

**DMA Errors Still Present**:
```
[0.031148] virtio-mmio virtio-mmio.0: Failed to enable 64-bit or 32-bit DMA.  Trying to continue, but this might not work.
[0.031711] virtio-mmio virtio-mmio.1: Failed to enable 64-bit or 32-bit DMA.  Trying to continue, but this might not work.
```

**IP Configuration**: ✅ Succeeded
```
[0.344202] IP-Config: Complete:
[0.345164]      device=eth0, hwaddr=02:fc:3f:a6:fe:ed, ipaddr=192.168.100.3, mask=255.255.255.0, gw=192.168.100.1
```

**Connectivity**: ❌ Failed
- Ping: Destination Host Unreachable
- ARP: (incomplete)
- Port 6080: No route to host

## Why Test Failed

### Root Cause Confirmed
The Linux kernel 4.14.174 from July 2021 has **NO CONFIG_SWIOTLB compiled in**:

```bash
strings /var/lib/firecracker/snapshots/base/vmlinux | grep "CONFIG_SWIOTLB"
# Output: (empty)
```

### Why Boot Parameter Doesn't Help
1. `swiotlb=force` only works if kernel has `CONFIG_SWIOTLB=y`
2. Without CONFIG_SWIOTLB, kernel ignores the parameter entirely
3. Even if parameter was added, DMA operations would still fail
4. Boot parameter approach cannot add missing kernel functionality

## Conclusion

**The quick test approach FAILED**. Boot parameters cannot enable missing kernel features.

**The only solution**: Upgrade to modern Linux kernel (6.1 LTS) with proper SWIOTLB support compiled in.

## Required Kernel Config Options

For Firecracker v1.9.1 compatibility, the new kernel MUST have:
```
CONFIG_VIRTIO=y
CONFIG_VIRTIO_MMIO=y
CONFIG_VIRTIO_NET=y
CONFIG_SWIOTLB=y
CONFIG_SWIOTLB_DYNAMIC=y
CONFIG_ZONE_DMA32=y
CONFIG_HAS_IOMEM=y
```

## Next Steps

1. ✅ Confirmed `swiotlb=force` doesn't work
2. ⏳ Download/compile Linux 6.1 LTS kernel
3. ⏳ Update golden snapshot with new kernel
4. ⏳ Test VM connectivity
5. ⏳ Deploy to production

## Related Documentation

1. `SWIOTLB-DMA-FIX-REQUIRED.md` - Root cause analysis (Oct 24, 23:00)
2. `DMA-INVESTIGATION-STATUS.md` - Investigation progress (Oct 24, 22:52)
3. `IFACE-ID-BUG-FIXED-NETWORK-STILL-BROKEN.md` - Previous debugging (Oct 24, 22:31)

---

**Investigation Complete**: ✅
**Quick Fix Attempted**: ✅
**Quick Fix Result**: ❌ FAILED
**Kernel Upgrade Required**: ✅
