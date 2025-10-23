# Admin Dashboard 403 Forbidden Fix - COMPLETE ✅

## Problem Summary

Admin dashboard at `http://localhost:3001/dashboard/admin` was returning 403 Forbidden errors on all admin API endpoints for user `gvsfans@gmail.com` (admin user).

### Affected Endpoints
- `/api/admin/stats` - 403 → 500 → 200 ✅
- `/api/admin/vms` - 403 → 200 ✅
- `/api/admin/health/system` - 403 → 200 ✅

## Root Cause

**Supabase Row Level Security (RLS) Infinite Recursion**

The `users` table had RLS policies that created an infinite recursion loop:
1. Admin routes tried to check user's `tier` column to verify admin access
2. Querying the `users` table triggered the RLS policy
3. The RLS policy checked the user's tier to determine access
4. This triggered another query to `users` table
5. Infinite loop → PostgreSQL error code `42P17`

```javascript
// Error from Supabase
{
  code: '42P17',
  message: 'infinite recursion detected in policy for relation "users"'
}
```

## Solution

Use `createAdminClient()` with Supabase service role key to bypass RLS policies when checking admin access.

### Code Pattern Applied

**Before (Broken):**
```typescript
const supabase = await createClient(); // Uses anon key, subject to RLS
const { data: profile } = await supabase
  .from('users')
  .select('tier')
  .eq('user_id', user.id)
  .single();
// Returns null with infinite recursion error
```

**After (Fixed):**
```typescript
const adminClient = createAdminClient(); // Uses service role key, bypasses RLS
const { data: profile } = await adminClient
  .from('users')
  .select('tier')
  .eq('user_id', user.id)
  .single();
// Returns { tier: 'admin' } successfully
```

## Files Modified

### 1. Core Admin Helper
**File:** `src/lib/admin-health-helper.ts`
- Added `createAdminClient` import
- Changed tier check to use admin client
- Used by 7 health monitoring endpoints

### 2. Admin API Routes (15 files total)

All routes updated to use `createAdminClient()` for tier verification:

#### Main Routes
- `src/app/api/admin/stats/route.ts` - **Also fixed endpoint path** from `/api/admin/stats` to `/api/admin/system/stats`
- `src/app/api/admin/users/route.ts`
- `src/app/api/admin/vms/route.ts`
- `src/app/api/admin/vms/[vmId]/route.ts`

#### Health Monitoring
- `src/app/api/admin/health/system/route.ts`

#### Analytics & Credits
- `src/app/api/admin/analytics/route.ts`
- `src/app/api/admin/credits/route.ts`

#### Bonuses
- `src/app/api/admin/bonuses/delete/route.ts`
- `src/app/api/admin/bonuses/grant/route.ts`
- `src/app/api/admin/bonuses/list/route.ts`

#### Models & Providers
- `src/app/api/admin/models/list/route.ts`
- `src/app/api/admin/providers/list/route.ts`

#### Pricing & Users
- `src/app/api/admin/pricing/sync-stripe/route.ts`
- `src/app/api/admin/users/list/route.ts`

## Additional Fix: Stats Endpoint Path

**Problem:** Frontend was calling `/api/admin/stats` but master controller has `/api/admin/system/stats`

**Fix in:** `src/app/api/admin/stats/route.ts`
```typescript
// Changed from:
const response = await fetch(`${MASTER_CONTROLLER_URL}/api/admin/stats`);

// To:
const response = await fetch(`${MASTER_CONTROLLER_URL}/api/admin/system/stats`);
```

## Verification

### Database Check ✅
```sql
SELECT user_id, email, tier FROM users WHERE email = 'gvsfans@gmail.com';
```
Result:
```
user_id: 5abacdd1-6a9b-48ce-b723-ca8056324c7a
email: gvsfans@gmail.com
tier: admin
```

### Terminal Logs After Fix ✅
```
[Admin Stats] Checking admin access for user: 5abacdd1-6a9b-48ce-b723-ca8056324c7a
[Admin Stats] Profile query result: { profile: { tier: 'admin' }, profileError: null }
[Admin Stats] Access granted - user is admin
GET /api/admin/health/system 200 in 156ms ✅
GET /api/admin/vms 200 in 89ms ✅
GET /api/admin/stats 200 in 234ms ✅
```

### Master Controller Response ✅
```bash
curl http://135.181.138.102:4000/api/admin/system/stats
```
```json
{
  "statistics": {
    "totalUsers": 8,
    "totalVMs": 93,
    "activeVMs": 1,
    "runningVMs": 1,
    "hibernatedVMs": 0,
    "totalPrompts": 0,
    "timestamp": "2025-10-20T23:43:20.793Z"
  }
}
```

## Technical Details

### Supabase Client Types

**1. Regular Client (Subject to RLS)**
```typescript
createClient() // Uses NEXT_PUBLIC_SUPABASE_ANON_KEY
```
- For user-authenticated requests
- Subject to Row Level Security policies
- Can cause infinite recursion when checking own permissions

**2. Admin Client (Bypasses RLS)**
```typescript
createAdminClient() // Uses SUPABASE_SERVICE_ROLE_KEY
```
- For server-side admin operations
- Bypasses all RLS policies
- Full database access
- Should NEVER be exposed to client

### Environment Variables Required
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... # Required for createAdminClient
```

## Debugging Journey

1. ❌ **First attempt:** Thought it was wrong table/column (profiles.role vs users.tier)
   - Fixed table references but issue persisted

2. ❌ **Second attempt:** Suspected Next.js cache
   - Killed multiple dev servers and restarted
   - Issue persisted

3. ❌ **Third attempt:** Added debug logging
   - Revealed the actual error: RLS infinite recursion

4. ✅ **Fourth attempt:** Used service role client to bypass RLS
   - **SUCCESS!** All admin endpoints now return 200

## Status: COMPLETE ✅

All admin dashboard endpoints are now working:
- ✅ Authentication fixed (403 → 200)
- ✅ Stats endpoint path corrected
- ✅ VM listing working
- ✅ Health monitoring working
- ✅ All 15 admin routes secured with proper tier checks

## Remaining Tasks

1. ✅ ~~Remove debug logging~~ - COMPLETED
2. **Test remote CLI admin access** to verify those endpoints also work now

## Lessons Learned

1. **RLS policies can create infinite recursion** when checking permissions on the same table being queried
2. **Service role client bypasses RLS** and is essential for admin operations that check permissions
3. **Always check actual error messages** in logs rather than assuming the cause
4. **Master controller endpoints may differ** from expected Next.js API route names
