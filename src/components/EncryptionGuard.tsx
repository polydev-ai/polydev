'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { onEncryptionLocked, initializeEncryptionAuth } from '@/lib/auth/encryption-auth'

/**
 * EncryptionGuard Component
 *
 * Monitors encryption session and redirects to unlock screen when locked.
 * Add this component to your root layout to enable auto-lock functionality.
 *
 * Features:
 * - Listens for encryption:locked events (idle timeout, manual lock)
 * - Automatically redirects to /unlock with return URL
 * - Initializes encryption auth system on mount
 *
 * Usage:
 * ```tsx
 * // In app/layout.tsx
 * import { EncryptionGuard } from '@/components/EncryptionGuard'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <EncryptionGuard />
 *         {children}
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 */
export function EncryptionGuard() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Initialize encryption auth system
    initializeEncryptionAuth()

    // Listen for encryption lock events
    const cleanup = onEncryptionLocked((event) => {
      console.log('[EncryptionGuard] Encryption locked:', event.reason)

      // Don't redirect if already on unlock page
      if (pathname === '/unlock') {
        return
      }

      // Redirect to unlock screen with return URL
      const returnUrl = encodeURIComponent(pathname || '/dashboard')
      router.push(`/unlock?returnUrl=${returnUrl}`)
    })

    return () => {
      cleanup()
    }
  }, [pathname, router])

  // This component doesn't render anything
  return null
}

/**
 * useEncryptionLock Hook
 *
 * React hook for manual encryption lock functionality.
 * Use this in your UI to add a "Lock" button.
 *
 * Usage:
 * ```tsx
 * import { useEncryptionLock } from '@/components/EncryptionGuard'
 *
 * function SecuritySettings() {
 *   const { lockEncryption, isLocked } = useEncryptionLock()
 *
 *   return (
 *     <button onClick={lockEncryption}>
 *       Lock Encryption
 *     </button>
 *   )
 * }
 * ```
 */
export function useEncryptionLock() {
  const router = useRouter()
  const pathname = usePathname()

  const lockEncryption = () => {
    // Trigger manual lock event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('encryption:locked', {
        detail: { reason: 'manual' }
      }))
    }

    // Redirect to unlock screen
    const returnUrl = encodeURIComponent(pathname || '/dashboard')
    router.push(`/unlock?returnUrl=${returnUrl}`)
  }

  return {
    lockEncryption,
  }
}
