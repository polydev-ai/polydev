import { NextResponse } from 'next/server'
import { createClient } from '../../utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  let next = searchParams.get('next') ?? '/dashboard'

  // Ensure next parameter is valid
  if (!next || next === 'undefined' || next === 'null') {
    next = '/dashboard'
  }

  // Ensure next starts with /
  if (!next.startsWith('/')) {
    next = '/dashboard'
  }

  console.log('[Auth Callback] Redirect parameters:', { code: !!code, next })

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Always use the site URL from environment or fallback to origin
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin
      const redirectUrl = `${siteUrl}${next}`
      
      console.log('[Auth Callback] Redirecting to:', redirectUrl)
      return NextResponse.redirect(redirectUrl)
    } else {
      console.error('[Auth Callback] Session exchange error:', error)
    }
  }

  // Return the user to an error page with instructions
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin
  return NextResponse.redirect(`${siteUrl}/auth/auth-code-error`)
}