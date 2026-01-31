# /polydev [question] - Get Multi-Model AI Perspectives

Query multiple AI models (GPT-5, Gemini, Grok, GLM) simultaneously to get diverse perspectives on any coding problem.

## Instructions

When the user runs `/polydev [question]`, do the following:

1. **Extract the question**: Parse the argument after `/polydev` as the question. If no question is provided, look at the recent conversation context.

2. **Enhance the question**: Add relevant context from:
   - Current file being worked on
   - Recent errors or debugging attempts
   - Project structure if relevant

3. **Call the perspectives MCP tool**:
   ```
   mcp__mcp-execution__polydev_perspectives({
     prompt: "The enhanced question with full context"
   })
   ```

4. **Synthesize the response**:
   - Highlight areas of **consensus** (high confidence)
   - Note where models **differ** (needs consideration)
   - Provide actionable **recommendations**

## Example Usage

**User**: `/polydev How should I structure my React state management?`

**Claude calls**:
```
mcp__mcp-execution__polydev_perspectives({
  prompt: "How should I structure state management in a React application? I'm building a dashboard with real-time updates, user preferences, and form state. Should I use Redux, Zustand, Jotai, or React Context?"
})
```

**Claude synthesizes**:
> **Multi-Model Perspectives on React State Management**
>
> 📊 **Consensus (High Confidence)**:
> - All models recommend separating server state (React Query/SWR) from client state
> - Zustand is favored for simplicity in medium-sized apps
> - Context API is sufficient for theme/auth but not complex state
>
> 🔀 **Different Perspectives**:
> - GPT-5 emphasizes Redux Toolkit for large teams needing predictability
> - Gemini recommends Jotai for atomic state with real-time needs
> - Grok suggests starting simple with useState + Context
>
> ✅ **Recommendation**: Start with Zustand for client state + React Query for server state. This combination offers the best developer experience while remaining scalable.

## When to Use

- **Stuck debugging**: After 2-3 failed attempts
- **Architecture decisions**: Choosing between approaches
- **Code review**: Getting validation on implementation
- **Best practices**: Unsure about patterns

## Models Queried

All queries consult 4 models in parallel:
- **GLM-4.7** - Zhipu AI's flagship model
- **Gemini 3 Flash** - Google's fast reasoning model
- **Grok 4.1 Fast** - xAI's quick inference model
- **GPT-5 Mini** - OpenAI's efficient model
