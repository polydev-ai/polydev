'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff, ExternalLink } from 'lucide-react'

interface ApiKeyFieldProps {
  provider: string
  providerName: string
  value: string
  onChange: (value: string) => void
  signupUrl?: string
  placeholder?: string
  helpText?: string
}

export function ApiKeyField({
  provider,
  providerName,
  value,
  onChange,
  signupUrl,
  placeholder,
  helpText
}: ApiKeyFieldProps) {
  const [localValue, setLocalValue] = useState(value)
  const [showKey, setShowKey] = useState(false)
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null)

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Debounced onChange
  useEffect(() => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
    }

    const timeout = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue)
      }
    }, 500)

    setDebounceTimeout(timeout)

    return () => {
      if (timeout) {
        clearTimeout(timeout)
      }
    }
  }, [localValue, onChange, value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-700">
          {providerName} API Key
        </label>
        {signupUrl && (
          <a
            href={signupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate-900 hover:text-slate-700 flex items-center gap-1"
          >
            Get API Key
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <div className="relative">
        <input
          type={showKey ? 'text' : 'password'}
          value={localValue}
          onChange={handleInputChange}
          placeholder={placeholder || `Enter your ${providerName} API key...`}
          className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors"
        />

        <button
          type="button"
          onClick={() => setShowKey(!showKey)}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
        >
          {showKey ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>

      {helpText && (
        <p className="text-xs text-slate-500">
          {helpText}
        </p>
      )}

      {localValue && (
        <div className="text-xs text-slate-900">
          ✓ API key configured
        </div>
      )}
    </div>
  )
}