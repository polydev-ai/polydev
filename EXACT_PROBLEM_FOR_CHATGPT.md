# Firecracker TAP/Bridge Networking Issue - Exact Problem Statement

**Date**: November 3, 2025, 8:20 AM CET
**Issue**: Firecracker microVMs boot successfully but have NO Layer 3/4 connectivity

---

## 🏗️ **Architecture**

### **Host (VPS):**
- Ubuntu 22.04
- IP: 135.181.138.102
- Firecracker: /usr/local/bin/firecracker (latest)
- Bridge: fcbr0 (192.168.100.1/24)
- Kernel: 5.15.0-157-generic

### **Guest (Firecracker microVM):**
- Ubuntu 22.04 (same as host)
- Kernel: 5.15.0-157-generic
- Memory: 2048MB (fixed from 256MB OOM issue)
- Network: virtio-net device via TAP
- Boot args: `ip=192.168.100.X::192.168.100.1:255.255.255.0::eth0:on`

### **Network Flow:**
```
Browser → Next.js (localhost:3000)
        → Master-controller (135.181.138.102:4000)
        → Creates Firecracker VM
        → TAP device (fc-vm-XXXXX)
        → Bridge (fcbr0)
        → Should reach VM at 192.168.100.X:8080
```

---

## ✅ **What WORKS (Verified)**

### **Host Side:**
1. ✅ Bridge exists and is UP:
   ```
   fcbr0: <NO-CARRIER,BROADCAST,MULTICAST,UP> mtu 1500 state DOWN
   inet 192.168.100.1/24 scope global fcbr0
   ```

2. ✅ TAP devices created and bridged:
   ```
   fc-vm-7d46a: <BROADCAST,MULTICAST,UP,LOWER_UP> master fcbr0 state UP
   ```
   `brctl show fcbr0` shows TAP devices attached

3. ✅ IP forwarding enabled:
   ```
   net.ipv4.ip_forward = 1
   ```

4. ✅ iptables configured:
   ```
   iptables -P FORWARD ACCEPT
   iptables -I INPUT -i fcbr0 -j ACCEPT
   iptables -I FORWARD -i fcbr0 -j ACCEPT
   iptables -I FORWARD -o fcbr0 -j ACCEPT
   ```

5. ✅ Bridge netfilter disabled:
   ```
   net.bridge.bridge-nf-call-iptables = 0
   net.bridge.bridge-nf-call-ip6tables = 0
   ```

6. ✅ rp_filter disabled:
   ```
   net.ipv4.conf.all.rp_filter = 0
   net.ipv4.conf.fcbr0.rp_filter = 0
   ```

7. ✅ proxy_arp enabled on TAP devices:
   ```
   net.ipv4.conf.fc-vm-XXXXX.proxy_arp = 1
   ```

8. ✅ Checksum offloading disabled:
   ```
   ethtool -K fc-vm-XXXXX tx off rx off tso off gso off
   ethtool -K fcbr0 tso off gso off
   ```

### **Guest Side (from console logs):**
1. ✅ VM boots successfully (no kernel panic)
2. ✅ Reached login prompt
3. ✅ eth0 configured:
   ```
   eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP
   inet 192.168.100.X/24 scope global eth0
   ```

4. ✅ Default route added:
   ```
   default via 192.168.100.1 dev eth0
   192.168.100.0/24 dev eth0 proto kernel scope link src 192.168.100.X
   ```

5. ✅ ARP resolution works:
   ```
   192.168.100.1 lladdr 2a:92:72:d2:08:52 REACHABLE
   ```
   (Guest can see host's MAC address!)

6. ✅ systemd services started:
   ```
   Started VM Browser Services (OAuth Agent + WebRTC Server)
   Started VNC Server for Display 1
   Started noVNC Web VNC Client
   ```

---

## ❌ **What FAILS**

### **From Host to Guest:**
```bash
ping 192.168.100.X
# Result: Destination Host Unreachable
```

### **From Guest to Host (shown in console):**
```
PING 192.168.100.1 (192.168.100.1) 56(84) bytes of data.
--- 192.168.100.1 ping statistics ---
3 packets transmitted, 0 received, 100% packet loss
ERROR: Gateway ping failed
```

### **TCP Connections:**
```bash
ssh root@192.168.100.X
# Result: Connection refused

curl http://192.168.100.X:8080
# Result: No route to host
```

---

## 🔍 **The Paradox**

**Layer 2 (ARP) WORKS:**
- Guest can see host MAC via ARP
- Host can see guest MAC via ARP
- `arp -an` shows both sides learned each other
- Bridge FDB shows MAC addresses learned

**Layer 3/4 (IP/TCP) COMPLETELY FAILS:**
- ICMP echo requests never reach destination
- TCP SYN packets fail
- No traffic flows bidirectionally

---

## 📊 **Diagnostic Data**

### **tcpdump on fcbr0:**
```
Listening on fcbr0... (no packets captured during ping test)
```

### **TAP Device State:**
```
fc-vm-7d46a: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel master fcbr0 state UP
```
Sometimes shows `<NO-CARRIER>` - inconsistent!

### **Bridge State:**
```
fcbr0: <NO-CARRIER,BROADCAST,MULTICAST,UP> state DOWN
```
Bridge shows NO-CARRIER even when TAP devices are attached!

### **Firecracker Process:**
```
/usr/local/bin/firecracker --api-sock /var/lib/firecracker/sockets/vm-XXX.sock
  --log-path /dev/null --level Off --enable-pci
  --config-file /var/lib/firecracker/users/vm-XXX/vm-config.json
```
Running and consuming CPU (VM is alive)

---

## 🎯 **What We've Tried (ALL FAILED)**

1. ✅ Added iptables INPUT rules for fcbr0
2. ✅ Set FORWARD policy to ACCEPT
3. ✅ Disabled rp_filter
4. ✅ Disabled bridge netfilter
5. ✅ Enabled proxy_arp on TAP devices
6. ✅ Disabled checksum offloading (tx, rx, tso, gso)
7. ✅ Removed bridge IP temporarily
8. ✅ Added explicit host routes
9. ✅ Verified no ufw or firewalld
10. ✅ Disabled IPv6
11. ✅ Cleared bridge FDB
12. ✅ Recreated bridge multiple times

**NOTHING helps.** Layer 3/4 traffic simply does NOT flow.

---

## 🔬 **Detailed TAP Device Creation Code**

```javascript
// From master-controller/src/services/vm-manager.js:145-165
const tapName = `fc-${vmId.substring(0, 8)}`;

// Create TAP device
execSync(`ip tuntap add ${tapName} mode tap`, { stdio: 'pipe' });

// Add to bridge
execSync(`ip link set ${tapName} master fcbr0`, { stdio: 'pipe' });

// Bring up
execSync(`ip link set ${tapName} up`, { stdio: 'pipe' });
```

### **Firecracker Network Config:**
```json
{
  "network-interfaces": [{
    "iface_id": tapDevice,
    "guest_mac": "02:fc:XX:XX:XX:XX",  // Generated from vmId
    "host_dev_name": tapDevice  // e.g., "fc-vm-7d46a"
  }]
}
```

### **Guest Kernel Boot Args:**
```
ip=192.168.100.X::192.168.100.1:255.255.255.0::eth0:on
```

---

## 🐛 **Specific Symptoms**

1. **Bridge shows NO-CARRIER** even with TAP devices attached and UP
2. **TAP devices intermittently show NO-CARRIER** despite Firecracker running
3. **ARP works perfectly** (both sides see MACs, marked REACHABLE)
4. **Zero IP traffic flows** (tcpdump on fcbr0 captures nothing during ping)
5. **Both directions fail** (host→guest AND guest→host)

---

## 💡 **Working Reference (From Earlier Testing)**

**ONE TIME we saw it work:**
```
PING 192.168.100.2 (192.168.100.2) 56(84) bytes of data.
64 bytes from 192.168.100.2: icmp_seq=1 ttl=64 time=0.498 ms
64 bytes from 192.168.100.2: icmp_seq=2 ttl=64 time=0.495 ms
--- 192.168.100.2 ping statistics ---
2 packets transmitted, 2 received, 0% packet loss
```

**But then the same VM became unreachable 2 minutes later!**

This proves the setup CAN work, but something is causing it to fail inconsistently.

---

## 🎯 **Specific Questions for ChatGPT Pro:**

1. **Why does bridge show NO-CARRIER** when TAP devices are attached and UP?

2. **Why does ARP work but ICMP/TCP fail?** What layer could be dropping packets AFTER successful ARP resolution?

3. **Why is it inconsistent?** One time ping worked, then failed. What could cause that?

4. **What's the correct TAP device configuration** for Firecracker on Ubuntu 22.04 with a bridge?

5. **Should TAP devices have IP addresses** or be 0.0.0.0 when bridged?

6. **Is there a kernel module or setting** we're missing for Firecracker TAP networking?

---

## 📁 **Files to Review**

- **TAP creation**: master-controller/src/services/vm-manager.js:145-165
- **Firecracker config**: master-controller/src/services/vm-manager.js:180-220
- **Guest boot args**: Line 206 with ip= parameter
- **Network setup in guest**: /etc/init.d/setup-network-kernel-params (in golden image)

---

## 🆘 **What We Need**

**A working Firecracker TAP/bridge configuration that:**
1. Creates TAP device correctly
2. Bridges it to fcbr0
3. Allows bidirectional ping/SSH/TCP
4. Works consistently (doesn't randomly break)

**For Ubuntu 22.04 host and Ubuntu 22.04 guest.**

---

## 📊 **System Info**

```bash
# Kernel
uname -r
# 5.15.0-157-generic

# Network interfaces
ip link | grep -E "fcbr0|fc-vm"
# fcbr0: UP, NO-CARRIER
# fc-vm-*: UP, sometimes LOWER_UP, sometimes NO-CARRIER

# Bridge details
brctl show fcbr0
# bridge name    bridge id              STP enabled    interfaces
# fcbr0          8000.2a9272d20852      no             fc-vm-2496d
#                                                       fc-vm-ba764
#                                                       fc-vm-e3544

# Routes
ip route
# (shows default via main interface, 192.168.100.0/24 on fcbr0)
```

---

**This is blocking everything** - OAuth flow, WebRTC, all Browser VM functionality. All the application code is complete and ready, just needs VMs to be network-accessible.

Help us understand what's wrong with this Firecracker TAP/bridge setup!
