// Client-side Supabase client for browser authentication
// Requires: @supabase/supabase-js
// Env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

import { createBrowserClient } from '@supabase/ssr'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
if (!anonKey) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set')

export const createClient = () => {
  return createBrowserClient(url, anonKey)
}