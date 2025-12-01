# Chrome DevTools MCP - Integration Guide

**Status**: ✅ Installed at `/Users/venkat/mcp-execution/node_modules/chrome-devtools-mcp`
**Package**: `chrome-devtools-mcp@0.10.2`
**Binary**: `./build/src/index.js`

---

## ✅ What Was Done

1. **Installed Package**:
```bash
cd /Users/venkat/mcp-execution
npm install chrome-devtools-mcp
# Result: added 1 package
```

---

## 🔧 What Still Needs to Be Done

### Step 1: Add to Config

Edit `/Users/venkat/mcp-execution/src/config.ts`:

```typescript
export const serverConfigs = [
  // ... existing servers ...
  {
    name: 'chrome-devtools',
    command: 'node',
    args: ['./node_modules/chrome-devtools-mcp/build/src/index.js'],
    env: {}
  }
];
```

### Step 2: Create Server Wrapper

Create `/Users/venkat/mcp-execution/src/servers/chrome/index.ts`:

```typescript
import { callMCPTool, initializeServer } from '../../client.js';

const SERVER_NAME = 'chrome-devtools';

export async function initialize() {
  await initializeServer(SERVER_NAME);
}

export async function navigate(url: string) {
  return await callMCPTool(SERVER_NAME, 'chrome_navigate', { url });
}

export async function screenshot(options?: {}) {
  return await callMCPTool(SERVER_NAME, 'chrome_screenshot', options || {});
}

export async function click(selector: string) {
  return await callMCPTool(SERVER_NAME, 'chrome_click', { selector });
}

export async function evaluate(script: string) {
  return await callMCPTool(SERVER_NAME, 'chrome_evaluate', { script });
}

export async function getConsoleLogs() {
  return await callMCPTool(SERVER_NAME, 'chrome_console_logs', {});
}
```

### Step 3: Export in Index

Edit `/Users/venkat/mcp-execution/src/index.ts`:

Add:
```typescript
export * as chrome from './servers/chrome/index.js';
```

### Step 4: Build

```bash
cd /Users/venkat/mcp-execution
npm run build
```

---

## 🚀 How to Use (After Integration)

### Basic Usage

```javascript
const { chrome } = require('~/mcp-execution/dist/index.js');

await chrome.initialize();

// Navigate to page
await chrome.navigate('http://localhost:3000/dashboard/remote-cli/auth');

// Wait for page to load
await new Promise(r => setTimeout(r, 5000));

// Take screenshot
const screenshot = await chrome.screenshot();
console.log('Screenshot:', screenshot);

// Get iframe src
const iframeSrc = await chrome.evaluate(`
  document.querySelector('iframe')?.src
`);
console.log('noVNC iframe URL:', iframeSrc);

// Get console errors
const logs = await chrome.getConsoleLogs();
console.log('Browser console:', logs);
```

### Debug VNC Display Issue

```javascript
const { chrome } = require('~/mcp-execution/dist/index.js');

await chrome.initialize();

// 1. Navigate
await chrome.navigate('http://localhost:3000/dashboard/remote-cli/auth');

// 2. Wait for VM creation (180s with new timeout)
console.log('Waiting for VM to be created...');
await new Promise(r => setTimeout(r, 180000));

// 3. Check iframe
const iframeInfo = await chrome.evaluate(\`
  const iframe = document.querySelector('iframe[title*="VM Desktop"]');
  if (iframe) {
    return {
      src: iframe.src,
      width: iframe.clientWidth,
      height: iframe.clientHeight,
      visible: iframe.style.display !== 'none'
    };
  }
  return null;
\`);

console.log('iframe Info:', iframeInfo);

// 4. Take screenshot of the page
const screenshot = await chrome.screenshot({fullPage: true});
console.log('Screenshot taken:', screenshot);

// 5. Get all errors
const errors = await chrome.evaluate(\`
  window.consoleErrors || []
\`);

console.log('Console errors:', errors);
```

---

## 📋 Available Chrome DevTools MCP Tools

Based on the package, these tools should be available:

1. **chrome_navigate** - Navigate to URL
2. **chrome_screenshot** - Take screenshot
3. **chrome_click** - Click element
4. **chrome_evaluate** - Run JavaScript
5. **chrome_console_logs** - Get console logs
6. **chrome_get_element** - Get element info
7. **chrome_type** - Type text
8. **chrome_wait** - Wait for element/timeout

Check README: `/Users/venkat/mcp-execution/node_modules/chrome-devtools-mcp/README.md`

---

## 🎯 Immediate Use Cases

### Test 1: Verify Page Loads
```javascript
await chrome.navigate('http://localhost:3000/dashboard/remote-cli/auth');
const screenshot = await chrome.screenshot();
// ACTUALLY SEE if the page loads correctly
```

### Test 2: Check noVNC Connection
```javascript
// After waiting for VM creation
const vncDisplay = await chrome.evaluate(\`
  const canvas = document.querySelector('canvas');
  return {
    width: canvas?.width,
    height: canvas?.height,
    visible: canvas && canvas.offsetWidth > 0
  };
\`);
console.log('VNC Canvas:', vncDisplay);
```

### Test 3: Verify Actual Display Size
```javascript
const displayInfo = await chrome.evaluate(\`
  // Check noVNC's internal state
  const canvas = document.querySelector('canvas');
  return {
    canvasWidth: canvas?.width,
    canvasHeight: canvas?.height,
    displayedWidth: canvas?.offsetWidth,
    displayedHeight: canvas?.offsetHeight
  };
\`);
console.log('Display resolution:', displayInfo);
```

---

## 🚨 Critical: What This Enables

**BEFORE** (without browser automation):
- ❌ Guess what's happening
- ❌ Ask user to test repeatedly
- ❌ Can't see actual display
- ❌ Can't verify fixes

**AFTER** (with Chrome DevTools MCP):
- ✅ See actual browser state
- ✅ Take screenshots of issues
- ✅ Read console errors directly
- ✅ Test fixes immediately
- ✅ Verify before claiming success

---

## 💡 Next Steps

1. **Integrate** (add to config.ts, create wrapper, build)
2. **Test** localhost:3000 page with browser automation
3. **Debug** vertical strip issue by seeing actual canvas size
4. **Fix** based on what you SEE, not what you GUESS
5. **Verify** with another test before reporting to user

---

**Master Controller**: Running on port 4000 with all fixes
**Frontend**: localhost:3000 ready to test
**Chrome DevTools MCP**: Installed, needs integration (5 minutes)

**With browser automation, all issues can be debugged and fixed properly!**
