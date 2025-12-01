import { polydev } from '/Users/venkat/mcp-execution/dist/index.js';

async function consultExperts() {
  console.log('🤖 Consulting AI experts on OAuth agent crash...\n');

  await polydev.initialize();

  const perspectives = await polydev.getPerspectives(`
# OAuth Agent Crash in Firecracker VMs - Root Cause Analysis

## Context:
- Running Node.js v12.22.9 inside Firecracker VMs (Ubuntu 22.04)
- Downgraded from Node.js v20 due to CPU feature incompatibility (AVX/SSE4.2)
- OAuth agent (server.js) crashes within 5 seconds of starting
- No error output captured (redirected to log file)

## Code Issue Found:
server.js line 891-897 uses:
\`\`\`javascript
const proxyRes = await fetch(proxyUrl, {
  method: 'GET',
  headers: {
    'Host': \`localhost:1455\`,
    'User-Agent': 'PolydevOAuthProxy/1.0'
  },
  signal: AbortSignal.timeout(10000)
});
\`\`\`

## The Problem:
- \`fetch()\` API was introduced in Node.js 18.0.0
- Node.js v12.22.9 does NOT have \`fetch()\`
- This causes: ReferenceError: fetch is not defined
- Process crashes immediately

## Questions:
1. What's the best fix given we MUST stay on Node.js v12 for CPU compatibility?
2. Should we:
   a) Use node-fetch npm package
   b) Rewrite using native http.get()
   c) Try Node.js 14/16 (between 12 and 20) for compatibility?

3. Are there other Node.js v12 compatibility issues in the code?
4. What's the minimal change to get this working quickly?

Please provide specific code solutions for fixing this fetch() usage to work with Node.js v12.
  `);

  console.log('🧠 Expert Perspectives:\n');
  console.log(perspectives);
  console.log('\n');
}

consultExperts().catch(err => {
  console.error('❌ Consultation failed:', err);
  process.exit(1);
});
