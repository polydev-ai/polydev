# ⚡ QUICK DEPLOYMENT REFERENCE

## 🎯 Goal
Deploy diagnostic fixes to identify the 24-second timeout issue.

## 📦 Files to Deploy
1. `master-controller/src/index.js` → `/opt/master-controller/src/index.js`
2. `master-controller/src/services/vm-manager.js` → `/opt/master-controller/src/services/vm-manager.js`

## 🚀 Fastest Method (If You Have Active SSH Session)

**Terminal 1 (Your Mac):**
```bash
cd /Users/venkat/Documents/polydev-ai
scp master-controller/src/index.js backspace@192.168.5.82:/tmp/index.js
scp master-controller/src/services/vm-manager.js backspace@192.168.5.82:/tmp/vm-manager.js
```

**Terminal 2 (SSH to 192.168.5.82):**
```bash
sudo cp /tmp/index.js /opt/master-controller/src/index.js
sudo cp /tmp/vm-manager.js /opt/master-controller/src/services/vm-manager.js
sudo systemctl restart master-controller && sleep 5 && sudo systemctl status master-controller
```

## ✅ Test Immediately After Deployment

**Test 1: Canary (should respond instantly)**
```bash
curl http://192.168.5.82:4000/api/debug/ping
```

**Test 2: Monitor logs**
```bash
ssh backspace@192.168.5.82 'sudo journalctl -u master-controller -f'
```

**Test 3: Auth endpoint (in another terminal)**
```bash
curl -X POST http://192.168.5.82:4000/api/auth/start \
  -H 'Content-Type: application/json' \
  -d '{"userId":"5abacdd1-6a9b-48ce-b723-ca8056324c7a","provider":"claude_code"}'
```

## 🔍 What to Look For

**If canary fails:**
- Node.js process is down or blocked
- Check: `sudo systemctl status master-controller`

**If canary works but no [REQUEST-ENTRY] logs for auth:**
- Reverse proxy/load balancer timing out requests
- Check: `sudo ss -tlnp | grep :4000`
- Check: `sudo nginx -T | grep timeout`

**If [REQUEST-ENTRY] appears but hangs at specific step:**
- See which [VM-CREATE] Step X is the last one
- Follow troubleshooting in DIAGNOSTIC-GUIDE.md

## 📋 Full Documentation
- **Detailed deployment options:** MANUAL-DEPLOYMENT-GUIDE.md
- **Complete diagnostic guide:** DIAGNOSTIC-GUIDE.md
- **Deployment automation (if SSH works):** DEPLOY-CRITICAL-FIX.sh

---

**Status:** Waiting for deployment
**Blocker:** SSH password authentication failing
**Solution:** Use manual deployment method above
