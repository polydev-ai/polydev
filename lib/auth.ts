// Helpers to derive the current user from Supabase auth cookies
// Requires @supabase/ssr and NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function getUserIdFromRequest(): Promise<string | null> {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )
    const { data } = await supabase.auth.getUser()
    if (data?.user?.id) return data.user.id
  } catch (e) {
    // ignore and try header fallback
  }
  // Optional: allow an internal proxy to set X-User-Id
  const h = headers()
  const userId = h.get('x-user-id')
  return userId || null
}

