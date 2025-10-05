'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { createClient } from '../utils/supabase/client'
import { AnimatePresence } from 'framer-motion'

interface UserProfile {
  id: string
  email: string
  display_name?: string
  company?: string
  role?: string
  timezone?: string
  avatar_url?: string
  created_at: string
  updated_at?: string
}

interface UserStats {
  totalChats: number
  totalTokens: number
  favoriteModel: string
  joinedDays: number
  lastActive: string
  recentActivity: Array<{
    timestamp: string
    action: string
    model: string
    tokens: number
    cost: number
    title?: string
  }>
}

// Global cache for profile data to prevent duplicate fetching
const profileCache = {
  profile: null as UserProfile | null,
  stats: null as UserStats | null,
  timestamps: {
    profile: 0,
    stats: 0,
  },
  CACHE_DURATION: 3 * 60 * 1000, // 3 minutes for profile data
}

let activeRequests: Record<string, Promise<any> | null> = {}

export default function Profile() {
  const { user, loading } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const isMountedRef = useRef(true)

  const supabase = createClient()

  // Fetch with caching and deduplication
  const fetchWithCache = useCallback(async (key: string, fetcher: () => Promise<any>) => {
    const now = Date.now()

    // Check cache first
    if (profileCache[key as keyof typeof profileCache] &&
        (now - profileCache.timestamps[key as keyof typeof profileCache.timestamps]) < profileCache.CACHE_DURATION) {
      return profileCache[key as keyof typeof profileCache]
    }

    // Prevent duplicate requests
    if (activeRequests[key]) {
      return await activeRequests[key]
    }

    activeRequests[key] = (async () => {
      try {
        const data = await fetcher()

        // Update cache
        profileCache[key as keyof typeof profileCache] = data
        profileCache.timestamps[key as keyof typeof profileCache.timestamps] = now

        return data
      } catch (err) {
        console.warn(`Failed to fetch ${key}:`, err)
        return profileCache[key as keyof typeof profileCache] || null
      } finally {
        activeRequests[key] = null
      }
    })()

    return await activeRequests[key]
  }, [])

  // Optimized profile loading with caching
  const loadProfile = useCallback(async () => {
    if (!user?.id) return

    const data = await fetchWithCache('profile', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        return {
          ...data,
          email: user?.email || data.email
        }
      }
      return null
    })

    if (isMountedRef.current && data) {
      setProfile(data)
    }
  }, [user?.id, supabase, fetchWithCache])

  // Optimized stats loading with caching
  const loadStats = useCallback(async () => {
    const data = await fetchWithCache('stats', async () => {
      const response = await fetch('/api/profile/stats')
      if (response.ok) {
        return await response.json()
      }
      throw new Error(`Failed to load profile stats: ${response.statusText}`)
    })

    if (isMountedRef.current && data) {
      setStats(data)
    }
  }, [fetchWithCache])

  // Load data efficiently in parallel
  const loadAllData = useCallback(async () => {
    if (!user?.id) return

    setIsLoading(true)
    try {
      // Load profile and stats in parallel
      await Promise.allSettled([
        loadProfile(),
        loadStats()
      ])
    } catch (error) {
      console.error('Error loading profile data:', error)
      setMessage('Failed to load profile data')
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [user?.id, loadProfile, loadStats])

  useEffect(() => {
    isMountedRef.current = true
    if (user?.id) {
      loadAllData()
    }

    return () => {
      isMountedRef.current = false
    }
  }, [user?.id, loadAllData])

  // Memoized computed values to prevent unnecessary recalculations
  const computedValues = useMemo(() => {
    const displayName = profile?.display_name || 'User Profile'
    const avatarInitial = profile?.display_name?.charAt(0)?.toUpperCase() ||
                         user?.email?.charAt(0)?.toUpperCase() || '?'
    const memberSince = new Date(user?.created_at || Date.now()).toLocaleDateString()
    const formattedTokens = stats?.totalTokens?.toLocaleString() || '0'

    return {
      displayName,
      avatarInitial,
      memberSince,
      formattedTokens
    }
  }, [profile, user, stats])

  // Memoized activity rendering to prevent re-processing on every render
  const renderedActivity = useMemo(() => {
    if (!stats?.recentActivity || stats.recentActivity.length === 0) {
      return null
    }

    return stats.recentActivity.map((activity, index) => ({
      ...activity,
      formattedDate: new Date(activity.timestamp).toLocaleDateString(),
      formattedTime: new Date(activity.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      formattedTokens: activity.tokens.toLocaleString(),
      formattedCost: activity.cost.toFixed(4)
    }))
  }, [stats?.recentActivity])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">
            Authentication Required
          </h1>
          <p className="text-slate-600 mb-6">
            Please sign in to view your profile.
          </p>
          <a
            href="/auth"
            className="inline-block px-6 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-700 transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    )
  }

  const { displayName, avatarInitial, memberSince, formattedTokens } = computedValues

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 }
    }
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className="bg-white rounded-lg shadow mb-8 hover:shadow-lg transition-shadow"
        >
          <div className="px-6 py-8">
            <div className="flex items-center space-x-6">
              <div className="h-24 w-24 bg-slate-900 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {avatarInitial}
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  {displayName}
                </h1>
                <p className="text-slate-600 text-lg">
                  {user.email}
                </p>
                <div className="mt-2 flex items-center space-x-4 text-sm text-slate-600">
                  <span>Member since {memberSince}</span>
                  {profile?.company && (
                    <>
                      <span>•</span>
                      <span>{profile.company}</span>
                    </>
                  )}
                  {profile?.role && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{profile.role}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* Stats Cards */}
          <div className="lg:col-span-2">
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
            >
              <div
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <svg className="h-6 w-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-600">Messages Sent</p>
                    <p className="text-2xl font-bold text-slate-900">{stats?.totalChats || 0}</p>
                  </div>
                </div>
              </div>

              <div
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <svg className="h-6 w-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-600">Tokens Used</p>
                    <p className="text-2xl font-bold text-slate-900">{formattedTokens}</p>
                  </div>
                </div>
              </div>

              <div
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <svg className="h-6 w-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-600">Favorite Model</p>
                    <p className="text-2xl font-bold text-slate-900">{stats?.favoriteModel || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <svg className="h-6 w-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-600">Days Active</p>
                    <p className="text-2xl font-bold text-slate-900">{stats?.joinedDays || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-medium text-slate-900">Recent Activity</h3>
              </div>
              <div className="px-6 py-4">
                {renderedActivity ? (
                  <div className="space-y-4">
                    {renderedActivity.map((activity, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="h-2 w-2 rounded-full mt-2 bg-slate-900"></div>
                        <div className="flex-1">
                          <p className="text-sm text-slate-900">
                            <span className="font-medium">{activity.action}</span>
                            {activity.title && (
                              <span className="text-slate-600"> - {activity.title}</span>
                            )}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            Model: {activity.model}
                          </p>
                          <div className="flex items-center space-x-2 text-xs text-slate-600 mt-1">
                            <span>{activity.formattedDate} {activity.formattedTime}</span>
                            {activity.tokens > 0 && (
                              <>
                                <span>•</span>
                                <span>{activity.formattedTokens} tokens</span>
                              </>
                            )}
                            {activity.cost > 0 && (
                              <>
                                <span>•</span>
                                <span>${activity.formattedCost}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-600">No recent activity found</p>
                    <p className="text-sm text-slate-500 mt-2">
                      Start using the API to see your activity here
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="space-y-6">
            <div
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-medium text-slate-900 mb-4">Profile Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-600">Email</label>
                  <p className="text-sm text-slate-900">{user.email}</p>
                </div>
                {profile?.display_name && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">Display Name</label>
                    <p className="text-sm text-slate-900">{profile.display_name}</p>
                  </div>
                )}
                {profile?.company && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">Company</label>
                    <p className="text-sm text-slate-900">{profile.company}</p>
                  </div>
                )}
                {profile?.role && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">Role</label>
                    <p className="text-sm text-slate-900 capitalize">{profile.role}</p>
                  </div>
                )}
                {profile?.timezone && (
                  <div>
                    <label className="text-sm font-medium text-slate-600">Timezone</label>
                    <p className="text-sm text-slate-900">{profile.timezone}</p>
                  </div>
                )}
              </div>
              <div className="mt-6">
                <a
                  href="/settings"
                  className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 bg-white hover:bg-slate-50 transition-colors"
                >
                  Edit Profile
                </a>
              </div>
            </div>

            <div
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-medium text-slate-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <a
                  href="/chat"
                  className="block w-full px-4 py-2 text-center bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Start New Chat
                </a>
                <a
                  href="/dashboard"
                  className="block w-full px-4 py-2 text-center border border-slate-300 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  View Dashboard
                </a>
                <a
                  href="/explorer"
                  className="block w-full px-4 py-2 text-center border border-slate-300 text-slate-900 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Explore Models
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}