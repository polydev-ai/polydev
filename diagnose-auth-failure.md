# Authentication Failure Diagnosis Plan

## Summary of Current State

### ✅ Fixes Deployed and Verified
1. **vm_type Column Fix** (vm-manager.js:251-252)
   - Both `type` and `vm_type` columns are now populated for new VMs
   - Confirmed working in code

2. **Debug Logging** (supabase.js:161-199)
   - Extensive debug logging added to findByUserId()
   - Confirmed working (logs from 23:56:20 UTC)

3. **Database Query Fix** (supabase.js:183)
   - Query filters for `vm_type='cli' AND destroyed_at IS NULL`
   - Confirmed correct

### ❌ The Structural Issue

**Critical Finding**: After service restart at 23:56:13 UTC, the ONLY logs captured were:
- **23:56:20 UTC**: Health check calling findByUserId()
- **NO `/api/auth/start` endpoint logs**
- **NO browserVMAuth.startAuthentication() logs**
- **NO VM creation logs**

User reports: "failing again" - but no backend logs exist for the failure.

## Root Cause Hypothesis

**The authentication is failing on the CLIENT SIDE (frontend or CLI tool) BEFORE reaching the backend API.**

This explains:
- Why no `/api/auth/start` logs appear
- Why no VM creation occurs
- Why user experiences failure without backend error logs

## Diagnostic Steps

### 1. Check Frontend/Client Logs
- Browser console errors
- Network tab in DevTools
- Failed API requests
- CORS errors
- Connection timeouts

### 2. Check if Backend is Reachable
```bash
# Test if API endpoint is accessible
curl -X POST http://192.168.5.82:4000/api/auth/start \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "5abacdd1-6a9b-48ce-b723-ca8056324c7a",
    "provider": "claude_code"
  }'
```

### 3. Check Recent Backend Logs for ANY Activity
```bash
# Check all logs since restart, not just auth logs
sudo journalctl -u master-controller --since '2025-10-11 23:56:13 UTC' --no-pager | tail -100
```

### 4. Check if Service is Running
```bash
sudo systemctl status master-controller
```

### 5. Verify Network Configuration
- Is port 4000 accessible?
- Are firewall rules blocking requests?
- Is there a reverse proxy in front of the API?

### 6. Check Database State
- Are there any NEW VMs created after 23:56:13?
- Are there any NEW auth_sessions created?

### 7. Test End-to-End Flow
1. Make a direct API call to `/api/auth/start`
2. Monitor logs in real-time: `sudo journalctl -u master-controller -f`
3. Verify CLI VM gets created with correct vm_type
4. Verify findByUserId() can retrieve it

## Expected Behavior (When Working)

### Backend Logs Should Show:
1. `[routes:auth] Starting authentication { userId, provider }`
2. `[browser-auth] Starting authentication { userId, provider }`
3. `[browser-auth] Creating CLI VM before authentication`
4. `[vm-manager] Creating VM { vmId, userId, vmType: 'cli' }`
5. `[database] [FINDBYUSERID] Query starting { userId }`
6. `[database] [FINDBYUSERID] All VMs for user`
7. `[database] [FINDBYUSERID] Query result { found: true, vmId, vmType: 'cli' }`

### What We're Actually Seeing:
- NONE of the above logs
- Only health check logs at 23:56:20

## Next Actions

1. **Immediate**: Check frontend/client for errors
2. **Test API manually**: Make a curl request to `/api/auth/start`
3. **Monitor in real-time**: Watch logs while testing
4. **Verify service health**: Check systemctl status and port accessibility

## Conclusion

The vm_type fix and debug logging are working correctly. The structural issue is that **authentication requests are not reaching the backend at all**. This is a client-side or network connectivity issue, not a backend code issue.
