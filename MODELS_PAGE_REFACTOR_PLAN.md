# Models Page Refactor Plan

## 📍 Current State (Commit: 4e40401)

### What Was Just Implemented

#### New Components Created:
1. **`ModelPriorityWaterfall.tsx`** (520+ lines)
   - Shows unified priority waterfall in Simple mode
   - Fetches data from 4 different tables on mount:
     - `user_perspective_quotas` - quota data
     - `user_api_keys` - user's API keys
     - `model_tiers` - active providers
     - `user_preferences` - mcp_settings
   - Displays:
     - perspectives_per_message slider (editable)
     - CLI tools status
     - User API keys with ↑ ↓ reordering
     - Admin keys (perspectives) with quota bars
     - Tier priority with ↑ ↓ reordering
     - Provider priority with ↑ ↓ reordering
   - Updates database on every reorder action

2. **`ProviderPriorityPicker.tsx`** (222 lines)
   - Drag-and-drop provider ordering
   - Fetches providers from `model_tiers`
   - Used in Advanced mode only

#### Modified Components:
1. **`enhanced-api-keys.tsx`**
   - Added Simple/Advanced mode toggle
   - Simple mode: Shows `ModelPriorityWaterfall`
   - Advanced mode: Shows existing components (`ModelSourcePriorityPicker`, `ModelPreferenceSelector`)
   - Still includes CLI Tools Status section
   - Still includes API Keys management section
   - Still includes All Available Models section

2. **`ModelSourcePriorityPicker.tsx`**
   - Updated descriptions for clarity
   - Shows CLI/API/Admin source priority

3. **`mcp/route.ts`**
   - Fixed to use `serviceRoleSupabase` instead of undefined `supabase`
   - Now respects `perspectives_per_message` setting from user preferences

### Architecture Implemented

**Priority System (Backend - Already Working Correctly):**
```
1. Source Priority: CLI > User API Keys > Admin Keys
2. Within User API Keys: Sorted by display_order (reorderable)
3. Within Admin Keys:
   a. Tier Priority: Try Normal → Eco → Premium (reorderable)
   b. Provider Priority: GLOBAL order (e.g., Anthropic → OpenAI → Google)
      - Applies same order to ALL tiers
```

**Database Schema Used:**
- `user_preferences.source_priority` - ["cli", "api", "admin"]
- `user_preferences.mcp_settings.tier_priority` - ["normal", "eco", "premium"]
- `user_preferences.mcp_settings.provider_priority` - ["anthropic", "openai", "google", ...]
- `user_preferences.mcp_settings.perspectives_per_message` - number (1-10)
- `user_api_keys.display_order` - number (for API key ordering)

## ⚠️ CRITICAL PERFORMANCE ISSUES IDENTIFIED

### Problem: Page Non-Responsive

**Root Causes:**

1. **Multiple Expensive Queries on Page Load:**
   - `ModelPriorityWaterfall` makes 4 separate Supabase queries on mount
   - `ProviderPriorityPicker` makes 1 query on mount
   - `enhanced-api-keys.tsx` already has `useEnhancedApiKeysData` hook making queries
   - Total: ~6-8 queries firing simultaneously on page load

2. **Duplicate Data Fetching:**
   - `ModelPriorityWaterfall` fetches API keys independently
   - `enhanced-api-keys.tsx` already fetches API keys via hook
   - Same data fetched twice in parallel

3. **No Loading States Coordination:**
   - Multiple components showing loading spinners independently
   - No unified loading state management

4. **Re-rendering Issues:**
   - Every state update in `ModelPriorityWaterfall` triggers re-render
   - Slider changes, reordering, all trigger database updates immediately
   - No debouncing or optimistic updates

5. **Large Component Size:**
   - `enhanced-api-keys.tsx` is 1702 lines (too large)
   - `ModelPreferenceSelector` is 705 lines (complex, unused in Simple mode)
   - Both still loaded even in Simple mode

## 🎯 DESIRED END STATE

### The Vision (From User's Comprehensive Design)

**SIMPLE MODE (Default - 90% of users):**

```
┌──────────────────────────────────────────────────────────────┐
│ 📊 Model Routing Priority                                    │
│ Shows how your requests are routed (in order):              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ⚙️ SETTINGS                                                  │
│ │ Perspectives per message: [2] [slider 1-10]              │
│ │ ℹ️ Number of models to query simultaneously               │
│                                                              │
│ 1️⃣ CLI TOOLS (Highest Priority - Always FREE)              │
│    ✓ Detected: Claude Code, Codex CLI                      │
│                                                              │
│ 2️⃣ YOUR API KEYS (Your Models - Always FREE)               │
│    │ 1. Anthropic - Claude Sonnet 4        [↑] [↓] [×]    │
│    │ 2. OpenAI - GPT-4 Turbo               [↑] [↓] [×]    │
│    │ 3. Google - Gemini 1.5 Pro            [↑] [↓] [×]    │
│    [+ Add API Key]                                          │
│                                                              │
│ 3️⃣ ADMIN KEYS (Uses Your Quota)                            │
│    Tier Priority:                                            │
│    │ 1. Normal (180/200) ████████░░ [↑] [↓]              │
│    │ 2. Eco (90/100)     █████████░ [↑] [↓]              │
│    │ 3. Premium (45/50)  █████████░ [↑] [↓]              │
│                                                              │
│    Provider Priority (applies to all tiers):                │
│    │ 1. Anthropic      [↑] [↓]                           │
│    │ 2. OpenAI         [↑] [↓]                           │
│    │ 3. Google         [↑] [↓]                           │
└──────────────────────────────────────────────────────────────┘

[Show Advanced Settings ↓]
```

**Key Features:**
- ✅ ↑ ↓ Buttons (no drag-and-drop complexity)
- ✅ Inline perspectives slider
- ✅ Clear 1️⃣ 2️⃣ 3️⃣ visual hierarchy
- ✅ Inline quota bars
- ✅ Provider order is GLOBAL (applies to all tiers)
- ✅ All edits save to database automatically

**ADVANCED MODE (10% power users):**
- Full drag-and-drop controls
- Source priority reordering
- Detailed API key management
- Additional settings toggles

## 🛠️ INCREMENTAL IMPLEMENTATION PLAN

### Phase 1: Performance Fix (IMMEDIATE - Before any UI changes)

**Goal:** Fix performance issues, make page responsive

**Actions:**

1. **Consolidate Data Fetching**
   - Use existing `useEnhancedApiKeysData` hook for ALL data
   - Remove duplicate queries from `ModelPriorityWaterfall`
   - Pass data as props instead of fetching independently

2. **Add Debouncing**
   - Debounce slider changes (500ms)
   - Optimistic updates for reordering (update UI first, save later)
   - Batch database updates

3. **Lazy Load Advanced Mode**
   - Use React.lazy() for `ModelPreferenceSelector` (705 lines)
   - Only load when Advanced mode is activated
   - Use Suspense with loading fallback

4. **Simplify Initial Render**
   - Start with Simple mode by default
   - Render only what's visible
   - Defer non-critical data (like available models list)

**Files to Modify:**
- `ModelPriorityWaterfall.tsx` - Remove data fetching, accept props
- `enhanced-api-keys.tsx` - Pass data from hook to waterfall
- Create `useModelPriority.ts` - Centralized priority logic hook

**Estimated Time:** 2-3 hours

### Phase 2: UI Refinement (After performance is fixed)

**Goal:** Match the comprehensive design exactly

**Actions:**

1. **Simplify ModelPriorityWaterfall Layout**
   - Remove verbose descriptions
   - Tighten spacing
   - Make quota bars more compact
   - Add tooltips for explanations (on hover, not inline)

2. **Add Visual Hierarchy**
   - Use numbered badges (1️⃣ 2️⃣ 3️⃣)
   - Better color coding
   - Clearer section separation

3. **Improve Button Controls**
   - Cleaner ↑ ↓ button styling
   - Disable buttons at boundaries (first item can't move up)
   - Add keyboard shortcuts (Alt+Up/Down)

**Files to Modify:**
- `ModelPriorityWaterfall.tsx` - UI refinements
- Add new CSS/Tailwind classes

**Estimated Time:** 2-3 hours

### Phase 3: Advanced Mode Enhancement (Optional, can defer)

**Goal:** Make Advanced mode truly powerful for power users

**Actions:**

1. **Add Drag-and-Drop to Advanced Mode**
   - Keep existing drag-drop components
   - Add visual feedback (drag handles, drop zones)
   - Add keyboard accessibility

2. **Add Bulk Operations**
   - "Reset to defaults" button
   - "Copy from another user" (admin only)
   - Import/Export configuration

**Files to Modify:**
- `ModelSourcePriorityPicker.tsx` - Enhanced drag-drop
- `ProviderPriorityPicker.tsx` - Enhanced drag-drop
- Add new components for bulk operations

**Estimated Time:** 3-4 hours

### Phase 4: Polish & Testing

**Goal:** Production-ready, bug-free

**Actions:**

1. **Error Handling**
   - Add error boundaries
   - Graceful fallbacks for failed queries
   - Retry mechanisms

2. **Loading States**
   - Unified loading spinner
   - Skeleton screens for better UX
   - Progress indicators for save operations

3. **Testing**
   - Test with slow network (throttling)
   - Test with many API keys (100+)
   - Test with quota exhausted
   - Test keyboard navigation
   - Test mobile responsive

**Files to Create:**
- `ErrorBoundary.tsx` - Error boundary component
- `LoadingState.tsx` - Unified loading component
- Tests for each component

**Estimated Time:** 2-3 hours

## 📋 IMMEDIATE NEXT STEPS (After Rollback)

### Step 1: Rollback to Stable Commit
```bash
git reset --hard d561cdaf432e98bbf62cd37e54fe1691386e3806
git push -f origin main  # If needed
```

### Step 2: Create Performance Branch
```bash
git checkout -b feature/models-page-performance
```

### Step 3: Phase 1 Implementation (Performance Fix)

**Create: `src/hooks/useModelPriority.ts`**
```typescript
// Centralized hook for model priority data and operations
export function useModelPriority() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Fetch all data in parallel (single hook)
  const { data, refetch } = useQuery({
    queryKey: ['modelPriority', user?.id],
    queryFn: async () => {
      const supabase = createClient()
      const [quota, apiKeys, preferences, providers] = await Promise.all([
        supabase.from('user_perspective_quotas').select('*').eq('user_id', user!.id).single(),
        supabase.from('user_api_keys').select('*').eq('user_id', user!.id).order('display_order'),
        supabase.from('user_preferences').select('*').eq('user_id', user!.id).single(),
        supabase.from('model_tiers').select('provider, display_name').eq('active', true)
      ])

      return { quota: quota.data, apiKeys: apiKeys.data, preferences: preferences.data, providers: providers.data }
    },
    enabled: !!user
  })

  // Debounced update functions
  const updatePerspectives = useDebouncedCallback(async (value: number) => {
    // Update database
  }, 500)

  const reorderApiKeys = async (from: number, to: number) => {
    // Optimistic update
    // Then save to database
  }

  return { data, loading, saving, updatePerspectives, reorderApiKeys, refetch }
}
```

**Modify: `ModelPriorityWaterfall.tsx`**
```typescript
// Remove all data fetching
// Accept data as props
export default function ModelPriorityWaterfall({
  quota,
  apiKeys,
  preferences,
  providers,
  onUpdatePerspectives,
  onReorderApiKeys
}: Props) {
  // No useEffect for data fetching
  // Just render UI with props
  // Call prop functions for updates
}
```

**Modify: `enhanced-api-keys.tsx`**
```typescript
// Use centralized hook
const { data, updatePerspectives, reorderApiKeys } = useModelPriority()

// Pass to waterfall
{viewMode === 'simple' && data && (
  <ModelPriorityWaterfall
    quota={data.quota}
    apiKeys={data.apiKeys}
    preferences={data.preferences}
    providers={data.providers}
    onUpdatePerspectives={updatePerspectives}
    onReorderApiKeys={reorderApiKeys}
  />
)}

// Lazy load advanced mode
const ModelPreferenceSelector = lazy(() => import('../ModelPreferenceSelector'))
```

### Step 4: Test Performance
- Test page load time (should be <2s)
- Test interactions (should be instant with debouncing)
- Test with slow network (should show loading states properly)

### Step 5: Commit & Deploy Phase 1
```bash
git add .
git commit -m "Fix models page performance - consolidate data fetching and add debouncing"
git push origin feature/models-page-performance
```

### Step 6: Create PR for Review
- Test on staging
- Get user approval
- Merge to main

### Step 7: Repeat for Phase 2, 3, 4

## 🔄 ROLLBACK PLAN

### Immediate Rollback (Now)
```bash
# Go back to commit before performance issues
git reset --hard d561cdaf432e98bbf62cd37e54fe1691386e3806

# Force push if needed (only if commit was pushed)
git push -f origin main
```

### What Gets Removed:
- `ModelPriorityWaterfall.tsx` - Delete
- `ProviderPriorityPicker.tsx` - Delete
- Changes to `enhanced-api-keys.tsx` - Revert
- Changes to `ModelSourcePriorityPicker.tsx` - Revert
- Changes to `mcp/route.ts` - Keep the fix (serviceRoleSupabase), revert perspectives logic

### What To Keep:
- The MCP endpoint fix (`serviceRoleSupabase` instead of `supabase`) - Cherry-pick this
- The architecture understanding (documented here)
- The comprehensive design (documented here)

## 📊 SUCCESS METRICS

### Performance Metrics (Phase 1)
- ✅ Page load time: <2 seconds
- ✅ Time to interactive: <1 second
- ✅ Database queries on mount: ≤3 (consolidated)
- ✅ UI updates on interaction: <100ms (optimistic)

### User Experience Metrics (Phase 2-3)
- ✅ Simple mode usage: >80% of users
- ✅ Advanced mode usage: <20% of users
- ✅ User can understand priority in <30 seconds
- ✅ User can reorder priorities in <5 clicks

### Code Quality Metrics (Phase 4)
- ✅ Component size: <400 lines each
- ✅ Test coverage: >80%
- ✅ No duplicate data fetching
- ✅ Error boundaries on all async operations

## 🎯 FINAL ARCHITECTURE (After All Phases)

### File Structure:
```
src/
├── components/
│   ├── models/
│   │   ├── ModelPriorityWaterfall.tsx      (Simple mode UI - 300 lines)
│   │   ├── ModelSourcePicker.tsx           (Source priority - 150 lines)
│   │   ├── ModelTierPicker.tsx             (Tier priority - 150 lines)
│   │   ├── ModelProviderPicker.tsx         (Provider priority - 150 lines)
│   │   ├── ApiKeyList.tsx                  (API keys list - 200 lines)
│   │   └── AdvancedSettings.tsx            (Advanced mode - 300 lines)
│   └── ui/
│       └── enhanced-api-keys.tsx           (Main page - 400 lines)
├── hooks/
│   ├── useModelPriority.ts                 (Centralized data/logic - 200 lines)
│   └── useEnhancedApiKeysData.ts           (Existing - keep)
└── types/
    └── model-priority.ts                   (Type definitions)
```

### Data Flow:
```
1. Page Load
   └── useModelPriority() hook
       └── Single parallel query (3 database calls)
           ├── Quotas
           ├── API Keys
           ├── Preferences
           └── Providers
       └── Returns consolidated data

2. User Interaction (Simple Mode)
   └── UI Component (ModelPriorityWaterfall)
       └── Calls hook function (updatePerspectives, reorderApiKeys)
           └── Optimistic UI update (instant)
           └── Debounced database save (500ms)
           └── Refetch on success

3. User Interaction (Advanced Mode)
   └── Lazy-loaded component
       └── Same hook functions
       └── Drag-and-drop events
       └── Save on drop
```

## 📝 NOTES

- **Provider Priority is GLOBAL** - Same order applies to Normal, Eco, and Premium tiers
- **Tier Priority is for Fallback** - When quota runs out in one tier, try next tier
- **API Key Order is Independent** - User's API keys have their own order via display_order
- **CLI Always Wins** - When MCP client detected, CLI tools take precedence
- **Perspectives Setting is Shared** - Same value used for both Chat and MCP endpoints

## 🚀 READY TO PROCEED

After rollback, we'll implement this plan incrementally:
1. Fix performance (Phase 1) - CRITICAL
2. Refine UI (Phase 2) - Important
3. Enhance Advanced (Phase 3) - Nice to have
4. Polish & Test (Phase 4) - Before production

Each phase will be a separate PR with proper testing before merge.
