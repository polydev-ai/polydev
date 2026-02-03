'use client'

import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'
import { FEATURES } from '@/lib/feature-flags'

type FeatureKey = keyof typeof FEATURES

interface FeatureGateProps {
  feature: FeatureKey
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Component that gates content behind a feature flag.
 * If the feature is disabled, redirects to the Coming Soon page.
 */
export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const router = useRouter()
  const isEnabled = FEATURES[feature]

  useEffect(() => {
    if (!isEnabled && !fallback) {
      router.replace(`/coming-soon?feature=${feature}`)
    }
  }, [isEnabled, feature, router, fallback])

  if (!isEnabled) {
    if (fallback) {
      return <>{fallback}</>
    }
    // Show loading state while redirecting
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Redirecting...</div>
      </div>
    )
  }

  return <>{children}</>
}

/**
 * Hook to check if a feature is enabled
 */
export function useFeatureFlag(feature: FeatureKey): boolean {
  return FEATURES[feature]
}

/**
 * Higher-order component for feature gating
 */
export function withFeatureGate<P extends object>(
  Component: React.ComponentType<P>,
  feature: FeatureKey
) {
  return function FeatureGatedComponent(props: P) {
    return (
      <FeatureGate feature={feature}>
        <Component {...props} />
      </FeatureGate>
    )
  }
}
