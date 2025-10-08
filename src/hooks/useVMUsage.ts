import { useState, useEffect, useCallback } from 'react';

interface UsageByProvider {
  [provider: string]: {
    count: number;
    tokens: number;
    avgResponseTime: number;
  };
}

interface PromptHistory {
  created_at: string;
  provider: string;
  tokens_used: number;
  response_time_ms: number;
}

interface UsageData {
  subscription: {
    plan: string;
    billingCycleStart: string;
    daysRemaining: number;
  };
  usage: {
    monthlyPrompts: number;
    monthlyPromptsLimit: number;
    totalPrompts: number;
    totalTokens: number;
    byProvider: UsageByProvider;
  };
  limits: {
    prompts: number;
    tokens: number;
  };
  recentPrompts: PromptHistory[];
}

export function useVMUsage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vm/usage');

      if (!response.ok) {
        throw new Error('Failed to fetch usage data');
      }

      const data = await response.json();
      setData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  // Calculate percentage used
  const getUsagePercentage = useCallback(() => {
    if (!data) return 0;
    return Math.round(
      (data.usage.monthlyPrompts / data.usage.monthlyPromptsLimit) * 100
    );
  }, [data]);

  // Check if user is approaching limit
  const isApproachingLimit = useCallback(() => {
    return getUsagePercentage() >= 80;
  }, [getUsagePercentage]);

  // Check if user has exceeded limit
  const hasExceededLimit = useCallback(() => {
    return getUsagePercentage() >= 100;
  }, [getUsagePercentage]);

  return {
    data,
    loading,
    error,
    refreshUsage: fetchUsage,
    getUsagePercentage,
    isApproachingLimit,
    hasExceededLimit
  };
}
