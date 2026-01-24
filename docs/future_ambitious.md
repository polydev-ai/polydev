# Polydev Ambitious Future: RL Training Infrastructure Vision

> **Document Purpose**: Capture the comprehensive vision for building an RL training data collection platform through Polydev, similar to OpenPipe but for agentic coding workflows.
>
> **Created**: January 2026
> **Status**: Planning / Thought Exercise

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [The Vision](#the-vision)
3. [Why Trajectory Data is Valuable](#why-trajectory-data-is-valuable)
4. [Current Architecture Limitations](#current-architecture-limitations)
5. [What We Can vs Cannot Capture](#what-we-can-vs-cannot-capture)
6. [Technical Architecture Options](#technical-architecture-options)
7. [Data Schema Design](#data-schema-design)
8. [Business Model: Credits for Data](#business-model-credits-for-data)
9. [OpenPipe Comparison](#openpipe-comparison)
10. [User Self-Training Platform](#user-self-training-platform)
11. [Privacy & Legal Considerations](#privacy--legal-considerations)
12. [Market Opportunity](#market-opportunity)
13. [Implementation Roadmap](#implementation-roadmap)
14. [Revenue Potential](#revenue-potential)
15. [Research References](#research-references)

---

## Executive Summary

**Core Concept**: Give users free/subsidized credits in exchange for capturing their Claude Code (and other AI coding assistant) workflows. Use this data to:

1. Build an RL training dataset for coding agents
2. Create a platform where users can fine-tune/train their own models on their workloads
3. Build something similar to OpenPipe but specifically for **agentic coding workflows**
4. Potentially sell high-quality trajectory data to AI labs

**Key Differentiator**: While OpenPipe captures `input → output` pairs, Polydev would capture **full trajectories**: `prompt → (tool₁ → result₁ → tool₂ → result₂ → ... → toolₙ → resultₙ) → outcome`

---

## The Vision

### What We're Building

```
┌─────────────────────────────────────────────────────────────────┐
│                    POLYDEV TRAJECTORY CAPTURE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Prompt: "Fix the authentication bug in login.ts"          │
│                                                                  │
│  Trajectory:                                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Step 1: [TOOL_CALL] warpgrep_codebase_search             │  │
│  │         query: "authentication login.ts"                  │  │
│  │         result: [file locations found]                    │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ Step 2: [TOOL_CALL] read_file                            │  │
│  │         path: "/src/auth/login.ts"                        │  │
│  │         result: [file contents]                           │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ Step 3: [REASONING] "The issue is in the token           │  │
│  │         validation logic on line 47..."                   │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ Step 4: [TOOL_CALL] edit_file                            │  │
│  │         changes: [diff]                                   │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ Step 5: [TOOL_CALL] run_tests                            │  │
│  │         result: PASS ✅                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Outcome: SUCCESS | User Feedback: 👍                           │
│  Reward Signal: +1.0                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### The Value Proposition

| For Users | For Polydev | For AI Labs |
|-----------|-------------|-------------|
| Free/subsidized credits | Valuable training data | High-quality trajectories |
| Train personal models | Improve own models | Real-world coding workflows |
| Data ownership | Revenue from data sales | Outcome signals included |
| Export capability | Flywheel effect | Organic (not synthetic) data |

---

## Why Trajectory Data is Valuable

### Data Type Comparison

| Data Type | Example | Training Value | Market Price |
|-----------|---------|----------------|--------------|
| **Preference Pairs** | "Which code snippet is better?" | Low - single decision | $0.50-2/pair |
| **Completions** | Input → Output | Medium - one-shot | $0.01-0.10/sample |
| **Trajectories** | Full workflow with tool calls | **Extremely High** | **$10-100/trajectory** |

### Why Trajectories Matter for RL

Research from SWE-Gym, SWE-Playground, and Nebius shows:

- Training on **67,074 trajectories** dramatically improves SWE-bench scores
- Dense training signal from multi-step workflows outperforms simple fine-tuning
- **Rejection fine-tuning (RFT)** on successful trajectories is nearly as good as full RL, but much simpler
- Organic user data is MORE VALUABLE than synthetic data

### The Training Data Gold Mine

Traditional RLHF uses simple preference pairs (response A vs B). What we're proposing captures **trajectories** - multi-step agent workflows with:

- Tool calls and their results
- File reads and edits
- Error corrections and retries
- Final outcomes with success/failure signals
- User feedback (implicit and explicit)

---

## Current Architecture Limitations

### Current Data Flow (Honest Assessment)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CURRENT DATA FLOW                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   USER                                                                   │
│     │                                                                    │
│     ▼                                                                    │
│   ┌─────────────────┐                                                   │
│   │   CLAUDE CODE   │ ◄─── We DON'T see this                           │
│   │   - file reads  │      (Anthropic's infrastructure)                 │
│   │   - file edits  │                                                   │
│   │   - bash cmds   │                                                   │
│   │   - reasoning   │                                                   │
│   └────────┬────────┘                                                   │
│            │                                                             │
│            │ occasionally calls                                          │
│            ▼                                                             │
│   ┌─────────────────┐                                                   │
│   │  POLYDEV MCP    │ ◄─── We ONLY see this                            │
│   │  - the prompt   │      (just the perspectives call)                 │
│   │  - responses    │                                                   │
│   └─────────────────┘                                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### The Fundamental Challenge

Polydev is currently a **tool** that gets called occasionally, NOT a wrapper around the entire coding session. To capture full trajectories, we need to either:

1. Become the agent itself (not just a tool)
2. Intercept all API traffic (proxy model)
3. Build IDE extensions that capture everything
4. Use MCP tracing middleware for our tools

---

## What We Can vs Cannot Capture

### What We CAN Capture Today

| Data | Capturable | Notes |
|------|------------|-------|
| Prompt sent to `polydev_perspectives` | ✅ Yes | The question user asks |
| Multi-model responses | ✅ Yes | Outputs from various models |
| User's model preferences | ✅ Yes | Provider order, tier settings |
| Basic metadata | ✅ Yes | Timestamps, token counts |
| User feedback on responses | ✅ Yes | If we add feedback UI |

### What We CANNOT Capture Today

| Data | Capturable | Why Not |
|------|------------|---------|
| Claude Code's file reads | ❌ No | Happens in Anthropic's infrastructure |
| Claude Code's file edits | ❌ No | Never passes through us |
| Claude Code's bash commands | ❌ No | Direct to user's machine |
| Claude Code's reasoning | ❌ No | Internal to Claude |
| Cursor's operations | ❌ No | Completely separate closed system |
| GitHub Copilot completions | ❌ No | GitHub's infrastructure |
| Full end-to-end trajectory | ❌ No | We're a tool, not the agent |

---

## Technical Architecture Options

### Option 1: MCP Tracing Middleware (Easiest)

Use `mcp-trace-js` library to capture ALL MCP tool calls:

```typescript
// If integrated into our MCP server
import { TraceMiddleware, SupabaseAdapter } from 'mcp-trace';

const traceMiddleware = new TraceMiddleware({
  adapter: new SupabaseAdapter({
    url: 'https://polydev-traces.supabase.co',
    apiKey: process.env.POLYDEV_TRACE_KEY
  }),
  shouldTrace: (request) => userHasOptedIn(request.userId)
});

traceMiddleware.init(mcpServer);
```

**Captures**: All Polydev MCP tool calls, Supabase queries, Git operations, Exa searches
**Effort**: 1-2 months
**Limitation**: Only captures what goes through our MCP, not Claude Code's own operations

### Option 2: Polydev as Primary Agent

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    POLYDEV AS AGENT                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   USER                                                                   │
│     │                                                                    │
│     ▼                                                                    │
│   ┌─────────────────┐                                                   │
│   │  POLYDEV AGENT  │ ◄─── We ARE the agent now                        │
│   │  (our infra)    │      Full visibility!                             │
│   └────────┬────────┘                                                   │
│            │                                                             │
│            ├──────────────┬──────────────┬──────────────┐               │
│            ▼              ▼              ▼              ▼               │
│      ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│      │ Claude   │  │ GPT-5    │  │ Gemini   │  │ Grok     │           │
│      │ API      │  │ API      │  │ API      │  │ API      │           │
│      └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
│                                                                          │
│   ALL tool calls go through us, we log EVERYTHING                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Implementation**: Build a Polydev CLI that IS the coding assistant

```bash
# Instead of: claude
# Users run: polydev

$ polydev "fix the bug in login.ts"

# Polydev orchestrates Claude/GPT/Gemini under the hood
# Full trajectory capture
# Multi-model consensus for better results
```

**Effort**: 3-6 months
**Benefit**: Complete trajectory visibility

### Option 3: IDE Extension (Deep Integration)

Build VS Code/Cursor extensions that:

1. Intercept ALL AI interactions
2. Log file changes before/after
3. Capture user corrections
4. Send trajectories to Polydev

**Effort**: 3-6 months per IDE
**Benefit**: Capture everything regardless of which AI the user prefers

### Option 4: API Proxy Model

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PROXY MODEL                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Claude Code / Cursor / Copilot                                        │
│     │                                                                    │
│     │  API calls to Claude/OpenAI/etc                                   │
│     ▼                                                                    │
│   ┌─────────────────┐                                                   │
│   │  POLYDEV PROXY  │ ◄─── Intercept ALL API traffic                   │
│   │  api.polydev.ai │                                                   │
│   └────────┬────────┘                                                   │
│            │                                                             │
│            │  Forward to real APIs                                       │
│            ▼                                                             │
│   ┌─────────────────┐                                                   │
│   │  Claude/OpenAI  │                                                   │
│   │  Real APIs      │                                                   │
│   └─────────────────┘                                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**How it works**:

```bash
# User configures their IDE to use our proxy
export ANTHROPIC_BASE_URL=https://api.polydev.ai/v1/claude
export ANTHROPIC_API_KEY=polydev_xxx

# Now ALL their Claude Code usage flows through us
```

**Effort**: 6+ months (needs to handle all API formats)
**Benefit**: Captures EVERYTHING without user changing workflows

---

## Data Schema Design

### Trajectory Schema

```typescript
interface PolydevTrajectory {
  // Metadata
  trajectory_id: string
  user_id: string // anonymized
  timestamp: Date
  session_id: string

  // Context
  project_context: {
    language: string[]           // ['typescript', 'python']
    framework: string[]          // ['next.js', 'react']
    repo_structure_hash: string  // anonymized
    file_count: number
    complexity_score: number
  }

  // The actual trajectory
  steps: Array<{
    step_id: number
    type: 'tool_call' | 'reasoning' | 'user_input' | 'model_response'
    tool_name?: string
    tool_input?: object
    tool_output?: object  // sanitized for PII
    reasoning?: string
    model?: string
    latency_ms: number
    token_count?: number
  }>

  // Outcome signals (critical for RL)
  outcome: {
    success: boolean
    user_feedback?: 'positive' | 'negative' | 'neutral'
    tests_passed?: boolean
    error_count: number
    iterations_to_success: number
    time_to_completion_ms: number
  }

  // For RL training
  reward_signal: number // computed from outcome

  // Data sharing consent
  consent: {
    share_for_training: boolean
    share_anonymized: boolean
    allow_research: boolean
  }
}
```

### Database Tables

```sql
-- Main trajectories table
CREATE TABLE trajectories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  session_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Context
  project_languages TEXT[],
  project_frameworks TEXT[],
  complexity_score INTEGER,

  -- Outcome
  success BOOLEAN,
  user_feedback TEXT,
  reward_signal FLOAT,

  -- Consent
  share_for_training BOOLEAN DEFAULT FALSE,
  share_anonymized BOOLEAN DEFAULT FALSE
);

-- Individual steps within trajectories
CREATE TABLE trajectory_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trajectory_id UUID REFERENCES trajectories(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_type TEXT NOT NULL,

  -- Tool call details
  tool_name TEXT,
  tool_input JSONB,
  tool_output JSONB,  -- sanitized

  -- Metadata
  model TEXT,
  latency_ms INTEGER,
  token_count INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX idx_trajectories_user ON trajectories(user_id);
CREATE INDEX idx_trajectories_success ON trajectories(success);
CREATE INDEX idx_trajectory_steps_trajectory ON trajectory_steps(trajectory_id);
```

---

## Business Model: Credits for Data

### Existing Precedent: OpenAI's Data Sharing Program

OpenAI already does credits-for-data:

- **Tiers 1-2**: Up to 250,000 free tokens/day for data sharing
- **Tiers 3-5**: Up to $2,000/day in complimentary tokens
- Users opt-in via dashboard
- Granular control (project-level opt-in/out)

### Proposed Polydev Tiers

```
┌────────────────────────────────────────────────────────────────┐
│                    POLYDEV CREDITS TIERS                        │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FREE TIER (no data sharing):                                  │
│  ├── 100 perspectives/month                                    │
│  ├── Basic CLI integrations                                    │
│  └── No trajectory sharing                                      │
│                                                                 │
│  FREE+ TIER (opt-in data sharing):                             │
│  ├── 1,000 perspectives/month (10x increase)                   │
│  ├── Access to all CLI integrations                            │
│  ├── Trajectories shared → anonymized → training pool          │
│  └── Data export available                                      │
│                                                                 │
│  PRO TIER ($20/month + data sharing):                          │
│  ├── Unlimited perspectives                                     │
│  ├── Priority routing                                           │
│  ├── Your trajectories → YOUR private dataset                  │
│  ├── Fine-tune YOUR models on YOUR workflows                   │
│  └── Training credits included                                  │
│                                                                 │
│  ENTERPRISE TIER (custom pricing):                              │
│  ├── Data stays in your environment                            │
│  ├── On-prem trajectory capture                                │
│  ├── Custom model training pipeline                            │
│  └── White-label options                                        │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Value Exchange

| User Gives | User Gets |
|------------|-----------|
| Trajectory data (anonymized) | 10x free credits |
| Feedback on responses | Priority support |
| Consent for training | Access to improved models |
| Usage patterns | Personal model training |

---

## OpenPipe Comparison

### What OpenPipe Does

- Captures API logs (prompts + completions)
- Fine-tunes models to reduce costs (50x cheaper than GPT-4)
- Simple UI for data curation
- Focus on cost reduction

### How Polydev Extends This

| OpenPipe | Polydev Extension |
|----------|-------------------|
| Capture API logs | Capture **full agent trajectories** |
| Fine-tune on completions | Fine-tune on **multi-step workflows** |
| Reduce costs | Train models that **think like you** |
| Simple input/output | Tool-aware trajectory data |
| Cost optimization | **Behavior cloning for coding agents** |

### The Key Differentiation

**OpenPipe solves**: "Fine-tune to reduce costs"
**Polydev would solve**: "Fine-tune to create coding agents that match YOUR coding style"

---

## User Self-Training Platform

### Vision: "Fine-tune on YOUR coding patterns"

```
┌─────────────────────────────────────────────────────────────────┐
│              POLYDEV PERSONAL MODEL TRAINING                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Your Trajectories: 2,847 captured over 3 months               │
│  ├── TypeScript/React: 1,923 (67%)                             │
│  ├── Python/FastAPI: 612 (22%)                                 │
│  └── Go: 312 (11%)                                              │
│                                                                  │
│  Success Rate: 78% first-attempt success                        │
│                                                                  │
│  [🔄 Train Personal Model]                                      │
│                                                                  │
│  Base Model: Qwen 3 Coder 480B                                  │
│  Fine-tuning Method: RFT (Rejection Fine-Tuning)               │
│  Training Data: Your successful trajectories only               │
│  Estimated Time: 45 minutes                                     │
│  Cost: 5,000 credits (~$5)                                      │
│                                                                  │
│  Result: A model that codes like YOU                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Training Pipeline Options

1. **Partner with OpenPipe**: Use their fine-tuning infrastructure
2. **Build on Nebius/Modal**: Direct GPU access for training
3. **Use RFT**: Simpler than full RL, nearly as effective
4. **Offer multiple base models**: Qwen, Llama, Mistral, etc.

### User Features

- **Trajectory Browser**: Review/label/filter your data
- **Data Export**: Download your trajectories in standard formats
- **Training Dashboard**: Monitor fine-tuning progress
- **Model Deployment**: Get API endpoint for your personal model
- **A/B Testing**: Compare personal model vs base model

---

## Privacy & Legal Considerations

### Critical Requirements

| Concern | Mitigation Strategy |
|---------|---------------------|
| **PII in code** | Automatic scrubbing (emails, API keys, passwords, names) |
| **Proprietary code** | Hash file paths, anonymize identifiers, never store raw code |
| **User consent** | Explicit opt-in, clear TOS, granular controls |
| **Data portability** | Users can export/delete all their data (GDPR compliant) |
| **Enterprise concerns** | Option to keep data local, air-gapped deployment |
| **Competitive info** | Never share individual user data, only aggregated/anonymized |

### Consent Model

```typescript
interface DataSharingConsent {
  // Granular controls
  share_prompts: boolean
  share_tool_calls: boolean
  share_file_contents: boolean  // most sensitive - default OFF
  share_outcomes_only: boolean  // safest option

  // Scope
  scope: 'all_projects' | 'selected_projects' | 'none'
  selected_project_ids?: string[]

  // Data use permissions
  allow_model_training: boolean      // train Polydev's models
  allow_personal_training: boolean   // train user's own models
  allow_research: boolean            // academic research
  allow_sharing_anonymized: boolean  // sell to third parties

  // Retention
  retention_days: number  // auto-delete after N days
}
```

### Data Processing Pipeline

```
Raw Trajectory → PII Scrubber → Anonymizer → Quality Filter → Training Pool
                     │               │              │
                     ▼               ▼              ▼
              Remove emails    Hash paths     Remove low-
              Remove API keys  Randomize IDs  quality data
              Remove passwords Generalize     Filter failures
              Remove names     code patterns  (unless useful)
```

---

## Market Opportunity

### The Training Data Gap

| Challenge | Current State | Polydev Opportunity |
|-----------|---------------|---------------------|
| SWE-bench data | Mostly synthetic | Real user workflows |
| Trajectory volume | ~100K (research datasets) | Potentially 500K+/month |
| Outcome signals | Often missing | Built into capture |
| Diversity | Limited repos | Thousands of codebases |

### Existing Dataset Sizes (for comparison)

- **SWE-Gym**: 2,438 tasks
- **Nebius OpenHands trajectories**: 67,074 (just released Dec 2025)
- **SWE-Playground**: Synthetic generation
- **Polydev potential**: 100K+ monthly if 1% of users opt in

### The Flywheel Effect

```
Better Models → More Users → More Data → Better Models → ...
     ▲                                         │
     │                                         │
     └─────────────────────────────────────────┘
```

### Enterprise Value Proposition

Companies would pay premium for:

- Models trained on THEIR codebase patterns
- Privacy-preserving fine-tuning
- Consistency with internal coding standards
- Reduced onboarding time for new developers
- Custom model that "knows" their architecture

---

## Implementation Roadmap

### Phase 1: Instrumentation (1-2 months)

**Goal**: Start capturing what we can with minimal changes

- [ ] Add trajectory logging to existing MCP server
- [ ] Integrate `mcp-trace-js` for all tool call capture
- [ ] Store in Supabase with proper anonymization
- [ ] Build basic consent UI in dashboard
- [ ] Implement PII scrubbing pipeline

**Deliverables**:
- `trajectories` and `trajectory_steps` tables
- Consent toggle in user settings
- Basic trajectory viewer in dashboard

### Phase 2: Data Platform (2-4 months)

**Goal**: Let users see and manage their data

- [ ] User-facing trajectory browser
- [ ] Data curation tools (label, filter, delete)
- [ ] Export functionality (JSON, JSONL, HuggingFace format)
- [ ] Analytics dashboard (success rates, common patterns)
- [ ] Quality scoring for trajectories

**Deliverables**:
- `/dashboard/trajectories` page
- Export API endpoints
- Data quality metrics

### Phase 3: Polydev Agent CLI (3-6 months)

**Goal**: Capture complete trajectories by being the agent

- [ ] Build Polydev CLI that orchestrates multiple models
- [ ] Implement tool execution layer (file ops, bash, etc.)
- [ ] Full trajectory capture with reasoning steps
- [ ] Multi-model consensus mode
- [ ] Local-first with cloud sync option

**Deliverables**:
- `polydev` CLI binary
- Full trajectory capture
- Significantly more training data

### Phase 4: Training Pipeline (4-6 months)

**Goal**: Let users (and Polydev) train models on trajectories

- [ ] Integration with OpenPipe or custom training infra
- [ ] RFT pipeline for trajectory-based fine-tuning
- [ ] Model deployment (serve fine-tuned models via API)
- [ ] A/B testing framework
- [ ] Cost estimation and credits system

**Deliverables**:
- "Train My Model" button in dashboard
- Personal model API endpoints
- Training credits economy

### Phase 5: Marketplace & Enterprise (6-12 months)

**Goal**: Monetize data and models

- [ ] Community model sharing (opt-in)
- [ ] Model benchmarking and leaderboards
- [ ] Enterprise features (on-prem, SSO, audit logs)
- [ ] Data licensing agreements with AI labs
- [ ] Research partnerships

**Deliverables**:
- Model marketplace
- Enterprise tier
- Revenue from data/model sales

---

## Revenue Potential

### Selling Training Data to Labs

| Data Type | Volume Needed | Price Range | Polydev Potential |
|-----------|---------------|-------------|-------------------|
| Simple completions | 100K+ | $0.01-0.10/sample | Low margin |
| Preference pairs | 50K+ | $0.50-2.00/pair | Medium margin |
| **Full trajectories** | 10K+ | **$10-100/trajectory** | **High margin** |

### Why Trajectories Command Premium Pricing

- SWE-bench solving requires multi-step reasoning
- Labs pay $50-200/hour for human labelers to create these manually
- Organic user data is MORE VALUABLE than synthetic
- Includes real-world edge cases and error recovery

### Revenue Projection (Conservative)

```
Assumptions:
- 10,000 active users
- 10% opt-in for data sharing (1,000 users)
- Average 50 trajectory-worthy sessions/month/user
- 50,000 trajectories/month total
- 10% are high-quality (5,000 sellable/month)

Revenue Streams:
1. Data sales to labs: 5,000 × $20 = $100K/month
2. Pro subscriptions: 500 × $20 = $10K/month
3. Enterprise contracts: 10 × $5K = $50K/month
4. Training credits: $20K/month

Total: ~$180K/month potential
```

### Long-term Value

- **Data moat**: Continuous stream of high-quality training data
- **Model improvement**: Better models → more users → more data
- **Enterprise lock-in**: Companies dependent on their custom models
- **Research partnerships**: Academic collaborations, grants

---

## Research References

### Key Papers and Projects

1. **SWE-Gym** (Berkeley, 2024)
   - First environment for training real-world SWE agents
   - 2,438 Python task instances
   - Showed 19% absolute gains from trajectory training
   - Paper: "Training Software Engineering Agents and Verifiers with SWE-Gym"

2. **SWE-Playground** (CMU, 2025)
   - Synthetic trajectory generation pipeline
   - Supports training versatile coding agents
   - Paper: "Training Versatile Coding Agents in Synthetic Environments"

3. **Nebius OpenHands Trajectories** (Dec 2025)
   - 67,074 agent trajectories
   - Generated with Qwen3-Coder-480B
   - Dataset: `nebius/SWE-rebench-openhands-trajectories`

4. **OpenPipe**
   - Fine-tuning from production logs
   - 50x cost reduction vs GPT-4
   - Precedent for data-for-credits model
   - URL: https://openpipe.ai

5. **RLHF Book** (Nathan Lambert, 2026)
   - Comprehensive guide to RLHF and post-training
   - URL: https://rlhfbook.com

### Observability Tools (Potential Integrations)

- **LangFuse**: Open-source LLM observability
- **LangSmith**: LangChain's tracing platform
- **mcp-trace-js**: MCP-specific tracing middleware
- **Braintrust**: Multi-step workflow tracing

---

## Appendix: Technical Details

### MCP Trace Integration Example

```typescript
// polydev-ai/mcp/server.js
import { TraceMiddleware, SupabaseAdapter } from 'mcp-trace';

const traceMiddleware = new TraceMiddleware({
  adapter: new SupabaseAdapter({
    url: process.env.SUPABASE_URL,
    table: 'mcp_trajectories',
    apiKey: process.env.SUPABASE_SERVICE_KEY
  }),

  // Only trace if user opted in
  shouldTrace: async (request) => {
    const userId = extractUserId(request);
    return await checkUserConsent(userId);
  },

  // Sanitize sensitive data
  sanitize: (data) => {
    return scrubPII(data);
  }
});

// Initialize tracing
traceMiddleware.init(server);
```

### PII Scrubbing Pipeline

```typescript
function scrubPII(trajectory: RawTrajectory): SanitizedTrajectory {
  return {
    ...trajectory,
    steps: trajectory.steps.map(step => ({
      ...step,
      tool_input: scrubObject(step.tool_input),
      tool_output: scrubObject(step.tool_output),
    }))
  };
}

function scrubObject(obj: any): any {
  if (typeof obj === 'string') {
    return obj
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
      .replace(/(?:api[_-]?key|secret|password|token)["\s:=]+["']?[\w-]+["']?/gi, '[REDACTED]')
      .replace(/sk-[a-zA-Z0-9]{48}/g, '[OPENAI_KEY]')
      .replace(/anthropic-[a-zA-Z0-9-]+/g, '[ANTHROPIC_KEY]');
  }
  // Recursively process objects/arrays
  // ...
}
```

---

## Conclusion

Building an RL training data infrastructure through Polydev is **technically feasible** and **strategically valuable**. The key insights:

1. **Start with what we can capture**: MCP tool calls, user feedback, outcomes
2. **Build toward full trajectories**: Polydev Agent CLI is the path to complete visibility
3. **Credits-for-data works**: OpenAI has proven the model
4. **Trajectory data is premium**: $10-100/trajectory vs $0.01/completion
5. **User value is real**: Personal model training is compelling
6. **The moat compounds**: More users → more data → better models → more users

The most realistic path is a phased approach: start capturing today, build the agent tomorrow, and create the training platform as the data accumulates.

---

*Document maintained by Polydev team. Last updated: January 2026*
