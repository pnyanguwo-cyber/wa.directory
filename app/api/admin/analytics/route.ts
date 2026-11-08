import { NextResponse } from 'next/server'
import { adminGuard } from '@/lib/admin-auth'
import { getAdminAnalytics } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const denied = adminGuard()
  if (denied) return denied

  const days = Number(new URL(request.url).searchParams.get('days') || 30)
  try {
    const data = await getAdminAnalytics(days)
    return NextResponse.json({ analytics: data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not build analytics' },
      { status: 500 }
    )
  }
}
