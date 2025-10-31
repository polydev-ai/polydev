# Deployment Troubleshooting

## Current Status

**Deployment #1 (575b84c)**: ✅ Deployed but ❌ Rolled back (health check timeout)
**Deployment #2 (3d28b94)**: ⏳ Running now (includes .env fix)

---

## Issue Analysis

The deployment succeeded (files synced) but the service failed health check because:
1. `.env` file wasn't deployed initially
2. dotenv.config() was loading from wrong directory
3. Service started but couldn't find database credentials

## Fixes Applied

**Commit 575b84c**:
- Fixed dotenv to load from absolute path: `path.join(__dirname, '../../.env')`

**Commit 3d28b94**:
- Updated GitHub Actions to explicitly deploy .env file
- Now includes: `rsync ./master-controller/.env → /opt/master-controller/.env`

---

## What Should Happen Now

The 3rd deployment (commit 3d28b94) will:
1. Sync fixed config/index.js (with absolute dotenv path)
2. Sync .env file with all credentials
3. Restart service
4. Health check should pass ✅
5. Service stays running

**Expected completion**: ~6-7 minutes from start

---

## If Health Check Still Fails

Run this on VPS terminal:
```bash
# Check if .env exists
ls -la /opt/master-controller/.env

# Check the dotenv path in config
grep -A2 "dotenv" /opt/master-controller/src/config/index.js

# Try manual start to see error
cd /opt/master-controller
node src/index.js
```

This will show the actual error.

---

## Monitor Deployment

Watch: https://github.com/backspacevenkat/polydev-ai/actions

Should show "Deploy to VPS" running for commit `3d28b94`.
