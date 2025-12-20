# Polydev MCP SWE-bench Evaluation Plan

## Executive Summary

This document outlines a comprehensive plan to demonstrate that **Polydev MCP's multi-model consultation approach** improves software engineering task accuracy on the SWE-bench Verified benchmark.

**Hypothesis**: When a base model (Claude Opus 4.5) consults other expert models (GPT-5.2, Gemini 3 Pro) via Polydev MCP on uncertain or complex problems, the overall pass rate on SWE-bench Verified improves compared to the base model alone.

**Goal**: Provide empirical evidence that multi-model consultation via MCP is a superior approach to single-model inference for complex software engineering tasks.

---

## Table of Contents

1. [Background](#1-background)
2. [Technical Architecture](#2-technical-architecture)
3. [Detailed Implementation Plan](#3-detailed-implementation-plan)
4. [Consultation Strategy](#4-consultation-strategy)
5. [Evaluation Methodology](#5-evaluation-methodology)
6. [Cost Analysis](#6-cost-analysis)
7. [Repository Structure](#7-repository-structure)
8. [Success Criteria](#8-success-criteria)
9. [Risk Mitigation](#9-risk-mitigation)
10. [Future Expansion](#10-future-expansion)
11. [Timeline](#11-timeline)

---

## 1. Background

### 1.1 What is SWE-bench?

SWE-bench is a benchmark for evaluating large language models on real-world software engineering tasks. It consists of GitHub issues from popular Python repositories where the task is to generate a patch that resolves the issue and passes all associated tests.

- **SWE-bench Full**: 2,294 task instances from 12 Python repositories
- **SWE-bench Verified**: 500 human-verified, high-quality task instances (our target)

### 1.2 What is Polydev MCP?

Polydev MCP (Model Context Protocol) is a tool that enables consulting multiple AI models simultaneously and synthesizing their perspectives. It's designed to leverage the diverse strengths of different models:

- **Claude**: Strong reasoning, code understanding, nuanced analysis
- **GPT-5.2**: Broad knowledge, code generation, practical solutions
- **Gemini 3 Pro**: Technical depth, alternative perspectives

### 1.3 Why This Matters

Current SWE-bench leaderboard entries use single models or ensembles with the same model. Demonstrating that **cross-model consultation improves results** would:

1. Validate Polydev's core value proposition
2. Provide marketing-ready benchmark results
3. Contribute novel findings to the AI research community
4. Position Polydev as a leader in multi-model AI systems

---

## 2. Technical Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SWE-bench Verified Task                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  - Repository: django/django                                      │  │
│  │  - Issue: "QuerySet.count() returns wrong value after filter"     │  │
│  │  - Test file: tests/queries/test_count.py                         │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          EVALUATION HARNESS                             │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  1. Clone repository at specified commit                          │  │
│  │  2. Set up isolated environment                                   │  │
│  │  3. Feed task to agent                                            │  │
│  │  4. Capture generated patch                                       │  │
│  │  5. Apply patch and run tests                                     │  │
│  │  6. Record pass/fail                                              │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         POLYDEV AGENT (Lightweight)                     │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    BASE MODEL: Claude Opus 4.5                  │    │
│  │                    (Via Claude Code CLI - FREE)                 │    │
│  │                                                                 │    │
│  │  STEP 1: Understand the Issue                                   │    │
│  │  ├── Read issue description                                     │    │
│  │  ├── Identify affected files                                    │    │
│  │  └── Understand expected behavior                               │    │
│  │                                                                 │    │
│  │  STEP 2: Analyze Codebase                                       │    │
│  │  ├── Read relevant source files                                 │    │
│  │  ├── Trace code paths                                           │    │
│  │  └── Identify root cause                                        │    │
│  │                                                                 │    │
│  │  STEP 3: Generate Solution Hypothesis                           │    │
│  │  ├── Propose fix approach                                       │    │
│  │  ├── ASSESS CONFIDENCE (1-10)                                   │    │
│  │  │                                                              │    │
│  │  │   ┌─────────────────────────────────────────────────────┐    │    │
│  │  │   │  CONFIDENCE >= 8: Proceed to patch generation       │    │    │
│  │  │   │  CONFIDENCE < 8:  Trigger Polydev consultation      │    │    │
│  │  │   └─────────────────────────────────────────────────────┘    │    │
│  │  │                         │                                    │    │
│  │  │                         ▼ (if confidence < 8)                │    │
│  │  │   ┌─────────────────────────────────────────────────────┐    │    │
│  │  │   │           POLYDEV MCP CONSULTATION                  │    │    │
│  │  │   │                                                     │    │    │
│  │  │   │  ┌─────────────┐       ┌─────────────┐             │    │    │
│  │  │   │  │  Codex CLI  │       │ Gemini 3    │             │    │    │
│  │  │   │  │  (GPT-5.2)  │       │ Pro API     │             │    │    │
│  │  │   │  │   FREE      │       │ ~$0.01/task │             │    │    │
│  │  │   │  └─────────────┘       └─────────────┘             │    │    │
│  │  │   │         │                     │                     │    │    │
│  │  │   │         └──────────┬──────────┘                     │    │    │
│  │  │   │                    ▼                                │    │    │
│  │  │   │  ┌─────────────────────────────────────────────┐   │    │    │
│  │  │   │  │  Claude synthesizes all perspectives and    │   │    │    │
│  │  │   │  │  decides on the best approach               │   │    │    │
│  │  │   │  └─────────────────────────────────────────────┘   │    │    │
│  │  │   └─────────────────────────────────────────────────┘    │    │
│  │  │                                                          │    │
│  │  └── Final solution decided                                 │    │
│  │                                                             │    │
│  │  STEP 4: Generate Patch                                     │    │
│  │  ├── Write code changes                                     │    │
│  │  ├── Format as unified diff                                 │    │
│  │  └── Output patch                                           │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           TEST EXECUTION                                │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  1. Apply patch to repository                                     │  │
│  │  2. Run test suite                                                │  │
│  │  3. Check if previously failing tests now pass                    │  │
│  │  4. Check that no previously passing tests now fail               │  │
│  │  5. Record result: PASS or FAIL                                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Details

#### 2.2.1 Evaluation Harness

We'll use the official SWE-bench evaluation harness with minimal modifications:

```python
# swe-bench provides this infrastructure
from swebench.harness.run_evaluation import run_evaluation

# We plug in our agent as the "model" that generates patches
```

#### 2.2.2 Lightweight Agent Wrapper

Instead of using full Claude Code, we'll create a lightweight Python wrapper that:

1. Reads task context (issue, repo files)
2. Calls Claude API (or Claude Code CLI) for reasoning
3. Detects confidence levels
4. Triggers Polydev consultation when needed
5. Outputs patches in the required format

```python
# Conceptual structure (not implementation)
class PolydevSWEAgent:
    def __init__(self):
        self.base_model = ClaudeCodeCLI()  # Free via CLI
        self.polydev = PolydevMCP()        # For consultation

    def solve_task(self, task: SWEBenchTask) -> str:
        # Step 1-2: Understand and analyze
        analysis = self.base_model.analyze(task)

        # Step 3: Generate hypothesis with confidence
        hypothesis = self.base_model.propose_solution(analysis)

        # Check confidence
        if hypothesis.confidence < 8:
            # Consult other models
            perspectives = self.polydev.get_perspectives(
                task, analysis, hypothesis
            )
            # Claude decides based on all perspectives
            hypothesis = self.base_model.synthesize(
                hypothesis, perspectives
            )

        # Step 4: Generate patch
        patch = self.base_model.generate_patch(hypothesis)
        return patch
```

#### 2.2.3 CLI Integration

**Claude Code CLI** (for Claude Opus 4.5):
```bash
# Invoke Claude Code in non-interactive mode
claude-code --print --no-input "Analyze this issue: ..."
```

**Codex CLI** (for GPT-5.2):
```bash
# Invoke Codex CLI
codex --approval-mode full-auto "Analyze this issue: ..."
```

**Gemini 3 Pro** (via API):
```python
# Direct API call via Polydev MCP
polydev.get_perspectives(prompt, models=["gemini-3-pro"])
```

---

## 3. Detailed Implementation Plan

### Phase 1: Setup & Infrastructure (Week 1)

#### 1.1 Environment Setup

**Tasks:**
- [ ] Clone SWE-bench repository
- [ ] Set up Docker environment for isolated test execution
- [ ] Verify SWE-bench Verified dataset access (500 tasks)
- [ ] Create project repository structure

**Commands:**
```bash
# Clone SWE-bench
git clone https://github.com/princeton-nlp/SWE-bench.git

# Set up evaluation environment
cd SWE-bench
pip install -e .

# Verify dataset
python -c "from swebench import get_eval_refs; print(len(get_eval_refs('verified')))"
# Expected: 500
```

#### 1.2 Agent Wrapper Development

**Tasks:**
- [ ] Create base agent class with task ingestion
- [ ] Implement Claude Code CLI integration
- [ ] Implement Codex CLI integration
- [ ] Implement Gemini API integration via Polydev MCP
- [ ] Create patch output formatter

**File: `agent/base_agent.py`**
```python
# Lightweight agent that:
# 1. Takes SWE-bench task as input
# 2. Uses Claude Code CLI for reasoning
# 3. Outputs patch in required format
```

#### 1.3 Confidence Detection System

**Tasks:**
- [ ] Design confidence scoring prompt
- [ ] Implement confidence extraction from model output
- [ ] Define consultation trigger thresholds
- [ ] Test on sample tasks

**Confidence Triggers (when score < 8):**
- Multiple valid approaches exist
- Unfamiliar library or domain
- Complex interaction between components
- Ambiguous issue description
- Edge cases or unusual patterns

#### 1.4 Polydev Consultation Integration

**Tasks:**
- [ ] Create consultation prompt template
- [ ] Implement parallel model querying
- [ ] Implement response synthesis logic
- [ ] Test consultation flow

### Phase 2: Baseline Evaluation (Week 2)

#### 2.1 Baseline Run: Claude Opus 4.5 Standalone

**Tasks:**
- [ ] Run agent on all 500 SWE-bench Verified tasks
- [ ] Disable consultation (single model only)
- [ ] Record per-task results
- [ ] Track confidence scores (for later analysis)

**Expected Output:**
```json
{
  "configuration": "claude-opus-4.5-standalone",
  "total_tasks": 500,
  "passed": 150,  // Example
  "failed": 350,
  "pass_rate": 0.30,
  "avg_time_per_task": "45s",
  "tasks_with_low_confidence": 180
}
```

#### 2.2 Baseline Analysis

**Tasks:**
- [ ] Categorize failures by type (wrong fix, no fix, syntax error)
- [ ] Identify tasks where model expressed uncertainty
- [ ] Note tasks that seem consultation-worthy
- [ ] Document baseline thoroughly

### Phase 3: Polydev-Enhanced Evaluation (Week 3)

#### 3.1 Enhanced Run: Claude + Polydev Consultation

**Tasks:**
- [ ] Enable consultation for confidence < 8
- [ ] Run on same 500 tasks
- [ ] Track which tasks triggered consultation
- [ ] Record consultation responses and synthesis

**Expected Output:**
```json
{
  "configuration": "claude-opus-4.5-with-polydev",
  "total_tasks": 500,
  "passed": 185,  // Example - hoping for improvement
  "failed": 315,
  "pass_rate": 0.37,
  "consultations_triggered": 150,
  "consultations_changed_answer": 45,
  "gemini_api_cost": "$15.00"
}
```

#### 3.2 Consultation Tracking

For each consultation, record:
- Task ID
- Original Claude hypothesis
- Claude's confidence score
- GPT-5.2 perspective
- Gemini 3 Pro perspective
- Final synthesized decision
- Did it differ from original?
- Was the final answer correct?

### Phase 4: Analysis & Documentation (Week 4)

#### 4.1 Quantitative Analysis

**Metrics to Calculate:**
- Overall pass rate improvement
- Statistical significance (p-value)
- Pass rate improvement by task category
- Cost per additional solved task
- Consultation effectiveness rate

**Analysis Table:**
```
┌────────────────────────────────────────────────────────────────────────┐
│                        RESULTS COMPARISON                              │
├──────────────────────────┬─────────────────┬─────────────────┬─────────┤
│ Configuration            │ Pass Rate       │ Tasks Solved    │ Cost    │
├──────────────────────────┼─────────────────┼─────────────────┼─────────┤
│ Claude Opus 4.5 alone    │ 30.0%           │ 150/500         │ $0      │
│ + Polydev (GPT+Gemini)   │ 37.0%           │ 185/500         │ $15     │
├──────────────────────────┼─────────────────┼─────────────────┼─────────┤
│ IMPROVEMENT              │ +7.0%           │ +35 tasks       │ $0.43/  │
│                          │                 │                 │ task    │
└──────────────────────────┴─────────────────┴─────────────────┴─────────┘
```

#### 4.2 Qualitative Analysis: Case Studies

Select 10 representative tasks for deep analysis:

**Case Study Template:**
```markdown
## Case Study: django__django-11099

### Task
- Repository: django/django
- Issue: QuerySet.count() returns wrong value after filter
- Difficulty: Medium

### Baseline (Claude alone)
- Confidence: 5/10
- Proposed fix: Modified queryset.py line 234
- Result: FAIL (didn't handle edge case)

### With Polydev Consultation
- Claude's initial thought: "Modify the count() method"
- GPT-5.2 perspective: "The issue is in the filter chain, not count()"
- Gemini perspective: "Need to check query compilation order"
- Synthesized approach: "Fix the filter chain as GPT suggested,
  with Gemini's compilation order insight"
- Result: PASS

### Analysis
The consultation revealed that Claude's initial instinct was wrong.
GPT-5.2 identified the correct location of the bug, and Gemini
provided additional context that made the fix robust.
```

#### 4.3 Documentation Deliverables

- [ ] METHODOLOGY.md - Detailed technical approach
- [ ] RESULTS.md - Full results with tables and charts
- [ ] CASE_STUDIES.md - 10 detailed case studies
- [ ] predictions.json - Leaderboard submission format
- [ ] Blog post draft
- [ ] Visualization assets (charts, diagrams)

### Phase 5: Open Source & Publication (Week 5)

#### 5.1 Repository Preparation

- [ ] Clean up code for public release
- [ ] Add comprehensive README
- [ ] Add LICENSE (MIT or Apache 2.0)
- [ ] Add contribution guidelines
- [ ] Create GitHub release

#### 5.2 Leaderboard Preparation

**SWE-bench submission requirements:**
1. `predictions.json` in specified format
2. Model name and description
3. Methodology documentation
4. Contact information

**Note:** We'll prepare everything but hold submission until ready.

#### 5.3 Marketing Materials

- [ ] Blog post: "How Multi-Model Consultation Improves SWE-bench Scores"
- [ ] Twitter/LinkedIn announcement thread
- [ ] Demo video showing consultation in action
- [ ] Comparison infographic

---

## 4. Consultation Strategy

### 4.1 When to Consult

The base model (Claude) will self-assess confidence on a 1-10 scale after analyzing the problem and proposing a solution.

**Confidence Levels:**
- **8-10 (High)**: Proceed without consultation
  - Clear problem with obvious solution
  - Familiar codebase patterns
  - Well-documented issue

- **5-7 (Medium)**: Consultation recommended
  - Multiple valid approaches
  - Some ambiguity in requirements
  - Moderate complexity

- **1-4 (Low)**: Consultation required
  - Unfamiliar domain
  - Highly complex interactions
  - Ambiguous or conflicting information

### 4.2 Confidence Assessment Prompt

```
After analyzing this software engineering task, I need you to:

1. Propose your solution approach
2. Rate your confidence (1-10) based on:
   - Clarity of the problem (is the issue well-defined?)
   - Familiarity with the codebase/library
   - Number of viable approaches (more = less confident)
   - Risk of unintended side effects
   - Edge cases you might be missing

Confidence Scale:
- 9-10: Very confident, clear solution
- 7-8: Confident, minor uncertainties
- 5-6: Moderate, would benefit from second opinion
- 3-4: Low, significant uncertainties
- 1-2: Very low, largely guessing

Output format:
<solution>
[Your proposed solution approach]
</solution>

<confidence score="X">
[Brief explanation of confidence level]
</confidence>
```

### 4.3 Consultation Prompt Template

When confidence < 8, Claude sends this to Polydev MCP:

```
I'm working on a software engineering task and would like expert perspectives.

## Task
Repository: {repo_name}
Issue: {issue_description}

## Relevant Code
{relevant_code_snippets}

## My Analysis
{claude_analysis}

## My Proposed Solution
{claude_proposed_solution}

## My Concerns
{why_confidence_is_low}

## Questions for Consultation
1. Is my diagnosis of the root cause correct?
2. Is my proposed solution approach sound?
3. Are there better alternatives I should consider?
4. What edge cases or risks might I be missing?

Please provide your perspective on the best approach to solve this issue.
```

### 4.4 Response Synthesis

After receiving perspectives from GPT-5.2 and Gemini 3 Pro, Claude synthesizes:

```
I've received the following expert perspectives:

## GPT-5.2 Perspective
{gpt_response}

## Gemini 3 Pro Perspective
{gemini_response}

## My Original Proposal
{original_proposal}

Based on all perspectives, I will now decide on the final approach:

1. Points of agreement across models: [...]
2. Points of disagreement: [...]
3. My assessment of each perspective: [...]
4. Final decision: [...]
5. Rationale: [...]

Proceeding with: [final_approach]
```

### 4.5 Synthesis Decision Rules

When models disagree, Claude (as primary) decides using these heuristics:

1. **Unanimous agreement**: Go with the consensus
2. **2 vs 1 disagreement**: Consider majority but evaluate reasoning
3. **All different**: Choose based on reasoning quality, not just voting
4. **Conflicting approaches**: Can sometimes combine insights from multiple

**Key principle**: Claude always makes the final decision. Other models provide perspectives, not votes.

---

## 5. Evaluation Methodology

### 5.1 Experimental Design

**Independent Variable:** Consultation mode (off vs on)

**Dependent Variable:** Pass rate on SWE-bench Verified

**Controls:**
- Same base model (Claude Opus 4.5)
- Same prompt templates
- Same task set (500 tasks)
- Same evaluation harness

### 5.2 Run Configurations

| Run | Base Model | Consultation | Models Consulted |
|-----|------------|--------------|------------------|
| A   | Claude Opus 4.5 | OFF | None |
| B   | Claude Opus 4.5 | ON (confidence < 8) | GPT-5.2, Gemini 3 Pro |

### 5.3 Metrics

**Primary Metric:**
- **Pass Rate** = Tasks Passed / Total Tasks

**Secondary Metrics:**
- Consultation trigger rate (% of tasks that triggered consultation)
- Consultation effectiveness (% of consultations that changed the outcome)
- Cost efficiency ($ per additional task solved)
- Time overhead (additional seconds per consultation)

### 5.4 Statistical Significance

We'll use McNemar's test for paired binary outcomes:
- Null hypothesis: Consultation doesn't improve pass rate
- Alternative: Consultation improves pass rate
- Significance level: p < 0.05

### 5.5 Task Categories

SWE-bench tasks span different repositories and difficulty levels. We'll analyze results by:

**By Repository:**
- django/django
- scikit-learn/scikit-learn
- matplotlib/matplotlib
- etc.

**By Difficulty (based on historical solve rates):**
- Easy: Historically solved by >50% of models
- Medium: Solved by 20-50%
- Hard: Solved by <20%

**By Issue Type:**
- Bug fixes
- Feature additions
- Refactoring
- Test improvements

---

## 6. Cost Analysis

### 6.1 Cost Breakdown

| Component | Per Task | 500 Tasks | Notes |
|-----------|----------|-----------|-------|
| Claude Opus 4.5 (baseline) | $0 | $0 | Via Claude Code CLI |
| Claude Opus 4.5 (with consultation) | $0 | $0 | Via Claude Code CLI |
| GPT-5.2 consultations | $0 | $0 | Via Codex CLI |
| Gemini 3 Pro consultations | ~$0.03 | ~$15-25 | API calls |
| **Total Baseline** | **$0** | **$0** | |
| **Total with Consultation** | **~$0.03-0.05** | **~$15-25** | |

### 6.2 Cost Efficiency Calculation

If consultation improves pass rate from 30% to 37%:
- Additional tasks solved: 35
- Cost of consultations: ~$20
- **Cost per additional task solved: ~$0.57**

This is extremely cost-effective compared to:
- Human engineer time to solve: ~$100+/task
- Running larger models: ~$5-10/task

### 6.3 ROI Narrative

> "For less than $1 per task, Polydev consultation increased our SWE-bench
> pass rate by 23% relative (30% → 37%). This translates to solving 35
> additional real-world GitHub issues that the base model couldn't solve alone."

---

## 7. Repository Structure

```
polydev-swe-bench/
│
├── README.md                           # Project overview and quick results
├── LICENSE                             # MIT or Apache 2.0
├── METHODOLOGY.md                      # Detailed methodology
├── RESULTS.md                          # Complete results and analysis
├── CONTRIBUTING.md                     # How to contribute
│
├── agent/
│   ├── __init__.py
│   ├── base_agent.py                   # Core agent class
│   ├── claude_integration.py           # Claude Code CLI wrapper
│   ├── codex_integration.py            # Codex CLI wrapper
│   ├── gemini_integration.py           # Gemini API wrapper
│   ├── polydev_consultation.py         # Consultation orchestration
│   ├── confidence_detector.py          # Confidence scoring
│   ├── patch_generator.py              # Patch formatting
│   └── prompts/
│       ├── analysis_prompt.txt
│       ├── confidence_prompt.txt
│       ├── consultation_prompt.txt
│       └── synthesis_prompt.txt
│
├── evaluation/
│   ├── run_baseline.py                 # Run baseline evaluation
│   ├── run_polydev.py                  # Run Polydev-enhanced evaluation
│   ├── evaluate_patches.py             # Score patches against tests
│   ├── compare_results.py              # Generate comparison reports
│   └── config.yaml                     # Evaluation configuration
│
├── results/
│   ├── baseline/
│   │   ├── claude_opus_4.5.json        # Raw results
│   │   └── claude_opus_4.5_analysis.md # Analysis
│   ├── polydev/
│   │   ├── claude_with_consultation.json
│   │   ├── consultation_logs/          # Detailed consultation logs
│   │   │   ├── task_001.json
│   │   │   └── ...
│   │   └── claude_with_consultation_analysis.md
│   ├── comparison/
│   │   ├── summary_table.md
│   │   ├── statistical_analysis.md
│   │   └── case_studies.md
│   └── predictions.json                # Leaderboard format
│
├── visualizations/
│   ├── pass_rate_comparison.png
│   ├── consultation_effectiveness.png
│   ├── cost_analysis.png
│   └── category_breakdown.png
│
├── scripts/
│   ├── setup.sh                        # Environment setup
│   ├── download_dataset.sh             # Get SWE-bench data
│   └── generate_visualizations.py      # Create charts
│
├── docs/
│   ├── blog_post.md                    # Draft blog post
│   ├── leaderboard_submission.md       # Submission instructions
│   └── video_script.md                 # Demo video script
│
└── tests/
    ├── test_agent.py
    ├── test_confidence.py
    └── test_consultation.py
```

---

## 8. Success Criteria

### 8.1 Primary Success Criteria

| Criterion | Target | Rationale |
|-----------|--------|-----------|
| Pass rate improvement | ≥ 5% absolute | Meaningful improvement |
| Statistical significance | p < 0.05 | Scientifically valid |
| Cost efficiency | < $1/additional task | Economically viable |

### 8.2 Secondary Success Criteria

| Criterion | Target | Rationale |
|-----------|--------|-----------|
| Consultation effectiveness | ≥ 30% of consultations help | Consultation is valuable |
| Reproducibility | Results within ±2% on re-run | Reliable methodology |
| Documentation quality | Complete and clear | Open source ready |

### 8.3 Stretch Goals

| Goal | Target |
|------|--------|
| Top 10 on SWE-bench Verified leaderboard | Visible industry recognition |
| Improvement across all repositories | Generalizability |
| Clear case studies | Marketing value |

---

## 9. Risk Mitigation

### 9.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Consultation doesn't improve results | Medium | High | Analyze failure cases, adjust prompts |
| CLI integration issues | Low | Medium | Have API fallbacks ready |
| SWE-bench harness compatibility | Low | High | Use official harness exactly |
| Rate limiting | Medium | Low | Add delays, retry logic |

### 9.2 Methodology Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Results not reproducible | Low | High | Seed random states, log everything |
| Overfitting to confidence threshold | Medium | Medium | Test multiple thresholds |
| Selection bias in case studies | Low | Low | Random + representative sampling |

### 9.3 Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Results are negative | Medium | High | Still valuable learnings; adjust approach |
| Competition releases similar first | Low | Medium | Move quickly, differentiate analysis |

---

## 10. Future Expansion

Once the initial evaluation is complete and successful, we can expand:

### 10.1 Different Base Models

| Base Model | Consult With | Expected Outcome |
|------------|--------------|------------------|
| GPT-5.2 | Claude, Gemini | Test if consultation helps GPT too |
| Gemini 3 Pro | Claude, GPT | Test if consultation helps Gemini too |
| Open source (Llama, etc.) | Claude, GPT, Gemini | Most compelling for open source community |

### 10.2 Different Benchmarks

- **SWE-bench Full**: 2,294 tasks for more data
- **HumanEval**: Code generation benchmark
- **MBPP**: Python programming problems
- **DS-1000**: Data science problems

### 10.3 Different Consultation Strategies

- Always consult (vs. confidence-based)
- Consult only one model (vs. both)
- Different confidence thresholds
- Domain-specific consultation

### 10.4 API-Based Demonstration

Once CLI-based evaluation is validated:
1. Create API-based version for production use
2. Build demo application
3. Offer as Polydev MCP feature

---

## 11. Timeline

```
Week 1: Setup & Infrastructure
├── Day 1-2: Environment setup, SWE-bench installation
├── Day 3-4: Agent wrapper development
├── Day 5: Confidence detection system
└── Day 6-7: Polydev consultation integration, testing

Week 2: Baseline Evaluation
├── Day 1-3: Run baseline (Claude alone) on 500 tasks
├── Day 4-5: Analyze baseline results
└── Day 6-7: Document baseline, prepare for enhanced run

Week 3: Polydev-Enhanced Evaluation
├── Day 1-3: Run enhanced evaluation (with consultation)
├── Day 4-5: Analyze results, compare to baseline
└── Day 6-7: Initial documentation

Week 4: Analysis & Documentation
├── Day 1-2: Deep statistical analysis
├── Day 3-4: Case studies (10 detailed examples)
├── Day 5-6: Visualizations and charts
└── Day 7: Review and refinement

Week 5: Open Source & Publication
├── Day 1-2: Code cleanup, documentation polish
├── Day 3: Create GitHub repository, release
├── Day 4-5: Blog post, marketing materials
└── Day 6-7: Prepare leaderboard submission (hold for approval)

Total: ~5 weeks
```

---

## Appendix A: SWE-bench Verified Task Example

```json
{
  "instance_id": "django__django-11099",
  "repo": "django/django",
  "base_commit": "a7e9a91",
  "problem_statement": "QuerySet.count() returns incorrect value when using distinct() with annotate()...",
  "hints_text": "The issue is in the SQL generation...",
  "created_at": "2019-03-15",
  "patch": "diff --git a/django/db/models/sql/query.py...",
  "test_patch": "diff --git a/tests/queries/tests.py...",
  "FAIL_TO_PASS": ["test_count_distinct_annotate"],
  "PASS_TO_PASS": ["test_count_basic", "test_count_filter"]
}
```

---

## Appendix B: Leaderboard Submission Format

```json
{
  "django__django-11099": {
    "model_patch": "diff --git a/django/db/models/sql/query.py...",
    "model_name_or_path": "Polydev-MCP-Claude-GPT-Gemini"
  },
  "scikit-learn__scikit-learn-12345": {
    "model_patch": "diff --git a/sklearn/...",
    "model_name_or_path": "Polydev-MCP-Claude-GPT-Gemini"
  }
}
```

---

## Appendix C: Glossary

- **SWE-bench**: Software Engineering benchmark for evaluating LLMs
- **SWE-bench Verified**: Human-verified subset of 500 high-quality tasks
- **MCP**: Model Context Protocol - standard for AI tool integration
- **Polydev**: Multi-model consultation system via MCP
- **Pass Rate**: Percentage of tasks where the generated patch passes all tests
- **Confidence Score**: Self-assessed certainty (1-10) by the base model
- **Consultation**: Querying additional models for perspectives

---

*Document Version: 1.0*
*Created: December 2024*
*Last Updated: December 2024*
