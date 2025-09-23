'use client'

import { useEffect } from 'react'

export default function ServiceWorkerMessageFilter() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    function isPingMessage(data: any): boolean {
      return data && typeof data === 'object' && 'test' in data && 'timestamp' in data
    }

    // Filter service worker messages (Vercel Speed Insights)
    if ('serviceWorker' in navigator) {
      const handleServiceWorkerMessage = (event: MessageEvent) => {
        if (isPingMessage(event.data)) {
          console.log('🔍 Filtered Vercel Speed Insights ping:', event.data)
          // Acknowledge the message to prevent retries
          if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({ received: true })
          }
          // Stop propagation to prevent React from trying to render it
          event.stopImmediatePropagation()
          return
        }
      }

      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)

      return () => {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage)
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    function isPingMessage(data: any): boolean {
      return data && typeof data === 'object' && 'test' in data && 'timestamp' in data
    }

    // Filter window messages
    const handleWindowMessage = (event: MessageEvent) => {
      // Only filter messages from same origin or Vercel
      if (event.origin &&
          event.origin !== window.location.origin &&
          !event.origin.includes('vercel.app') &&
          !event.origin.includes('vercel.com')) {
        return
      }

      if (isPingMessage(event.data)) {
        console.log('🔍 Filtered window ping message:', event.data, 'from:', event.origin)
        // Stop propagation to prevent React from trying to render it
        event.stopImmediatePropagation()
        return
      }
    }

    window.addEventListener('message', handleWindowMessage, true) // Use capture phase

    return () => {
      window.removeEventListener('message', handleWindowMessage, true)
    }
  }, [])

  return null
}