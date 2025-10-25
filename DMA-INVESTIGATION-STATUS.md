# DMA Investigation Status - October 24, 2025 22:52 CEST

## Current Status

⚠️ **STILL BLOCKED** - But significant progress made in understanding the issue

## Summary

Investigated virtio-mmio DMA errors in Firecracker v1.9.1 VMs. Despite trying multiple kernel boot parameters (`iommu.passthrough=1` and `iommu=off`), the DMA warnings persist. However, discovered that:

1. **DMA warnings may be harmless** - They say "Trying to continue, but this might not work" but don't completely prevent the VM from booting
2. **TAP interface state varies** - Some VMs show forwarding state, others don't
3. **IP configuration works** - Kernel successfully configures eth0 with correct IP address
4. **Connectivity still fails** - Despite correct configuration, VMs cannot be reached from host

## Test Results

### VM 1: vm-fc6275c6 (without IOMMU parameters)
- **DMA Errors**: Yes
- **IP Config**: ✅ 192.168.100.2 configured successfully
- **TAP State**: ❌ DOWN (`state DOWN`, `bridge_slave state disabled`)
- **Connectivity**: ❌ Failed (0 packets captured, Destination Host Unreachable)

### VM 2: vm-1236bada (with `iommu=off`)
- **DMA Errors**: Still present
- **IP Config**: ✅ 192.168.100.2 configured successfully
- **TAP State**: ✅ UP (`state UP`, `bridge_slave state forwarding`)
- **Connectivity**: ❌ Failed (ARP incomplete, Destination Host Unreachable)

## Key Findings

### The DMA Error Is NOT the Root Cause

Both kernel parameters attempted:
1. `iommu.passthrough=1` - Still shows DMA errors
2. `iommu=off` - Still shows DMA errors

This suggests the DMA failure is either:
- A non-fatal warning that doesn't prevent basic operation
- An unavoidable limitation of Firecracker v1.9.1 with Linux kernel 4.14.174
- Related to host kernel/KVM configuration rather than guest kernel parameters

### TAP Interface Behavior Varies

**VM 1 (fc-vm-fc627)**:
```
<NO-CARRIER,BROADCAST,MULTICAST,UP> state DOWN
bridge_slave state disabled
```
This indicates the virtio-net driver failed to establish carrier/link.

**VM 2 (fc-vm-1236b)**:
```
<BROADCAST,MULTICAST,UP,LOWER_UP> state UP
bridge_slave state forwarding
```
This shows the link IS up and forwarding - much better!

**Why the difference?** Unknown. Possibly timing-related or due to service restart.

### Network Configuration Is Correct

All test VMs show successful IP configuration:
```
[0.348218] IP-Config: Complete:
[0.349167] device=eth0, hwaddr=02:fc:XX:XX:XX:XX, ipaddr=192.168.100.2, mask=255.255.255.0, gw=192.168.100.1
```

This proves:
- ✅ Kernel `ip=` parameter works
- ✅ eth0 interface created
- ✅ IP address assigned
- ✅ Default gateway configured

### Historical Evidence

Background process #243343 from Oct 19, 2025 00:31 CEST successfully connected to VM 192.168.100.5:6080 with HTTP 101 WebSocket upgrade. This proves the system CAN work, but something changed between Oct 19 and Oct 24.

## What Changed?

Comparing working (Oct 19) vs broken (Oct 24) state:

| Aspect | Oct 19 (Working) | Oct 24 (Current) |
|--------|------------------|------------------|
| VM IP Range | 192.168.100.x | 192.168.100.x |
| Bridge IP | Unknown | 192.168.100.1 |
| TAP State | Likely UP | Varies (DOWN/UP) |
| DMA Errors | Unknown | Present |
| Connectivity | ✅ Working | ❌ Broken |

Possible causes of regression:
- Golden snapshot was rebuilt
- Kernel updated
- Firecracker version changed
- Host system updates
- iptables/firewall rules modified

## Files Modified

### Local
- `master-controller/src/services/vm-manager.js:193` - Added `iommu=off` to boot_args

### Server
- `/opt/master-controller/src/services/vm-manager.js:193` - Deployed with `iommu=off`
- master-controller service restarted (PID: 817758)

## Next Steps to Investigate

### 1. Check Host Kernel DMA Support
```bash
# On host
dmesg | grep -i iommu
dmesg | grep -i dma
cat /proc/cmdline
```

The host may need IOMMU/DMA configuration, not just the guest.

### 2. Compare Kernel Versions

Check if kernel changed between Oct 19 and Oct 24:
```bash
uname -r
cat /var/lib/firecracker/snapshots/base/golden-kernel-version.txt  # If exists
```

### 3. Test Different Firecracker Versions

Current: v1.9.1
Try: v1.8.x or v1.7.x to see if DMA issue is version-specific

### 4. Investigate Why TAP State Varies

VM 1 showed DOWN, VM 2 showed UP. What's the difference?
- Timing during VM startup?
- Race condition in virtio-mmio initialization?
- Host-side TAP interface creation issues?

### 5. Check for Kernel Module Issues

```bash
# On host
lsmod | grep virtio
lsmod | grep kvm
lsmod | grep tun
```

### 6. Try Alternative Network Configuration

Instead of kernel `ip=` parameter, use systemd-networkd in golden snapshot:
```bash
# In golden snapshot
cat > /etc/systemd/network/10-eth0.network << EOF
[Match]
Name=eth0

[Network]
DHCP=yes
EOF
```

This would test if the issue is kernel IP configuration vs network daemon.

## Related Documentation

1. `IFACE-ID-BUG-FIXED-NETWORK-STILL-BROKEN.md` - iface_id fix (Oct 24, 22:31)
2. `WEBSOCKET-1006-NETWORK-DEEP-DIVE-STATUS.md` - Bridge configuration fix (Oct 24, 21:54)
3. `WEBSOCKET-1006-BRIDGE-CONFIG-FIX-INCOMPLETE.md` - Environment variable fix (Oct 24, 21:14)
4. `WEBSOCKET-1006-STILL-BLOCKED-BY-NETWORK.md` - Network block confirmation (Oct 24, 21:01)

## Conclusion

The DMA error is a symptom, not the root cause. Even with `iommu=off`, the errors persist but the TAP interface can still come UP and forward packets. The real issue is likely:
- Timing/race condition in virtio-mmio initialization
- Host kernel configuration issue
- Firecracker version compatibility problem
- Missing kernel modules or drivers

**Recommendation**: Focus investigation on why TAP interface state varies (sometimes UP, sometimes DOWN) rather than trying to eliminate DMA warnings. The Oct 19 working state suggests the system CAN function with whatever DMA limitations exist - we need to identify what environmental change broke it.
