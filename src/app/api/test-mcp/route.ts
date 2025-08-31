import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('[TEST] GET request received')
  return NextResponse.json({ message: 'GET works', timestamp: Date.now() })
}

export async function POST(request: NextRequest) {
  console.log('[TEST] POST request received')
  const body = await request.json()
  console.log('[TEST] POST body:', body)
  return NextResponse.json({ message: 'POST works', body, timestamp: Date.now() })
}