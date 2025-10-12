# CLI Smart Caching Implementation - Complete Guide

## ✅ **Both Options Successfully Implemented**

### **Option 1: Simplified SmartCliCache (Server-Side) ✅**
### **Option 2: Smart Local Refresh (Stdio-Wrapper) ✅**

---

## **🏗️ Architecture Overview**

### **Two-Layer Caching System**

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: Local Machine (Stdio-Wrapper)                      │
│ - Detects CLI tools locally                                 │
│ - Smart refresh scheduler (1-minute checks)                 │
│ - Only refreshes stale CLIs based on smart timeouts         │
│ - Updates database with fresh status                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ DATABASE (cli_provider_configurations)                      │
│ - Single source of truth                                    │
│ - Stores CLI status with timestamps                         │
│ - Updated by stdio-wrapper only                             │
│ - Read by SmartCliCache                                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ LAYER 2: Remote Server (SmartCliCache)                      │
│ - Reads CLI status from database                            │
│ - Detects stale data for monitoring                         │
│ - Returns current data immediately                          │
│ - No refresh capability (by design)                         │
└─────────────────────────────────────────────────────────────┘
```

---

## **🔄 Complete Data Flow**

### **Phase 1: Stdio-Wrapper Startup**

```javascript
// When stdio-wrapper starts:
async start() {
  // 1. Run initial CLI detection
  await this.localForceCliDetection({});
  
  // 2. Start smart refresh scheduler
  this.startSmartRefreshScheduler();
  
  // 3. Listen for MCP requests
  // ...
}
```

**What happens:**
1. ✅ Detects all CLI tools (claude_code, codex_cli, gemini_cli)
2. ✅ Saves status to local file (`~/.polydev/cli-status.json`)
3. ✅ Updates database via `/api/cli-status-update`
4. ✅ Starts 1-minute interval scheduler

### **Phase 2: Smart Refresh Scheduler (Every 60 Seconds)**

```javascript
startSmartRefreshScheduler() {
  setInterval(async () => {
    // 1. Load current status from local file
    const currentStatus = await this.loadLocalCliStatus();
    
    // 2. Check which CLIs are stale
    const staleProviders = [];
    for (const [providerId, status] of Object.entries(currentStatus)) {
      if (this.isStale(status)) {
        staleProviders.push({ providerId, minutesOld, timeout });
      }
    }
    
    // 3. Only refresh stale CLIs
    if (staleProviders.length > 0) {
      for (const { providerId } of staleProviders) {
        await this.localForceCliDetection({ provider_id: providerId });
      }
    }
  }, 60000); // Every 60 seconds
}
```

**Smart Timeout Logic:**
| CLI Status | Timeout | Check Frequency |
|------------|---------|-----------------|
| Unavailable | 2 min | Every 2 minutes |
| Unauthenticated | 3 min | Every 3 minutes |
| Fallback Mode | 5 min | Every 5 minutes |
| Stable/Working | 10 min | Every 10 minutes |

**Example Scenario:**
```
Time 0:00 - Initial detection
  - claude_code: available, authenticated → timeout = 10 min
  - codex_cli: unavailable → timeout = 2 min
  - gemini_cli: available, not authenticated → timeout = 3 min

Time 0:01 - Scheduler check #1
  - All fresh, no refresh needed

Time 0:02 - Scheduler check #2
  - codex_cli is stale (2 min old, timeout = 2 min)
  - Refresh only codex_cli
  - claude_code and gemini_cli still fresh

Time 0:03 - Scheduler check #3
  - gemini_cli is stale (3 min old, timeout = 3 min)
  - Refresh only gemini_cli
  - claude_code still fresh (only 3 min old, timeout = 10 min)

Time 0:10 - Scheduler check #10
  - claude_code is stale (10 min old, timeout = 10 min)
  - Refresh only claude_code
```

### **Phase 3: Server-Side Routing (Route.ts)**

```typescript
// When user calls get_perspectives:
async function callPerspectivesAPI(args, user) {
  // 1. Initialize SmartCliCache (read-only)
  const smartCache = new SmartCliCache(serviceRoleSupabase);
  
  // 2. Get CLI status from database
  const cliConfigs = await smartCache.getCliStatusWithCache(user.id);
  
  // 3. Get summary statistics
  const cliSummary = smartCache.getClimiStatusSummary(cliConfigs);
  
  // 4. For each model, check if CLI is available
  for (const model of models) {
    const apiKeyForModel = apiKeys.find(key => key.default_model === model);
    const providerName = apiKeyForModel.provider;
    
    // Map provider to CLI tool
    const cliToolName = providerToCliMap[providerName.toLowerCase()];
    
    // Check CLI availability from database
    const cliConfig = cliConfigs.find(config => 
      config.provider === cliToolName && 
      config.status === 'available' && 
      config.authenticated === true
    );
    
    if (cliConfig) {
      // CLI available - skip API key
      return {
        model,
        provider: `${providerName} (CLI Available)`,
        content: `Local CLI tool ${cliToolName} is available...`,
        cli_available: true
      };
    } else {
      // CLI not available - use API key
      // Continue with normal API key flow
    }
  }
}
```

---

## **🎯 Key Benefits of This Implementation**

### **1. No Circular Dependencies**
- ✅ Stdio-wrapper writes to database (one-way)
- ✅ SmartCliCache reads from database (one-way)
- ✅ No server-to-local communication
- ✅ Clean separation of concerns

### **2. Intelligent Resource Usage**
- ✅ Only refreshes stale CLIs (not all CLIs every time)
- ✅ Smart timeouts based on CLI reliability
- ✅ Minimal database queries
- ✅ Efficient local file caching

### **3. Real-Time Updates**
- ✅ Initial detection on startup
- ✅ Periodic smart refresh (every 60 seconds)
- ✅ Immediate database updates
- ✅ Fresh data for routing decisions

### **4. Graceful Degradation**
- ✅ Works even if database update fails
- ✅ Local file cache as backup
- ✅ Continues with stale data if needed
- ✅ Comprehensive error logging

---

## **📊 Smart Timeout Strategy Explained**

### **Why Different Timeouts?**

#### **Unavailable CLI (2 minutes)**
**Reason:** User might install CLI tool at any time
**Behavior:** Check frequently to detect new installations quickly
**Example:** User installs Claude Code → Detected within 2 minutes

#### **Unauthenticated CLI (3 minutes)**
**Reason:** User might authenticate CLI tool
**Behavior:** Check for authentication completion
**Example:** User runs `claude auth login` → Detected within 3 minutes

#### **Fallback Mode (5 minutes)**
**Reason:** Interactive model detection might succeed on retry
**Behavior:** Retry model detection periodically
**Example:** CLI becomes responsive → Models detected within 5 minutes

#### **Stable/Working CLI (10 minutes)**
**Reason:** CLI is working reliably, no need for frequent checks
**Behavior:** Minimize unnecessary CLI detection overhead
**Example:** Claude Code working perfectly → Only check every 10 minutes

---

## **🔍 How to Verify It's Working**

### **1. Check Local File Cache**
```bash
cat ~/.polydev/cli-status.json
```

**Expected output:**
```json
{
  "last_updated": "2025-09-30T23:45:00.000Z",
  "results": {
    "claude_code": {
      "available": true,
      "authenticated": true,
      "version": "1.2.3",
      "default_model": "claude-3-5-sonnet",
      "available_models": ["claude-3-5-sonnet", "claude-3-sonnet"],
      "model_detection_method": "interactive",
      "last_checked": "2025-09-30T23:45:00.000Z"
    },
    "codex_cli": {
      "available": false,
      "authenticated": false,
      "error": "CLI not installed",
      "last_checked": "2025-09-30T23:45:00.000Z"
    },
    "gemini_cli": {
      "available": true,
      "authenticated": false,
      "version": "0.5.0",
      "last_checked": "2025-09-30T23:45:00.000Z"
    }
  }
}
```

### **2. Check Stdio-Wrapper Logs**
```bash
# Look for these log messages:
[Stdio Wrapper] Starting smart refresh scheduler...
[Stdio Wrapper] Smart refresh scheduler started (checks every 60 seconds)
[Stdio Wrapper] Smart refresh: 1 stale CLI providers detected
[Stdio Wrapper] - codex_cli: 3 min old (timeout: 2 min)
[Stdio Wrapper] Refreshing codex_cli...
[Stdio Wrapper] Smart refresh completed
```

### **3. Check Server Logs (Route.ts)**
```bash
# Look for these log messages:
[Smart Cache] 1 CLI configs are stale (will be refreshed by stdio-wrapper)
[Smart Cache] - codex_cli: 3 min old (timeout: 2 min)
[MCP] ✅ CLI tool claude_code is available and authenticated - SKIPPING API key for anthropic
[MCP] ⚠️ CLI tool codex_cli found in database but not available/authenticated - using API keys
```

---

## **🚀 Implementation Summary**

### **Option 1: SmartCliCache (Server) ✅**
**File:** `src/lib/smartCliCache.ts`

**Changes:**
- ✅ Removed `refreshStaleConfigs()` method
- ✅ Removed `updateCliStatus()` method
- ✅ Removed `getUserToken()` method
- ✅ Simplified `getCliStatusWithCache()` to read-only
- ✅ Kept `isStale()` for monitoring
- ✅ Kept smart timeout logic
- ✅ Added comprehensive logging

**Result:** Clean, read-only cache that detects stale data but doesn't try to refresh it

### **Option 2: Smart Local Refresh (Stdio-Wrapper) ✅**
**File:** `mcp/stdio-wrapper.js`

**Changes:**
- ✅ Added `loadLocalCliStatus()` method
- ✅ Added `getSmartTimeout()` method (same logic as SmartCliCache)
- ✅ Added `isStale()` method (same logic as SmartCliCache)
- ✅ Added `startSmartRefreshScheduler()` method
- ✅ Added `stopSmartRefreshScheduler()` method
- ✅ Modified `start()` to run initial detection and start scheduler
- ✅ Modified signal handlers to stop scheduler on shutdown

**Result:** Intelligent local refresh that only updates stale CLIs based on smart timeouts

---

## **✅ Final Verification**

### **No Circular Dependencies:**
1. **Stdio-wrapper** → **Database** (write-only)
2. **SmartCliCache** → **Database** (read-only)
3. **No communication** between stdio-wrapper and SmartCliCache
4. **Database** is single source of truth

### **Efficient Resource Usage:**
1. **Smart timeouts** prevent excessive CLI detection
2. **Only stale CLIs** are refreshed
3. **Async operations** don't block requests
4. **Local file caching** reduces database queries

### **Reliable Operation:**
1. **Initial detection** on startup
2. **Periodic smart refresh** every 60 seconds
3. **Graceful error handling** throughout
4. **Comprehensive logging** for debugging

---

## **🎉 Implementation Complete!**

Both options are now working correctly:
- ✅ **Option 1**: SmartCliCache simplified to read-only
- ✅ **Option 2**: Smart local refresh in stdio-wrapper
- ✅ **No circular loops**
- ✅ **Efficient caching**
- ✅ **Real-time updates**
- ✅ **Intelligent timeouts**

The system now properly handles CLI status caching with local refresh capabilities!
