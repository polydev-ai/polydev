import { exa, github, polydev } from '/Users/venkat/mcp-execution/dist/index.js';

(async () => {
  console.log('🔍 Researching ACTUAL AI CLI tool packages and installation methods...\n');

  try {
    // Initialize MCP servers
    await Promise.all([exa.initialize(), github.initialize(), polydev.initialize()]);

    // 1. Research Google Gemini CLI - ACTUAL installation method
    console.log('=== Research 1: Google Gemini CLI (Official Installation) ===\n');

    const geminiInstall = await exa.search('google gemini cli command line tool install npm pip official', {
      numResults: 5,
      type: 'deep',
      livecrawl: 'preferred'
    });

    console.log('📚 Gemini CLI Installation (Top Result):');
    console.log(geminiInstall.content[0]?.text?.substring(0, 2000) || 'No results');
    console.log('\n---\n');

    // Also check GitHub for official Google Gemini CLI
    const geminiRepos = await github.searchRepositories('google gemini cli');
    console.log('GitHub Repositories (Gemini CLI):');
    if (geminiRepos[0]) {
      console.log(`Repository: ${geminiRepos[0].full_name}`);
      console.log(`Description: ${geminiRepos[0].description}`);
      console.log(`Stars: ${geminiRepos[0].stargazers_count}`);
      console.log(`URL: ${geminiRepos[0].html_url}`);
    }
    console.log('\n---\n');

    // 2. Research Claude Code CLI - Official Anthropic installation
    console.log('=== Research 2: Anthropic Claude Code CLI (Official) ===\n');

    const claudeCodeInstall = await exa.search('anthropic claude code cli install official download', {
      numResults: 5,
      type: 'deep',
      livecrawl: 'preferred'
    });

    console.log('📚 Claude Code CLI Installation:');
    console.log(claudeCodeInstall.content[0]?.text?.substring(0, 2000) || 'No results');
    console.log('\n---\n');

    // Check Anthropic GitHub
    const anthropicRepos = await github.searchRepositories('anthropic claude code cli');
    console.log('GitHub Repositories (Anthropic):');
    if (anthropicRepos[0]) {
      console.log(`Repository: ${anthropicRepos[0].full_name}`);
      console.log(`Description: ${anthropicRepos[0].description}`);
      console.log(`Stars: ${anthropicRepos[0].stargazers_count}`);
      console.log(`URL: ${anthropicRepos[0].html_url}`);
    }
    console.log('\n---\n');

    // 3. Research OpenAI Codex CLI - Is this even a real thing?
    console.log('=== Research 3: OpenAI Codex CLI (Verify Existence) ===\n');

    const codexCLI = await exa.search('openai codex cli command line tool 2024 2025', {
      numResults: 5,
      type: 'deep',
      livecrawl: 'preferred'
    });

    console.log('📚 Codex CLI Research:');
    console.log(codexCLI.content[0]?.text?.substring(0, 2000) || 'No results');
    console.log('\n---\n');

    // 4. Get expert validation from multiple AI models
    console.log('=== Expert Consultation: Correct AI CLI Packages ===\n');

    const expertAdvice = await polydev.getPerspectives(`
      I'm trying to install AI CLI tools in an Ubuntu 22.04 VM for developers.

      Failed package names that DON'T exist:
      - @google/generative-ai-cli (npm 404 error)
      - google-generativeai-cli (pip3 not found)
      - @anthropic-ai/claude-code (npm not found)
      - openai-codex-cli (pip3 not found)
      - @openai/codex-cli (npm not found)

      Questions:
      1. What are the CORRECT package names for Google Gemini CLI?
      2. What is the correct installation method for Claude Code CLI (is it even a public package)?
      3. Does OpenAI Codex CLI even exist as a standalone tool in 2024/2025?
      4. What are the official CLI tools from Google, Anthropic, and OpenAI that ARE publicly available?
    `);

    console.log('🤖 Expert Perspectives:');
    console.log(expertAdvice);
    console.log('\n---\n');

    // 5. Alternative: Search for actual CLI tools that DO exist
    console.log('=== Research 4: What AI CLI Tools Actually Exist? ===\n');

    const actualCLIs = await exa.search('AI CLI tools 2024 2025 google openai anthropic terminal command line', {
      numResults: 5,
      type: 'deep'
    });

    console.log('📚 Actual Available AI CLI Tools:');
    console.log(actualCLIs.content[0]?.text?.substring(0, 2000) || 'No results');

    console.log('\n\n✅ Research Complete!');
    console.log('\n📝 Summary will identify:');
    console.log('- Correct installation methods (if packages exist)');
    console.log('- Alternative tools if original packages are not public');
    console.log('- Whether to skip non-existent packages');

  } catch (error) {
    console.error('❌ Error during research:', error.message);
    console.error(error.stack);
  }
})();
