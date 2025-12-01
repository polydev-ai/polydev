import { exa } from '/Users/venkat/mcp-execution/dist/index.js';

await exa.initialize();

console.log('🔍 Researching Decodo ISP Proxy configuration...\n');

const results = await exa.search('Decodo Smartproxy ISP proxy static residential setup endpoint configuration', {
  numResults: 5,
  type: 'deep',
  livecrawl: 'preferred'
});

console.log('📚 Research Results:');
console.log(results.content[0].text);
