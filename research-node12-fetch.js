import { exa } from '/Users/venkat/mcp-execution/dist/index.js';

async function researchNodeFetchCompatibility() {
  console.log('🔍 Researching Node.js 12 fetch() compatibility solutions...\n');

  await exa.initialize();

  // Search for how to use fetch in Node.js 12
  const fetchSolutions = await exa.search('Node.js 12 fetch alternative polyfill http.get', {
    numResults: 5,
    type: 'deep'
  });

  console.log('📚 Research Results:\n');
  console.log('='.repeat(80));

  for (let i = 0; i < Math.min(3, fetchSolutions.content.length); i++) {
    const result = fetchSolutions.content[i];
    console.log(`\n### Result ${i + 1}: ${result.title || 'Untitled'}`);
    console.log(`URL: ${result.url}`);
    console.log(`\nContent:\n${result.text.substring(0, 800)}...\n`);
    console.log('='.repeat(80));
  }

  // Get code examples
  const codeExamples = await exa.getCodeContext('replace fetch with http.get Node.js', 3000);

  console.log('\n\n💻 Code Examples:\n');
  console.log('='.repeat(80));

  for (let i = 0; i < Math.min(2, codeExamples.content.length); i++) {
    const example = codeExamples.content[i];
    console.log(`\n### Example ${i + 1}: ${example.title || 'Untitled'}`);
    console.log(`\nContent:\n${example.text.substring(0, 1000)}...\n`);
    console.log('='.repeat(80));
  }

  console.log('\n✅ Research complete!');
}

researchNodeFetchCompatibility().catch(err => {
  console.error('❌ Research failed:', err);
  process.exit(1);
});
