/**
 * Research GStreamer ximagesrc syntax
 * Find correct property names and syntax for X11 screen capture
 */

import { exa } from '/Users/venkat/mcp-execution/dist/index.js';

async function researchGStreamerSyntax() {
  try {
    console.log('🔍 Researching GStreamer ximagesrc syntax...\n');

    await exa.initialize();

    // Search for ximagesrc documentation and examples
    const results = await exa.search('GStreamer ximagesrc properties display-name use-damage example', {
      numResults: 5,
      type: 'deep',
      livecrawl: 'preferred'
    });

    console.log('='.repeat(60));
    console.log('📚 GStreamer ximagesrc Research Results');
    console.log('='.repeat(60));
    console.log('');

    for (let i = 0; i < results.content.length; i++) {
      const item = results.content[i];
      console.log(`\n${i + 1}. ${item.title || 'Result'}`);
      console.log(`   URL: ${item.url}`);
      console.log(`   Content: ${item.text.substring(0, 800)}...\n`);
      console.log('-'.repeat(60));
    }

    // Also search for working examples
    console.log('\n\n🔍 Searching for working ximagesrc pipeline examples...\n');

    const examples = await exa.search('gst-launch-1.0 ximagesrc working example VP8 encode', {
      numResults: 3,
      type: 'deep'
    });

    console.log('='.repeat(60));
    console.log('💡 Working Pipeline Examples');
    console.log('='.repeat(60));

    for (let i = 0; i < examples.content.length; i++) {
      const item = examples.content[i];
      console.log(`\n${i + 1}. ${item.title || 'Example'}`);
      console.log(`   ${item.text.substring(0, 600)}...\n`);
    }

  } catch (error) {
    console.error('❌ Research failed:', error.message);
    process.exit(1);
  }
}

researchGStreamerSyntax();
