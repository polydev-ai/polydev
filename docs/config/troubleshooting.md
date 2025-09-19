# **Troubleshooting**

Common issues and quick fixes.

## **MCP not working**

**Check config path**
```bash
# macOS
~/Library/Application Support/Claude/claude_desktop_config.json

# Windows
%APPDATA%\Claude\claude_desktop_config.json
```

**Restart your agent** - Claude Desktop, Cline, Cursor

## **No API responses**

**Check API keys** → Dashboard → Settings → API Keys

**Test connection:**
```bash
curl -H "Authorization: Bearer sk-your-key" https://api.openai.com/v1/models
```

## **High costs**

**Set limits** in provider dashboards (OpenAI, Anthropic, etc.)

**Use cheaper models** - GPT-4 instead of GPT-5 for simple tasks

That's it.