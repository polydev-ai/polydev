import { polydev, exa } from '/Users/venkat/mcp-execution/dist/index.js';

await Promise.all([polydev.initialize(), exa.initialize()]);

console.log('🔍 Researching how Claude Code users handle proxy/IP issues...\n');

const perspectives = await polydev.getPerspectives(`
I'm building a system that runs Claude Code CLI inside Firecracker VMs for multiple users.

**CRITICAL PROBLEM:**
- Anthropic is blocking ALL proxy types I've tried:
  - Decodo/Smartproxy Residential proxies - BLOCKED
  - Decodo/Smartproxy ISP/Fixed IP proxies - ALSO BLOCKED
  
**MY USE CASE:**
- Running Claude Code CLI inside Firecracker microVMs
- Need to authenticate multiple users (OAuth flow)
- Each user needs their own session/credentials
- Want IP isolation between users for rate limiting

**QUESTIONS:**
1. How do other Claude Code integrations (mobile apps, web apps, IDE extensions) handle this?
2. Does Claude Code CLI have any official guidance on proxy/IP restrictions?
3. Is Anthropic specifically blocking proxy IPs to prevent automated usage?
4. Should I be using the Anthropic API directly instead of Claude Code CLI?
5. Are there legitimate ways to run multiple Claude Code sessions from a single IP?
6. Is there a way to whitelist my server IP with Anthropic?

**ALTERNATIVE APPROACHES:**
- Use Anthropic API directly instead of CLI OAuth
- Request enterprise/API access from Anthropic
- Use a single server IP without proxy (rate limiting concerns)
- Build a proper SaaS integration with Anthropic partnership
`);

console.log('🤖 Expert Perspectives:');
console.log(perspectives);

console.log('\n\n🔍 Researching Claude Code CLI proxy requirements...\n');
const research1 = await exa.search('Claude Code CLI proxy requirements IP restrictions Anthropic', {
  numResults: 5,
  type: 'deep',
  livecrawl: 'preferred'
});

console.log('Research Results (Claude CLI):');
console.log(research1.content[0].text);

console.log('\n\n🔍 Researching Anthropic API access for automated systems...\n');
const research2 = await exa.search('Anthropic API enterprise access automated systems multiple users SaaS', {
  numResults: 5,
  type: 'deep',
  livecrawl: 'preferred'
});

console.log('Research Results (Anthropic API):');
console.log(research2.content[0].text);

console.log('\n\n🔍 Researching alternatives to residential proxies for AI APIs...\n');
const research3 = await exa.search('best proxy alternative for ChatGPT Claude API not blocked 2024 2025', {
  numResults: 5,
  type: 'deep',
  livecrawl: 'preferred'
});

console.log('Research Results (Alternatives):');
console.log(research3.content[0].text);
