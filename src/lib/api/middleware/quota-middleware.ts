/**
 * Quota Middleware for Perspective-Based System
 * Handles quota checking and deduction in API requests
 */

import { NextRequest, NextResponse } from 'next/server'
import { quotaManager } from '@/lib/quota-manager'
import { getModelTier } from '@/lib/model-tiers'

export interface QuotaCheckResult {
  allowed: boolean
  response?: NextResponse
  quotaStatus?: any
}

/**
 * Check quota availability before processing request
 */
export async function checkQuotaMiddleware(
  request: NextRequest,
  userId: string,
  modelName: string
): Promise<QuotaCheckResult> {
  try {
    // Check if user can make request with given model
    const quotaStatus = await quotaManager.checkQuotaAvailability(userId, modelName)

    if (!quotaStatus.allowed) {
      const errorResponse = {
        error: {
          message: quotaStatus.reason || 'Quota limit exceeded',
          type: 'quota_exceeded',
          code: 'QUOTA_EXCEEDED'
        },
        quota_status: {
          plan_tier: quotaStatus.planTier,
          quota_remaining: quotaStatus.quotaRemaining,
          current_usage: quotaStatus.currentUsage
        }
      }

      return {
        allowed: false,
        response: NextResponse.json(errorResponse, { status: 429 })
      }
    }

    return {
      allowed: true,
      quotaStatus
    }
  } catch (error) {
    console.error('Quota check middleware error:', error)

    return {
      allowed: false,
      response: NextResponse.json({
        error: {
          message: 'Internal quota check error',
          type: 'internal_error',
          code: 'QUOTA_CHECK_FAILED'
        }
      }, { status: 500 })
    }
  }
}

/**
 * Deduct quota after successful API response
 */
export async function deductQuotaMiddleware(
  userId: string,
  modelName: string,
  sessionId: string,
  usage: {
    inputTokens: number
    outputTokens: number
  },
  estimatedCost?: number,
  requestMetadata?: any,
  responseMetadata?: any,
  providerSourceId?: string,
  sourceType?: 'user_key' | 'user_cli' | 'admin_key' | 'admin_credits'
): Promise<void> {
  try {
    await quotaManager.deductQuota({
      userId,
      modelName,
      sessionId,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      estimatedCost: estimatedCost || 0,
      requestMetadata,
      responseMetadata,
      providerSourceId,
      sourceType
    })
  } catch (error) {
    console.error('Quota deduction middleware error:', error)
    // Don't throw here as we don't want to break the response flow
    // Log for monitoring and alerting
  }
}

/**
 * Generate session ID for tracking
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Extract usage data from API response
 */
export function extractUsageFromResponse(response: any): { inputTokens: number, outputTokens: number } {
  // Try different usage data formats
  if (response?.usage) {
    return {
      inputTokens: response.usage.prompt_tokens || response.usage.input_tokens || 0,
      outputTokens: response.usage.completion_tokens || response.usage.output_tokens || 0
    }
  }

  // Fallback estimation based on content length if no usage data
  if (response?.choices?.[0]?.message?.content) {
    const contentLength = response.choices[0].message.content.length
    const estimatedOutputTokens = Math.ceil(contentLength / 4) // rough estimation: 4 chars per token
    return {
      inputTokens: 0, // We'll need to estimate this from request
      outputTokens: estimatedOutputTokens
    }
  }

  return { inputTokens: 0, outputTokens: 0 }
}

/**
 * Calculate estimated cost based on model and usage
 */
export function calculateEstimatedCost(
  modelName: string,
  inputTokens: number,
  outputTokens: number
): number {
  const modelInfo = getModelTier(modelName)
  if (!modelInfo) return 0

  const inputCost = (inputTokens / 1000) * modelInfo.costPer1k.input
  const outputCost = (outputTokens / 1000) * modelInfo.costPer1k.output

  return inputCost + outputCost
}