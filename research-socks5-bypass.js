import { polydev, exa } from '/Users/venkat/mcp-execution/dist/index.js';

await Promise.all([polydev.initialize(), exa.initialize()]);

console.log('🤖 Consulting experts on SOCKS5 vs HTTP CONNECT for bypassing domain blocks...\n');

const perspectives = await polydev.getPerspectives(`
I have a residential proxy (Decodo/Smartproxy) that blocks api.anthropic.com via HTTP CONNECT filtering.

I'm now investigating using SOCKS5 instead of HTTP proxy to bypass this.

**Current setup (blocked):**
- HTTP_PROXY=http://user:pass@dc.decodo.com:10001
- Uses HTTP CONNECT tunnel which reveals hostname
- Decodo can filter based on CONNECT request hostname

**Proposed SOCKS5 setup:**
- SOCKS5 proxy at different port (Decodo supports SOCKS5)
- In Node.js, use something like https-proxy-agent with SOCKS5

**QUESTIONS:**
1. Does SOCKS5 hide the destination hostname from the proxy provider?
2. What's the difference between SOCKS5 and SOCKS5h (proxy-side DNS)?
3. For Node.js fetch/undici, how do I configure SOCKS5 proxy instead of HTTP?
4. Would using transparent proxy (redsocks) with SOCKS5 work better?
5. Any specific Decodo SOCKS5 endpoint I should use?
`);

console.log('🤖 Expert Perspectives:');
console.log(perspectives);

console.log('\n\n🔍 Researching SOCKS5 hostname visibility...\n');
const research = await exa.search('SOCKS5 proxy hide hostname destination vs HTTP CONNECT domain filtering', {
  numResults: 5,
  type: 'deep'
});

console.log('Research Results:');
console.log(research.content[0].text);
