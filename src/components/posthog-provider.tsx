'use client'

import { Suspense, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { initPostHog, analytics } from '@/lib/posthog'

function PostHogPageView() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname) {
      analytics.pageView()
    }
  }, [pathname])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog()
  }, [])

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </>
  )
}