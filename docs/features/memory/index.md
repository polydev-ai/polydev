# Project Memory

Attach the minimum context your models need — safely and automatically.

## What it does
- Locates relevant snippets from your repo (paths you allow).
- Encrypts content client-side; only hashed metadata is stored for analytics.
- Injects just enough context into each request to keep answers accurate.

## Modes
- **None** — no automatic context.
- **Smart** — small, similarity-based snippets (recommended default).
- **Full** — larger context for deep reviews (use sparingly).

## Configure
```jsonc
// dashboard → Memory
{
  "enabled": true,
  "mode": "smart",
  "include": ["src/**", "docs/**"],
  "exclude": ["node_modules/**", "dist/**"],
  "max_kb": 64
}
```

## Use in a request
```javascript
const res = await perspectives({
  prompt: "Review this auth middleware for bugs and missing checks.",
  models: ["gpt-5", "claude-opus-4"],
  project_memory: "smart",
  project_context: {
    root_path: "/repo",
    include_patterns: ["src/auth/**"],
    exclude_patterns: ["**/*.test.ts"],
    max_context_size: 64000
  }
});
```

## Privacy
- Content encrypted client-side.
- Only minimal hashed metadata logged (path hash, size, timestamp).
- You can disable memory or clear stored entries at any time.
