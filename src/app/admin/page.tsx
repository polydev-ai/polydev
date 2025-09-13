'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

export default function AdminPage() {
  const { user, loading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [backfillResult, setBackfillResult] = useState<any | null>(null)
  const [backfillLoading, setBackfillLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncStatus, setSyncStatus] = useState<any | null>(null)
  const [syncResult, setSyncResult] = useState<any | null>(null)

  const adminEmails = useMemo(() => new Set(['admin@polydev.ai', 'venkat@polydev.ai']), [])

  useEffect(() => {
    if (user && user.email) {
      setIsAdmin(adminEmails.has(user.email))
    }
  }, [user, adminEmails])

  useEffect(() => {
    if (isAdmin) fetchSyncStatus()
  }, [isAdmin])

  const runBackfill = async () => {
    setBackfillLoading(true)
    setBackfillResult(null)
    try {
      const resp = await fetch('/api/usage/backfill', { method: 'POST', credentials: 'include' })
      const data = await resp.json()
      setBackfillResult({ ok: resp.ok, data })
    } catch (e: any) {
      setBackfillResult({ ok: false, error: e?.message || String(e) })
    } finally {
      setBackfillLoading(false)
    }
  }

  const fetchSyncStatus = async () => {
    try {
      const resp = await fetch('/api/models-dev/sync', { method: 'GET', credentials: 'include' })
      const data = await resp.json()
      setSyncStatus({ ok: resp.ok, data })
    } catch (e: any) {
      setSyncStatus({ ok: false, error: e?.message || String(e) })
    }
  }

  const runModelsDevSync = async () => {
    setSyncLoading(true)
    setSyncResult(null)
    try {
      const resp = await fetch('/api/models-dev/sync', { method: 'POST', credentials: 'include' })
      const data = await resp.json()
      setSyncResult({ ok: resp.ok, data })
      await fetchSyncStatus()
    } catch (e: any) {
      setSyncResult({ ok: false, error: e?.message || String(e) })
    } finally {
      setSyncLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Unauthorized</h1>
          <p className="text-gray-600">You do not have access to this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Operations</h1>

        {/* Backfill card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900">Backfill usage_sessions</h2>
            <button
              disabled={backfillLoading}
              onClick={runBackfill}
              className={`px-4 py-2 rounded-md text-white ${backfillLoading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {backfillLoading ? 'Running…' : 'Run Backfill'}
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Normalizes session_type to 'api' | 'cli' | 'credits' and fills cost from metadata for historical rows.
          </p>
          {backfillResult && (
            <pre className={`text-sm p-3 rounded bg-gray-50 overflow-x-auto ${backfillResult.ok ? 'text-gray-800' : 'text-red-600'}`}>
              {JSON.stringify(backfillResult, null, 2)}
            </pre>
          )}
        </div>

        {/* models.dev sync card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900">Sync models.dev registry</h2>
            <button
              disabled={syncLoading}
              onClick={runModelsDevSync}
              className={`px-4 py-2 rounded-md text-white ${syncLoading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {syncLoading ? 'Syncing…' : 'Run Sync'}
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Fetches providers/models from models.dev and upserts into registry and mappings tables.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">Latest Sync Status</h3>
              <pre className="text-sm p-3 rounded bg-gray-50 overflow-x-auto">{JSON.stringify(syncStatus, null, 2)}</pre>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">Last Run Result</h3>
              <pre className="text-sm p-3 rounded bg-gray-50 overflow-x-auto">{JSON.stringify(syncResult, null, 2)}</pre>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

