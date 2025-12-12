# Polydev Auto-Invocation Instructions

Copy this section into your project's `CLAUDE.md`, `.claude/instructions.md`, or `AGENTS.md` file.

---

## Auto-Invoke Polydev for Multi-Model Perspectives

When you encounter any of these situations, **automatically** use the Polydev MCP tool to get multiple AI perspectives:

### When to Auto-Invoke

1. **Architecture decisions** - Choosing between patterns, technologies, or approaches
2. **Stuck on bugs** - Debugging tricky issues with unclear causes
3. **Code review** - Getting diverse opinions on implementation quality
4. **Performance issues** - Identifying bottlenecks and optimization strategies
5. **Security concerns** - Checking for vulnerabilities from multiple angles
6. **Design tradeoffs** - Weighing pros/cons of different solutions

### How to Invoke

Use the `get_perspectives` MCP tool:

```
Ask Polydev: "Get multiple perspectives on [your question with context]"
```

Or call the tool directly:

```javascript
await callTool({
  name: "get_perspectives",
  arguments: {
    prompt: "Your detailed question with relevant context"
  }
});
```

### Auto-Invocation Rules

**DO automatically invoke Polydev when:**
- You've tried 2+ approaches without success
- The user asks "what do you think?" or wants validation
- Making decisions that affect architecture or security
- The problem has multiple valid solutions
- You're uncertain about best practices

**DON'T invoke Polydev for:**
- Simple, straightforward tasks
- Questions with obvious answers
- Repetitive operations you've done before

### Example Prompts

**For debugging:**
```
"Get multiple perspectives on this error. Context: [paste error + relevant code]"
```

**For architecture:**
```
"Get perspectives on whether to use [option A] vs [option B] for [use case]. Requirements: [list requirements]"
```

**For code review:**
```
"Get perspectives on this implementation. Looking for bugs, security issues, and improvement suggestions. [paste code]"
```

---

## Integration Notes

- Polydev returns responses from multiple AI models (Claude, GPT, Gemini, etc.)
- Each model may catch different issues or suggest different approaches
- Use the diverse perspectives to make more informed decisions
- The tool works through MCP, so your IDE handles the connection
