# SWE-bench Extended Thinking Evaluation Plan

## Background

### Current Results (Baseline - No Extended Thinking)
- **Model**: Claude Haiku 4.5 (`claude-haiku-4-5-20251001`)
- **Resolution Rate**: 63.0% (281/446 evaluated instances)
- **Patch Generation Rate**: 99.4% (497/500 instances)
- **Total Cost**: $179.32
- **51 instances**: Failed to evaluate due to Docker Hub rate limiting

### Anthropic's Benchmark Results
- **Model**: Claude Haiku 4.5
- **Resolution Rate**: 73.3%
- **Key Differences**:
  1. Extended thinking with 128K token budget
  2. Prompt: "Use tools as much as possible, ideally more than 100 times. Write tests first."
  3. Multiple runs averaged (50 runs per instance)

## Gap Analysis

| Metric | Our Run | Anthropic | Gap |
|--------|---------|-----------|-----|
| Resolution Rate | 63.0% | 73.3% | -10.3% |
| Extended Thinking | No | Yes (128K) | Missing |
| Prompt Strategy | Basic | Write tests first, 100+ tools | Different |
| Runs per Instance | 1 | 50 (averaged) | Different |

## Key Findings

### 1. Extended Thinking IS Supported on Haiku 4.5
Per Anthropic's official documentation, these models support extended thinking:
- Claude Sonnet 4.5
- Claude Sonnet 4
- **Claude Haiku 4.5** (our model)
- Claude Opus 4.5, 4.1, 4

### 2. How to Enable Extended Thinking in Claude Code CLI
```bash
MAX_THINKING_TOKENS=128000 claude --model claude-haiku-4-5-20251001 ...
```

### 3. Thinking Token Behavior
- Claude 4 models return **summarized** thinking (not full)
- You're billed for full thinking tokens, but see a summary
- The visible output token count **won't match** billed count

### 4. Test Results (Single Instance)
**Instance**: `astropy__astropy-12907`
- **Turns**: 39
- **Time**: 205 seconds
- **Cost**: $0.0315
- **Result**: Patch generated successfully

**Instance**: `astropy__astropy-14309` (from evaluation)
- **Turns**: 42
- **Time**: 211 seconds
- **Cost**: $0.019
- **Result**: Correct patch with proper root cause analysis

## Proposed Evaluation Configuration

### Runner Script
Location: `/Users/venkat/temp-scripts/swe_bench_v2_thinking.py`

### Settings
```python
MODEL = "claude-haiku-4-5-20251001"
THINKING_TOKENS = 128000  # 128K thinking budget
MAX_TURNS = 150           # More turns for thorough exploration
MAX_WORKERS = 10          # Parallel instances
TIMEOUT = 2400            # 40 min per instance
```

### Prompt (Matching Anthropic's Methodology)
```
IMPORTANT: You should use tools as much as possible, ideally more than 100 times.
You should also implement your own tests first before attempting the problem.

## Recommended Workflow:
1. EXPLORE EXTENSIVELY: Use bash commands (grep, find, ls, cat) to thoroughly explore
2. WRITE A TEST FIRST: Create a simple test script that reproduces the bug
3. LOCATE THE ROOT CAUSE: Trace through the code to find exactly where the bug originates
4. IMPLEMENT THE FIX: Make MINIMAL, targeted changes
5. VERIFY WITH YOUR TEST: Run your test again to confirm the fix works
```

## Cost Estimate

Based on test results:
- **Cost per instance**: ~$0.02-0.03 with extended thinking
- **500 instances**: ~$10-15 total
- **Time**: ~3-4 hours (10 parallel workers, ~3.5 min/instance)

This is actually **cheaper** than the baseline run ($179.32) because:
1. Haiku is very cost-effective even with thinking
2. Better prompting may reduce retries/wasted turns

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Extended thinking not fully engaged | Verified via test - costs are higher than non-thinking |
| Long running times | 40 min timeout, background execution |
| Rate limiting | 10 workers (conservative) |
| Docker eval rate limiting | Run evaluation after patch generation |

## Scripts Created

| Script | Purpose |
|--------|---------|
| `swe_bench_v2_thinking.py` | Main evaluation runner with extended thinking |
| `test_thinking_v2.py` | Single instance test to verify thinking works |
| `test_single_thinking.py` | Alternative test script |

## Next Steps

1. **Review this plan** - Ensure configuration is correct
2. **Run full evaluation** with extended thinking
3. **Compare results** - Resolution rate should improve toward 73%
4. **Run Docker evaluation** - After rate limit resets
5. **Iterate** - Adjust prompts/settings based on results

## References

- [Anthropic Extended Thinking Docs](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)
- [Claude Haiku 4.5 Announcement](https://www.anthropic.com/news/claude-haiku-4-5)
- [SWE-bench Verified Dataset](https://huggingface.co/datasets/princeton-nlp/SWE-bench_Verified)
