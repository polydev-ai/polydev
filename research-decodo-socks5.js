import { exa } from '/Users/venkat/mcp-execution/dist/index.js';

await exa.initialize();

console.log('🔍 Researching Decodo/Smartproxy SOCKS5 capabilities...\n');

const results = await exa.search('Decodo Smartproxy SOCKS5 proxy configuration residential', {
  numResults: 5,
  type: 'deep',
  livecrawl: 'preferred'
});

console.log('📚 Research Results:');
console.log(results.content[0].text);
