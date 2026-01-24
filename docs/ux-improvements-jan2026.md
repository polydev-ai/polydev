# Polydev UX Improvement Recommendations
**Date:** January 23, 2026
**Status:** Draft for Review

---

## Current State Summary

Pages reviewed:
- **Landing Page** (polydev.ai)
- **Dashboard** (overview with stats)
- **Models** (API keys & perspectives config)
- **API Tokens** (MCP token management)
- **Activity** (analytics)
- **Docs** (setup guide)

---

## Dashboard/Models Page Improvements

### 1. Clarify "Perspectives per Request" Purpose
**Current:** Slider shows 1-10 with "Will query these 3 models"
**Issue:** New users may not understand what "perspectives" means or why they'd want more/fewer

**Recommendation:**
- Add tooltip: "More perspectives = more diverse AI opinions but higher cost"
- Show estimated cost per request based on slider value
- Add a "Recommended" badge at 2-3 perspectives

### 2. API Keys Section - Better Visual Hierarchy
**Current:** All keys listed equally with small "WILL USE" badges
**Issue:** Hard to quickly see which providers are active vs inactive

**Recommendation:**
- Use more prominent visual distinction (green highlight for active, gray for inactive)
- Add a quick "Enable/Disable" toggle instead of requiring click to expand
- Show which models will be queried at a glance (currently requires mental mapping)

### 3. Add "Quick Start" Card for New Users
**Issue:** New users landing on /dashboard/models may not know what to do first

**Recommendation:**
- Show a dismissable onboarding card: "Welcome! Here's how to get started:"
  1. Add your first API key
  2. Set perspectives count
  3. Copy your MCP token
- Progress indicator showing setup completion

### 4. Model Usage Analytics - Make it Actionable
**Current:** Collapsed by default
**Recommendation:**
- Show a mini-chart preview even when collapsed
- Add "Cost optimization tips" based on usage patterns

---

## Navigation Improvements for New Users

### 1. Add Breadcrumbs or Section Indicators
**Issue:** Dashboard sub-pages (Models, API Tokens, Activity) don't clearly show hierarchy

**Recommendation:**
- Add breadcrumbs: `Dashboard > Models`
- Or use a left sidebar for dashboard sections instead of top tabs

### 2. Rename "API Tokens" to "MCP Setup" or "Connect IDE"
**Issue:** "API Tokens" is technical jargon that doesn't explain the purpose

**Recommendation:**
- Rename to "Connect IDE" or "MCP Setup"
- This matches the landing page messaging better

### 3. Add "Getting Started" Link in Dashboard Nav
**Current:** Docs is external-looking in the nav
**Recommendation:**
- Add a prominent "Setup Guide" or "?" help icon
- Show setup completion status in header

### 4. Consolidate Related Pages
**Observation:** "Models" handles both API keys AND perspectives config

**Recommendation:**
- Consider splitting into:
  - "API Keys" (provider credentials)
  - "Preferences" (perspectives count, model priority)
- Or rename "Models" to "Configuration" for clarity

---

## New User Onboarding Improvements

### 1. Post-Signup Flow
**Recommendation:** After signup, guide users through:
1. Generate MCP token (auto-create one)
2. Choose their IDE (show relevant install command)
3. Add first API key OR explain Credits mode
4. Test with sample query

### 2. Empty State Improvements
When user has no API keys configured:
- Show clear call-to-action: "Add your first API key to get started"
- Explain Credits alternative: "Or use Polydev Credits - no API keys needed"

### 3. In-App Tooltips
Add contextual help for:
- "CLI" badges (what does CLI mean here?)
- "Credits Only" label
- "Perspectives" concept
- "Standard" vs other token types

---

## Quick Wins (Easy to Implement)

| Issue | Fix |
|-------|-----|
| "API Tokens" page title unclear | Rename to "MCP Setup" or "Connect Your IDE" |
| No visual feedback on slider | Show estimated cost as slider moves |
| Token list shows partial tokens | Add "Show full token" button more prominently |
| Activity page shows 0s for new users | Show "No activity yet - make your first request!" |
| Docs page requires scrolling | Add anchor links to steps |

---

## Visual/Polish Suggestions

1. **Provider Logos Consistency** - Some show CLI badges, some don't - explain the difference

2. **Credits Balance** - Make more prominent in header (like a wallet balance)

3. **Active Token Indicator** - Show which token is currently being used in MCP

4. **Dark Mode** - Consider adding for developers who prefer it

---

## Summary: Top 5 Priority Changes

1. **Add onboarding flow** for new users with progress tracking
2. **Rename "API Tokens"** to something clearer like "Connect IDE"
3. **Add tooltips/help** explaining Perspectives, CLI badges, Credits
4. **Show cost estimates** on the Perspectives slider
5. **Empty state CTAs** that guide users to next action

---

## Credits Tier Simplification (To Be Analyzed)

### Current State (3 Tiers)
- Premium
- Normal
- Eco

### Proposed Options
1. **2 Tiers:** Premium + Eco
2. **1 Tier:** Eco only

### Model Categorization (Draft)
**Premium tier candidates:**
- Claude 4.5 Opus
- GPT 5.2
- Gemini 3 Pro

**Eco tier candidates:**
- Gemini 3 Flash
- Grok 4.1 Fast reasoning
- GLM 4.7
- GPT 5 mini

### Default Model Priority (Draft)
Prioritize CLI tools with leading models:
1. CLI tools first (Claude Code, Codex CLI, Gemini CLI)
2. Within CLI: Leading models (Opus 4.5, GPT 5.2 Codex, Gemini 3.0 Pro)

---

*Analysis of tiers and model ordering in separate document*
