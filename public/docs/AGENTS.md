# AGENTS.md - Universal AI Assistant Instructions

This file provides instructions for AI coding assistants (Claude Code, Cursor, Cline, Windsurf, Codex CLI, Continue, etc.) to automatically use Polydev when they need multiple perspectives.

---

## Polydev Multi-Model Perspectives

Polydev provides simultaneous access to multiple AI models through MCP. When facing complex problems, use it to get diverse perspectives.

### Auto-Invocation Triggers

**Automatically invoke Polydev `get_perspectives` when:**

1. **Architectural Decisions**
   - Choosing between design patterns
   - Selecting technologies or libraries
   - Planning system structure
   - Database schema decisions

2. **Debugging Complex Issues**
   - Errors with unclear root causes
   - Intermittent or hard-to-reproduce bugs
   - Performance degradation investigation
   - Memory leaks or race conditions

3. **Security Considerations**
   - Authentication/authorization implementation
   - Input validation approaches
   - Encryption or data protection
   - Vulnerability assessment

4. **Trade-off Analysis**
   - Performance vs. readability
   - Flexibility vs. simplicity
   - Build vs. buy decisions
   - Backward compatibility concerns

5. **User Requests Validation**
   - When user asks "is this the right approach?"
   - When user wants multiple opinions
   - When validating proposed solutions

### Usage Pattern

When triggered, use this pattern:

```
[Tool: get_perspectives]
prompt: "[Detailed question with full context]

Context:
- Current situation: [describe]
- Goal: [what needs to be achieved]
- Constraints: [any limitations]
- Code involved: [relevant snippets]

Question: [specific question]"
```

### Example Invocations

**Architecture decision:**
```
get_perspectives: "Should we use a monorepo or polyrepo structure for this project?

Context:
- Team size: 5 developers
- Services: 3 backend services, 1 frontend
- Current pain points: dependency management, release coordination
- Tech stack: TypeScript, Node.js, React

What are the tradeoffs and which approach fits better?"
```

**Debugging:**
```
get_perspectives: "React component re-renders excessively causing performance issues.

Code:
[paste component code]

Behavior:
- Re-renders on every parent update
- useMemo doesn't seem to help
- Using React 18 with strict mode

What could cause this and how to fix it?"
```

**Security review:**
```
get_perspectives: "Review this authentication middleware for security issues.

Code:
[paste middleware code]

Concerns:
- JWT handling
- Session management
- Rate limiting adequacy

What vulnerabilities exist and how to address them?"
```

### Response Handling

Polydev returns perspectives from multiple models. When presenting results:

1. **Synthesize** - Don't just list responses; identify common themes
2. **Highlight differences** - Note where models disagree
3. **Recommend** - Based on perspectives, suggest the best approach
4. **Explain reasoning** - Share why you're recommending a particular path

### When NOT to Invoke

Skip Polydev for:
- Simple, well-defined tasks
- Tasks you've successfully completed before
- Pure code generation without design decisions
- Trivial bug fixes with obvious solutions

---

## Configuration

Ensure Polydev MCP is configured in your environment. See setup guide at:
https://polydev.ai/docs/mcp-integration
