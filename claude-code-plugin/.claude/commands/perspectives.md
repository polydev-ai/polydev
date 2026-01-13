# /perspectives - Get Multi-Model AI Perspectives

When the user runs this command, consult multiple AI models (GPT, Gemini, Grok) to get diverse perspectives on the current problem or question.

## How It Works

This skill uses the Polydev MCP server to query multiple AI models in parallel and synthesize their responses.

## Instructions

1. **Identify the context**: Look at the recent conversation to understand what the user is working on or stuck on.

2. **Formulate the query**: Create a clear, detailed question that captures:
   - The current problem or decision
   - Relevant code context (if applicable)
   - What kind of help is needed (debugging, architecture, review, etc.)

3. **Call Polydev**: Use the `mcp__mcp-execution__polydev_perspectives` tool with:
   ```
   prompt: "Your detailed question with context"
   ```

4. **Synthesize the response**: After receiving perspectives:
   - Highlight where models **agree** (high confidence insights)
   - Note where models **differ** (areas needing more consideration)
   - Provide actionable recommendations

## Example Usage

**User**: `/perspectives`

**Claude analyzes context and calls**:
```
mcp__mcp-execution__polydev_perspectives({
  prompt: "I'm implementing authentication for a Next.js app. Should I use NextAuth.js, Clerk, or build custom JWT auth? Consider: ease of setup, flexibility, cost, and security."
})
```

**Claude synthesizes**:
> **Multi-Model Consensus:**
> - All models recommend NextAuth.js for most use cases due to built-in providers
> - GPT emphasizes security considerations with custom JWT
> - Gemini highlights Clerk's developer experience benefits
>
> **Recommendation**: Start with NextAuth.js unless you need Clerk's UI components or have specific custom requirements.

## When to Use

- **Debugging**: When stuck on a bug after trying multiple approaches
- **Architecture**: When choosing between technologies or patterns
- **Code Review**: When you want validation from multiple perspectives
- **Best Practices**: When unsure about implementation approaches

## Models Consulted

- GPT-4 / GPT-5 (OpenAI)
- Gemini Pro (Google)
- Grok (xAI)
- Claude (via local CLI if available)
