# Claude Code MCP Context Analysis

## Executive Summary

**Question**: Can Polydev MCP server automatically access Claude Code conversation history and project memory without local installation?

**Answer**: **No, this is not possible** due to fundamental architectural limitations.


## Technical Investigation

### 1. Claude Code Request Structure

Claude Code sends standard JSON-RPC requests to MCP servers containing:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_perspectives",
    "arguments": {
      "prompt": "user's actual prompt"
    }
  }
}
```

**Key Finding**: Claude Code does **NOT** automatically include conversation history, project memory, or CLAUDE.md contents in MCP requests.

### 2. Memory Architecture Analysis

#### Claude Code Memory Types:
- **Enterprise Policy**: Organization-wide (`CLAUDE.md` at enterprise level)
- **Project Memory**: Team-shared (`CLAUDE.md` in project directories) 
- **User Memory**: Personal preferences (`CLAUDE.md` in user directories)
- **Conversation History**: Stored locally in `~/.claude/projects/*.jsonl`

#### Memory Scope:
- CLAUDE.md files are loaded into Claude's **internal context** only
- Memory content is **NOT transmitted** to external MCP servers
- Conversation history remains **local to the Claude Code client**

### 3. Server-Side Access Limitations

#### Vercel Environment Constraints:
- **No filesystem access** to user's local machine
- **No network access** to local Claude Code files
- **Serverless isolation** prevents local file system interaction

#### Security Boundaries:
- **OS-level isolation**: Remote servers cannot access local user files
- **Network Address Translation (NAT)**: Local files unreachable from internet
- **TLS boundaries**: No secure channel to local Claude Code storage

### 4. Alternative Architecture Evaluation

#### Local Proxy Approach (Rejected by User):
```
Claude Code → Local Context Bridge → Polydev MCP Server
```
- **Status**: Technically viable but requires local installation
- **User Requirement**: "I was hoping that there is a server way to handle this without installing anything local"

#### Server-Only Approach:
```
Claude Code → Polydev MCP Server (attempts local file access)
```
- **Status**: **Impossible** - server cannot access local Claude files
- **Error**: `ENOENT: no such file or directory, scandir '/home/sbx_user1051/.claude/projects'`

## Cross-LLM Expert Consultation (GPT-5)

**Question Asked**: Can a remote MCP server automatically access Claude Code conversation history without local installation?

**GPT-5 Response**: **"No, it's not possible"**

**Technical Reasoning**:
1. **OS Isolation**: Remote servers run in different operating systems/containers
2. **Network Boundaries**: Local files are behind NAT, not accessible via internet
3. **Security Constraints**: Modern systems prevent remote access to local user data
4. **Architecture Mismatch**: Claude Code is client-side, MCP servers are server-side

## Documentation Research

### Claude Code MCP Documentation:
- **Finding**: No mention of automatic context transmission to MCP servers
- **Confirmation**: MCP servers receive only explicit tool call parameters

### Claude Code Memory Documentation:
- **Finding**: Memory is loaded into Claude's internal context
- **Limitation**: No indication that memory is shared with external tools/services

## Current Implementation Status

### Frontend Changes:
- **Memory Dashboard**: `/src/app/dashboard/memory/page.tsx` - **DISABLED** with feature flag
- **Status**: Shows comprehensive explanation to users about why feature is disabled
- **Reactivation**: Simple flag change (`isFeatureDisabled = false`) to re-enable

### Backend Infrastructure (Preserved):
1. `/src/lib/claudeMemorySync.ts` - Local file access implementation (kept for future use)
2. `/src/lib/mcpMemory.ts` - Memory management system (functional but unused)
3. `/src/app/api/mcp/route.ts` - Has client_context parameter support (ready for activation)
4. `/tools/polydev-context-bridge.js` - Local proxy solution (fully implemented)

### Error Logs (When Attempting Server Access):
```
ENOENT: no such file or directory, scandir '/home/sbx_user1051/.claude/projects'
```

### Database Schema (Still Active):
- All Supabase tables for conversations and project memories remain intact
- Request logs are still being captured in `/dashboard` as requested

## Conclusion

**Primary Requirement**: Automatic Claude Code context integration without local installation
**Technical Reality**: Not possible due to architectural isolation

**Implementation Status**: 
- Frontend feature **DISABLED** with user-friendly explanation
- Backend infrastructure **PRESERVED** for easy reactivation
- Database schema and request logging **ACTIVE** as requested
- All code maintained for future use

## Reactivation Instructions

### Quick Reactivation (Frontend):
```typescript
// In /src/app/dashboard/memory/page.tsx
const [isFeatureDisabled] = useState(false) // Change true to false
```

### Full Reactivation (Backend):
1. **Server-side**: Remove Claude file access attempts in `mcpMemory.ts`
2. **Local Proxy**: Deploy `/tools/polydev-context-bridge.js` locally
3. **Client Config**: Update Claude MCP config to use local proxy
4. **Testing**: Verify context injection through request logs

### Alternative Solutions:
- **Wait for Claude Code updates**: If Anthropic adds context transmission
- **Manual context**: Users explicitly include relevant memory in prompts
- **Hybrid approach**: Combine manual and automatic context where possible

## Current Status Summary

| Component | Status | Purpose | Reactivation |
|-----------|---------|---------|-------------|
| Frontend Dashboard | 🔴 DISABLED | User interface | Change feature flag |
| Backend Infrastructure | 🟡 PRESERVED | Core functionality | Ready for use |
| Database Schema | 🟢 ACTIVE | Data storage | Fully operational |
| Request Logging | 🟢 ACTIVE | Monitoring | Available in dashboard |
| Local Proxy | 🟡 IMPLEMENTED | Context bridge | Deploy when needed |
| Documentation | 🟢 COMPLETE | Technical reference | This document |

**Status**: Feature gracefully disabled with full preservation of functionality for future activation.