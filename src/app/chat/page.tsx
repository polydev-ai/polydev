'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useDashboardModels, type DashboardModel } from '../../hooks/useDashboardModels'
import { useChatSessions, type ChatSession, type ChatMessage } from '../../hooks/useChatSessions'

export default function Chat() {
  const { user, loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Authentication Required
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please sign in to access the multi-model chat interface.
          </p>
          <a
            href="/auth"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex">
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          <p>Chat interface will go here</p>
        </div>
      </div>
    </div>
  )
}