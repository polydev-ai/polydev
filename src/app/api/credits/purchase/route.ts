import { NextRequest, NextResponse } from 'next/server'

// Credit purchases are disabled - users can only get credits through subscriptions
// This endpoint is kept for backward compatibility but returns an error

export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    error: 'Credit purchases are disabled. Please subscribe to a Plus ($25/mo) or Pro ($50/mo) plan to receive monthly credits.',
    subscriptionUrl: '/dashboard/subscription'
  }, { status: 410 }) // 410 Gone - resource no longer available
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    packages: [],
    message: 'Credit packages are no longer available. Please subscribe to a plan for monthly credits.',
    subscriptionUrl: '/dashboard/subscription'
  })
}