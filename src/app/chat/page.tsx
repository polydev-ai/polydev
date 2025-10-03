'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ChatIndex() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const redirectToSession = async () => {
      try {
        // Fetch sessions to check if user has any existing sessions
        const response = await fetch('/api/chat/sessions', {
          credentials: 'include'
        })

        if (response.ok) {
          const data = await response.json()
          const sessions = data.sessions || []

          // If user has sessions, redirect to the most recent one
          if (sessions.length > 0) {
            router.push(`/chat/${sessions[0].id}`)
          } else {
            // No sessions, create a new one
            router.push('/chat/new')
          }
        } else {
          // Fallback to new session on error
          router.push('/chat/new')
        }
      } catch (error) {
        // Fallback to new session on error
        router.push('/chat/new')
      } finally {
        setIsLoading(false)
      }
    }

    redirectToSession()
  }, [router])

  // Show loading while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">
          {isLoading ? 'Loading chat...' : 'Redirecting...'}
        </p>
      </div>
    </div>
  )
}