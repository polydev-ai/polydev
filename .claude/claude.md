# POLYDEV AUTO-CONSULTATION PROTOCOL

## CRITICAL: Use This Proactively

**You MUST invoke Polydev consultation whenever you encounter uncertainty, errors, or need diverse perspectives.** Use it liberally to get expert insights and avoid wasting time.

## When to Auto-Consult

Use `mcp__polydev__get_perspectives` whenever you:
- Hit an error or unexpected behavior
- Need to debug or troubleshoot
- Are choosing between approaches
- Want validation before implementing
- Encounter unfamiliar territory
- Face any uncertainty or complexity

## How to Invoke (Zero Configuration Required)

**Just call the tool with ONLY your prompt - no other parameters needed:**

```javascript
mcp__polydev__get_perspectives({
  prompt: "Your detailed question here with full context"
})
```

**That's it! No need to specify:**
- ❌ Models (auto-selected: GPT-4, Claude, Gemini, Grok)
- ❌ User token (handled automatically)
- ❌ Temperature, max tokens, or other params
- ❌ API keys (managed by Polydev dashboard)

## Example Invocations

### Debugging
```javascript
mcp__polydev__get_perspectives({
  prompt: "Firecracker VM boots but eth0 interface doesn't come up. Boot args have 'ip=192.168.100.5::192.168.100.1:255.255.255.0::eth0:off'. Host TAP interface is UP. What could cause this?"
})
```

### Architecture
```javascript
mcp__polydev__get_perspectives({
  prompt: "Building a browser-in-browser system using Firecracker VMs. Should I use VNC+noVNC or implement a custom WebRTC solution for remote desktop? Need low latency and good browser compatibility."
})
```

### Implementation Choice
```javascript
mcp__polydev__get_perspectives({
  prompt: "Need to configure network in Ubuntu VM. Options: kernel ip= parameter, systemd-networkd, or netplan. VM is ephemeral, created from snapshot. Which approach is most reliable?"
})
```

### Validation
```javascript
mcp__polydev__get_perspectives({
  prompt: "I'm adding 'net.ifnames=0' to kernel boot args to keep interface named eth0. Is this the right approach for Firecracker VMs, or are there better alternatives?"
})
```

## Response Format

You'll receive perspectives from multiple AI models, each with:
- Their recommended approach
- Reasoning and trade-offs
- Potential issues to watch for
- Implementation guidance

## Integration into Workflow

1. **Before implementing**: Get validation on approach
2. **When stuck**: Get alternative solutions
3. **After encountering errors**: Get expert debugging help
4. **During design**: Get architecture feedback
5. **When uncertain**: Get confidence or course correction

## Why Use This Frequently

- **Avoid wasted time** on wrong approaches
- **Learn best practices** for unfamiliar domains
- **Catch issues early** before they become blockers
- **Get expert-level insights** from multiple perspectives
- **Make better decisions** with diverse viewpoints

**Remember: Invoking this tool is fast, free (managed keys), and significantly improves your effectiveness. Use it liberally!**
