# Quick Reference Guide - Polydev OAuth System

## Emergency Commands

### Check System Status
```bash
# SSH into mini PC
ssh backspace@192.168.5.82
# Password: Venkatesh4158198303

# Check service
sudo systemctl status master-controller

# View live logs
sudo journalctl -u master-controller -f

# Check running VMs
ps aux | grep firecracker | grep -v grep
```

### Common Operations

#### Restart Master Controller
```bash
ssh backspace@192.168.5.82
sudo systemctl restart master-controller
sudo journalctl -u master-controller -f  # Watch logs
```

#### Check User's VMs
```bash
# From any machine with curl
curl "http://192.168.5.82:4000/api/vm/list?userId=YOUR_USER_ID" | jq .
```

#### Manually Cleanup Stuck VMs
```bash
ssh backspace@192.168.5.82

# List all Firecracker processes
ps aux | grep firecracker

# Kill specific VM (replace PID)
sudo kill -9 PID

# Or kill all VMs (CAREFUL!)
sudo pkill -9 firecracker

# Cleanup TAP interfaces
sudo ip link | grep fc-tap | awk '{print $2}' | cut -d: -f1 | xargs -I {} sudo ip link del {}

# Remove VM files
sudo rm -rf /var/lib/firecracker/users/vm-*
sudo rm -f /var/lib/firecracker/sockets/*.sock
```

#### Test OAuth Flow
```bash
curl -X POST http://192.168.5.82:4000/api/auth/start \
  -H 'Content-Type: application/json' \
  -d '{"userId":"YOUR_USER_UUID","provider":"claude_code"}' \
  --max-time 90
```

#### Check VM Filesystem (Troubleshooting)
```bash
ssh backspace@192.168.5.82

# Mount VM's filesystem
VM_ID="vm-xxx-xxx-xxx"
sudo mkdir -p /tmp/vm-inspect
sudo mount -o loop /var/lib/firecracker/users/$VM_ID/rootfs.ext4 /tmp/vm-inspect

# Check credentials
sudo ls -la /tmp/vm-inspect/root/.claude/
sudo cat /tmp/vm-inspect/root/.claude/credentials.json

# Unmount when done
sudo umount /tmp/vm-inspect
```

## Important Paths

### Mini PC (192.168.5.82)
```
Code:          /home/backspace/master-controller/
Service:       /etc/systemd/system/master-controller.service
VM Images:     /var/lib/firecracker/users/
Golden Images: /var/lib/firecracker/golden-snapshots/
Sockets:       /var/lib/firecracker/sockets/
Logs:          /var/log/syslog (grep master-controller)
```

### Development Machine
```
Frontend:      /Users/venkat/Documents/polydev-ai/src/
Backend:       /Users/venkat/Documents/polydev-ai/master-controller/src/
Docs:          /Users/venkat/Documents/polydev-ai/*.md
```

## Key URLs
```
Production:    https://polydev.ai (or http://192.168.5.82:3000)
API:           http://192.168.5.82:4000
Supabase:      https://supabase.com/dashboard (project: Polydev AI)
```

## Environment Variables Quick Check
```bash
# On mini PC
ssh backspace@192.168.5.82
cat /home/backspace/master-controller/.env | grep -v "^#" | grep .

# Check encryption key exists
grep ENCRYPTION_KEY /home/backspace/master-controller/.env
```

## Deploy Code Changes

### Deploy Master Controller
```bash
# From dev machine
cd /Users/venkat/Documents/polydev-ai/master-controller
tar czf /tmp/master-controller-update.tar.gz src/
sshpass -p 'Venkatesh4158198303' scp /tmp/master-controller-update.tar.gz backspace@192.168.5.82:/tmp/

# On mini PC
ssh backspace@192.168.5.82
cd /home/backspace/master-controller
tar xzf /tmp/master-controller-update.tar.gz
sudo systemctl restart master-controller
sudo journalctl -u master-controller -f  # Watch for errors
```

### Deploy Frontend
```bash
# From dev machine
cd /Users/venkat/Documents/polydev-ai
# Build
npm run build

# Deploy (method depends on hosting setup)
# If running locally on mini PC:
tar czf /tmp/frontend-build.tar.gz .next/
sshpass -p 'Venkatesh4158198303' scp /tmp/frontend-build.tar.gz backspace@192.168.5.82:/tmp/
# Then restart frontend service on mini PC
```

## Troubleshooting Decision Tree

### Issue: OAuth not working
1. Check logs: `sudo journalctl -u master-controller -f`
2. Look for: "Authentication completed" (should appear)
3. If timeout: Check Browser VM health service
4. If "fetch failed": Check credential transfer (fixed by filesystem mount)

### Issue: Can't connect to VM in chat
1. Check user's VMs: `curl http://192.168.5.82:4000/api/vm/list?userId=XXX`
2. Verify CLI VM exists with status="running"
3. Check if frontend is using correct VM IP (CLI, not Browser)
4. Test VM connectivity: `ping VM_IP_ADDRESS`

### Issue: VM won't start
1. Check Firecracker logs: `sudo cat /var/lib/firecracker/users/vm-XXX/error.log`
2. Check console: `sudo tail -100 /var/lib/firecracker/users/vm-XXX/console.log`
3. Verify golden snapshot exists: `ls -lh /var/lib/firecracker/golden-snapshots/`
4. Check disk space: `df -h /var/lib/firecracker`

### Issue: VM has no network
1. Check TAP interface: `ip link show | grep fc-tap`
2. Check bridge: `ip addr show br0`
3. Test ping from host: `ping VM_IP`
4. Check firewall: `sudo iptables -L -n | grep 192.168.100`

## Database Quick Queries

### Check User's VMs (SQL)
```sql
SELECT vm_id, ip_address, status, vm_type, created_at 
FROM vms 
WHERE user_id = 'USER_UUID' 
ORDER BY created_at DESC;
```

### Check Recent Auth Sessions
```sql
SELECT session_id, user_id, provider, status, created_at
FROM auth_sessions
ORDER BY created_at DESC
LIMIT 10;
```

### Check Stored Credentials
```sql
SELECT credential_id, user_id, provider, is_valid, created_at
FROM credentials
WHERE user_id = 'USER_UUID';
```

## Health Check Script
```bash
#!/bin/bash
echo "=== Polydev System Health ==="
echo ""
echo "1. Service Status:"
ssh backspace@192.168.5.82 "sudo systemctl is-active master-controller"

echo ""
echo "2. Running VMs:"
ssh backspace@192.168.5.82 "ps aux | grep firecracker | grep -v grep | wc -l"

echo ""
echo "3. Recent Errors (last 50 lines):"
ssh backspace@192.168.5.82 "sudo journalctl -u master-controller -n 50 --no-pager | grep ERROR"

echo ""
echo "=== Health Check Complete ==="
```

Save this as `health-check.sh`, make executable with `chmod +x health-check.sh`
