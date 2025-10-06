'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '../hooks/useAuth'
import { createClient } from '../app/utils/supabase/client'
import PolydevLogo from './PolydevLogo'

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

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const { user, loading, signOut, isAuthenticated } = useAuth()

  const supabase = createClient()

  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Load user profile
  useEffect(() => {
    if (user && isAuthenticated) {
      loadProfile()
    } else {
      setProfile(null)
    }
  }, [user, isAuthenticated])

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single()

      if (data) {
        setProfile({
          ...data,
          email: user?.email || data.email
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  // Close dropdown and mobile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Element

      // Close user dropdown if clicking outside
      if (dropdownRef.current && !dropdownRef.current.contains(target as Node)) {
        setUserDropdownOpen(false)
      }

      // Close mobile menu when clicking outside nav (but not on navigation links)
      if (isOpen && !target.closest('nav') && !target.closest('a[href]')) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const publicNavigation = [
    { name: 'Home', href: '/' },
    { name: 'Docs', href: '/docs' },
  ]

  const authenticatedNavigation = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Chat', href: '/chat' },
    { name: 'Models', href: '/dashboard/models' },
    { name: 'Activity', href: '/dashboard/activity' },
    { name: 'Docs', href: '/docs' },
  ]

  // Always show public navigation on home page
  const navigation = (isMounted && isAuthenticated && pathname !== '/') ? authenticatedNavigation : publicNavigation

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  // Don't render navigation on landing page (auth page has its own nav)
  if (pathname === '/' || pathname === '/auth') {
    return null
  }

  return (
    <nav className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-slate-200/50 sticky top-0 z-[100]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center gap-3 group">
              <PolydevLogo size={40} className="text-slate-900 group-hover:text-slate-600 transition-colors duration-200" />
              <span className="text-xl font-bold text-slate-900 group-hover:text-slate-600 transition-colors duration-200">Polydev</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 touch-manipulation active:scale-95 ${
                    isActive(item.href)
                      ? 'bg-slate-100 text-slate-900 border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {!isMounted || loading ? (
              <div className="w-16 h-8 bg-slate-200 rounded animate-pulse"></div>
            ) : isAuthenticated ? (
              <>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {(profile?.display_name || user?.email)?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <span className="max-w-32 truncate">{profile?.display_name || user?.email}</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 divide-y divide-slate-100 z-[110]">
                      <div className="px-4 py-3">
                        <p className="text-sm text-slate-900">Signed in as</p>
                        <p className="text-sm font-medium text-slate-900 truncate">{user?.email}</p>
                      </div>
                      <div className="py-1">
                        <Link
                          href="/profile"
                          className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          Profile
                        </Link>
                        <Link
                          href="/dashboard/models"
                          className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          Models
                        </Link>
                        <Link
                          href="/dashboard/mcp-tokens"
                          className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          MCP Tokens
                        </Link>
                        <Link
                          href="/dashboard/usage"
                          className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          Usage & Analytics
                        </Link>
                        <Link
                          href="/dashboard/subscription"
                          className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          👑 Subscription
                        </Link>
                        <Link
                          href="/dashboard/referrals"
                          className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          🎁 Referrals
                        </Link>
                        <Link
                          href="/dashboard/preferences"
                          className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          Preferences
                        </Link>
                        <Link
                          href="/settings"
                          className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          onClick={() => setUserDropdownOpen(false)}
                        >
                          Settings
                        </Link>
                      </div>
                      <div className="py-1">
                        <button
                          onClick={() => {
                            signOut()
                            setUserDropdownOpen(false)
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/docs"
                  className="text-slate-600 hover:text-slate-900 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Docs
                </Link>
                <Link
                  href="/pricing"
                  className="text-slate-600 hover:text-slate-900 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Pricing
                </Link>
                <Link
                  href="/blog"
                  className="text-slate-600 hover:text-slate-900 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Blog
                </Link>
                <div className="h-4 w-px bg-slate-300"></div>
                <Link
                  href="/auth"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-700 transition-all duration-300"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-900"
            >
              <span className="sr-only">Open main menu</span>
              {/* Hamburger icon */}
              <svg
                className={`${isOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {/* Close icon */}
              <svg
                className={`${isOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-slate-200 bg-white/95 backdrop-blur-sm">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-all duration-200 touch-manipulation active:scale-95 ${
                    isActive(item.href)
                      ? 'bg-slate-100 text-slate-900 border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              <div className="border-t border-slate-200 pt-4 space-y-1">
                {!isMounted || loading ? (
                  <div className="px-3 py-2">
                    <div className="w-24 h-8 bg-slate-200 rounded animate-pulse"></div>
                  </div>
                ) : isAuthenticated ? (
                  <>
                    <div className="px-3 py-2 border-b border-slate-200 mb-2">
                      <p className="text-xs text-slate-600">Signed in as</p>
                      <p className="text-sm font-medium text-slate-900 truncate">{profile?.display_name || user?.email}</p>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setIsOpen(false)}
                      className="block px-3 py-2 text-base font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/dashboard/subscription"
                      onClick={() => setIsOpen(false)}
                      className="block px-3 py-2 text-base font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    >
                      👑 Subscription
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setIsOpen(false)}
                      className="block px-3 py-2 text-base font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    >
                      Settings
                    </Link>
                    <button
                      onClick={() => {
                        signOut()
                        setIsOpen(false)
                      }}
                      className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/docs"
                      onClick={() => setIsOpen(false)}
                      className="block px-3 py-2 rounded-md text-base font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    >
                      Docs
                    </Link>
                    <Link
                      href="/pricing"
                      onClick={() => setIsOpen(false)}
                      className="block px-3 py-2 rounded-md text-base font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    >
                      Pricing
                    </Link>
                    <Link
                      href="/blog"
                      onClick={() => setIsOpen(false)}
                      className="block px-3 py-2 rounded-md text-base font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    >
                      Blog
                    </Link>
                    <Link
                      href="/auth"
                      onClick={() => setIsOpen(false)}
                      className="block px-3 py-2 rounded-md text-base font-medium bg-slate-900 text-white hover:bg-slate-700 transition-all duration-300 mx-3 mt-4 text-center"
                    >
                      Sign In
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}