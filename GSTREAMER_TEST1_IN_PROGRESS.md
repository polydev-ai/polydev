# GStreamer Test 1 - Incremental Pipeline Testing (IN PROGRESS)

**Status**: Test 1 BYPASS - Golden Rootfs Rebuild Running
**Started**: 2025-11-08 06:12 UTC
**Expected Completion**: ~06:27 UTC (15 minutes)
**Build PID**: 2019079

## What's Happening

I've deployed **Test 1: Minimal Pipeline (fakesrc ! fakesink)** with **BYPASS MODE** to isolate the GStreamer syntax error root cause.

### CRITICAL DISCOVERY

**Test 1 was never actually executed!** When examining VMs created from the earlier Test 1 snapshot, I discovered the WebRTC server was getting stuck at `waitForOffer()` and timing out after 60 seconds, **never reaching** `startGStreamer()`.

The workflow was:
1. ✅ Fetch ICE servers
2. ⚠️ **Wait for client offer (60s timeout)** ← BLOCKS HERE
3. ❌ Create answer ← NEVER REACHED
4. ❌ Send answer ← NEVER REACHED
5. ❌ **Start GStreamer** ← NEVER REACHED

### The Fix: BYPASS MODE

I modified `webrtc-server.js` to skip the entire WebRTC signaling exchange:

```javascript
async start() {
  // TEST 1 BYPASS: Skip WebRTC signaling and go directly to GStreamer testing
  console.log('[TEST 1] BYPASS MODE: Skipping offer/answer exchange');
  console.log('[TEST 1] Starting GStreamer pipeline immediately for testing...');

  // Start GStreamer for screen capture
  await this.startGStreamer();
  // ...
}
```

This allows Test 1 to execute immediately on VM boot without waiting for a WebRTC client connection.

### Test Strategy

Created 9 incremental test pipelines (from simplest to most complex):

1. ✅ **Test 1: `fakesrc ! fakesink`** ← Currently building
2. Test 2: `ximagesrc ! fakesink`
3. Test 3: `ximagesrc ! video/x-raw,framerate=30/1 ! fakesink`
4. Test 4: `ximagesrc ! videoscale ! fakesink`
5. Test 5: Full capture chain without encoding
6. Test 6: `ximagesrc ! video/x-raw,framerate=30/1 ! vp8enc ! fakesink`
7. Test 7: vp8enc with target-bitrate only
8. Test 8: Full pipeline without RTP
9. Test 9: Full production pipeline

### Why Test 1 is Critical

**If Test 1 SUCCEEDS:**
- ✅ spawn() invocation is working correctly
- ✅ GStreamer is installed and functional
- ❌ **Problem is with pipeline syntax** (ximagesrc, vp8enc, or caps)
- → Continue with Test 2, 3, 4... to identify exact failing element

**If Test 1 FAILS:**
- ❌ spawn() invocation has issues OR
- ❌ GStreamer is not installed/broken OR
- ❌ Environment issue (PATH, permissions, etc.)
- → Need to investigate GStreamer installation in VMs

### Build Progress

- [x] Deployed Test 1 webrtc-server.js to `/opt/master-controller/vm-browser-agent/`
- [x] Started golden rootfs rebuild (PID 1981615)
- [ ] Build completion (~10-15 minutes)
- [ ] Create test VM
- [ ] Check console logs for GStreamer output
- [ ] Analyze results

### Expected Results

**Success Output:**
```
[DEBUG] GStreamer command line: gst-launch-1.0 -v fakesrc ! fakesink
[DEBUG] GStreamer args array: ["-v", "fakesrc ! fakesink"]
[WebRTC] GStreamer pipeline started (PID: XXXX)
(GStreamer runs successfully without syntax error)
```

**Failure Output:**
```
[DEBUG] GStreamer command line: gst-launch-1.0 -v fakesrc ! fakesink
[DEBUG] GStreamer args array: ["-v", "fakesrc ! fakesink"]
[WebRTC] GStreamer pipeline started (PID: XXXX)
[GStreamer STDERR] WARNING: erroneous pipeline: syntax error
[GStreamer] Process exited with code: 1
```

## Previous Findings

From earlier investigation:
- ✅ spawn() passes entire pipeline as one string argument (CORRECT)
- ✅ GStreamer binary executes (no ENOENT error)
- ❌ Current pipeline fails with NO detailed error:
  ```
  [GStreamer STDERR] WARNING: erroneous pipeline: syntax error
  ```

This is highly unusual - GStreamer normally provides detailed errors like:
```
ERROR: no element "ximagesrc"
ERROR: property "invalid-prop" not found in element "vp8enc"
ERROR: could not link element "videoscale" to "vp8enc"
```

## Next Actions

1. **Wait 15 minutes** for golden rootfs rebuild to complete
2. **Create test VM** to boot from new golden snapshot
3. **Examine console logs** for GStreamer Test 1 output
4. **Based on Test 1 results:**
   - If SUCCESS → Deploy Test 2, continue incrementally
   - If FAILURE → Investigate GStreamer installation/environment

## Files Created

- `/Users/venkat/Documents/polydev-ai/test-gstreamer-incremental.js` - Test file generator
- `/Users/venkat/Documents/polydev-ai/vm-browser-agent/webrtc-server-test1.js` - Test 1 pipeline
- `/Users/venkat/Documents/polydev-ai/vm-browser-agent/webrtc-server-test2.js` - Test 2 pipeline
- ... (through test9.js)

## Build Log Location

VPS: `/tmp/golden-build-test1-20251108-XXXXXX.log`

---

**Last Updated**: 2025-11-08 05:38 UTC
**Build PID**: 1981615
**Status**: Debootstrap phase (minute 1 of ~15)
