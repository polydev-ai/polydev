'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { loginWithEncryption, isSessionUnlocked } from '@/lib/auth/encryption-auth'

export default function UnlockScreen() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [error, setError] = useState('')
  const [returnUrl, setReturnUrl] = useState('/dashboard')

  useEffect(() => {
    // Check if already unlocked
    if (isSessionUnlocked()) {
      const url = new URLSearchParams(window.location.search).get('returnUrl') || '/dashboard'
      router.push(url)
      return
    }

    // Get return URL from query params
    const params = new URLSearchParams(window.location.search)
    const url = params.get('returnUrl')
    if (url) {
      setReturnUrl(url)
    }
  }, [router])

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!password) {
      setError('Please enter your password')
      return
    }

    setIsUnlocking(true)
    setError('')

    try {
      const success = await loginWithEncryption(password)

      if (success) {
        // Successfully unlocked
        console.log('[Unlock] Encryption unlocked successfully')

        // Clear password from memory
        setPassword('')

        // Redirect to return URL
        router.push(returnUrl)
      } else {
        setError('Incorrect password. Please try again.')
        setPassword('')
      }
    } catch (err) {
      console.error('[Unlock] Unlock error:', err)
      setError('Failed to unlock encryption. Please try again.')
      setPassword('')
    } finally {
      setIsUnlocking(false)
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    if (error) {
      setError('')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Lock Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-slate-900 rounded-full blur-xl opacity-20"></div>
            <div className="relative bg-white rounded-full p-6 shadow-lg">
              <Lock className="h-12 w-12 text-slate-900" />
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Encryption Locked
            </h1>
            <p className="text-slate-600 text-sm">
              Your session was locked due to inactivity. Enter your password to unlock.
            </p>
          </div>

          {/* Security Badge */}
          <div className="flex items-center justify-center gap-2 mb-6 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <Shield className="h-4 w-4 text-slate-700" />
            <span className="text-xs text-slate-700 font-medium">
              Zero-knowledge encryption protects your data
            </span>
          </div>

          {/* Unlock Form */}
          <form onSubmit={handleUnlock} className="space-y-4">
            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Master Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Enter your password"
                  className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-colors ${
                    error
                      ? 'border-red-300 bg-red-50'
                      : 'border-slate-300 bg-white'
                  }`}
                  autoFocus
                  disabled={isUnlocking}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-2 mt-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Unlock Button */}
            <button
              type="submit"
              disabled={isUnlocking || !password}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
                isUnlocking || !password
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg'
              }`}
            >
              {isUnlocking ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Unlocking...
                </span>
              ) : (
                'Unlock Encryption'
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              Forgot your password? Contact support or reset your account.
              <br />
              <span className="text-red-500 font-medium">Warning: Resetting will delete all encrypted data.</span>
            </p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            Your data is encrypted with AES-256-GCM.
            <br />
            We never store your password or encryption keys.
          </p>
        </div>
      </div>
    </div>
  )
}
