# Chat Jitter Fix - Integration Guide for Existing OpenRouter Chat

## Problem Identified

Your existing chat at `/app/chat/[sessionId]/page.tsx` has:
- ❌ Direct state updates on every chunk (`setMessages(prev => [...prev, ...])`)
- ❌ No requestAnimationFrame batching
- ❌ Multiple re-renders per message chunk
- ❌ No model tier grouping in empty state
- ❌ No sample questions for guidance

## Solution

### 1. **Import Chat Streaming Optimizer**

Add to the imports section of `/app/chat/[sessionId]/page.tsx`:

```typescript
import { chatStreamingOptimizer } from '../../../lib/chat-streaming-optimizer'
```

### 2. **Initialize Optimizer on Component Mount**

In the `sendMessage` function, after creating placeholder messages:

```typescript
const sendMessage = async () => {
  // ... existing code ...

  const placeholderMessages: Message[] = selectedModels.map((modelId, index) => {
    const model = dashboardModels.find(m => m.id === modelId)
    return {
      id: `streaming-${modelId}-${Date.now()}`,
      role: 'assistant',
      content: '',
      model: modelId,
      timestamp: new Date(),
      provider: model?.provider || 'unknown'
    }
  })

  setMessages(prev => [...prev, ...placeholderMessages])

  // ✅ NEW: Register models with optimizer
  for (const modelId of selectedModels) {
    chatStreamingOptimizer.registerModel(modelId, (chunk: string) => {
      setMessages(prev => prev.map(msg => {
        if (msg.id.startsWith(`streaming-${modelId}-`)) {
          return {
            ...msg,
            content: (msg.content || '') + chunk,
          }
        }
        return msg
      }))
    })
  }

  try {
    // ... existing API call ...
```

### 3. **Use Optimizer in Stream Processing**

Replace this section in the streaming handler:

**BEFORE** (causes jitter):
```typescript
if (parsed.type === 'content' && parsed.model && parsed.content) {
  setStreamingResponses(prev => ({
    ...prev,
    [parsed.model]: (prev[parsed.model] || '') + parsed.content
  }))

  setMessages(prev => prev.map(msg => {
    if (msg.id.startsWith(`streaming-${parsed.model}-`)) {
      return {
        ...msg,
        content: (prev.find(m => m.id === msg.id)?.content || '') + parsed.content,
        fallbackMethod: (parsed.fallback_method as any) || msg.fallbackMethod,
        provider: parsed.provider || msg.provider
      }
    }
    return msg
  }))
}
```

**AFTER** (smooth):
```typescript
if (parsed.type === 'content' && parsed.model && parsed.content) {
  setStreamingResponses(prev => ({
    ...prev,
    [parsed.model]: (prev[parsed.model] || '') + parsed.content
  }))

  // ✅ NEW: Use optimizer for smooth buffering
  chatStreamingOptimizer.addChunk(parsed.model, parsed.content)
}
```

### 4. **Flush on Stream End**

After stream completion, add:

```typescript
// Stream complete
} finally {
  setIsLoading(false)
  setIsStreaming(false)
  setStreamingResponses({})

  // ✅ NEW: Flush any remaining buffered chunks
  chatStreamingOptimizer.flushAll()
  chatStreamingOptimizer.clearAll()
}
```

### 5. **Add Model Tier Grouping to Empty State** (Optional)

In the empty state section (around line 915), enhance the model selector:

```typescript
{messages.length === 0 ? (
  <div className="text-center py-12">
    {/* ... existing welcome text ... */}

    {/* ✅ NEW: Add tier grouping */}
    <div className="mt-8 max-w-4xl mx-auto">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">
        Select models by tier:
      </h3>

      {['cli', 'api', 'admin'].map(tier => {
        const tierModels = dashboardModels.filter(m => m.tier === tier && m.isConfigured)
        if (tierModels.length === 0) return null

        return (
          <div key={tier} className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-slate-600 uppercase">
                {tier === 'cli' ? '🚀 Free CLI' : tier === 'api' ? '🔑 API Keys' : '💳 Your Plan'}
              </span>
              <span className="text-xs text-slate-500">({tierModels.length})</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {tierModels.map(model => (
                <button
                  key={model.id}
                  onClick={() => toggleModel(model.id)}
                  className={`p-3 rounded-lg border text-left text-sm transition-all ${
                    selectedModels.includes(model.id)
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-medium text-slate-900">{model.name}</div>
                  <div className="text-xs text-slate-500">{model.providerName}</div>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  </div>
) : (
  // ... rest of messages ...
)}
```

### 6. **Add CSS Optimizations**

Add to your `globals.css` or component styles:

```css
/* Chat Streaming Performance */
.chat-messages {
  contain: layout style paint;
}

.message-item {
  will-change: auto;
  transform: translateZ(0);
}

.streaming-content {
  will-change: contents;
}

/* Smooth animations at 60fps */
@media (prefers-reduced-motion: no-preference) {
  .message-enter {
    animation: slideIn 0.3s ease-out;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

## Expected Results After Integration

✅ **Smooth 60fps streaming** - No more jitter
✅ **Consistent rendering** - Buffered updates via requestAnimationFrame
✅ **Better UX** - Model tier grouping on empty state
✅ **Lower CPU usage** - Fewer component re-renders
✅ **Multi-model sync** - All models stream smoothly simultaneously

## Testing

1. **Start streaming with multiple models**
   - Should see smooth, consistent output
   - No stuttering or jumpy text

2. **Check performance**
   - Open DevTools → Performance tab
   - Record while sending a message
   - Should see consistent ~60fps rendering

3. **Verify buffering**
   - Open DevTools → Console
   - Messages should update in batches, not per-character

## Files Modified

- `src/app/chat/[sessionId]/page.tsx` - Add optimizer integration
- `src/lib/chat-streaming-optimizer.ts` - New utility (already created)
- `src/styles/globals.css` - Add performance CSS (optional)

## Rollback

If issues occur, simply:
1. Remove the `chatStreamingOptimizer` calls
2. Revert to original `setMessages` patterns
3. No other changes are required

---

**Note**: This is a **non-breaking** integration. The optimizer wraps the existing logic and doesn't change the overall architecture.
