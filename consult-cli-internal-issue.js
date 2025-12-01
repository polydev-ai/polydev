import { polydev } from '/Users/venkat/mcp-execution/dist/index.js';

await polydev.initialize();

const perspectives = await polydev.getPerspectives(`
I'm debugging a Node.js application running inside a Firecracker microVM. I have a CRITICAL paradox:

**WORKING:**
- Native Node.js fetch() to api.anthropic.com works perfectly (returns HTTP 404)
- Test code: const r = await fetch('https://api.anthropic.com/'); console.log('OK:', r.status);
- DNS resolution works (dnsmasq returns 160.79.104.10 for api.anthropic.com)
- All DNS diagnostics pass

**FAILING:**
- Claude Code CLI fails with: "Failed to connect to api.anthropic.com: ERR_INVALID_IP_ADDRESS"
- ERR_INVALID_IP_ADDRESS is thrown by Node.js lib/internal/net.js via net.isIP() BEFORE DNS lookup
- This happens when the address passed to the socket is invalid (empty string, malformed, etc.)

**ENVIRONMENT:**
- VM runs Node.js (via Claude Code CLI which is npx @anthropic-ai/claude-code)
- NODE_OPTIONS='--dns-result-order=ipv4first' is set
- No proxy environment variables (HTTP_PROXY, HTTPS_PROXY are unset)
- Redsocks transparent proxy is disabled
- IPv4-only NAT network

**THE PARADOX:**
Same VM, same Node.js runtime, same DNS - but native fetch() works while Claude Code CLI doesn't.

**QUESTIONS:**
1. What could cause Claude Code CLI to get ERR_INVALID_IP_ADDRESS when native fetch works?
2. Does Claude Code CLI bundle its own HTTP client (undici) that might behave differently?
3. Could there be a configuration file or environment variable that Claude Code CLI reads that native fetch doesn't?
4. How can I debug what host/IP is being passed to the socket inside Claude Code CLI?
`);

console.log('🤖 Expert Perspectives on Claude Code CLI Internal Issue:');
console.log(perspectives);
