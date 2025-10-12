# Frontend Fix Required - VM Connection Issue

## Current Problem (As Shown in Screenshots)

### What's Happening
1. User completes OAuth successfully
2. Frontend shows "Successfully Connected!" ✅
3. User clicks "Start Chatting"
4. Chat interface shows "Connected to 192.168.100.6" with status "running"
5. **BUG**: 192.168.100.6 is the Browser VM, which has been destroyed!
6. User cannot actually chat because they're connected to wrong VM

### Why This Happens
- Backend creates TWO VMs during OAuth:
  - **CLI VM** (192.168.100.5) - Persistent, runs the AI assistant
  - **Browser VM** (192.168.100.6) - Temporary, for OAuth only
- After OAuth completes, Browser VM is destroyed
- Frontend is incorrectly using the Browser VM's IP from the auth session
- Frontend should be using the CLI VM's IP instead

### Evidence from Production Logs
```
2025-10-12 06:20:53 [INFO]: CLI OAuth flow started
  sessionId: 92a568b6-dd8c-44b5-ab46-8b876ed16351

2025-10-12 06:20:55 [INFO]: Authentication completed
  (OAuth succeeded in 2 seconds)
```

Backend is working perfectly! The issue is purely in frontend VM selection logic.

---

## The Fix

### Files That Need Changes

#### 1. OAuth Completion Handler
**File:** `src/app/connect-cli/[provider]/page.tsx` (or similar connect page)

**Current Code (Incorrect):**
```typescript
// After OAuth completion
const authSession = await getAuthSession(sessionId);
const vmIP = authSession.vm_ip;  // ❌ This is Browser VM IP!
const vmId = authSession.vm_id;  // ❌ This is Browser VM ID!

// User gets connected to destroyed Browser VM
router.push(`/chat?vmId=${vmId}&vmIP=${vmIP}`);
```

**Fixed Code:**
```typescript
// After OAuth completion
const authSession = await getAuthSession(sessionId);

// Fetch user's active CLI VM (NOT the Browser VM from session)
const response = await fetch(`/api/vm/active-cli?userId=${userId}`);
const { cliVM } = await response.json();

if (!cliVM) {
  throw new Error('CLI VM not found after authentication');
}

// Connect to CLI VM
router.push(`/chat?vmId=${cliVM.vmId}&vmIP=${cliVM.ipAddress}`);
```

#### 2. Create New API Endpoint
**File:** `src/app/api/vm/active-cli/route.ts` (NEW FILE)

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Query for user's active CLI VM
    const { data: cliVM, error } = await supabase
      .from('vms')
      .select('vm_id, ip_address, status, created_at')
      .eq('user_id', userId)
      .eq('vm_type', 'cli')
      .eq('status', 'running')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !cliVM) {
      return NextResponse.json(
        { error: 'No active CLI VM found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      cliVM: {
        vmId: cliVM.vm_id,
        ipAddress: cliVM.ip_address,
        status: cliVM.status,
        createdAt: cliVM.created_at
      }
    });
  } catch (error) {
    console.error('Error fetching active CLI VM:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### 3. Update Chat Page
**File:** `src/app/chat/page.tsx` (or wherever chat happens)

**Validate VM on page load:**
```typescript
export default function ChatPage({ searchParams }: { searchParams: any }) {
  const vmId = searchParams.vmId;
  const vmIP = searchParams.vmIP;

  useEffect(() => {
    // Validate this is actually a CLI VM that exists
    async function validateVM() {
      const response = await fetch(`/api/vm/validate?vmId=${vmId}`);
      const data = await response.json();

      if (!data.valid || data.vmType !== 'cli') {
        // Wrong VM! Redirect to get correct one
        const userId = /* get from session */;
        const cliResponse = await fetch(`/api/vm/active-cli?userId=${userId}`);
        const { cliVM } = await cliResponse.json();

        // Redirect to correct VM
        router.push(`/chat?vmId=${cliVM.vmId}&vmIP=${cliVM.ipAddress}`);
      }
    }

    validateVM();
  }, [vmId]);

  return (
    <div>
      {/* Chat UI */}
      <div>Connected to {vmIP}</div>
      {/* ... */}
    </div>
  );
}
```

#### 4. Add VM Validation Endpoint
**File:** `src/app/api/vm/validate/route.ts` (NEW FILE)

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vmId = searchParams.get('vmId');

    if (!vmId) {
      return NextResponse.json({ valid: false, error: 'vmId is required' });
    }

    const supabase = createClient();

    const { data: vm, error } = await supabase
      .from('vms')
      .select('vm_id, vm_type, status')
      .eq('vm_id', vmId)
      .single();

    if (error || !vm) {
      return NextResponse.json({ valid: false, error: 'VM not found' });
    }

    return NextResponse.json({
      valid: true,
      vmType: vm.vm_type,
      status: vm.status,
      isRunning: vm.status === 'running',
      isCLI: vm.vm_type === 'cli'
    });
  } catch (error) {
    console.error('Error validating VM:', error);
    return NextResponse.json({ valid: false, error: 'Validation failed' });
  }
}
```

---

## Alternative Quick Fix (If Above Is Too Complex)

### Simplest Fix: Update Auth Session API

**File:** `src/app/api/auth/session/[sessionId]/route.ts`

**Add this at the end of the GET handler:**
```typescript
export async function GET(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  // ... existing code to get auth session ...

  // If session is completed, return CLI VM info instead of Browser VM
  if (authSession.status === 'completed') {
    const supabase = createClient();

    // Get user's CLI VM
    const { data: cliVM } = await supabase
      .from('vms')
      .select('vm_id, ip_address')
      .eq('user_id', authSession.user_id)
      .eq('vm_type', 'cli')
      .eq('status', 'running')
      .single();

    if (cliVM) {
      // Replace Browser VM info with CLI VM info
      authSession.vm_id = cliVM.vm_id;
      authSession.vm_ip = cliVM.ip_address;
    }
  }

  return NextResponse.json(authSession);
}
```

This way, when frontend queries the auth session after completion, it automatically gets CLI VM info instead of Browser VM info.

---

## Testing the Fix

### 1. Test OAuth Flow
```bash
# Start OAuth
curl -X POST http://192.168.5.82:4000/api/auth/start \
  -H 'Content-Type: application/json' \
  -d '{"userId":"5abacdd1-6a9b-48ce-b723-ca8056324c7a","provider":"claude_code"}'
```

### 2. Check Which VMs Were Created
```bash
# Query database
curl "http://192.168.5.82:4000/api/vm/list?userId=5abacdd1-6a9b-48ce-b723-ca8056324c7a" | jq .

# Should show:
# - CLI VM: status="running", vm_type="cli", ip_address="192.168.100.X"
# - Browser VM: status="destroyed", vm_type="browser"
```

### 3. Test New API Endpoint
```bash
# Get user's active CLI VM
curl "http://192.168.5.82:3000/api/vm/active-cli?userId=5abacdd1-6a9b-48ce-b723-ca8056324c7a" | jq .

# Should return:
# {
#   "cliVM": {
#     "vmId": "vm-xxx...",
#     "ipAddress": "192.168.100.5",
#     "status": "running"
#   }
# }
```

### 4. Verify Chat Connects to CLI VM
1. Complete OAuth flow in browser
2. Click "Start Chatting"
3. Check URL: `http://localhost:3000/chat?vmId=vm-xxx&vmIP=192.168.100.5`
4. Verify IP is CLI VM (ends in .5, not .6)
5. Check chat status shows correct IP
6. Send test message to verify VM responds

---

## Database Schema Reference

### VMs Table Structure
```sql
CREATE TABLE vms (
  vm_id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  ip_address TEXT NOT NULL,
  status TEXT NOT NULL,  -- 'running', 'hibernated', 'destroyed'
  vm_type TEXT NOT NULL, -- 'cli', 'browser'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example data after OAuth:
-- vm_id: 3e529ada-51e5-477d-8dab-e1d62dcc314d
-- user_id: 5abacdd1-6a9b-48ce-b723-ca8056324c7a
-- ip_address: 192.168.100.5
-- status: running
-- vm_type: cli
--
-- vm_id: 6cd5652f-2d7a-47ba-bbe2-cc7aa8e8fe2b
-- user_id: 5abacdd1-6a9b-48ce-b723-ca8056324c7a
-- ip_address: 192.168.100.6
-- status: destroyed
-- vm_type: browser
```

### Auth Sessions Table
```sql
CREATE TABLE auth_sessions (
  session_id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  provider TEXT NOT NULL,  -- 'claude_code', 'codex', 'gemini_cli'
  status TEXT NOT NULL,    -- 'pending', 'vm_created', 'completed', 'failed'
  vm_id UUID,              -- Browser VM ID (temporary)
  vm_ip TEXT,              -- Browser VM IP (temporary)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- NOTE: vm_id and vm_ip in auth_sessions refer to BROWSER VM
-- Frontend should NOT use these for chat connection!
```

---

## Why This Bug Happened

### Root Cause
The auth session table stores the Browser VM's info (needed during OAuth), but after OAuth completes:
- Browser VM gets destroyed
- CLI VM continues running
- Frontend was reading Browser VM info from auth session
- Frontend needs to query for CLI VM separately

### Design Pattern
```
Auth Session (temporary)
├── vm_id: Browser VM UUID
└── vm_ip: Browser VM IP (192.168.100.6)
    ↓
    Used during OAuth flow only
    ↓
    After completion, query:
    ↓
VMs Table (persistent)
├── CLI VM: status=running, vm_type=cli, ip=192.168.100.5  ← Use this!
└── Browser VM: status=destroyed, vm_type=browser, ip=192.168.100.6
```

---

## Implementation Priority

### Priority 1 (Must Fix Now)
1. Create `/api/vm/active-cli` endpoint
2. Update OAuth completion to use CLI VM instead of Browser VM

### Priority 2 (Should Fix Soon)
3. Add VM validation endpoint
4. Update chat page to validate VM on load

### Priority 3 (Nice to Have)
5. Add UI warning if user tries to connect to destroyed VM
6. Auto-recover by fetching correct CLI VM

---

## Summary

**The Problem:** Frontend connects to wrong VM (destroyed Browser VM instead of persistent CLI VM)

**The Fix:** Query database for user's CLI VM after OAuth completion, use that instead of auth session's VM info

**Files to Change:**
- `src/app/connect-cli/[provider]/page.tsx` - Update OAuth completion logic
- `src/app/api/vm/active-cli/route.ts` - NEW: Get user's CLI VM
- `src/app/api/vm/validate/route.ts` - NEW: Validate VM is correct type
- `src/app/chat/page.tsx` - Add VM validation on load

**Expected Result:** After OAuth, user connects to CLI VM (192.168.100.5) instead of destroyed Browser VM (192.168.100.6)

---

**Document Created:** 2025-10-12
**Status:** URGENT - Frontend fix required for chat to work
**Estimated Fix Time:** 30-60 minutes
