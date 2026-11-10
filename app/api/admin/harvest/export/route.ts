import { adminGuard } from '@/lib/admin-auth'
import { listTrainingExamples, trainingExamplesToCsv } from '@/lib/harvest'
import { NextResponse } from 'next/server'
import { getHarareDateNow } from '@/lib/date-utils'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const denied = adminGuard()
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') === 'json' ? 'json' : 'csv'
  const status = (searchParams.get('status') as 'pending' | 'approved' | 'rejected' | 'all') || 'approved'
  const category = searchParams.get('category') || 'all'

  try {
    const examples = await listTrainingExamples({ status, category })
    const stamp = getHarareDateNow().replace(/\s+/g, '-')

    if (format === 'json') {
      return new NextResponse(JSON.stringify({ exportedAt: new Date().toISOString(), status, category, examples }, null, 2), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="wa-training-${status}-${stamp}.json"`,
        },
      })
    }

    return new NextResponse(trainingExamplesToCsv(examples), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="wa-training-${status}-${stamp}.csv"`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not export training examples' },
      { status: 500 }
    )
  }
}
