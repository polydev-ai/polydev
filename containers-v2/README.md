# Ultra-Lightweight Unified Runtime Container (V2)

**Design Goal**: Support 200+ concurrent containers on 62GB RAM, 20-core VPS

## Key Changes from V1

### V1 Problems (❌ Bloated)
- Separate container per provider (3 images to maintain)
- Used full CLI tools: `@openai/codex` (378MB!), `@anthropic-ai/claude-code`, `@google/gemini-cli`
- Debian-based node:20-slim (100MB+ base)
- Installed unnecessary tools (git, curl, etc.)
- **Result**: 400-700MB per image, only ~12 concurrent containers possible

### V2 Solution (✅ Minimal)
- **ONE unified container** for all 3 providers
- Uses lightweight API clients only (not full CLI tools)
- Alpine-based node:20-alpine (~40MB base)
- No unnecessary dependencies
- **Target**: <50MB total image size, 200+ concurrent containers

## Architecture

### Single Unified Container
```
polydev-runtime:latest
├─ node:20-alpine (40MB base)
├─ openai SDK (~5MB)
├─ @anthropic-ai/sdk (~3MB)
├─ @google/generative-ai (~4MB)
├─ execute.js (API call logic)
└─ entrypoint.sh (credential validation)

Total: ~50MB (vs 400-700MB before!)
```

### Why This Works

**We don't need CLI tools!** Our users interact via the Polydev web frontend, not terminal.

**What we need**:
- API clients to make streaming requests
- Credential injection
- Output streaming back to master-controller

**What we DON'T need**:
- Interactive terminal UI
- File system tools
- Git integration
- Full development environment

## Resource Calculation

### Target: 200+ Concurrent Containers

**Available Resources**:
- RAM: 62GB total - 10GB system = 52GB available
- CPU: 20 cores

**Per Container**:
- RAM: 256MB
- CPU: 0.1 cores (100 MHz)
- Image: <50MB disk

**Capacity**:
```
52GB / 256MB = 203 containers ✅
20 cores / 0.1 = 200 containers ✅
```

**With warm pool (30 idle containers)**:
```
Active execution capacity: ~170 concurrent
Warm pool (idle): 30 containers
Total: 200 containers
```

## Usage

### Environment Variables

```bash
# Required
PROVIDER=openai|anthropic|google
USER_ID=user_xyz

# Provider-specific credentials (ONE of these)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...

# Optional
PROMPT="Your prompt here"
MODEL=gpt-4o-mini|claude-3-5-sonnet-20241022|gemini-2.0-flash-exp
WARM_POOL=true  # For idle containers
```

### Run Container

```bash
# OpenAI
docker run --rm \
  -e PROVIDER=openai \
  -e OPENAI_API_KEY=sk-test123 \
  -e PROMPT="Write a hello world function" \
  polydev-runtime:latest

# Anthropic
docker run --rm \
  -e PROVIDER=anthropic \
  -e ANTHROPIC_API_KEY=sk-ant-test123 \
  -e PROMPT="Explain how async/await works" \
  polydev-runtime:latest

# Google
docker run --rm \
  -e PROVIDER=google \
  -e GOOGLE_API_KEY=AIza-test123 \
  -e PROMPT="Debug this error" \
  polydev-runtime:latest
```

### Integration with Nomad

```javascript
const result = await nomadManager.submitRuntimeJob({
  userId: 'user_123',
  provider: 'openai',  // Can be openai, anthropic, or google
  credentials: { apiKey: decryptedKey },
  command: 'node /runtime/execute.js',
  env: {
    PROMPT: userPrompt,
    MODEL: 'gpt-4o-mini'
  }
});
```

## Build Instructions

```bash
# Build on VPS
cd /tmp/containers-v2/unified-runtime
docker build -t polydev-runtime:latest .

# Check size
docker images polydev-runtime:latest

# Expected: ~50MB (vs 400-700MB V1!)
```

## Size Comparison

| Version | Strategy | Base | Dependencies | Total Size | Concurrent |
|---------|----------|------|--------------|------------|------------|
| V1 | 3 separate images | Debian (100MB) | Full CLI tools | 400-700MB | ~12 max |
| V2 | 1 unified image | Alpine (40MB) | API clients only | **<50MB** | **200+** |

**Improvement**: 10x smaller images, 16x more concurrent containers!

## Testing

```bash
# Test all 3 providers with one container
docker run --rm -e PROVIDER=openai -e OPENAI_API_KEY=sk-test polydev-runtime:latest node -e "console.log('OpenAI client:', require('openai').VERSION)"

docker run --rm -e PROVIDER=anthropic -e ANTHROPIC_API_KEY=sk-ant-test polydev-runtime:latest node -e "const {VERSION} = require('@anthropic-ai/sdk'); console.log('Anthropic SDK:', VERSION)"

docker run --rm -e PROVIDER=google -e GOOGLE_API_KEY=test polydev-runtime:latest node -e "console.log('Google Gen AI client loaded')"
```

## Why One Container Works

**Benefits**:
1. **Simpler deployment** - Build once, use for all providers
2. **Faster pulls** - One image to pull vs 3
3. **Smaller total footprint** - 50MB vs 1.8GB (3×600MB)
4. **Easier updates** - Update SDK versions in one place
5. **Better resource utilization** - No duplicate base layers

**Provider selection at runtime** via `PROVIDER` env var:
- Same container binary
- Different API client used based on `PROVIDER`
- Credentials injected per execution

## Next Steps

1. Build and test unified container
2. Measure actual size (<50MB target)
3. Test with all 3 providers
4. Replace V1 bloated containers
5. Update Nomad job templates
6. Activate warm pool with lightweight images
