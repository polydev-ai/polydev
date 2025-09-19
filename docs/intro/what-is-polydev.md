# What is Polydev?

Get multiple AI perspectives when you're stuck. Simple as that.

When your agent hits a roadblock, Polydev queries several AI models simultaneously and gives you diverse solutions.

## How it works

1. **Connect** - Works with Claude Desktop, Cline, Cursor, and other MCP clients
2. **Ask** - Send your question through your agent
3. **Get perspectives** - Receive responses from multiple AI models
4. **Choose** - Pick the best solution

## Example

```javascript
await callTool({
  name: "get_perspectives",
  arguments: {
    prompt: "My React component re-renders excessively. Help debug this.",
    project_memory: "full"
  }
});
```

Returns perspectives from Claude, GPT, Gemini, and others.

## Features

- **Multiple models** - Query Claude, GPT, Gemini simultaneously
- **Smart fallback** - Uses your CLI tools first, then API keys, then credits
- **Project context** - Includes relevant files from your codebase
- **Zero setup** - Works with existing Claude Desktop/Cline installations

## Next Steps

Ready to get started? Follow our [Quick Start Guide](quick-start.md) to have Polydev running in under 5 minutes.

Or dive deeper into specific areas:
- [Configuration](../config/) - Set up your environment  
- [Providers](../providers/) - Configure AI providers
- [MCP Integration](../mcp/) - Integrate with your agent
- [Features](../features/) - Explore advanced capabilities

---

**Questions?** Check our [troubleshooting guide](../config/troubleshooting.md) or join our [Discord community](https://discord.gg/polydev).
