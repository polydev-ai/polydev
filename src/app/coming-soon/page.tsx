'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import PolydevLogo from '@/components/PolydevLogo'

function ComingSoonContent() {
  const searchParams = useSearchParams()
  const feature = searchParams.get('feature') || 'This feature'

  const featureNames: Record<string, string> = {
    chat: 'Multi-Model Chat',
    credits: 'Credits System',
    subscription: 'Subscription Management',
    referrals: 'Referral Program',
    vm: 'Browser VM',
    admin: 'Admin Panel',
    'remote-cli': 'Remote CLI',
  }

  const displayName = featureNames[feature] || feature

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <PolydevLogo size={120} className="text-slate-900" />
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          Coming Soon
        </h1>

        {/* Feature Name */}
        <div className="inline-block px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg mb-6">
          <span className="text-slate-600 text-sm font-medium">{displayName}</span>
        </div>

        {/* Description */}
        <p className="text-slate-600 mb-8 leading-relaxed">
          This feature is available on the hosted version of Polydev.
          Self-hosted users can enable it by setting the appropriate feature flag.
        </p>

        {/* Divider */}
        <div className="w-16 h-px bg-slate-300 mx-auto mb-8"></div>

        {/* Options */}
        <div className="space-y-4">
          <Link
            href="/dashboard"
            className="block w-full px-6 py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
          >
            Back to Dashboard
          </Link>

          <a
            href="https://polydev.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full px-6 py-3 bg-white text-slate-900 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 transition-colors"
          >
            Try Hosted Version
          </a>
        </div>

        {/* Footer */}
        <p className="mt-12 text-slate-400 text-sm">
          Multi-model perspectives for your coding agents
        </p>
      </div>
    </div>
  )
}

export default function ComingSoonPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    }>
      <ComingSoonContent />
    </Suspense>
  )
}
