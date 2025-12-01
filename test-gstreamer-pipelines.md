# GStreamer Pipeline Syntax Error - Root Cause Analysis

## Current Status (2025-11-08 01:16 UTC)

### ✅ Confirmed Working:
- Node.js spawn() argument passing is CORRECT
- Entire GStreamer pipeline passed as single string argument
- GStreamer binary (`gst-launch-1.0`) exists and executes

### ❌ Problem:
GStreamer fails with minimal error output:
```
[GStreamer STDERR] WARNING: erroneous pipeline: syntax error
[GStreamer] Process exited with code: 1
```

### Current Pipeline Being Tested:
```bash
gst-launch-1.0 -v ximagesrc ! video/x-raw,framerate=30/1 ! videoscale ! video/x-raw,width=1280,height=720 ! vp8enc target-bitrate=2000000 deadline=1 cpu-used=4 ! rtpvp8pay ! fakesink
```

## Hypothesis: Shell Escaping Issue

**Theory**: When `spawn()` passes the pipeline string to `gst-launch-1.0`, the `!` characters might be interpreted differently than when typing directly in shell.

### Test Plan:

1. **Test 1: Minimal Pipeline (no properties)**
   ```bash
   gst-launch-1.0 fakesrc ! fakesink
   ```

2. **Test 2: ximagesrc without properties**
   ```bash
   gst-launch-1.0 ximagesrc ! fakesink
   ```

3. **Test 3: ximagesrc with caps (framerate only)**
   ```bash
   gst-launch-1.0 ximagesrc ! video/x-raw,framerate=30/1 ! fakesink
   ```

4. **Test 4: Add videoscale**
   ```bash
   gst-launch-1.0 ximagesrc ! videoscale ! fakesink
   ```

5. **Test 5: Full chain without encoding**
   ```bash
   gst-launch-1.0 ximagesrc ! video/x-raw,framerate=30/1 ! videoscale ! video/x-raw,width=1280,height=720 ! fakesink
   ```

6. **Test 6: Add vp8enc (identify which property fails)**
   ```bash
   gst-launch-1.0 ximagesrc ! video/x-raw ! vp8enc ! fakesink
   ```

7. **Test 7: vp8enc with properties one by one**
   - `vp8enc target-bitrate=2000000`
   - `vp8enc deadline=1`
   - `vp8enc cpu-used=4`

## Alternative Approaches if Pipeline Syntax Can't Be Fixed:

### Option A: Use `gst-inspect-1.0` to verify elements exist
```bash
gst-inspect-1.0 ximagesrc
gst-inspect-1.0 vp8enc
gst-inspect-1.0 videoscale
gst-inspect-1.0 rtpvp8pay
```

### Option B: Use GStreamer's Python bindings instead of gst-launch-1.0
- Install `python3-gst-1.0`
- Build pipeline programmatically (avoids shell escaping)

### Option C: Use `webrtcbin` element (more robust for WebRTC)
Instead of `gst-launch-1.0`, use GStreamer's native WebRTC bin which handles:
- ICE candidates
- DTLS
- RTP/RTCP
- Codec negotiation

Example:
```javascript
const pipeline = `webrtcbin name=rtc ! fakesink
                  ximagesrc ! video/x-raw ! queue ! vp8enc ! rtpvp8pay ! rtc.`;
```

## Next Immediate Step:

Since we can't SSH into VMs, the fastest way to test is to:

1. Modify `vm-browser-agent/webrtc-server.js` to test simpler pipelines
2. Deploy the changes to the golden rootfs
3. Create a new VM and test

OR

4. Check if GStreamer is being invoked with proper environment (DISPLAY, PATH, etc.)
5. Verify GStreamer version compatibility (Ubuntu 22.04 ships with GStreamer 1.20)

## Critical Question:

**Why does GStreamer provide NO detailed error?**

Possible reasons:
1. GStreamer crashes before error reporting initializes
2. The `-v` (verbose) flag isn't working
3. Shell escaping mangles the pipeline before GStreamer sees it
4. GStreamer version incompatibility

## Recommended Action:

Test the SIMPLEST possible pipeline first:
```javascript
const gstPipeline = [
  'gst-launch-1.0',
  'fakesrc ! fakesink'
];
```

If this fails with the same "syntax error", then the problem is NOT with the pipeline syntax but with how `spawn()` invokes GStreamer.
