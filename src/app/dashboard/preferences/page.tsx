'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Preferences page now redirects to Settings
 * All preference settings have been consolidated into /settings
 */
export default function PreferencesPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/settings')
  }, [router])

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-4"></div>
        <p className="text-slate-600">Redirecting to Settings...</p>
      </div>
    </div>
  )
}
