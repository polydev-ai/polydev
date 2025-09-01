#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Find the most recent conversation file
const claudeProjectsDir = '/Users/venkat/.claude/projects/-Users-venkat-Documents-jarvis/';
const conversationFiles = fs.readdirSync(claudeProjectsDir)
  .filter(file => file.endsWith('.jsonl'))
  .map(file => ({
    name: file,
    path: path.join(claudeProjectsDir, file),
    mtime: fs.statSync(path.join(claudeProjectsDir, file)).mtime
  }))
  .sort((a, b) => b.mtime - a.mtime);

console.log('📄 Recent conversation files:');
conversationFiles.slice(0, 3).forEach((file, i) => {
  console.log(`${i + 1}. ${file.name} (${file.mtime.toISOString()})`);
});

async function extractConversations(filePath, limit = 10) {
  const conversations = [];
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    try {
      const entry = JSON.parse(line);
      
      // Extract user messages
      if (entry.type === 'user' && entry.message?.content) {
        const textContent = entry.message.content
          .filter(c => c.type === 'text')
          .map(c => c.text)
          .join(' ');
        
        if (textContent && textContent.length > 10) {
          conversations.push({
            type: 'user',
            timestamp: entry.timestamp,
            content: textContent,
            cwd: entry.cwd,
            gitBranch: entry.gitBranch
          });
        }
      }
      
      // Extract assistant messages
      if (entry.type === 'assistant' && entry.message?.content) {
        const textContent = entry.message.content
          .filter(c => c.type === 'text')
          .map(c => c.text)
          .join(' ');
        
        if (textContent && textContent.length > 10) {
          conversations.push({
            type: 'assistant',
            timestamp: entry.timestamp,
            content: textContent,
            model: entry.message.model
          });
        }
      }
    } catch (e) {
      // Skip invalid JSON lines
    }
  }
  
  return conversations.slice(-limit * 2); // Get last N pairs
}

async function generateProjectMemory(conversations) {
  const patterns = [];
  const decisions = [];
  const contexts = [];
  
  // Analyze conversations for patterns
  conversations.forEach(conv => {
    const content = conv.content.toLowerCase();
    
    // Look for debugging patterns
    if (content.includes('debug') || content.includes('error') || content.includes('fix')) {
      patterns.push({
        type: 'debugging',
        description: conv.content.substring(0, 200),
        timestamp: conv.timestamp
      });
    }
    
    // Look for decisions
    if (content.includes('decided') || content.includes('chose') || content.includes('implement')) {
      decisions.push({
        type: 'decision',
        description: conv.content.substring(0, 200),
        timestamp: conv.timestamp
      });
    }
    
    // Look for context
    if (content.includes('working on') || content.includes('project') || content.includes('implement')) {
      contexts.push({
        type: 'context',
        description: conv.content.substring(0, 200),
        timestamp: conv.timestamp
      });
    }
  });
  
  return { patterns, decisions, contexts };
}

async function main() {
  if (conversationFiles.length === 0) {
    console.log('❌ No conversation files found');
    return;
  }
  
  const latestFile = conversationFiles[0];
  console.log(`\n🔍 Extracting conversations from: ${latestFile.name}`);
  
  const conversations = await extractConversations(latestFile.path, 15);
  console.log(`📝 Found ${conversations.length} conversation entries`);
  
  const memory = await generateProjectMemory(conversations);
  console.log(`🧠 Generated memory: ${memory.patterns.length} patterns, ${memory.decisions.length} decisions, ${memory.contexts.length} contexts`);
  
  // Output recent conversations for Supabase import
  const recentConversations = conversations.slice(-6); // Last 3 pairs
  
  console.log('\n📋 Recent conversation pairs for import:');
  for (let i = 0; i < recentConversations.length; i += 2) {
    const user = recentConversations[i];
    const assistant = recentConversations[i + 1];
    
    if (user && assistant && user.type === 'user' && assistant.type === 'assistant') {
      console.log(`\n--- Conversation ${Math.floor(i/2) + 1} ---`);
      console.log(`User: ${user.content.substring(0, 150)}...`);
      console.log(`Assistant: ${assistant.content.substring(0, 150)}...`);
      console.log(`Model: ${assistant.model || 'unknown'}`);
      console.log(`Timestamp: ${user.timestamp}`);
    }
  }
  
  // Output JSON for programmatic use
  const output = {
    conversations: recentConversations,
    memory: memory,
    extractedAt: new Date().toISOString(),
    sourceFile: latestFile.name
  };
  
  fs.writeFileSync('/tmp/claude-memory-extract.json', JSON.stringify(output, null, 2));
  console.log('\n💾 Saved detailed data to: /tmp/claude-memory-extract.json');
}

main().catch(console.error);