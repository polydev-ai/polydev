'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FeatureGate } from '@/components/FeatureGate'

function ChatContent() {
  const router = useRouter()

  useEffect(() => {
    // Always redirect to new chat - let the chat page handle session creation
    router.push('/chat/new')
  }, [router])

  // Show loading while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-4"></div>
        <p className="text-slate-600">Starting new chat...</p>
      </div>
    </div>
  )
}

export default function ChatIndex() {
  return (
    <FeatureGate feature="chat">
      <ChatContent />
    </FeatureGate>
  )
}