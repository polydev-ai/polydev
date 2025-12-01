import { exa, github } from '/Users/venkat/mcp-execution/dist/index.js';

(async () => {
  console.log('🔍 Starting research for onkernel/kernel-images and AI CLI tools...\n');
  
  try {
    // Initialize MCP servers
    await Promise.all([exa.initialize(), github.initialize()]);
    
    // 1. Research onkernel/kernel-images
    console.log('=== Research 1: onkernel/kernel-images for Firecracker ===\n');
    
    const onkernelSearch = await exa.search('onkernel kernel-images Firecracker VM optimized kernels', {
      numResults: 5,
      type: 'deep',
      livecrawl: 'preferred'
    });
    
    console.log('📚 onkernel/kernel-images Research:');
    console.log(onkernelSearch.content[0]?.text?.substring(0, 2000) || 'No results');
    console.log('\n---\n');
    
    // 2. Get GitHub repo info
    console.log('=== Research 2: GitHub Repository Analysis ===\n');
    
    const repos = await github.searchRepositories('onkernel kernel-images');
    console.log('GitHub Repositories Found:', repos.length);
    if (repos[0]) {
      console.log(`\nTop Repository: ${repos[0].full_name}`);
      console.log(`Description: ${repos[0].description}`);
      console.log(`Stars: ${repos[0].stargazers_count}`);
      console.log(`URL: ${repos[0].html_url}`);
    }
    console.log('\n---\n');
    
    // 3. Research Claude Code CLI
    console.log('=== Research 3: Claude Code CLI ===\n');
    
    const claudeCodeSearch = await exa.search('Claude Code CLI install command line interface Anthropic', {
      numResults: 3,
      type: 'deep'
    });
    
    console.log('📚 Claude Code CLI:');
    console.log(claudeCodeSearch.content[0]?.text?.substring(0, 1500) || 'No results');
    console.log('\n---\n');
    
    // 4. Research Codex CLI (OpenAI)
    console.log('=== Research 4: OpenAI Codex CLI ===\n');
    
    const codexSearch = await exa.search('OpenAI Codex CLI command line installation', {
      numResults: 3,
      type: 'deep'
    });
    
    console.log('📚 Codex CLI:');
    console.log(codexSearch.content[0]?.text?.substring(0, 1500) || 'No results');
    console.log('\n---\n');
    
    // 5. Research Gemini CLI (Google)
    console.log('=== Research 5: Google Gemini CLI ===\n');
    
    const geminiSearch = await exa.search('Google Gemini CLI command line terminal interface installation', {
      numResults: 3,
      type: 'deep'
    });
    
    console.log('📚 Gemini CLI:');
    console.log(geminiSearch.content[0]?.text?.substring(0, 1500) || 'No results');
    console.log('\n---\n');
    
    // 6. Research terminal emulators for headless Linux
    console.log('=== Research 6: Terminal Tools for Headless Ubuntu ===\n');
    
    const terminalSearch = await exa.search('best terminal emulator headless Ubuntu server tmux screen', {
      numResults: 3,
      type: 'auto'
    });
    
    console.log('📚 Terminal Tools:');
    console.log(terminalSearch.content[0]?.text?.substring(0, 1500) || 'No results');
    
    console.log('\n\n✅ Research Complete!');
    
  } catch (error) {
    console.error('❌ Error during research:', error.message);
    console.error(error.stack);
  }
})();
