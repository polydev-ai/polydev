'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { createClient } from '../utils/supabase/client'
import Link from 'next/link'
import { Settings, MessageSquare, Zap, Clock, Heart, Key, CreditCard, Shield, ArrowRight } from 'lucide-react'

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
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6 overflow-hidden">
          <div className="px-6 py-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-5">
                <div className="h-20 w-20 bg-slate-900 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl font-bold text-white">
                    {avatarInitial}
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    {displayName}
                  </h1>
                  <p className="text-slate-600">{user.email}</p>
                  <div className="mt-1 flex items-center space-x-3 text-sm text-slate-500">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Member since {memberSince}</span>
                    </span>
                    {profile?.company && (
                      <span className="text-slate-400">•</span>
                    )}
                    {profile?.company && <span>{profile.company}</span>}
                    {profile?.role && (
                      <span className="text-slate-400">•</span>
                    )}
                    {profile?.role && <span className="capitalize">{profile.role}</span>}
                  </div>
                </div>
              </div>
              <Link
                href="/settings"
                className="flex items-center space-x-1 text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Edit Profile</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <MessageSquare className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Messages</p>
                <p className="text-xl font-bold text-slate-900">{stats?.totalChats || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Zap className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tokens</p>
                <p className="text-xl font-bold text-slate-900">{formattedTokens}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Heart className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Favorite</p>
                <p className="text-lg font-bold text-slate-900 truncate">{stats?.favoriteModel || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Clock className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Days Active</p>
                <p className="text-xl font-bold text-slate-900">{stats?.joinedDays || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200">
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

          {/* Profile Info */}
          <div className="space-y-6">
            {/* Quick Links */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <h3 className="font-medium text-slate-900">Quick Links</h3>
              </div>
              <div className="p-2">
                <Link
                  href="/chat"
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors">
                      <MessageSquare className="w-4 h-4 text-slate-700" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Start New Chat</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </Link>

                <Link
                  href="/dashboard"
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors">
                      <Zap className="w-4 h-4 text-slate-700" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Dashboard</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </Link>

                <Link
                  href="/dashboard/mcp-tokens"
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors">
                      <Key className="w-4 h-4 text-slate-700" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">MCP Tokens</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </Link>

                <Link
                  href="/dashboard/billing"
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors">
                      <CreditCard className="w-4 h-4 text-slate-700" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Billing</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </Link>

                <Link
                  href="/settings"
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors">
                      <Settings className="w-4 h-4 text-slate-700" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Settings</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </Link>

                <Link
                  href="/dashboard/security"
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-slate-100 rounded-lg group-hover:bg-slate-200 transition-colors">
                      <Shield className="w-4 h-4 text-slate-700" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Security</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}