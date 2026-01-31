import { createClient } from '@/app/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const userCode = requestUrl.searchParams.get('code') // Device user code

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redirect back to device auth page with the user code
  const deviceCode = requestUrl.searchParams.get('code')
  return NextResponse.redirect(new URL(`/auth/device?code=${deviceCode || ''}`, requestUrl.origin))
}
