import { polydev, exa } from '/Users/venkat/mcp-execution/dist/index.js';

await Promise.all([polydev.initialize(), exa.initialize()]);

console.log('🔍 Researching proxy alternatives that work with AI APIs...\n');

const perspectives = await polydev.getPerspectives(`
I need to find a proxy solution for my Firecracker VMs that will work with Anthropic's API (api.anthropic.com).

**PROBLEM:**
- Decodo/Smartproxy residential proxies are BLOCKED by Anthropic
- Anthropic actively blocks known residential proxy IP ranges
- I need unique IPs per VM for rate limiting and isolation

**REQUIREMENTS:**
1. Must work with api.anthropic.com (not blocked)
2. Need unique/rotating IPs per VM
3. Reasonable cost for ~50-100 concurrent VMs
4. Reliable uptime

**OPTIONS TO CONSIDER:**
1. ISP Proxies (static residential) - harder to detect
2. Mobile Proxies - very expensive but rarely blocked
3. Datacenter Proxies - often blocked but cheaper
4. Different residential proxy provider
5. VPN services with dedicated IPs
6. Cloud provider IPs (AWS, GCP, Azure)

**QUESTIONS:**
1. Which proxy type is LEAST likely to be blocked by AI APIs?
2. Are there specific providers known to work with Anthropic/OpenAI?
3. Would ISP proxies from Smartproxy/Decodo work (different from residential)?
4. Are there any "clean" residential proxy providers not yet blocked?
5. What about using cloud provider egress IPs instead of proxies?
`);

console.log('🤖 Expert Perspectives:');
console.log(perspectives);

console.log('\n\n🔍 Researching ISP proxies vs residential for AI APIs...\n');
const research1 = await exa.search('ISP proxy static residential work with OpenAI Anthropic API not blocked', {
  numResults: 5,
  type: 'deep',
  livecrawl: 'preferred'
});

console.log('Research Results (ISP Proxies):');
console.log(research1.content[0].text);

console.log('\n\n🔍 Researching proxy providers for AI API access...\n');
const research2 = await exa.search('proxy provider works with ChatGPT OpenAI API Anthropic Claude 2024', {
  numResults: 5,
  type: 'deep',
  livecrawl: 'preferred'
});

console.log('Research Results (Providers):');
console.log(research2.content[0].text);
