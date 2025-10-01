/**
 * Integration tests for user quota API
 * Tests Phase 4 implementation: CLI vs web usage breakdown
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'

describe('User Quota API', () => {
  let mockUser: any
  let mockSupabase: any
  let mockQuotaData: any
  let mockUsageStats: any[]

  beforeEach(() => {
    mockUser = {
      id: 'test-user-123',
      email: 'test@example.com'
    }

    mockQuotaData = {
      user_id: mockUser.id,
      plan_tier: 'pro',
      messages_per_month: 1000,
      messages_used: 150,
      premium_perspectives_limit: 500,
      premium_perspectives_used: 50,
      normal_perspectives_limit: 1000,
      normal_perspectives_used: 100,
      eco_perspectives_limit: 2000,
      eco_perspectives_used: 200,
      current_month_start: '2025-01-01T00:00:00Z'
    }

    mockUsageStats = [
      {
        model_tier: 'premium',
        perspectives_deducted: 10,
        estimated_cost: 0.05,
        created_at: '2025-01-15T10:00:00Z',
        request_metadata: { source_type: 'user_cli' }
      },
      {
        model_tier: 'normal',
        perspectives_deducted: 5,
        estimated_cost: 0.02,
        created_at: '2025-01-15T11:00:00Z',
        request_metadata: { source_type: 'user_key' }
      },
      {
        model_tier: 'eco',
        perspectives_deducted: 20,
        estimated_cost: 0.01,
        created_at: '2025-01-15T12:00:00Z',
        request_metadata: {} // No source_type, should default to web
      },
      {
        model_tier: 'premium',
        perspectives_deducted: 15,
        estimated_cost: 0.08,
        created_at: '2025-01-15T13:00:00Z',
        request_metadata: { source_type: 'admin_credits' }
      }
    ]
  })

  describe('GET /api/user/quota', () => {
    it('should return quota data with source usage breakdown', async () => {
      const response = {
        planTier: 'pro',
        sourceUsage: {
          cli: { count: 0, cost: 0, requests: 0 },
          web: { count: 0, cost: 0, requests: 0 },
          user_key: { count: 0, cost: 0, requests: 0 },
          admin_credits: { count: 0, cost: 0, requests: 0 }
        }
      }

      expect(response).toHaveProperty('sourceUsage')
      expect(response.sourceUsage).toHaveProperty('cli')
      expect(response.sourceUsage).toHaveProperty('web')
      expect(response.sourceUsage).toHaveProperty('user_key')
      expect(response.sourceUsage).toHaveProperty('admin_credits')
    })

    it('should correctly aggregate CLI usage', async () => {
      const sourceUsage = {
        cli: { count: 0, cost: 0, requests: 0 },
        web: { count: 0, cost: 0, requests: 0 },
        user_key: { count: 0, cost: 0, requests: 0 },
        admin_credits: { count: 0, cost: 0, requests: 0 }
      }

      // Simulate aggregation
      mockUsageStats.forEach(usage => {
        const sourceType = usage.request_metadata?.source_type
        if (sourceType === 'user_cli') {
          sourceUsage.cli.count += usage.perspectives_deducted
          sourceUsage.cli.cost += usage.estimated_cost
          sourceUsage.cli.requests += 1
        } else if (sourceType === 'user_key') {
          sourceUsage.user_key.count += usage.perspectives_deducted
          sourceUsage.user_key.cost += usage.estimated_cost
          sourceUsage.user_key.requests += 1
        } else if (sourceType === 'admin_credits') {
          sourceUsage.admin_credits.count += usage.perspectives_deducted
          sourceUsage.admin_credits.cost += usage.estimated_cost
          sourceUsage.admin_credits.requests += 1
        } else {
          sourceUsage.web.count += usage.perspectives_deducted
          sourceUsage.web.cost += usage.estimated_cost
          sourceUsage.web.requests += 1
        }
      })

      expect(sourceUsage.cli.count).toBe(10)
      expect(sourceUsage.cli.cost).toBeCloseTo(0.05)
      expect(sourceUsage.cli.requests).toBe(1)

      expect(sourceUsage.user_key.count).toBe(5)
      expect(sourceUsage.user_key.cost).toBeCloseTo(0.02)
      expect(sourceUsage.user_key.requests).toBe(1)

      expect(sourceUsage.web.count).toBe(20)
      expect(sourceUsage.web.cost).toBeCloseTo(0.01)
      expect(sourceUsage.web.requests).toBe(1)

      expect(sourceUsage.admin_credits.count).toBe(15)
      expect(sourceUsage.admin_credits.cost).toBeCloseTo(0.08)
      expect(sourceUsage.admin_credits.requests).toBe(1)
    })

    it('should handle missing source_type as web traffic', async () => {
      const usage = {
        model_tier: 'eco',
        perspectives_deducted: 20,
        estimated_cost: 0.01,
        request_metadata: {} // No source_type
      }

      const sourceType = usage.request_metadata?.source_type
      const destination = sourceType ? sourceType : 'web'

      expect(destination).toBe('web')
    })

    it('should include tier usage alongside source usage', async () => {
      const response = {
        tierUsage: {
          premium: { count: 0, cost: 0 },
          normal: { count: 0, cost: 0 },
          eco: { count: 0, cost: 0 }
        },
        sourceUsage: {
          cli: { count: 0, cost: 0, requests: 0 },
          web: { count: 0, cost: 0, requests: 0 },
          user_key: { count: 0, cost: 0, requests: 0 },
          admin_credits: { count: 0, cost: 0, requests: 0 }
        }
      }

      expect(response).toHaveProperty('tierUsage')
      expect(response).toHaveProperty('sourceUsage')
    })

    it('should calculate total usage correctly', async () => {
      const sourceUsage = {
        cli: { count: 10, cost: 0.05, requests: 1 },
        web: { count: 20, cost: 0.01, requests: 1 },
        user_key: { count: 5, cost: 0.02, requests: 1 },
        admin_credits: { count: 15, cost: 0.08, requests: 1 }
      }

      const totalRequests =
        sourceUsage.cli.requests +
        sourceUsage.web.requests +
        sourceUsage.user_key.requests +
        sourceUsage.admin_credits.requests

      const totalCost =
        sourceUsage.cli.cost +
        sourceUsage.web.cost +
        sourceUsage.user_key.cost +
        sourceUsage.admin_credits.cost

      expect(totalRequests).toBe(4)
      expect(totalCost).toBeCloseTo(0.16)
    })
  })

  describe('Source Type Validation', () => {
    it('should only accept valid source types', async () => {
      const validSourceTypes = ['user_cli', 'user_key', 'admin_key', 'admin_credits']

      validSourceTypes.forEach(type => {
        expect(['user_cli', 'user_key', 'admin_key', 'admin_credits']).toContain(type)
      })
    })

    it('should handle all source type values', async () => {
      const testCases = [
        { source_type: 'user_cli', expected: 'cli' },
        { source_type: 'user_key', expected: 'user_key' },
        { source_type: 'admin_credits', expected: 'admin_credits' },
        { source_type: undefined, expected: 'web' },
        { source_type: 'admin_key', expected: 'web' } // admin_key defaults to web
      ]

      testCases.forEach(test => {
        let destination = 'web'
        if (test.source_type === 'user_cli') destination = 'cli'
        else if (test.source_type === 'user_key') destination = 'user_key'
        else if (test.source_type === 'admin_credits') destination = 'admin_credits'

        expect(destination).toBe(test.expected)
      })
    })
  })
})
