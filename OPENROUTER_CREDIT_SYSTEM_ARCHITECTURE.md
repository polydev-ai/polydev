# OpenRouter Credit System Architecture

## Executive Summary

**Objective**: Implement a comprehensive credit-based subscription system where Polydev users can purchase credits to access AI models through OpenRouter's organization management infrastructure.

**Key Capabilities**:
- User credit purchasing and management
- Individual user API key provisioning through OpenRouter
- Budget controls and spending limits
- Model selection with real-time pricing
- Usage analytics and cost tracking
- Automated user tracking under Polydev organization

## OpenRouter Infrastructure Analysis

### Available Keys
- **Organization Key**: `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`
  - Type: Standard API key for making requests
  - Status: Active, no usage limits, not free tier
- **Provisioning Key**: `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`
  - Type: Provisioning key for managing user API keys
  - Status: Active, can create/manage keys programmatically

### Core API Capabilities

#### 1. Key Provisioning (`/api/v1/keys`)
- **Create individual user API keys** with optional credit limits
- **Track usage per key** with detailed analytics
- **Set spending limits** per user/key
- **Disable/enable keys** based on usage or violations

#### 2. Models API (`/api/v1/models`)
- **415+ available models** with real-time pricing
- **Pricing structure**: Per-token costs (prompt/completion/reasoning)
- **Model metadata**: Context length, capabilities, modalities
- **Dynamic pricing**: Costs can vary by provider

#### 3. Analytics API (`/api/v1/activity`)
- **Daily usage tracking** for last 30 days
- **Per-user breakdown** using user ID parameter
- **Cost analysis** with detailed token usage
- **Model-specific analytics**

#### 4. User Tracking
- **Sticky caching** per user for improved performance
- **Enhanced reporting** with user-level insights
- **Stable user identifiers** for consistent tracking

## Comprehensive Architecture Design

### 1. Database Schema Extensions

```sql
-- User Credit Management
CREATE TABLE user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(10,2) DEFAULT 0.00,
  total_purchased DECIMAL(10,2) DEFAULT 0.00,
  total_spent DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit Purchase History
CREATE TABLE credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  stripe_payment_intent_id TEXT,
  status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OpenRouter API Keys (per user)
CREATE TABLE openrouter_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  openrouter_key_hash TEXT NOT NULL,
  openrouter_key_label TEXT NOT NULL,
  spending_limit DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Model Usage Tracking
CREATE TABLE model_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  openrouter_key_hash TEXT,
  model_id TEXT NOT NULL,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  reasoning_tokens INTEGER DEFAULT 0,
  total_cost DECIMAL(10,6) NOT NULL,
  request_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Budget Settings
CREATE TABLE user_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_limit DECIMAL(10,2),
  weekly_limit DECIMAL(10,2),
  monthly_limit DECIMAL(10,2),
  preferred_models TEXT[], -- Array of model IDs
  auto_top_up_enabled BOOLEAN DEFAULT false,
  auto_top_up_threshold DECIMAL(10,2),
  auto_top_up_amount DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Model Pricing Cache
CREATE TABLE model_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT UNIQUE NOT NULL,
  model_name TEXT NOT NULL,
  prompt_price DECIMAL(12,8),
  completion_price DECIMAL(12,8),
  reasoning_price DECIMAL(12,8),
  context_length INTEGER,
  description TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Credit Purchase System

#### Stripe Integration Flow
```typescript
// Credit packages with volume discounts
const CREDIT_PACKAGES = [
  { amount: 10, price: 1000, bonus: 0 }, // $10.00 for $10 credits
  { amount: 25, price: 2400, bonus: 1 }, // $24.00 for $26 credits (4% bonus)
  { amount: 50, price: 4700, bonus: 3 }, // $47.00 for $53 credits (6% bonus)
  { amount: 100, price: 9200, bonus: 8 }, // $92.00 for $108 credits (8% bonus)
  { amount: 250, price: 2250, bonus: 25 }, // $225.00 for $275 credits (10% bonus)
]
```

#### Purchase Process
1. **User selects package** → Create Stripe Payment Intent
2. **Payment succeeds** → Add credits to user balance
3. **Provision OpenRouter key** → Create individual user API key with spending limit
4. **Initialize analytics** → Set up user tracking in system

### 3. OpenRouter Integration Layer

#### User API Key Management
```typescript
class OpenRouterKeyManager {
  async createUserKey(userId: string, spendingLimit: number) {
    const response = await fetch('https://openrouter.ai/api/v1/keys', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PROVISIONING_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `polydev_user_${userId}`,
        limit: spendingLimit
      })
    })
    
    // Store key info in database
    // Return key for user
  }
  
  async updateKeyLimit(keyHash: string, newLimit: number) {
    // Update spending limit for existing key
  }
  
  async getUserUsage(keyHash: string) {
    // Fetch usage analytics for specific user key
  }
}
```

#### Real-time Cost Calculation
```typescript
class ModelPricingService {
  async calculateRequestCost(modelId: string, promptTokens: number, completionTokens: number) {
    const pricing = await this.getModelPricing(modelId)
    return {
      promptCost: promptTokens * pricing.prompt_price,
      completionCost: completionTokens * pricing.completion_price,
      totalCost: (promptTokens * pricing.prompt_price) + (completionTokens * pricing.completion_price)
    }
  }
  
  async refreshModelPricing() {
    // Sync latest model pricing from OpenRouter
    const models = await fetch('https://openrouter.ai/api/v1/models')
    // Update model_pricing table
  }
}
```

### 4. Budget Management System

#### Spending Controls
- **Pre-request validation**: Check user balance before allowing requests
- **Real-time monitoring**: Track spending as requests are made  
- **Automatic limits**: Disable keys when limits are reached
- **Budget alerts**: Notify users at 50%, 80%, 90% of budget

#### Budget Dashboard Features
- **Current balance** and spending history
- **Model usage breakdown** with cost analysis
- **Budget setting controls** (daily/weekly/monthly limits)
- **Auto top-up configuration**
- **Preferred model selection** with cost estimates

### 5. Model Selection Interface

#### Smart Model Recommendations
```typescript
interface ModelRecommendation {
  modelId: string
  name: string
  description: string
  estimatedCost: number // per 1K tokens
  performance: 'fast' | 'balanced' | 'high-quality'
  useCase: string[]
  popularity: number
}

class ModelRecommendationEngine {
  async getRecommendedModels(userBudget: number, useCase: string) {
    // Filter models by budget
    // Rank by performance/cost ratio
    // Consider user's previous preferences
  }
}
```

#### Model Selection UI Components
- **Cost calculator**: Real-time cost estimates based on expected usage
- **Model comparison table**: Side-by-side feature/cost comparison
- **Usage-based recommendations**: Suggest models based on user's typical requests
- **Budget-aware filtering**: Hide/highlight models based on current budget

### 6. Analytics & Reporting

#### User Dashboard Analytics
- **Daily/weekly/monthly usage** charts
- **Cost breakdown by model** 
- **Token usage patterns**
- **Budget utilization** trends
- **Cost per request** analysis

#### Admin Analytics
- **Total revenue** and user acquisition
- **Most popular models** across users
- **Average spending** per user
- **Cost efficiency** metrics

### 7. API Integration Points

#### Enhanced MCP Route
```typescript
// Modified /api/mcp route to include credit checking
async function handleMCPRequest(request: MCPRequest, user: User) {
  // 1. Check user credit balance
  const userCredits = await getUserCredits(user.id)
  if (userCredits.balance <= 0) {
    throw new InsufficientCreditsError()
  }
  
  // 2. Get user's OpenRouter key
  const userKey = await getUserOpenRouterKey(user.id)
  
  // 3. Estimate request cost
  const estimatedCost = await estimateRequestCost(request.model, request.prompt)
  if (estimatedCost > userCredits.balance) {
    throw new InsufficientCreditsError()
  }
  
  // 4. Make request with user tracking
  const response = await makeOpenRouterRequest({
    ...request,
    apiKey: userKey.key,
    user: `polydev_user_${user.id}`
  })
  
  // 5. Record actual usage and cost
  await recordModelUsage(user.id, response.usage, response.cost)
  await deductCredits(user.id, response.cost)
  
  return response
}
```

### 8. Implementation Phases

#### Phase 1: Core Infrastructure (Week 1-2)
- Database schema implementation
- Basic credit purchase with Stripe
- OpenRouter key provisioning
- User balance tracking

#### Phase 2: Budget Management (Week 3)
- Budget setting interface
- Spending limit enforcement
- Usage analytics dashboard
- Alert system

#### Phase 3: Model Selection (Week 4)
- Model pricing sync
- Cost calculator
- Model recommendation engine
- Advanced filtering

#### Phase 4: Advanced Features (Week 5-6)
- Auto top-up system
- Advanced analytics
- Usage optimization suggestions
- Cost forecasting

## Security & Compliance Considerations

### API Key Security
- **Encrypted storage** of OpenRouter keys
- **Limited scope** keys per user
- **Automatic rotation** capability
- **Audit logging** of all key operations

### Financial Controls
- **PCI compliance** for payment processing
- **Fraud detection** for unusual spending patterns
- **Refund handling** for failed transactions
- **Tax calculation** where applicable

### Privacy Protection
- **User consent** for usage tracking
- **Data anonymization** in analytics
- **GDPR compliance** for EU users
- **Opt-out mechanisms** for tracking

## Cost Optimization Strategies

### Intelligent Routing
- **Model performance tracking** to recommend cost-effective alternatives
- **Batch processing** for bulk requests
- **Caching optimization** for repeated queries
- **Load balancing** across providers

### User Education
- **Cost awareness** tools and notifications
- **Best practices** documentation
- **Model selection guides**
- **Budget optimization tips**

## Success Metrics

### Business Metrics
- **Monthly Recurring Revenue** (MRR)
- **Customer Acquisition Cost** (CAC)
- **User Lifetime Value** (LTV)
- **Credit utilization rate**

### Technical Metrics
- **API response times**
- **Cost prediction accuracy**
- **System reliability** (99.9% uptime)
- **User satisfaction** scores

This architecture provides a comprehensive foundation for implementing a robust credit-based AI model access system using OpenRouter's infrastructure.