import { useState, useEffect } from 'react'
import {
  encryptMessageContent,
  decryptMessageContent,
  dbRowToEncryptedData,
  isEncryptionUnlocked,
  type EncryptionMetadata
} from '@/lib/crypto'

export interface ChatSession {
  id: string
  title: string
  created_at: string
  updated_at: string
  archived: boolean
  message_count?: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string  // Decrypted content (for display)
  encrypted_content?: string  // Server-side encrypted blob
  encryption_metadata?: EncryptionMetadata
  model_id?: string
  provider_info?: any
  usage_info?: any
  cost_info?: any
  metadata?: any
  created_at: string
}

export interface ChatSessionWithMessages extends ChatSession {
  chat_messages: ChatMessage[]
}

export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/chat/sessions', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.status}`)
      }
      
      const data = await response.json()
      setSessions(data.sessions || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching chat sessions:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions')
    } finally {
      setLoading(false)
    }
  }

  const createSession = async (title?: string): Promise<ChatSession | null> => {
    try {
      const response = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ title: title || 'New Chat' })
      })
      
      if (!response.ok) {
        throw new Error('Failed to create session')
      }
      
      const data = await response.json()
      const newSession = data.session
      
      // Add to sessions list
      setSessions(prev => [newSession, ...prev])
      
      return newSession
    } catch (err) {
      console.error('Error creating session:', err)
      setError(err instanceof Error ? err.message : 'Failed to create session')
      return null
    }
  }

  const deleteSession = async (sessionId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete session')
      }
      
      // Remove from sessions list
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      
      return true
    } catch (err) {
      console.error('Error deleting session:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete session')
      return false
    }
  }

  const updateSession = async (sessionId: string, updates: Partial<ChatSession>): Promise<boolean> => {
    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(updates)
      })
      
      if (!response.ok) {
        throw new Error('Failed to update session')
      }
      
      const data = await response.json()
      const updatedSession = data.session
      
      // Update in sessions list
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, ...updatedSession } : s
      ))
      
      return true
    } catch (err) {
      console.error('Error updating session:', err)
      setError(err instanceof Error ? err.message : 'Failed to update session')
      return false
    }
  }

  const getSessionWithMessages = async (sessionId: string): Promise<ChatSessionWithMessages | null> => {
    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch session')
      }

      const data = await response.json()
      const session = data.session

      // Decrypt messages if encryption is unlocked
      if (session.chat_messages && isEncryptionUnlocked()) {
        const decryptedMessages = await Promise.all(
          session.chat_messages.map(async (msg: ChatMessage) => {
            // If message has encrypted_content, decrypt it
            if (msg.encrypted_content && msg.encryption_metadata) {
              try {
                const encryptedData = dbRowToEncryptedData({
                  encrypted_content: msg.encrypted_content,
                  encryption_metadata: msg.encryption_metadata
                })

                if (encryptedData) {
                  const decryptedContent = await decryptMessageContent(encryptedData)
                  return { ...msg, content: decryptedContent }
                }
              } catch (err) {
                console.error('Failed to decrypt message:', msg.id, err)
                // Fall back to legacy content or placeholder
                return { ...msg, content: msg.content || '[Encrypted message - unlock to view]' }
              }
            }

            // Message is not encrypted (legacy plaintext)
            return msg
          })
        )

        session.chat_messages = decryptedMessages
      }

      return session
    } catch (err) {
      console.error('Error fetching session with messages:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch session')
      return null
    }
  }

  const sendMessage = async (
    sessionId: string,
    content: string,
    role: 'user' | 'assistant' | 'system' = 'user',
    additionalData?: {
      model_id?: string
      provider_info?: any
      usage_info?: any
      cost_info?: any
      metadata?: any
    }
  ): Promise<ChatMessage | null> => {
    try {
      let encryptedContent: string | undefined
      let encryptionMetadata: EncryptionMetadata | undefined

      // Encrypt content if encryption is unlocked
      if (isEncryptionUnlocked()) {
        try {
          const encrypted = await encryptMessageContent(content)
          encryptedContent = encrypted.ciphertext
          encryptionMetadata = encrypted.metadata
        } catch (err) {
          console.error('Encryption failed, falling back to plaintext:', err)
          // Continue with plaintext if encryption fails
        }
      }

      // Send to API
      const response = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          role,
          content: encryptedContent ? undefined : content,  // Only send plaintext if no encryption
          encryptedContent,
          encryptionMetadata,
          ...additionalData
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()
      const message = data.message

      // Return message with decrypted content for display
      return {
        ...message,
        content: content  // Use original content for display
      }
    } catch (err) {
      console.error('Error sending message:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message')
      return null
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  return {
    sessions,
    loading,
    error,
    refetchSessions: fetchSessions,
    createSession,
    deleteSession,
    updateSession,
    getSessionWithMessages,
    sendMessage
  }
}