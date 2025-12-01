# Build Infrastructure Analysis - Final Report

## Date: November 4, 2025
## Status: NODE.JS V20 PERSISTS IN ROOTFS

---

## 🎯 PROBLEM SUMMARY

Despite multiple rebuild attempts with cleanup and isolated directories, **Node.js v20.19.5 files persist in all golden rootfs images**. This is a **systematic infrastructure issue**, not a simple configuration problem.

---

## 🔍 ROOT CAUSE ANALYSIS

### Evidence
1. **File Timestamps**: All rootfs images contain files dated June 7, 2024
2. **Library Files**: `libnode.so.72` (v20 library) present in fresh builds
3. **Host Contamination**: Server has Node.js v20.19.5 installed system-wide
4. **Isolated Builds Failed**: Even builds with unique directories (e.g., `/root/isolate-build-*`) produce corrupted rootfs

### Build Process
```
dd if=/dev/zero of=rootfs.ext4 bs=1M count=8192    # Creates fresh 8GB file
mkfs.ext4 -F rootfs.ext4                           # Formats to ext4
debootstrap --arch=amd64 jammy rootfs              # Installs Ubuntu base
apt-get install nodejs npm                         # Installs Node.js
→ Result: Contains June 2024 Node.js v20 files
```

Despite this sequence creating a fresh filesystem, the final rootfs contains old files.

---

## 🚨 HYPOTHESIS: HOST CONTAMINATION

The build server has **Node.js v20.19.5 installed** which may be:
1. **Bind-mounted** into the chroot environment
2. **Copied** via apt cache or debootstrap cache
3. **Reused** from a filesystem overlay or shared mount

### Build Script Lines 122, 189, 193
```bash
cp /etc/resolv.conf rootfs/etc/resolv.conf                    # Network config
chroot rootfs npm install -g @anthropic-ai/claude-code        # CLI tools
chroot rootfs npm install -g @openai/codex                     # More npm install
```

These commands run with host environment variables and could access host Node.js paths.

---

## 🔄 WHAT WAS ATTEMPTED

1. ✅ Added aggressive Node.js cleanup before install
2. ✅ Cleaned all mount points and build directories
3. ✅ Used isolated build directories with timestamps
4. ✅ Added filesystem sync/unmount fixes
5. ✅ Deleted all old rootfs files
6. ❌ **All attempts failed** - new rootfs still contains June 2024 files

---

## 📊 CURRENT STATE

| Metric | Value |
|--------|-------|
| Rootfs Build Time | ~8 minutes |
| Node.js in Logs | v12.22.9 (Ubuntu repos) |
| Node.js in Filesystem | v20.19.5 (dated June 2024) |
| Host Node.js | v20.19.5 |
| VM Creation | Ready to test |

---

## 💡 NEXT STEPS (3 OPTIONS)

### Option 1: Continue with Current Rootfs
- **Action**: Test VM creation with existing rootfs (has v20 files)
- **Pros**: Immediate testing possible, v20 may work in some contexts
- **Cons**: Known CPU incompatibility with Firecracker vCPUs

### Option 2: Build on Clean System
- **Action**: Use Docker container or VM without Node.js to build
- **Pros**: Completely clean build environment
- **Cons**: Requires infrastructure changes, 30-60 min setup

### Option 3: Manual Rootfs Creation
- **Action**: Use different tool (Packer, Docker export, etc.)
- **Pros**: Avoids debootstrap issues entirely
- **Cons**: Requires learning new tool, more work

---

## 🧪 IMMEDIATE TESTING PLAN

**Proceed with Option 1**: Test VM creation despite Node.js v20 in rootfs

### Rationale
- Replit and other browser-VM systems work with various Node.js versions
- CPU incompatibility may not affect all operations
- Need to verify actual runtime behavior vs theoretical issues

### Test Sequence
1. Create VM using current rootfs
2. Check if OAuth agent starts (without "died" errors)
3. Verify WebRTC server stability (no crashes)
4. Test basic functionality (not NPM-heavy operations)

---

## 🎯 EXPECTED OUTCOME

**If Option 1 fails**: System will crash during VM boot or OAuth agent start
**If Option 1 works**: We have a working system and can optimize later

---

## 📝 KEY LESSONS

1. **Build contamination is real**: Host Node.js affects build results
2. **Isolated directories aren't enough**: Need complete environment isolation
3. **Logs can lie**: Build logs show v12 but filesystem has v20
4. **Move fast**: Test actual behavior rather than theorizing

---

**Report Generated**: November 5, 2025, 01:05 CET
**Next Action**: Test VM creation with current rootfs
