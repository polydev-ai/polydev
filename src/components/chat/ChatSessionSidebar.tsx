'use client'

import { useRouter } from 'next/navigation'
import { memo } from 'react'

interface ChatSession {
  id: string
  title: string
  updated_at: string
}

interface ChatSessionSidebarProps {
  showSidebar: boolean
  setShowSidebar: (show: boolean) => void
  isCreatingSession: boolean
  startNewSession: () => void
  sessionsError: string | null
  sessions: ChatSession[]
  currentSession: ChatSession | null
  sessionId: string
  deleteSession: (id: string) => Promise<boolean>
  setCurrentSession: (session: ChatSession | null) => void
  setMessages: (messages: any[]) => void
}

function ChatSessionSidebarComponent({
  showSidebar,
  setShowSidebar,
  isCreatingSession,
  startNewSession,
  sessionsError,
  sessions,
  currentSession,
  sessionId,
  deleteSession,
  setCurrentSession,
  setMessages
}: ChatSessionSidebarProps) {
  const router = useRouter()

  return (
    <div className={`${showSidebar ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden bg-slate-50 border-r border-slate-200`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Chat History</h2>
          <button
            type="button"
            onClick={() => setShowSidebar(false)}
            className="p-1 text-slate-600 hover:text-slate-900 pointer-events-auto z-10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            console.log('[New Chat] Button clicked, isCreatingSession:', isCreatingSession)
            startNewSession()
          }}
          disabled={isCreatingSession}
          className="w-full mb-4 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transform pointer-events-auto z-10"
        >
          {isCreatingSession ? 'Creating...' : 'New Chat'}
        </button>

        {sessionsError && (
          <div className="mb-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900">
            Failed to load sessions: {sessionsError}
          </div>
        )}

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {sessions.map((session) => (
            <div key={session.id} className={`group flex items-center justify-between p-2 rounded-lg transition-colors ${
              currentSession?.id === session.id
                ? 'bg-slate-100 text-slate-900 border border-slate-200'
                : 'bg-white hover:bg-slate-50 text-slate-900'
            }`}>
              <button
                type="button"
                onClick={() => {
                  console.log('[Chat Navigation] Clicked session:', session.id, 'Current session:', sessionId)
                  // Only navigate if not already on this session
                  if (session.id !== sessionId) {
                    console.log('[Chat Navigation] Navigating to:', `/chat/${session.id}`)
                    router.push(`/chat/${session.id}`)
                    // Force page refresh to re-render with new session
                    setTimeout(() => router.refresh(), 100)
                  } else {
                    console.log('[Chat Navigation] Already on this session, skipping navigation')
                  }
                }}
                className="flex-1 text-left pointer-events-auto z-10"
              >
                <div className="text-sm font-medium truncate">{session.title}</div>
                <div className="text-xs text-slate-600 mt-1">
                  {new Date(session.updated_at).toLocaleDateString()}
                </div>
              </button>
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation()
                  if (!confirm('Delete this conversation?')) return
                  const ok = await deleteSession(session.id)
                  if (ok) {
                    if (currentSession?.id === session.id) {
                      setCurrentSession(null)
                      setMessages([])
                      router.push('/chat/new')
                    }
                  }
                }}
                title="Delete conversation"
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-slate-900 transition-opacity pointer-events-auto z-10"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m-1 0v12a2 2 0 01-2 2h-4a2 2 0 01-2-2V7h8z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default memo(ChatSessionSidebarComponent)
