// Server-side Supabase client for secure RPC/view access
// Requires: @supabase/supabase-js
// Env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url) throw new Error('SUPABASE_URL is not set')
if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')

export const supabaseServer = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
})

