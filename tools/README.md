# Polydev Context Bridge

Local proxy that enables automatic context sharing between Claude Code and Polydev MCP responses.

## Problem

- Claude Code stores conversation history locally in `~/.claude/projects/*.jsonl`
- Polydev MCP runs on remote Vercel servers with no access to local files
- Users want automatic context injection without complex background sync

## Solution

The **Context Bridge Proxy** runs locally and:
1. Intercepts MCP requests from Claude Code
2. Reads local Claude conversation files
3. Injects context into request parameters
4. Forwards enhanced requests to Polydev MCP server

## Setup

1. **Install dependencies:**
   ```bash
   cd tools
   npm install
   ```

2. **Start the context bridge:**
   ```bash
   npm start
   # or for development:
   npm run dev
   ```

3. **Update Claude Code MCP configuration:**
   
   Change your Claude MCP config from:
   ```json
   {
     "polydev": {
       "type": "http",
       "url": "https://www.polydev.ai/api/mcp"
     }
   }
   ```
   
   To:
   ```json
   {
     "polydev": {
       "type": "http", 
       "url": "http://127.0.0.1:8787/api/mcp"
     }
   }
   ```

## How It Works

```
Claude Code → Context Bridge (localhost:8787) → Polydev MCP (polydev.ai)
                     ↑
              Injects client_context:
              - Recent conversation summary
              - Last 6 conversation turns  
              - Project information
```

## Features

- ✅ **Zero Background Sync** - Only reads files on-demand during requests
- ✅ **Privacy-First** - Runs locally, only shares context summaries
- ✅ **Size-Limited** - Context capped at ~8KB to prevent payload bloat
- ✅ **Auto-Detection** - Finds most recent Claude project automatically
- ✅ **Transparent Proxy** - All other requests pass through unchanged
- ✅ **Health Checks** - Visit `http://127.0.0.1:8787/healthz` to check status

## Context Injection

The bridge automatically detects:
- **Recent Patterns**: Development, debugging, deployment activities
- **Key Terms**: Important technical concepts from conversation
- **Conversation Turns**: Last 6 user/assistant message exchanges
- **Project Context**: Current working project and session info

This context is injected as `client_context` parameter in MCP requests.

## Troubleshooting

- **Health Check**: `curl http://127.0.0.1:8787/healthz`
- **No Context**: Check Claude projects directory exists: `~/.claude/projects`
- **Port Conflict**: Change port in `polydev-context-bridge.js` if needed
- **Fallback**: Temporarily switch Claude config back to direct Polydev URL

## Security

- Binds to `127.0.0.1` only (no external access)
- No persistent storage of conversation data
- Context summaries only, not full conversation content
- Automatic redaction of potential secrets in development