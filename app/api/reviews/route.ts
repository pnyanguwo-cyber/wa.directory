import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('business_id')
    if (!businessId) {
      return NextResponse.json({ error: 'business_id is required' }, { status: 400 })
    }

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('ratings')
      .select('id, name, rating, comment, created_at')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ reviews: data || [] })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function POST(request: Request) {
  try {
    const { business_id, rating, comment, name } = await request.json()

    if (!business_id || typeof business_id !== 'string') {
      return NextResponse.json({ error: 'business_id is required' }, { status: 400 })
    }
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }
    if (comment && typeof comment === 'string' && comment.length > 500) {
      return NextResponse.json({ error: 'Comment must be 500 characters or less' }, { status: 400 })
    }

    const supabase = getSupabase()

    const insertData: Record<string, unknown> = {
      business_id,
      customer_phone: '',
      name: typeof name === 'string' ? name.trim().slice(0, 50) : '',
      rating: Math.round(rating),
      comment: typeof comment === 'string' ? comment.trim().slice(0, 500) : '',
    }

    const { data, error } = await supabase
      .from('ratings')
      .insert(insertData)
      .select('id, name, rating, comment, created_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Refresh the business aggregate rating
    const { data: allRatings } = await supabase
      .from('ratings')
      .select('rating')
      .eq('business_id', business_id)

    if (allRatings && allRatings.length > 0) {
      const avg = allRatings.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / allRatings.length
      await supabase
        .from('businesses')
        .update({
          rating: Math.round(avg * 10) / 10,
          review_count: allRatings.length,
        })
        .eq('id', business_id)
    }

    return NextResponse.json({ success: true, review: data })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
