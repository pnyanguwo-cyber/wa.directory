import { NextResponse } from 'next/server'
import { adminGuard } from '@/lib/admin-auth'
import {
  createTrainingExamples,
  deleteTrainingExample,
  harvestStats,
  listTrainingExamples,
  reviewTrainingExample,
  type HarvestExchange,
} from '@/lib/harvest'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const denied = adminGuard()
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  try {
    const [examples, stats] = await Promise.all([
      listTrainingExamples({
        status: (searchParams.get('status') as 'pending' | 'approved' | 'rejected' | 'all') || 'all',
        category: searchParams.get('category') || 'all',
        q: searchParams.get('q') || '',
      }),
      harvestStats(),
    ])
    return NextResponse.json({ examples, stats })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load training examples' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const denied = adminGuard()
  if (denied) return denied

  try {
    const body = await request.json()
    const exchanges: HarvestExchange[] = Array.isArray(body.exchanges)
      ? body.exchanges.map((item: { userMessage?: unknown; assistantMessage?: unknown }) => ({
          userMessage: String(item?.userMessage || ''),
          assistantMessage: String(item?.assistantMessage || ''),
        }))
      : []
    const result = await createTrainingExamples({
      phone: typeof body.phone === 'string' ? body.phone : '',
      exchanges,
      category: typeof body.category === 'string' ? body.category : 'general',
      tags: Array.isArray(body.tags) ? body.tags.map((tag: unknown) => String(tag)) : [],
      redact: body.redact !== false,
      reviewedBy: 'admin',
    })
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ success: true, created: result.created })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function PATCH(request: Request) {
  const denied = adminGuard()
  if (denied) return denied

  try {
    const body = await request.json()
    const id = typeof body.id === 'string' ? body.id : ''
    const action = body.action
    if (!id || (action !== 'approve' && action !== 'reject')) {
      return NextResponse.json({ error: 'id and action (approve/reject) are required' }, { status: 400 })
    }
    const result = await reviewTrainingExample({
      id,
      action,
      category: typeof body.category === 'string' ? body.category : undefined,
      tags: Array.isArray(body.tags) ? body.tags.map((tag: unknown) => String(tag)) : undefined,
      reason: typeof body.reason === 'string' ? body.reason : '',
      reviewedBy: 'admin',
    })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  const denied = adminGuard()
  if (denied) return denied

  try {
    const body = await request.json()
    const id = typeof body.id === 'string' ? body.id : ''
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    const result = await deleteTrainingExample(id)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
