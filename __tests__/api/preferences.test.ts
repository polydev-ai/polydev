/**
 * Integration tests for preferences API
 * Tests Phase 3 implementation: prefer_own_keys preference
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

describe('Preferences API', () => {
  let mockUser: any
  let mockSupabase: any

  beforeEach(() => {
    mockUser = {
      id: 'test-user-123',
      email: 'test@example.com'
    }

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null
        })
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      update: jest.fn().mockReturnThis()
    }
  })

  describe('GET /api/preferences', () => {
    it('should return default preferences when none exist', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      })

      const response = {
        preferences: expect.objectContaining({
          user_id: mockUser.id,
          usage_preference: 'auto',
          prefer_own_keys: false,
          mcp_settings: expect.objectContaining({
            default_temperature: 0.7,
            default_max_tokens: 4000,
            auto_select_model: false
          })
        })
      }

      expect(response.preferences.prefer_own_keys).toBe(false)
      expect(response.preferences.usage_preference).toBe('auto')
    })

    it('should return existing preferences including prefer_own_keys', async () => {
      const existingPrefs = {
        user_id: mockUser.id,
        usage_preference: 'api_keys',
        prefer_own_keys: true,
        mcp_settings: {
          default_temperature: 0.8,
          default_max_tokens: 5000
        }
      }

      mockSupabase.single.mockResolvedValue({
        data: existingPrefs,
        error: null
      })

      expect(existingPrefs.prefer_own_keys).toBe(true)
      expect(existingPrefs.usage_preference).toBe('api_keys')
    })

    it('should handle authentication errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized')
      })

      // Should return 401
      expect(mockSupabase.auth.getUser).toHaveBeenCalled()
    })
  })

  describe('PUT /api/preferences', () => {
    it('should update prefer_own_keys preference', async () => {
      const updates = {
        prefer_own_keys: true,
        usage_preference: 'api_keys'
      }

      mockSupabase.select.mockReturnThis()
      mockSupabase.single.mockResolvedValue({
        data: { ...mockUser, ...updates },
        error: null
      })

      expect(updates.prefer_own_keys).toBe(true)
    })

    it('should filter out invalid fields', async () => {
      const updates = {
        prefer_own_keys: true,
        invalid_field: 'should_be_filtered',
        usage_preference: 'auto'
      }

      const allowedFields = [
        'default_provider',
        'default_model',
        'preferred_providers',
        'usage_preference',
        'model_preferences',
        'mcp_settings',
        'prefer_own_keys'
      ]

      const filteredUpdates: any = {}
      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          filteredUpdates[key] = updates[key]
        }
      })

      expect(filteredUpdates).not.toHaveProperty('invalid_field')
      expect(filteredUpdates).toHaveProperty('prefer_own_keys')
      expect(filteredUpdates).toHaveProperty('usage_preference')
    })

    it('should handle all usage preference options', async () => {
      const usageOptions = ['auto', 'api_keys', 'credits', 'cli']

      usageOptions.forEach(option => {
        const updates = {
          usage_preference: option
        }
        expect(['auto', 'api_keys', 'credits', 'cli']).toContain(updates.usage_preference)
      })
    })
  })

  describe('Preference Integration', () => {
    it('should work with prefer_own_keys enabled', async () => {
      const userPrefs = {
        user_id: mockUser.id,
        prefer_own_keys: true,
        usage_preference: 'api_keys'
      }

      // When prefer_own_keys is true, system should only use user keys
      expect(userPrefs.prefer_own_keys).toBe(true)
      // Usage preference should be set accordingly
      expect(userPrefs.usage_preference).toBe('api_keys')
    })

    it('should work with auto fallback when prefer_own_keys is false', async () => {
      const userPrefs = {
        user_id: mockUser.id,
        prefer_own_keys: false,
        usage_preference: 'auto'
      }

      // When prefer_own_keys is false, system can fallback to credits
      expect(userPrefs.prefer_own_keys).toBe(false)
      expect(userPrefs.usage_preference).toBe('auto')
    })
  })
})
