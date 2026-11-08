import { NextResponse } from 'next/server'
import { getActingPortalBusiness, isPaidSubscriber } from '@/lib/portal'
import { getBusinessAnalytics } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const session = await getActingPortalBusiness(url.searchParams.get('branch'))
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  if (!(await isPaidSubscriber(session.business.id))) {
    return NextResponse.json({ error: 'Analytics require an active subscription' }, { status: 403 })
  }

  try {
    const data = await getBusinessAnalytics(
      session.business.id,
      session.business.name,
      Number(url.searchParams.get('days') || 30)
    )
    return NextResponse.json({ analytics: data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not build analytics' },
      { status: 500 }
    )
  }
}
