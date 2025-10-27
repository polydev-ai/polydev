#!/bin/bash
# Quick Debug Commands for Firefox OAuth Launch Issue
# Use this to quickly diagnose the problem

VPS_HOST="135.181.138.102"
VPS_PASS="Venkatesh4158198303"

echo "===== FIREFOX OAUTH LAUNCH DEBUG QUICK START ====="
echo ""
echo "1. CREATE NEW BROWSER VM"
echo "   Go to: http://localhost:3000/dashboard/remote-cli"
echo "   Click: Claude Code button"
echo "   Note the session ID from URL"
echo ""

echo "2. GET VM IP AND LOGS"
VM_IP="192.168.100.13"  # Replace with actual IP from step 1
echo "   VM IP: $VM_IP"
echo ""

echo "3. SSH INTO VM"
CMD1="ssh -o StrictHostKeyChecking=no root@$VM_IP"
echo "   $CMD1"
echo ""

echo "4. CHECK AGENT SERVICE (run inside VM)"
echo "   systemctl status vm-browser-agent"
echo "   ps aux | grep vm-browser-agent"
echo "   ps aux | grep firefox"
echo ""

echo "5. CHECK LOGS (run inside VM)"
echo "   tail -100 /tmp/vm-browser-agent.log"
echo "   tail -100 /tmp/vm-browser-agent-error.log"
echo "   tail -100 /tmp/firefox-launch.log"
echo "   journalctl -u vm-browser-agent.service -n 100"
echo ""

echo "6. TEST X11 DISPLAY (run inside VM)"
echo "   ps aux | grep -E 'Xvfb|vncserver|openbox'"
echo "   DISPLAY=:1 xset q"
echo ""

echo "7. TEST FIREFOX DIRECTLY (run inside VM)"
echo "   DISPLAY=:1 HOME=/root XAUTHORITY=/root/.Xauthority /usr/bin/firefox https://accounts.anthropic.com &"
echo "   ps aux | grep firefox"
echo ""

echo "8. TRIGGER OAUTH FLOW FROM HOST"
# This will trigger the agent
curl -v http://$VM_IP:8080/health

echo ""
echo "===== COMMON ISSUES & FIXES ====="
echo ""
echo "Issue 1: vm-browser-agent service not running"
echo "  Fix: systemctl start vm-browser-agent (inside VM)"
echo ""

echo "Issue 2: X11 display not working"
echo "  Check: ps aux | grep Xvfb"
echo "  Check: DISPLAY=:1 xset q"
echo "  Fix: systemctl restart vncserver@1 (inside VM)"
echo ""

echo "Issue 3: Firefox can't start"
echo "  Check: /tmp/firefox-launch.log for errors"
echo "  Fix: rm -rf /root/.mozilla/firefox (inside VM)"
echo ""

echo "Issue 4: Can't SSH to VM"
echo "  Use noVNC instead:"
echo "  Get URL from master-controller response"
echo "  Password: polydev123"
echo ""

echo "===== KEY FILES ====="
echo "Handoff docs: /Users/venkat/Documents/polydev-ai/HANDOFF*.md"
echo "Agent code: /Users/venkat/Documents/polydev-ai/vm-agent/vm-browser-agent.js"
echo "Golden image: /var/lib/firecracker/snapshots/base/golden-rootfs.ext4 (on VPS)"
echo ""

echo "===== VPS ACCESS ====="
echo "ssh -o StrictHostKeyChecking=no root@$VPS_HOST"
echo "Password: $VPS_PASS"
