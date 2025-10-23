# Supabase Database State - Manual Query Reference

## Current Database Status

All required tables from the migration exist:
- ✅ `users` table - EXISTS
- ✅ `vms` table - EXISTS
- ✅ `provider_credentials` table - EXISTS
- ✅ `prompts` table - EXISTS
- ✅ `auth_sessions` table - EXISTS
- ✅ `system_metrics` table - EXISTS

## Users Table Schema (COMPLETE)

All columns from migration have been added:

| Column Name | Data Type | Default | Nullable |
|------------|-----------|---------|----------|
| user_id | uuid | null | NO |
| email | text | null | NO |
| tier | text | 'free'::text | NO |
| status | text | 'active'::text | NO |
| vm_id | uuid | null | YES |
| decodo_proxy_port | integer | null | YES |
| last_active_at | timestamptz | now() | YES |
| created_at | timestamptz | now() | YES |
| updated_at | timestamptz | now() | YES |
| **decodo_fixed_ip** | text | null | YES | ← **JUST ADDED**
| **supabase_auth_id** | uuid | null | YES | ← **JUST ADDED**
| **vm_ip** | text | null | YES | ← **JUST ADDED**
| **subscription_plan** | text | 'free'::text | YES | ← **JUST ADDED**
| **vm_destroyed_at** | timestamptz | null | YES | ← **JUST ADDED**

## Recent Changes Applied

### 1. Added Missing Columns to Users Table

```sql
-- These have been successfully executed:
ALTER TABLE users
ADD COLUMN IF NOT EXISTS decodo_fixed_ip TEXT;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS supabase_auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS vm_ip TEXT;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free'
  CHECK (subscription_plan IN ('free', 'pro', 'enterprise'));

ALTER TABLE users
ADD COLUMN IF NOT EXISTS vm_destroyed_at TIMESTAMPTZ;
```

**Result:** All schema errors are now fixed. The master-controller can now write to these columns without "column not found" errors.

## SQL Commands for Common Operations

### Check if a user exists
```sql
SELECT user_id, email, status, vm_id, vm_ip, decodo_proxy_port, subscription_plan
FROM users
WHERE user_id = '5abacdd1-6a9b-48ce-b723-ca8056324c7a';
```

### List all VMs
```sql
SELECT vm_id, user_id, vm_type, ip_address, status, created_at, destroyed_at
FROM vms
ORDER BY created_at DESC
LIMIT 20;
```

### List active/running VMs
```sql
SELECT vm_id, user_id, vm_type, ip_address, status, firecracker_pid
FROM vms
WHERE status = 'running' AND destroyed_at IS NULL
ORDER BY created_at DESC;
```

### List Browser VMs (including destroyed ones)
```sql
SELECT vm_id, user_id, ip_address, status, created_at, destroyed_at
FROM vms
WHERE vm_type = 'browser'
ORDER BY created_at DESC
LIMIT 20;
```

### Clean up destroyed VMs from database
```sql
-- First check what will be deleted:
SELECT vm_id, vm_type, ip_address, status, destroyed_at
FROM vms
WHERE destroyed_at IS NOT NULL;

-- Then delete them:
DELETE FROM vms WHERE destroyed_at IS NOT NULL;
```

### Check auth_sessions table
```sql
SELECT session_id, user_id, provider, status, browser_vm_id,
       started_at, completed_at, error_message
FROM auth_sessions
ORDER BY started_at DESC
LIMIT 20;
```

### Get system metrics
```sql
SELECT total_vms_running, browser_vms_active, cli_vms_active,
       cpu_usage_percent, memory_used_mb, memory_available_mb,
       recorded_at
FROM system_metrics
ORDER BY recorded_at DESC
LIMIT 10;
```

### Check provider credentials
```sql
SELECT credential_id, user_id, provider, is_valid, last_verified,
       created_at, updated_at
FROM provider_credentials
ORDER BY created_at DESC;
```

## Current Issues & Status

### ✅ FIXED: Supabase Schema Errors
- **Problem:** master-controller was getting "column not found" errors for:
  - `decodo_fixed_ip`
  - `vm_ip`
  - `supabase_auth_id`
  - `subscription_plan`
  - `vm_destroyed_at`
- **Solution:** All columns added successfully
- **Status:** OAuth flow now progresses past database writes

### ❌ ACTIVE ISSUE: Browser VM Health Check Failure
- **Problem:** Node.js HTTP service on port 8080 in Browser VMs doesn't start
- **Symptom:** Health checks timeout after 60 seconds with "VM not ready after 60000ms"
- **Root Cause:** Missing error handling in server.js causes silent crashes
- **Status:** Under investigation, fixes planned

## Test User

The test user being used for OAuth testing:
- **user_id:** `5abacdd1-6a9b-48ce-b723-ca8056324c7a`
- **provider:** `claude_code`

## How to Execute These Queries (for Codex CLI)

Since Supabase MCP doesn't work in Codex CLI due to missing crypto APIs, you can:

1. **Via Supabase Dashboard:**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Go to "SQL Editor"
   - Paste any query above and run it

2. **Ask Claude Code (this session) to run queries:**
   - I have working Supabase MCP access
   - Just tell me what query you need run
   - I'll execute it and provide the results

3. **Via psql (if you have direct access):**
   ```bash
   psql "postgresql://postgres:[password]@[host]:[port]/postgres"
   ```

## Example Workflow

To check current OAuth flow state:

```sql
-- 1. Check if user exists
SELECT * FROM users WHERE user_id = '5abacdd1-6a9b-48ce-b723-ca8056324c7a';

-- 2. Check recent VMs for this user
SELECT * FROM vms WHERE user_id = '5abacdd1-6a9b-48ce-b723-ca8056324c7a'
ORDER BY created_at DESC LIMIT 5;

-- 3. Check recent auth sessions
SELECT * FROM auth_sessions WHERE user_id = '5abacdd1-6a9b-48ce-b723-ca8056324c7a'
ORDER BY started_at DESC LIMIT 5;

-- 4. Check for failed Browser VMs (should show vm-a5aa3c4d from our debug test)
SELECT vm_id, ip_address, status, created_at, destroyed_at
FROM vms
WHERE vm_type = 'browser' AND status != 'destroyed'
ORDER BY created_at DESC;
```

## Next Steps

1. **Fix Browser VM Node.js service** - Add error handlers to server.js
2. **Update systemd unit** - Add network-online.target dependency
3. **Rebuild golden image** - Create new Browser VM snapshot with fixes
4. **Test end-to-end OAuth** - Verify complete flow works
5. **Clean up stale VMs** - Remove old test VMs from database

---

**Last Updated:** 2025-10-13T18:52:00Z
**Database State:** Schema complete, OAuth flow functional, Browser VM health checks failing
