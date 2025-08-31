'use client'

import { useState } from 'react'
import Link from 'next/link'

interface DocSection {
  id: string
  title: string
  items: {
    title: string
    href: string
    description?: string
  }[]
}

export default function Documentation() {
  const [activeSection, setActiveSection] = useState('getting-started')

  const docSections: DocSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      items: [
        { title: 'Introduction', href: '#introduction', description: 'What is Polydev AI?' },
        { title: 'Quick Start', href: '#quick-start', description: 'Get up and running in 5 minutes' },
        { title: 'Installation', href: '#installation', description: 'Install the Polydev CLI and SDKs' },
        { title: 'Authentication', href: '#authentication', description: 'Secure API access' }
      ]
    },
    {
      id: 'mcp-protocol',
      title: 'Model Context Protocol',
      items: [
        { title: 'MCP Overview', href: '#mcp-overview', description: 'Understanding MCP architecture' },
        { title: 'Server Implementation', href: '#server-implementation', description: 'Build custom MCP servers' },
        { title: 'Tool Integration', href: '#tool-integration', description: 'Connect external tools' },
        { title: 'Resource Management', href: '#resource-management', description: 'Handle data and resources' }
      ]
    },
    {
      id: 'multi-llm',
      title: 'Multi-LLM Integration',
      items: [
        { title: 'Supported Models', href: '#supported-models', description: 'Available LLM providers' },
        { title: 'Model Orchestration', href: '#model-orchestration', description: 'Route requests across models' },
        { title: 'Response Comparison', href: '#response-comparison', description: 'Compare model outputs' },
        { title: 'Cost Optimization', href: '#cost-optimization', description: 'Optimize usage costs' }
      ]
    },
    {
      id: 'api-reference',
      title: 'API Reference',
      items: [
        { title: 'REST API', href: '#rest-api', description: 'HTTP API endpoints' },
        { title: 'GraphQL API', href: '#graphql-api', description: 'GraphQL schema and queries' },
        { title: 'WebSocket API', href: '#websocket-api', description: 'Real-time connections' },
        { title: 'SDKs', href: '#sdks', description: 'Language-specific libraries' }
      ]
    },
    {
      id: 'integrations',
      title: 'MCP Clients',
      items: [
        { title: 'Claude Desktop', href: '#claude-desktop', description: 'Anthropic\'s native MCP client' },
        { title: 'Cursor', href: '#cursor', description: 'AI code editor with MCP support' },
        { title: 'Continue', href: '#continue', description: 'VS Code extension for AI coding' },
        { title: 'Cline', href: '#cline', description: 'VS Code AI agent' }
      ]
    }
  ]

  const getDocContent = (section: string) => {
    switch (section) {
      case 'getting-started':
        return (
          <div className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-h1:text-4xl prose-h1:font-extrabold prose-h1:tracking-tight prose-h2:text-3xl prose-h2:tracking-tight prose-h3:text-xl prose-h3:text-slate-800 prose-p:text-slate-600 prose-p:leading-relaxed prose-code:bg-slate-100 prose-code:text-violet-600 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-semibold">
            <h1 className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600">
              Polydev Breakthroughs MCP Server
            </h1>
            
            <h2 id="introduction">Introduction</h2>
            <p>
              <strong>Never get stuck again.</strong> Polydev Breakthroughs is an MCP (Model Context Protocol) server that 
              eliminates agent roadblocks by providing instant access to multiple AI breakthroughs. When your agent encounters 
              a difficult problem, decision paralysis, or complex challenge, our <code>get_breakthroughs</code> tool fans out 
              queries to GPT-4, Claude 3.5 Sonnet, Gemini Pro, and 20+ other models in parallel, returning diverse expert 
              viewpoints to help break through.
            </p>
            
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 my-8">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">Why Multiple AI Breakthroughs?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-blue-800 font-medium mb-2">Different models have different strengths:</p>
                  <ul className="space-y-1 text-blue-700">
                    <li>• <strong>GPT-4</strong>: Strong reasoning and code generation</li>
                    <li>• <strong>Claude 3.5 Sonnet</strong>: Excellent analysis and explanations</li>
                    <li>• <strong>Gemini Pro</strong>: Creative solutions and alternatives</li>
                  </ul>
                </div>
                <div>
                  <p className="text-blue-800 font-medium mb-2">By consulting multiple models, agents can:</p>
                  <ul className="space-y-1 text-blue-700">
                    <li>✅ Break through decision paralysis</li>
                    <li>✅ Get diverse approaches to complex problems</li>
                    <li>✅ Validate solutions across different AI breakthroughs</li>
                    <li>✅ Discover blind spots in reasoning</li>
                  </ul>
                </div>
              </div>
            </div>

            <h2 id="quick-start">Quick Start Guide</h2>
            
            <h3>Step 1: Connect to Hosted MCP Server</h3>
            <p>Connect directly to our hosted MCP server - no downloads or npm packages required.</p>
            <pre className="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono border"><code>{`Server URL: https://polydev.ai/api/mcp`}</code></pre>
            
            <h3>Step 2: Configure Your Authentication</h3>
            <p>Set up your authentication for accessing the hosted MCP server:</p>
            <pre className="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono border"><code>{`Hosted Server: https://polydev.ai/api/mcp
Authentication: OAuth 2.0 or Bearer Token`}</code></pre>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 my-6">
              <h4 className="font-semibold text-blue-900 mb-3">🔐 Authentication Options</h4>
              
              <div className="mb-4">
                <h5 className="font-medium text-blue-800 mb-2">Option A: Your Own API Keys (Recommended)</h5>
                <ol className="list-decimal list-inside space-y-2 text-blue-700 text-sm ml-4">
                  <li>Create account at <a href="/auth" className="underline font-medium">polydev.ai/auth</a></li>
                  <li>Add API keys via <a href="/dashboard/api-keys" className="underline font-medium">Dashboard → API Keys</a></li>
                  <li>Sign in during configuration to enable user_keys mode</li>
                  <li>Get access to 20+ providers with your own rate limits</li>
                </ol>
              </div>
              
              <div>
                <h5 className="font-medium text-blue-800 mb-2">Option B: MCP Token (Limited)</h5>
                <ol className="list-decimal list-inside space-y-2 text-blue-700 text-sm ml-4">
                  <li>Generate token at <a href="/dashboard/mcp-tools" className="underline font-medium">Dashboard → MCP Tools</a></li>
                  <li>Enter token during configuration</li>
                  <li>⚠️ Limited to basic models with shared rate limits</li>
                </ol>
              </div>
            </div>

            <h3>Step 3: Add to Your MCP Client</h3>
            <p>Configure your MCP client to connect to the hosted server:</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">🖥️ Claude Desktop</h4>
                <p className="text-sm text-gray-600 mb-3">Edit your configuration file:</p>
                <code className="text-sm text-gray-500 block mb-2">~/.config/claude/claude_desktop_config.json</code>
                <pre className="bg-gray-100 text-gray-800 p-3 rounded text-sm font-mono border overflow-x-auto"><code>{`{
  "mcpServers": {
    "polydev": {
      "remote": {
        "transport": {
          "type": "sse",
          "url": "https://polydev.ai/api/mcp"
        },
        "auth": {
          "type": "oauth",
          "provider": "polydev"
        }
      }
    }
  }
}`}</code></pre>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">🔄 Continue.dev</h4>
                <p className="text-sm text-gray-600 mb-3">Add to your config:</p>
                <code className="text-sm text-gray-500 block mb-2">.continue/config.json</code>
                <pre className="bg-gray-100 text-gray-800 p-3 rounded text-sm font-mono border overflow-x-auto"><code>{`{
  "mcpServers": {
    "polydev": {
      "remote": {
        "transport": {
          "type": "sse",
          "url": "https://polydev.ai/api/mcp"
        },
        "auth": {
          "type": "bearer",
          "token": "pd_your_token_here"
        }
      }
    }
  }
}`}</code></pre>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">🎯 Cursor</h4>
                <p className="text-sm text-gray-600 mb-3">Configure MCP servers:</p>
                <code className="text-sm text-gray-500 block mb-2">Settings → MCP servers</code>
                <pre className="bg-gray-100 text-gray-800 p-3 rounded text-sm font-mono border overflow-x-auto"><code>{`{
  "mcp": {
    "servers": {
      "polydev": {
        "remote": {
          "transport": {
            "type": "sse",
            "url": "https://polydev.ai/api/mcp"
          },
          "auth": {
            "type": "oauth",
            "provider": "polydev"
          }
        }
      }
    }
  }
}`}</code></pre>
              </div>

              <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">🛠️ Cline (VSCode)</h4>
                <p className="text-sm text-gray-600 mb-3">Extension settings:</p>
                <code className="text-sm text-gray-500 block mb-2">MCP Server Configuration</code>
                <pre className="bg-gray-100 text-gray-800 p-3 rounded text-sm font-mono border overflow-x-auto"><code>{`{
  "remote": {
    "transport": {
      "type": "sse",
      "url": "https://polydev.ai/api/mcp"
    },
    "auth": {
      "type": "bearer",
      "token": "pd_your_token_here"
    }
  }
}`}</code></pre>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-green-900 mb-2">💡 Pro Tip</h4>
              <p className="text-green-800 text-sm">The hosted server approach means no local installation needed! Connect directly from any MCP-compatible client using Server-Sent Events (SSE) transport.</p>
            </div>

            <h3>Step 4: Test the Integration</h3>
            <p>Restart your MCP client and test the <code>get_breakthroughs</code> tool:</p>
            
            <h4>With Your Own API Keys (Recommended):</h4>
            <pre className="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono border"><code>{`{
  "name": "get_breakthroughs",
  "arguments": {
    "prompt": "I'm debugging a React performance issue. The component re-renders excessively but I can't pinpoint why. Help me identify potential causes and solutions.",
    "mode": "user_keys",
    "models": ["gpt-4", "claude-3.5-sonnet", "gemini-1.5-pro", "llama-3.1-70b-versatile"],
    "project_memory": "light"
  }
}`}</code></pre>

            <h4>With MCP Token (Legacy):</h4>
            <pre className="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono border"><code>{`{
  "name": "get_breakthroughs",
  "arguments": {
    "prompt": "I'm debugging a React performance issue...",
    "user_token": "poly_your_token_here",
    "mode": "managed",
    "models": ["gpt-4", "claude-3-sonnet", "gemini-pro"]
  }
}`}</code></pre>

            <h3>Complete Tool Schema</h3>
            <p>The <code>get_breakthroughs</code> tool accepts these parameters:</p>
            <pre className="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono border"><code>{`{
  "name": "get_breakthroughs",
  "description": "Get multiple AI breakthroughs on a problem to break through roadblocks",
  "inputSchema": {
    "type": "object",
    "properties": {
      "prompt": {
        "type": "string", 
        "description": "The problem or question to get breakthroughs on"
      },
      "mode": {
        "type": "string",
        "enum": ["user_keys", "managed"],
        "description": "user_keys (your API keys) or managed (MCP token)"
      },
      "models": {
        "type": "array",
        "items": {"type": "string"},
        "description": "List of models to query in parallel"
      },
      "user_token": {
        "type": "string",
        "description": "Required for managed mode only"
      },
      "temperature": {
        "type": "number",
        "description": "Temperature for responses (0.1-1.0, default: 0.7)"
      },
      "project_memory": {
        "type": "string",
        "enum": ["none", "light", "full"],
        "description": "Include project context: none, light (recent files), full (similarity search)"
      },
      "project_context": {
        "type": "object",
        "description": "Project path and file patterns for context"
      }
    },
    "required": ["prompt"]
  }
}`}</code></pre>

            <h2 id="authentication">Authentication Details</h2>
            
            <h3>User Keys Mode (Recommended)</h3>
            <p>When using your own API keys, you get:</p>
            <ul className="space-y-2">
              <li>✅ <strong>Full model access</strong>: 20+ providers with all their models</li>
              <li>✅ <strong>Your rate limits</strong>: Use your own quotas and limits</li>
              <li>✅ <strong>Custom configurations</strong>: Set budgets, rate limits per provider</li>
              <li>✅ <strong>Best performance</strong>: Direct API access without shared bottlenecks</li>
            </ul>
            
            <p>To use user keys mode:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Sign in to your Polydev account in the MCP client</li>
              <li>Add your API keys via the dashboard</li>
              <li>Use <code>"mode": "user_keys"</code> in your tool calls</li>
              <li>No token required - authentication handled by your signed-in session</li>
            </ol>

            <h3>MCP Token Mode (Legacy)</h3>
            <p>Limited access with managed keys:</p>
            <ul className="space-y-2">
              <li>⚠️ <strong>Basic models only</strong>: GPT-4, Claude 3 Sonnet, Gemini Pro</li>
              <li>⚠️ <strong>Shared rate limits</strong>: May hit limits during peak usage</li>
              <li>⚠️ <strong>No customization</strong>: Fixed configuration</li>
            </ul>

            <h3>Project Memory Integration</h3>
            <p>Enhance breakthroughs with your project context:</p>
            <ul className="space-y-2">
              <li><strong>none</strong>: No project context (fastest)</li>
              <li><strong>light</strong>: Include recently modified files</li>
              <li><strong>full</strong>: TF-IDF similarity matching for most relevant code</li>
            </ul>

            <pre className="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono border"><code>{`{
  "prompt": "How can I optimize this database query performance?",
  "mode": "user_keys",
  "project_memory": "full",
  "project_context": {
    "root_path": "/workspace/myapp",
    "includes": ["**/*.sql", "**/*.js", "**/*.ts"],
    "excludes": ["node_modules/**", "dist/**", "*.log"]
  }
}`}</code></pre>

            <h2 id="usage-examples">Real-World Agent Use Cases</h2>
            
            <h3>🐛 Debugging Roadblocks</h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
              <h4 className="font-semibold text-red-900 mb-2">Scenario: SQL Performance Mystery</h4>
              <p className="text-red-800 text-sm mb-3">Your agent is stuck - the SQL query has indexes but is still slow despite standard optimizations.</p>
              <pre className="bg-gray-100 text-gray-800 p-3 rounded text-sm font-mono border overflow-x-auto"><code>{`{
  "name": "get_breakthroughs",
  "arguments": {
    "prompt": "My SQL query is slow despite having indexes. I've tried standard optimizations but performance is still poor. The query joins 3 tables and filters by date range. What advanced optimizations am I missing?",
    "mode": "user_keys",
    "models": ["gpt-4", "claude-3.5-sonnet", "gemini-1.5-pro"],
    "project_memory": "full",
    "temperature": 0.3
  }
}`}</code></pre>
            </div>

            <h3>🏗️ Architecture Decisions</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-4">
              <h4 className="font-semibold text-blue-900 mb-2">Scenario: Microservices vs Monolith</h4>
              <p className="text-blue-800 text-sm mb-3">Your agent needs expert breakthroughs on architectural trade-offs for a fintech application.</p>
              <pre className="bg-gray-100 text-gray-800 p-3 rounded text-sm font-mono border overflow-x-auto"><code>{`{
  "name": "get_breakthroughs",
  "arguments": {
    "prompt": "I'm choosing between microservices and monolith architecture for a fintech app that needs to handle payments, user management, and compliance reporting. I need multiple expert breakthroughs on trade-offs, security implications, and scalability considerations.",
    "mode": "user_keys",
    "models": ["gpt-4", "claude-3-opus", "llama-3.1-405b-reasoning"],
    "temperature": 0.4
  }
}`}</code></pre>
            </div>

            <h3>🔍 Code Review & Security</h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 my-4">
              <h4 className="font-semibold text-green-900 mb-2">Scenario: Authentication Security Review</h4>
              <p className="text-green-800 text-sm mb-3">Your agent wants multiple security-focused breakthroughs on an authentication module.</p>
              <pre className="bg-gray-100 text-gray-800 p-3 rounded text-sm font-mono border overflow-x-auto"><code>{`{
  "name": "get_breakthroughs",
  "arguments": {
    "prompt": "Review this authentication module for security vulnerabilities and suggest improvements. I want multiple security-focused breakthroughs on JWT handling, password policies, and session management.",
    "mode": "user_keys",
    "models": ["gpt-4", "claude-3.5-sonnet", "gemini-1.5-pro"],
    "project_memory": "full",
    "project_context": {
      "root_path": "/workspace/auth-service",
      "includes": ["**/*.js", "**/*.ts", "**/auth/**", "**/middleware/**"],
      "excludes": ["node_modules/**", "tests/**", "*.log"]
    },
    "temperature": 0.2
  }
}`}</code></pre>
            </div>

            <h3>🔧 Problem-Solving Stuck Points</h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-4">
              <h4 className="font-semibold text-yellow-900 mb-2">Scenario: OAuth2 Implementation Issues</h4>
              <p className="text-yellow-800 text-sm mb-3">Your agent is stuck with cryptic OAuth2 PKCE errors and unclear documentation.</p>
              <pre className="bg-gray-100 text-gray-800 p-3 rounded text-sm font-mono border overflow-x-auto"><code>{`{
  "name": "get_breakthroughs",
  "arguments": {
    "prompt": "I'm implementing OAuth2 PKCE flow but getting 'invalid_request' errors. The documentation is unclear about parameter encoding, code_challenge generation, and redirect URI handling. Help me troubleshoot step by step.",
    "mode": "user_keys",
    "models": ["gpt-4", "claude-3.5-sonnet", "gemini-1.5-pro", "llama-3.1-sonar-large-128k-online"],
    "temperature": 0.3
  }
}`}</code></pre>
            </div>

            <h2 id="response-format">Response Format</h2>
            <p>Polydev returns formatted breakthroughs that your agent can directly process:</p>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 my-4">
              <pre className="text-sm"><code>{`# Multiple AI Perspectives

Got 3 breakthroughs in 1247ms using 892 tokens.

## GPT-4 Perspective

The performance issue likely stems from unnecessary re-renders caused by objects being recreated on every render. Here are the key areas to investigate:

1. **Inline object creation in JSX**: Check if you're creating objects directly in render methods
2. **useEffect dependencies**: Ensure dependency arrays don't contain objects that change reference
3. **Context value changes**: If using React Context, make sure the value isn't recreated each render

*Tokens: 234, Latency: 1100ms*

---

## CLAUDE-3.5-SONNET Perspective

Looking at React performance optimization, I'd focus on these systematic approaches:

1. **Profiler analysis**: Use React DevTools Profiler to identify which components re-render
2. **Memoization strategy**: Apply React.memo, useMemo, and useCallback strategically
3. **State structure**: Consider if state is normalized and properly scoped

The root cause is often improper memoization or state management patterns.

*Tokens: 198, Latency: 987ms*

---

## GEMINI-1.5-PRO Perspective

From a different angle, consider these React optimization strategies:

1. **Component tree analysis**: Look for parent components that re-render unnecessarily
2. **Props drilling**: Check if you're passing down props that frequently change
3. **Virtual DOM overhead**: Sometimes splitting components can reduce reconciliation work

I'd recommend starting with the React Profiler to get concrete data before optimizing.

*Tokens: 156, Latency: 892ms*`}</code></pre>
            </div>

            <h2 id="best-practices">Best Practices for Agents</h2>
            
            <h3>1. Be Specific in Prompts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-900 mb-2">❌ Too Generic</h4>
                <code className="text-sm text-red-800">"Help me with this code"</code>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">✅ Specific & Actionable</h4>
                <code className="text-sm text-green-800">"This React component re-renders on every state change even with useMemo. Help me identify why the memoization isn't working."</code>
              </div>
            </div>

            <h3>2. Choose the Right Models</h3>
            <ul className="space-y-3">
              <li><strong>All models</strong> - For diverse breakthroughs and creative solutions</li>
              <li><strong>GPT-4 + Claude 3.5 Sonnet</strong> - For technical accuracy and analysis</li>
              <li><strong>Gemini + Perplexity Sonar</strong> - For research and latest information</li>
              <li><strong>Llama 3.1 405B</strong> - For complex reasoning and mathematical problems</li>
            </ul>

            <h3>3. Use Project Memory Strategically</h3>
            <ul className="space-y-2">
              <li><strong>none</strong>: For general questions not tied to your codebase</li>
              <li><strong>light</strong>: For debugging issues in recently modified files</li>
              <li><strong>full</strong>: For complex architectural decisions requiring deep context</li>
            </ul>

            <h3>4. Handle Responses Intelligently</h3>
            <pre className="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono border"><code>{`// Agent logic example
const breakthroughs = await getPerspectives({
  prompt: "How do I fix this memory leak?",
  models: ["gpt-4", "claude-3.5-sonnet", "gemini-1.5-pro"]
});

// Extract common themes across responses
const commonSolutions = findCommonAdvice(breakthroughs.responses);
const quickWins = findImmediateSolutions(breakthroughs.responses);

// Prioritize solutions mentioned by multiple models
if (commonSolutions.length > 0) {
  return implementSolution(commonSolutions[0]);
} else if (quickWins.length > 0) {
  return implementSolution(quickWins[0]);
}

// If no consensus, ask for more specific guidance
return requestMoreSpecificHelp();`}</code></pre>

            <h2 id="troubleshooting">Troubleshooting</h2>
            
            <h3>Common Issues</h3>
            
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-900 mb-2">❌ "Authentication failed"</h4>
                <ul className="text-red-800 text-sm space-y-1">
                  <li>• Generate new token at <a href="/dashboard/mcp-tools" className="underline">dashboard/mcp-tools</a></li>
                  <li>• Check token isn't expired</li>
                  <li>• Ensure proper token format (<code>poly_...</code>)</li>
                  <li>• For user_keys mode: Make sure you're signed in</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-900 mb-2">⚠️ "No breakthroughs received"</h4>
                <ul className="text-yellow-800 text-sm space-y-1">
                  <li>• Check internet connectivity</li>
                  <li>• Verify prompt isn't empty</li>
                  <li>• Try with default models: <code>["gpt-4", "claude-3-sonnet"]</code></li>
                  <li>• Check if you've hit rate limits</li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">🔧 "Project memory not working"</h4>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>• Ensure root_path exists and is accessible</li>
                  <li>• Check file patterns include target files</li>
                  <li>• Verify sufficient disk space for caching</li>
                  <li>• Try with <code>project_memory: "light"</code> first</li>
                </ul>
              </div>
            </div>

            <h3>Debug Mode</h3>
            <pre className="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono border"><code>{`# Enable debug logging in MCP server
export POLYDEV_DEBUG=1
node /path/to/polydev/mcp/server.js

# Check MCP client logs
tail -f ~/.config/claude/mcp_debug.log`}</code></pre>
          </div>
        )

      case 'mcp-protocol':
        return (
          <div className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-h1:text-4xl prose-h1:font-extrabold prose-h1:tracking-tight prose-h2:text-3xl prose-h2:tracking-tight prose-h3:text-xl prose-h3:text-slate-800 prose-p:text-slate-600 prose-p:leading-relaxed prose-code:bg-slate-100 prose-code:text-violet-600 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-semibold">
            <h1>Model Context Protocol (MCP)</h1>
            
            <h2 id="mcp-overview">MCP Overview</h2>
            <p>
              The Model Context Protocol (MCP) is an open-source standard for connecting AI models with external data sources and tools.
              Polydev AI implements MCP to provide seamless integration with various services and APIs.
            </p>

            <h3>Architecture</h3>
            <div className="bg-blue-50 p-6 rounded-lg">
              <pre><code>{`┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │────│ MCP Server  │────│  Resource   │
│ (AI Model)  │    │ (Polydev)   │    │ (Database)  │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       │                   │                   │
   ┌───▼───┐          ┌────▼────┐         ┌────▼────┐
   │Tools  │          │Protocol │         │  Data   │
   │Context│          │Messages │         │Sources  │
   └───────┘          └─────────┘         └─────────┘`}</code></pre>
            </div>

            <h2 id="server-implementation">Server Implementation</h2>
            <p>Create custom MCP servers to connect your tools and data sources:</p>

            <h3>Basic Server</h3>
            <pre className="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono border"><code>{`import { Server } from '@polydev/mcp-server'

const server = new Server({
  name: 'my-custom-server',
  version: '1.0.0'
})

// Register tools
server.registerTool({
  name: 'get_weather',
  description: 'Get current weather for a location',
  schema: {
    type: 'object',
    properties: {
      location: { type: 'string' }
    }
  },
  handler: async ({ location }) => {
    // Implementation
    return { temperature: 72, conditions: 'sunny' }
  }
})

server.start()`}</code></pre>

            <h3>Advanced Features</h3>
            <ul>
              <li>Resource management and streaming</li>
              <li>Authentication and authorization</li>
              <li>Error handling and logging</li>
              <li>Performance monitoring</li>
            </ul>

            <h2 id="tool-integration">Tool Integration</h2>
            <p>Connect external tools and APIs to your MCP server:</p>

            <pre className="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono border"><code>{`// Database integration
server.registerTool({
  name: 'query_database',
  description: 'Execute SQL queries',
  handler: async ({ query }) => {
    const result = await db.query(query)
    return result
  }
})

// API integration
server.registerTool({
  name: 'call_external_api',
  description: 'Make HTTP requests',
  handler: async ({ url, method, data }) => {
    const response = await fetch(url, { method, body: data })
    return response.json()
  }
})`}</code></pre>

            <h2 id="resource-management">Resource Management</h2>
            <p>Handle data sources and file systems:</p>

            <pre className="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono border"><code>{`// File system resource
server.registerResource({
  name: 'file',
  description: 'Access file system',
  handler: {
    list: async (path) => {
      return fs.readdir(path)
    },
    read: async (path) => {
      return fs.readFile(path, 'utf8')
    },
    write: async (path, content) => {
      return fs.writeFile(path, content)
    }
  }
})`}</code></pre>
          </div>
        )

      case 'multi-llm':
        return (
          <div className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-h1:text-4xl prose-h1:font-extrabold prose-h1:tracking-tight prose-h2:text-3xl prose-h2:tracking-tight prose-h3:text-xl prose-h3:text-slate-800 prose-p:text-slate-600 prose-p:leading-relaxed prose-code:bg-slate-100 prose-code:text-violet-600 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-semibold">
            <h1>Multi-LLM Provider Support</h1>

            <h2 id="supported-providers">20+ Provider Ecosystem</h2>
            <p>Polydev Perspectives supports an extensive ecosystem of LLM providers. Use your own API keys for direct access to any combination of models:</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 not-prose mb-6">
              <div className="bg-white border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">🏆 OpenAI</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• GPT-4o</li>
                  <li>• GPT-4 Turbo</li>
                  <li>• GPT-4</li>
                  <li>• GPT-3.5 Turbo</li>
                  <li>• o1-preview</li>
                  <li>• o1-mini</li>
                </ul>
              </div>
              
              <div className="bg-white border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">🧠 Anthropic</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Claude 3.5 Sonnet</li>
                  <li>• Claude 3 Opus</li>
                  <li>• Claude 3 Haiku</li>
                  <li>• Claude 3.5 Haiku</li>
                </ul>
              </div>
              
              <div className="bg-white border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">🌟 Google AI</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Gemini 1.5 Pro</li>
                  <li>• Gemini 1.5 Flash</li>
                  <li>• Gemini Pro</li>
                  <li>• Gemini Flash</li>
                </ul>
              </div>
              
              <div className="bg-white border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">⚡ Groq</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Llama 3.1 70B Versatile</li>
                  <li>• Llama 3.1 8B Instant</li>
                  <li>• Mixtral 8x7B</li>
                  <li>• Gemma 2 9B</li>
                </ul>
              </div>
              
              <div className="bg-white border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">🔍 Perplexity</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Sonar Large 128k Online</li>
                  <li>• Sonar Small 128k Online</li>
                  <li>• Llama 3.1 Sonar Large</li>
                  <li>• Llama 3.1 Sonar Small</li>
                </ul>
              </div>
              
              <div className="bg-white border rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">🤝 Together AI</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Llama 3.1 405B</li>
                  <li>• Llama 3.1 70B</li>
                  <li>• Qwen 2.5 72B</li>
                  <li>• DeepSeek Coder</li>
                </ul>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-blue-900 mb-2">💡 16+ More Providers Supported</h4>
              <p className="text-blue-800 text-sm">Including Cohere, Mistral, Replicate, Hugging Face, Azure OpenAI, AWS Bedrock, Vertex AI, and more. Add any provider's API key in your dashboard.</p>
            </div>

            <h2 id="model-orchestration">Model Orchestration</h2>
            <p>Route requests intelligently across different models:</p>

            <pre className="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono border"><code>{`// Smart routing configuration
const orchestration = {
  rules: [
    {
      condition: 'task === "code"',
      model: 'gpt-4',
      fallback: 'claude-3-opus'
    },
    {
      condition: 'length > 10000',
      model: 'claude-3-opus',
      fallback: 'gpt-4-turbo'
    },
    {
      condition: 'cost_sensitive === true',
      model: 'gpt-3.5-turbo',
      fallback: 'claude-haiku'
    }
  ],
  default: 'gpt-4'
}`}</code></pre>

            <h3>Load Balancing</h3>
            <pre className="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono border"><code>{`// Distribute load across models
const loadBalancer = {
  strategy: 'round_robin', // or 'least_latency', 'least_cost'
  models: [
    { id: 'gpt-4', weight: 0.4 },
    { id: 'claude-3-opus', weight: 0.4 },
    { id: 'gemini-pro', weight: 0.2 }
  ]
}`}</code></pre>

            <h2 id="response-comparison">Response Comparison</h2>
            <p>Compare outputs from multiple models simultaneously:</p>

            <pre className="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono border"><code>{`POST /v1/compare
{
  "models": ["gpt-4", "claude-3-opus", "gemini-pro"],
  "prompt": "Explain quantum computing",
  "parameters": {
    "temperature": 0.7,
    "max_tokens": 500
  }
}`}</code></pre>

            <h3>Response Format</h3>
            <pre className="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono border"><code>{`{
  "comparison_id": "comp_123456",
  "responses": [
    {
      "model": "gpt-4",
      "response": "Quantum computing is...",
      "metrics": {
        "latency": 1200,
        "tokens": 487,
        "cost": 0.024
      }
    },
    {
      "model": "claude-3-opus", 
      "response": "Quantum computing represents...",
      "metrics": {
        "latency": 950,
        "tokens": 523,
        "cost": 0.031
      }
    }
  ],
  "analysis": {
    "best_for_speed": "claude-3-opus",
    "best_for_cost": "gpt-4", 
    "most_detailed": "claude-3-opus"
  }
}`}</code></pre>

            <h2 id="cost-optimization">Cost Optimization</h2>
            <p>Strategies to minimize API costs while maintaining quality:</p>

            <h3>Caching Strategy</h3>
            <pre className="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono border"><code>{`// Semantic caching
const cacheConfig = {
  enabled: true,
  similarity_threshold: 0.95,
  ttl: 3600, // 1 hour
  max_size: '1GB'
}

// Response caching reduces costs by ~60%`}</code></pre>

            <h3>Smart Usage Tips</h3>
            <div className="space-y-3">
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <p className="text-sm"><strong>💡 Start Small:</strong> Begin with 2-3 providers (OpenAI + Anthropic + Groq) to see what works best for your use cases.</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <p className="text-sm"><strong>⚡ Speed vs Cost:</strong> Use Groq for fast iterations, premium models (GPT-4, Claude Opus) for critical decisions.</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <p className="text-sm"><strong>📊 Track Usage:</strong> Monitor your dashboard to understand which models provide the best value for your specific workflows.</p>
              </div>
            </div>
          </div>
        )

      case 'api-reference':
        return (
          <div className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-h1:text-4xl prose-h1:font-extrabold prose-h1:tracking-tight prose-h2:text-3xl prose-h2:tracking-tight prose-h3:text-xl prose-h3:text-slate-800 prose-p:text-slate-600 prose-p:leading-relaxed prose-code:bg-slate-100 prose-code:text-violet-600 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-semibold">
            <h1>MCP Tool Reference</h1>
            <p>Polydev Perspectives provides a single powerful MCP tool for getting multiple AI breakthroughs. Here's the complete tool specification:</p>

            <h2 id="get-breakthroughs-tool">get_breakthroughs Tool</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">🎯 Core Purpose</h3>
              <p className="text-blue-800">Fan out a single prompt to multiple LLM providers simultaneously and get back diverse breakthroughs. Perfect for breaking through agent roadblocks and decision paralysis.</p>
            </div>

            <h3>Base URL</h3>
            <pre className="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono border"><code>https://api.polydev.ai/v1</code></pre>

            <h3>Authentication</h3>
            <pre className="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono border"><code>{`Authorization: Bearer YOUR_API_KEY`}</code></pre>

            <h3>Chat Completions</h3>
            <div className="bg-green-50 p-4 rounded-lg">
              <strong>POST</strong> <code>/chat/completions</code>
            </div>

            <pre className="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono border"><code>{`curl -X POST https://api.polydev.ai/v1/chat/completions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user", 
        "content": "Hello!"
      }
    ],
    "temperature": 0.7,
    "max_tokens": 150
  }'`}</code></pre>

            <h3>MCP Server Management</h3>
            <div className="bg-blue-50 p-4 rounded-lg">
              <strong>GET</strong> <code>/mcp/servers</code> - List MCP servers<br/>
              <strong>POST</strong> <code>/mcp/servers</code> - Create MCP server<br/>
              <strong>GET</strong> <code>/mcp/servers/{'{id}'}</code> - Get MCP server<br/>
              <strong>PUT</strong> <code>/mcp/servers/{'{id}'}</code> - Update MCP server<br/>
              <strong>DELETE</strong> <code>/mcp/servers/{'{id}'}</code> - Delete MCP server
            </div>

            <h3>Model Comparison</h3>
            <div className="bg-purple-50 p-4 rounded-lg">
              <strong>POST</strong> <code>/compare</code>
            </div>

            <pre className="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono border"><code>{`{
  "models": ["gpt-4", "claude-3-opus"],
  "prompt": "Explain machine learning",
  "parameters": {
    "temperature": 0.7,
    "max_tokens": 300
  }
}`}</code></pre>

            <h2 id="graphql-api">GraphQL API</h2>
            <p>For more complex queries and real-time subscriptions.</p>

            <h3>Endpoint</h3>
            <pre className="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono border"><code>https://api.polydev.ai/graphql</code></pre>

            <h3>Example Query</h3>
            <pre className="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono border"><code>{`query GetDashboardData {
  user {
    id
    email
    subscription {
      plan
      usage {
        requests
        cost
      }
    }
  }
  mcpServers {
    id
    name
    status
    tools {
      name
      description
    }
  }
  llmProviders {
    id
    name
    models {
      id
      name
      pricing {
        input
        output
      }
    }
  }
}`}</code></pre>

            <h3>Subscriptions</h3>
            <pre className="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono border"><code>{`subscription SystemHealth {
  systemStatus {
    timestamp
    mcpServers {
      id
      status
      responseTime
    }
    llmProviders {
      id
      status
      latency
    }
  }
}`}</code></pre>

            <h2 id="websocket-api">WebSocket API</h2>
            <p>Real-time communication for streaming responses and live updates.</p>

            <h3>Connection</h3>
            <pre className="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono border"><code>{`const ws = new WebSocket('wss://api.polydev.ai/v1/ws');
ws.addEventListener('open', () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'YOUR_API_KEY'
  }));
});`}</code></pre>

            <h3>Streaming Chat</h3>
            <pre className="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono border"><code>{`ws.send(JSON.stringify({
  type: 'chat.stream',
  data: {
    model: 'gpt-4',
    messages: [
      { role: 'user', content: 'Hello!' }
    ],
    stream: true
  }
}));`}</code></pre>

            <h2 id="sdks">SDKs</h2>
            <p>Official SDKs for popular programming languages.</p>

            <h3>JavaScript/TypeScript</h3>
            <pre className="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono border"><code>{`import { PolydevAI } from '@polydev/sdk'

const polydev = new PolydevAI({
  apiKey: process.env.POLYDEV_API_KEY
})

const response = await polydev.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }]
})`}</code></pre>

            <h3>Python</h3>
            <pre className="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono border"><code>{`import polydev

client = polydev.PolydevAI(
    api_key=os.environ.get("POLYDEV_API_KEY")
)

response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)`}</code></pre>

            <h3>Go</h3>
            <pre className="bg-gray-100 text-gray-800 p-4 rounded-lg overflow-x-auto text-sm font-mono border"><code>{`package main

import (
    "github.com/polydev-ai/go-sdk"
)

func main() {
    client := polydev.NewClient(
        polydev.WithAPIKey(os.Getenv("POLYDEV_API_KEY")),
    )
    
    response, err := client.Chat.Completions.Create(ctx, &polydev.ChatRequest{
        Model: "gpt-4",
        Messages: []polydev.Message{
            {Role: "user", Content: "Hello!"},
        },
    })
}`}</code></pre>
          </div>
        )

      case 'integrations':
        return (
          <div className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-h1:text-4xl prose-h1:font-extrabold prose-h1:tracking-tight prose-h2:text-3xl prose-h2:tracking-tight prose-h3:text-xl prose-h3:text-slate-800 prose-p:text-slate-600 prose-p:leading-relaxed prose-code:bg-slate-100 prose-code:text-violet-600 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-semibold">
            <h1>MCP Client Integrations</h1>
            <p>Polydev Perspectives works with any MCP-compatible client. Here are the most popular integrations:</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 not-prose mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl mr-3">
                    C
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Claude Desktop</h3>
                    <p className="text-sm text-gray-600">Anthropic's official desktop app</p>
                  </div>
                </div>
                <p className="text-gray-700 text-sm mb-4">Most popular MCP client with built-in breakthroughs support. Perfect for interactive AI conversations with multiple model insights.</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Desktop App</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Official</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Easy Setup</span>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl mr-3">
                    →
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Continue.dev</h3>
                    <p className="text-sm text-gray-600">VSCode AI coding assistant</p>
                  </div>
                </div>
                <p className="text-gray-700 text-sm mb-4">Integrate breakthroughs directly into your coding workflow. Get multiple AI viewpoints on code reviews, debugging, and architecture decisions.</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">VSCode Extension</span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">Coding Focus</span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">Open Source</span>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-xl mr-3">
                    ⚡
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Cursor</h3>
                    <p className="text-sm text-gray-600">AI-first code editor</p>
                  </div>
                </div>
                <p className="text-gray-700 text-sm mb-4">Transform Cursor into a multi-AI powerhouse. Get diverse breakthroughs on complex coding challenges without switching contexts.</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">AI Editor</span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Built-in AI</span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Modern</span>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-xl mr-3">
                    🤖
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Cline (VSCode)</h3>
                    <p className="text-sm text-gray-600">Autonomous coding agent</p>
                  </div>
                </div>
                <p className="text-gray-700 text-sm mb-4">Give Cline access to multiple AI breakthroughs when it gets stuck. Perfect for complex autonomous coding tasks requiring diverse approaches.</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">VSCode Extension</span>
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">Autonomous</span>
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">Agent</span>
                </div>
              </div>
            </div>

            <h2 id="quick-setup">Quick Setup Guide</h2>
            <p>All MCP clients follow the same setup pattern for connecting to the hosted Polydev server:</p>
            
            <div className="bg-gray-50 border rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">1. Get Server URL</h3>
              <pre className="bg-gray-100 text-gray-800 p-3 rounded text-sm font-mono border overflow-x-auto"><code>Server URL: https://polydev.ai/api/mcp</code></pre>
            </div>
            
            <div className="bg-gray-50 border rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">2. Choose Authentication</h3>
              <pre className="bg-gray-100 text-gray-800 p-3 rounded text-sm font-mono border overflow-x-auto"><code>OAuth 2.0 (Recommended) or Bearer Token</code></pre>
            </div>
            
            <div className="bg-gray-50 border rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">3. Add to MCP Client Config</h3>
              <pre className="bg-gray-100 text-gray-800 p-3 rounded text-sm font-mono border overflow-x-auto"><code>{`{
  "servers": {
    "polydev": {
      "remote": {
        "transport": {
          "type": "sse",
          "url": "https://polydev.ai/api/mcp"
        },
        "auth": {
          "type": "oauth",
          "provider": "polydev"
        }
      }
    }
  }
}`}</code></pre>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">🎉 That's It!</h4>
              <p className="text-green-800 text-sm">The <code>get_breakthroughs</code> tool is now available in your MCP client. Test it with any question or problem that needs multiple AI viewpoints.</p>
            </div>

            <h2 id="universal-compatibility">Universal MCP Compatibility</h2>
            <p>Since Polydev Perspectives follows the standard MCP protocol, it works with any MCP-compatible client:</p>
            
            <ul className="space-y-2">
              <li>✅ <strong>Current MCP Clients:</strong> Claude Desktop, Continue.dev, Cursor, Cline</li>
              <li>✅ <strong>Future MCP Clients:</strong> Any new client that implements MCP protocol</li>
              <li>✅ <strong>Custom Clients:</strong> Your own MCP client implementations</li>
              <li>✅ <strong>Agent Frameworks:</strong> LangChain, AutoGen, CrewAI with MCP support</li>
            </ul>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <h4 className="font-semibold text-blue-900 mb-2">💡 Why MCP?</h4>
              <p className="text-blue-800 text-sm">MCP (Model Context Protocol) is Anthropic's open standard for AI assistant integrations. By building on MCP, Polydev Perspectives works everywhere MCP does - now and in the future.</p>
            </div>

            <h2 id="quick-setup">Quick Setup Guide</h2>
            <p className="text-lg text-gray-600 mb-6">Get started with Polydev Perspectives in any MCP-compatible client in under 5 minutes.</p>

            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6 mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">1</span>
                Configure MCP Client
              </h3>
              <p className="text-gray-700 mb-4">Add Polydev Perspectives to your MCP client configuration:</p>
              
              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <h4 className="font-semibold text-gray-900 mb-2">Claude Desktop</h4>
                <pre className="bg-gray-100 text-gray-800 p-3 rounded text-sm font-mono border overflow-x-auto"><code>{`{
  "mcpServers": {
    "polydev": {
      "remote": {
        "transport": {
          "type": "sse",
          "url": "https://polydev.ai/api/mcp"
        },
        "auth": {
          "type": "oauth",
          "provider": "polydev"
        }
      }
    }
  }
}`}</code></pre>
              </div>

              <div className="bg-white rounded-lg p-4 border border-purple-200 mt-4">
                <h4 className="font-semibold text-gray-900 mb-2">Continue.dev</h4>
                <pre className="bg-gray-100 text-gray-800 p-3 rounded text-sm font-mono border overflow-x-auto"><code>{`// In your .continue/config.json
{
  "mcpServers": {
    "polydev": {
      "remote": {
        "transport": {
          "type": "sse",
          "url": "https://polydev.ai/api/mcp"
        },
        "auth": {
          "type": "bearer",
          "token": "pd_your_token_here"
        }
      }
    }
  }
}`}</code></pre>
              </div>

              <div className="bg-white rounded-lg p-4 border border-purple-200 mt-4">
                <h4 className="font-semibold text-gray-900 mb-2">Cursor / Cline</h4>
                <pre className="bg-gray-100 text-gray-800 p-3 rounded text-sm font-mono border overflow-x-auto"><code>{`# Configure remote MCP server connection
Server URL: https://polydev.ai/api/mcp
Transport: Server-Sent Events (SSE)
Authentication: OAuth 2.0 or Bearer Token`}</code></pre>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">2</span>
                Set Up API Keys
              </h3>
              <p className="text-gray-700 mb-4">Configure your LLM provider API keys for best results:</p>
              
              <div className="space-y-4">
                <div className="flex items-center p-3 bg-white rounded-lg border border-green-200">
                  <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center text-white font-bold text-sm mr-4">
                    AI
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Sign in to Polydev Dashboard</p>
                    <p className="text-sm text-gray-600">Visit <a href="https://polydev.ai/dashboard/api-keys" className="text-blue-600 hover:underline">polydev.ai/dashboard/api-keys</a></p>
                  </div>
                </div>
                
                <div className="flex items-center p-3 bg-white rounded-lg border border-green-200">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm mr-4">
                    +
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Add Your API Keys</p>
                    <p className="text-sm text-gray-600">OpenAI, Anthropic, Google, Groq, and 16+ more providers</p>
                  </div>
                </div>
                
                <div className="flex items-center p-3 bg-white rounded-lg border border-green-200">
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm mr-4">
                    ⚡
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Ready to Use</p>
                    <p className="text-sm text-gray-600">Your MCP client can now call multiple LLMs through Polydev</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6 mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">3</span>
                Start Using Perspectives
              </h3>
              <p className="text-gray-700 mb-4">Use the get_breakthroughs tool in your MCP client:</p>
              
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <pre className="bg-gray-100 text-gray-800 p-3 rounded text-sm font-mono border overflow-x-auto"><code>{`// In Claude Desktop, Continue.dev, or other MCP client:
{
  "tool": "get_breakthroughs",
  "arguments": {
    "prompt": "Help me debug this React performance issue...",
    "models": ["gpt-4", "claude-3-sonnet", "gemini-pro"],
    "mode": "user_keys"
  }
}`}</code></pre>
              </div>
              
              <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                <p className="text-sm text-blue-800">💡 <strong>Pro tip:</strong> The tool automatically uses your configured API keys and returns breakthroughs from multiple LLMs in a single response.</p>
              </div>
            </div>

            <h2 id="advanced-configuration">Advanced Configuration</h2>
            <p className="text-lg text-gray-600 mb-6">Customize Polydev Perspectives for your specific workflow needs.</p>

            <div className="space-y-6">
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Project Memory</h3>
                <p className="text-gray-600 mb-4">Include relevant project context in your perspective requests:</p>
                <pre className="bg-gray-100 text-gray-800 p-4 rounded text-sm font-mono border overflow-x-auto"><code>{`{
  "tool": "get_breakthroughs",
  "arguments": {
    "prompt": "How can I optimize this database query?",
    "project_memory": "full",
    "project_context": {
      "root_path": "/workspace/myapp",
      "includes": ["**/*.sql", "**/*.js"],
      "excludes": ["node_modules/**", "dist/**"]
    }
  }
}`}</code></pre>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Model Selection</h3>
                <p className="text-gray-600 mb-4">Choose specific models for specialized tasks:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Code & Technical</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• gpt-4</li>
                      <li>• claude-3-sonnet</li>
                      <li>• llama-3.1-70b-versatile</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Creative & Research</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• gemini-pro</li>
                      <li>• claude-3-opus</li>
                      <li>• llama-3.1-sonar-large-128k-online</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Temperature Control</h3>
                <p className="text-gray-600 mb-4">Fine-tune model creativity for different use cases:</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <div>
                      <span className="font-medium text-blue-900">Technical / Debugging</span>
                      <p className="text-sm text-blue-700">Precise, factual responses</p>
                    </div>
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">0.1 - 0.3</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div>
                      <span className="font-medium text-green-900">Analysis / Planning</span>
                      <p className="text-sm text-green-700">Balanced reasoning</p>
                    </div>
                    <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">0.4 - 0.6</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <div>
                      <span className="font-medium text-purple-900">Creative / Brainstorming</span>
                      <p className="text-sm text-purple-700">Diverse ideas and approaches</p>
                    </div>
                    <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium">0.7 - 0.9</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return <div>Select a section to view documentation</div>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Documentation</h2>
              <nav className="space-y-2">
                {docSections.map((section) => (
                  <div key={section.id}>
                    <button
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg font-medium ${
                        activeSection === section.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {section.title}
                    </button>
                    {activeSection === section.id && (
                      <div className="ml-4 mt-2 space-y-1">
                        {section.items.map((item) => (
                          <a
                            key={item.href}
                            href={item.href}
                            className="block px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
                          >
                            {item.title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow p-8">
              {getDocContent(activeSection)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}