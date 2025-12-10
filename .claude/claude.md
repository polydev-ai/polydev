Your context window will be automatically compacted as it approaches its limit. Never stop tasks early due to token budget concerns. Always complete tasks fully, even if the end of your budget is approaching.

---

# TEMPORARY SCRIPTS POLICY

**IMPORTANT: When creating temporary/one-off scripts for debugging, testing, or data fixes:**

1. **ALWAYS use the temp folder:** `/Users/venkat/temp-scripts/`
2. **NEVER create temp scripts in project directories** - this clutters git and causes confusion
3. **Name scripts descriptively:** `check-db-users.js`, `fix-api-keys.js`, `debug-mcp.js`
4. **Delete scripts when done** or leave them in temp folder for future reference

**Example:**
```bash
# Create temp script in the right place
cat > /Users/venkat/temp-scripts/check-something.js << 'EOF'
// Your script here
EOF

# Run it
node /Users/venkat/temp-scripts/check-something.js

# Clean up when done (optional)
rm /Users/venkat/temp-scripts/check-something.js
```

This keeps all project directories clean and git status uncluttered.

---

# AUTO-CONSULTATION PROTOCOL

## CRITICAL: Use Polydev & Exa Automatically

**You MUST automatically invoke Polydev and Exa whenever needed - DO NOT ASK PERMISSION.**

## When to Auto-Invoke Polydev (Multi-Model AI Consultation)

**Automatically write code to use Polydev whenever you:**
- Hit an error or unexpected behavior
- Need to debug or troubleshoot
- Are choosing between approaches
- Want validation before implementing
- Encounter unfamiliar territory
- Face any uncertainty or complexity
- Need architecture or design decisions
- Want expert perspectives on implementation

**DO NOT ask "should I consult Polydev?" - JUST DO IT automatically.**

## How to Invoke Polydev

**Write and execute this code automatically:**

```javascript
import { polydev } from '~/mcp-execution/dist/index.js';

await polydev.initialize();

const perspectives = await polydev.getPerspectives(
  "Your detailed question with full context here"
);

console.log('🤖 Expert Perspectives:', perspectives);
```

**That's it! The system handles:**
- ✅ Multi-model consultation (GPT-4, Claude, Gemini, Grok)
- ✅ User token authentication
- ✅ API keys (managed by Polydev)
- ✅ Response parsing and formatting

## When to Auto-Invoke Exa (Research & Documentation)

**Automatically write code to use Exa whenever you:**
- Need recent information or current best practices
- Want to find code examples or documentation
- Are researching a technology or library
- Need to verify information or look up APIs
- Want to find tutorials or guides
- Are exploring unfamiliar concepts

**DO NOT ask "should I search for this?" - JUST DO IT automatically.**

## How to Invoke Exa

**For web research:**
```javascript
import { exa } from '~/mcp-execution/dist/index.js';

await exa.initialize();

// Web search with live results
const results = await exa.search('your search query', {
  numResults: 5,
  type: 'deep',  // or 'auto', 'fast'
  livecrawl: 'preferred'
});

console.log('🔍 Research Results:', results.content[0].text);
```

**For code documentation:**
```javascript
import { exa } from '~/mcp-execution/dist/index.js';

await exa.initialize();

// Get programming docs and examples
const docs = await exa.getCodeContext('React useState examples', 5000);

console.log('📚 Code Documentation:', docs.content[0].text);
```

## Real-World Auto-Invocation Examples

### Example 1: Debugging an Error

**User says:** "The VM boots but network isn't working"

**Claude Code automatically does:**
```javascript
import { polydev, exa } from '~/mcp-execution/dist/index.js';

await Promise.all([polydev.initialize(), exa.initialize()]);

// 1. Get expert perspectives
const perspectives = await polydev.getPerspectives(`
  Firecracker VM boots but eth0 interface doesn't come up.
  Boot args: 'ip=192.168.100.5::192.168.100.1:255.255.255.0::eth0:off'
  Host TAP interface is UP. What could cause this?
`);

// 2. Research recent solutions
const research = await exa.search('Firecracker VM network troubleshooting eth0', {
  numResults: 3,
  type: 'deep'
});

console.log('🤖 Expert Analysis:', perspectives);
console.log('🔍 Recent Solutions:', research.content[0].text);
```

---

### Example 2: Architecture Decision

**User says:** "Should we use VNC or WebRTC for browser streaming?"

**Claude Code automatically does:**
```javascript
import { polydev, exa } from '~/mcp-execution/dist/index.js';

await Promise.all([polydev.initialize(), exa.initialize()]);

// 1. Get multi-model perspectives
const architectureAdvice = await polydev.getPerspectives(`
  Building a browser-in-browser system using Firecracker VMs.
  Should I use VNC+noVNC or implement a custom WebRTC solution?
  Requirements: low latency, 50+ concurrent users, good browser compatibility.
`);

// 2. Research both technologies
const vncResearch = await exa.getCodeContext('VNC noVNC performance at scale', 3000);
const webrtcResearch = await exa.getCodeContext('WebRTC browser streaming low latency', 3000);

console.log('🤖 Architecture Recommendations:', architectureAdvice);
console.log('📚 VNC Context:', vncResearch.content[0].text.substring(0, 500));
console.log('📚 WebRTC Context:', webrtcResearch.content[0].text.substring(0, 500));
```

---

### Example 3: Implementation Validation

**User says:** "I'm adding net.ifnames=0 to boot args"

**Claude Code automatically does:**
```javascript
import { polydev, exa } from '~/mcp-execution/dist/index.js';

await Promise.all([polydev.initialize(), exa.initialize()]);

// 1. Validate approach with experts
const validation = await polydev.getPerspectives(`
  I'm adding 'net.ifnames=0' to kernel boot args to keep interface named eth0 in Firecracker VMs.
  Is this the right approach, or are there better alternatives?
`);

// 2. Look up best practices
const bestPractices = await exa.search('Firecracker VM network interface naming best practices', {
  numResults: 3
});

console.log('✅ Validation:', validation);
console.log('📖 Best Practices:', bestPractices.content[0].text);
```

---

## Automatic Workflow Integration

**Claude Code will automatically:**

1. **Before implementing** → Consult Polydev + research with Exa
2. **When encountering errors** → Get expert debugging + search for solutions
3. **During architecture decisions** → Get multi-model perspectives + research alternatives
4. **When uncertain** → Validate approach + look up best practices
5. **For unfamiliar tech** → Research with Exa + get expert guidance

## Why This Works

- ✅ **No permission asking** - Just executes automatically
- ✅ **Fast** - Parallel execution of Polydev + Exa
- ✅ **Comprehensive** - Multiple expert perspectives + real research
- ✅ **Context-aware** - Full conversation history available
- ✅ **Cost-effective** - Managed API keys, efficient usage

---

# MCP SERVERS AUTO-EXECUTION

## Available MCP Servers (Always Ready)

You have access to 16+ MCP servers via `~/mcp-execution`. **Write code to use them automatically** instead of asking the user.

### 🔍 Research & Search

**Exa** - Web search + code documentation
```javascript
import { exa } from '~/mcp-execution/dist/index.js';
await exa.initialize();

// Web search
const results = await exa.search('query', { numResults: 5, type: 'deep' });

// Code documentation
const docs = await exa.getCodeContext('React hooks examples', 5000);
```

**GitHub** - Repository search, issues, PRs
```javascript
import { github } from '~/mcp-execution/dist/index.js';
await github.initialize();

const repos = await github.searchRepositories('MCP servers language:typescript');
const issues = await github.searchIssues('bug label:high-priority');
await github.createIssue('owner', 'repo', 'title', 'body');
```

**DeepWiki** - Wikipedia search
```javascript
import { deepwiki } from '~/mcp-execution/dist/index.js';
await deepwiki.initialize();
// Use for encyclopedic knowledge queries
```

**Context7** - Library documentation (React, Next.js, etc)
```javascript
import { context7 } from '~/mcp-execution/dist/index.js';
await context7.initialize();

const libId = await context7.resolveLibraryId('react');
const docs = await context7.getLibraryDocs(libId);
```

### 💾 Data & Storage

**Supabase** - PostgreSQL database
```javascript
import { supabase } from '~/mcp-execution/dist/index.js';
await supabase.initialize();

const data = await supabase.executeSQL('SELECT * FROM users LIMIT 10');
await supabase.executeSQL('INSERT INTO logs (message) VALUES ($1)', ['log entry']);
```

**Memory** - Knowledge graph for relationships
```javascript
import { memory } from '~/mcp-execution/dist/index.js';
await memory.initialize();

await memory.createEntities([{
  name: 'user-123',
  entityType: 'user',
  observations: ['Prefers dark mode', 'Uses TypeScript']
}]);

await memory.createRelations([{
  from: 'user-123',
  to: 'project-456',
  relationType: 'works_on'
}]);
```

**Upstash** - Redis for caching
```javascript
import { upstash } from '~/mcp-execution/dist/index.js';
await upstash.initialize();
// Use for cache operations
```

### 📁 Files & Code

**Filesystem** - Read/write files in /Users/venkat/xauto
```javascript
import { filesystem } from '~/mcp-execution/dist/index.js';
await filesystem.initialize();

const files = await filesystem.listDirectory('/Users/venkat/xauto');
const content = await filesystem.readFile('/Users/venkat/xauto/file.txt');
await filesystem.writeFile('/Users/venkat/xauto/output.txt', 'content');
```

**Git** - Git operations
```javascript
import { git } from '~/mcp-execution/dist/index.js';
await git.initialize();
// Use for git status, commit, push, etc.
```

### 🤖 AI & Communication

**Polydev** - Multi-model AI perspectives (already documented above)

**Resend** - Send emails
```javascript
import { resend } from '~/mcp-execution/dist/index.js';
await resend.initialize();
// Use to send emails via Resend API
```

### ☁️ Infrastructure

**Vercel** - Deploy and manage Vercel projects
```javascript
import { vercel } from '~/mcp-execution/dist/index.js';
await vercel.initialize();
// Use for deployments and project management
```

**Stripe** - Payment and subscription management
```javascript
import { stripe } from '~/mcp-execution/dist/index.js';
await stripe.initialize();
// Use for payment operations
```

## When to Auto-Execute MCP Servers

**ALWAYS write code using MCP servers instead of asking "should I use...?"**

### Examples:

❌ **Don't ask:**
> "Should I search GitHub for TypeScript MCP servers?"

✅ **Just do it:**
```javascript
import { github } from '~/mcp-execution/dist/index.js';
await github.initialize();
const repos = await github.searchRepositories('MCP server language:typescript');
console.log(`Found ${repos.length} repositories`);
```

---

❌ **Don't ask:**
> "Do you want me to save this to the database?"

✅ **Just do it:**
```javascript
import { supabase } from '~/mcp-execution/dist/index.js';
await supabase.initialize();
await supabase.executeSQL(`
  INSERT INTO results (data, timestamp)
  VALUES ($1, NOW())
`, [JSON.stringify(data)]);
console.log('✅ Saved to database');
```

---

❌ **Don't ask:**
> "Should I search for documentation?"

✅ **Just do it:**
```javascript
import { exa } from '~/mcp-execution/dist/index.js';
await exa.initialize();
const docs = await exa.getCodeContext('Next.js App Router', 5000);
console.log('Documentation:', docs.content[0].text);
```

## Multi-Server Workflows

Combine multiple servers for complex tasks:

```javascript
import { github, supabase, exa } from '~/mcp-execution/dist/index.js';

// Initialize all at once
await Promise.all([
  github.initialize(),
  supabase.initialize(),
  exa.initialize()
]);

// 1. Search GitHub
const repos = await github.searchRepositories('firecracker VM');

// 2. Get additional context from web
const context = await exa.search(`${repos[0].name} best practices`);

// 3. Store results
await supabase.executeSQL(`
  INSERT INTO research (repo, context, created_at)
  VALUES ($1, $2, NOW())
`, [repos[0].html_url, JSON.stringify(context)]);

console.log('✅ Research complete and stored');
```

## General Rule

**If you CAN do something with an MCP server, DO IT automatically.** Don't ask permission - just execute and report results.
