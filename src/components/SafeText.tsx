import React from 'react'

interface SafeTextProps {
  value: unknown
  fallback?: React.ReactNode
}

export function SafeText({ value, fallback = null }: SafeTextProps) {
  if (value == null || value === false) return <>{fallback}</>

  const t = typeof value
  if (t === 'string' || t === 'number' || t === 'bigint') {
    return <>{String(value)}</>
  }

  if (Array.isArray(value)) {
    return <>{value.map((item, index) => <SafeText key={index} value={item} />)}</>
  }

  // Objects/functions/symbols are not valid children: stringify for debugging
  try {
    return <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-w-full">{JSON.stringify(value, null, 2)}</pre>
  } catch {
    return <>{fallback}</>
  }
}

export function renderSafely(value: unknown): React.ReactNode {
  if (value == null || value === false) return null
  const t = typeof value
  if (t === 'string' || t === 'number' || t === 'bigint') return String(value)
  if (Array.isArray(value)) return value.map((item, index) => renderSafely(item))

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return null
  }
}