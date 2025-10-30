'use client'

import { useState, useEffect } from 'react'
import { Shield, ShieldCheck, ShieldOff, Lock, Unlock, AlertCircle, ShieldAlert } from 'lucide-react'
import { isSessionUnlocked, onEncryptionLocked, hasEncryptionInitialized } from '@/lib/auth/encryption-auth'

export interface EncryptionStatusProps {
  /**
   * Display variant
   * - 'badge': Small badge with icon and text
   * - 'full': Full status card with details
   * - 'icon': Icon only
   */
  variant?: 'badge' | 'full' | 'icon'

  /**
   * Show detailed encryption info (key ID, timestamps, etc.)
   */
  showDetails?: boolean

  /**
   * Custom className for styling
   */
  className?: string
}

/**
 * EncryptionStatus Component
 *
 * Displays the current encryption status to the user.
 * Updates automatically when encryption is locked/unlocked.
 *
 * Usage:
 * ```tsx
 * // Badge variant (for nav bar)
 * <EncryptionStatus variant="badge" />
 *
 * // Full card variant (for dashboard/settings)
 * <EncryptionStatus variant="full" showDetails />
 *
 * // Icon only (for compact UI)
 * <EncryptionStatus variant="icon" />
 * ```
 */
export function EncryptionStatus({
  variant = 'badge',
  showDetails = false,
  className = '',
}: EncryptionStatusProps) {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [hasInit, setHasInit] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)

    // Initial status check
    const checkStatus = async () => {
      const initialized = await hasEncryptionInitialized()
      setHasInit(initialized)

      if (initialized) {
        setIsUnlocked(isSessionUnlocked())
      }
    }

    checkStatus()

    // Listen for lock events
    const cleanup = onEncryptionLocked(() => {
      setIsUnlocked(false)
    })

    // Poll status periodically (in case unlock happens in another tab)
    const interval = setInterval(checkStatus, 3000)

    return () => {
      cleanup()
      clearInterval(interval)
    }
  }, [])

  // Don't render on server (encryption is client-side)
  if (!isMounted) {
    return null
  }

  // Don't show status for users who haven't initialized encryption
  // This prevents existing users from seeing "Locked" badge
  if (!hasInit) {
    return null
  }

  // Icon only variant
  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center ${className}`}>
        {isUnlocked ? (
          <ShieldCheck className="h-5 w-5 text-green-600" title="Encryption Active" />
        ) : (
          <ShieldOff className="h-5 w-5 text-amber-600" title="Encryption Locked" />
        )}
      </div>
    )
  }

  // Badge variant
  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
        isUnlocked
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-amber-50 text-amber-700 border border-amber-200'
      } ${className}`}>
        {isUnlocked ? (
          <>
            <ShieldCheck className="h-4 w-4" />
            <span>Encrypted</span>
          </>
        ) : (
          <>
            <ShieldOff className="h-4 w-4" />
            <span>Locked</span>
          </>
        )}
      </div>
    )
  }

  // Full card variant
  return (
    <div className={`bg-white rounded-lg border p-4 ${
      isUnlocked ? 'border-green-200' : 'border-amber-200'
    } ${className}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${
          isUnlocked ? 'bg-green-100' : 'bg-amber-100'
        }`}>
          {isUnlocked ? (
            <ShieldCheck className="h-6 w-6 text-green-700" />
          ) : (
            <ShieldOff className="h-6 w-6 text-amber-700" />
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900">
              {isUnlocked ? 'Encryption Active' : 'Encryption Locked'}
            </h3>
            {isUnlocked ? (
              <Unlock className="h-4 w-4 text-green-600" />
            ) : (
              <Lock className="h-4 w-4 text-amber-600" />
            )}
          </div>

          <p className="text-sm text-slate-600 mt-1">
            {isUnlocked
              ? 'Your data is being encrypted before syncing to the server.'
              : 'Session locked due to inactivity. Unlock to access encrypted data.'}
          </p>

          {showDetails && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <dt className="text-slate-500">Algorithm:</dt>
                <dd className="text-slate-900 font-medium">AES-256-GCM</dd>

                <dt className="text-slate-500">Mode:</dt>
                <dd className="text-slate-900 font-medium">Zero-Knowledge</dd>

                <dt className="text-slate-500">Storage:</dt>
                <dd className="text-slate-900 font-medium">IndexedDB (Local)</dd>

                <dt className="text-slate-500">Auto-lock:</dt>
                <dd className="text-slate-900 font-medium">15 minutes idle</dd>
              </dl>
            </div>
          )}
        </div>
      </div>

      {!isUnlocked && (
        <div className="mt-3 flex items-start gap-2 p-2 bg-amber-50 rounded text-xs text-amber-800 border border-amber-200">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>
            Unlock your session to decrypt and view your encrypted conversations and data.
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * EncryptionIndicator Component
 *
 * Small inline indicator showing encryption status.
 * Useful for showing encrypted content status.
 *
 * Usage:
 * ```tsx
 * <div className="message">
 *   <EncryptionIndicator /> This message is encrypted
 * </div>
 * ```
 */
export function EncryptionIndicator({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs text-slate-500 ${className}`}
      title="End-to-end encrypted"
    >
      <Shield className="h-3 w-3" />
      <span>E2EE</span>
    </span>
  )
}
