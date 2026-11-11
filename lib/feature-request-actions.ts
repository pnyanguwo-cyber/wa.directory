import { getSupabase } from '@/lib/supabase-server'

export interface FeatureRequestRow {
  id: string
  type: 'category' | 'city' | 'area'
  name: string
  city: string | null
  business_id: string | null
}

/** Approve a feature request: add the value to the approved lists
 * (categories/cities/areas tables), fix the business's arrays, and mark the
 * request approved. Shared by the admin feature-requests panel and the
 * business-verification flow (verifying a business verifies its location). */
export async function approveFeatureRequest(
  supabase: ReturnType<typeof getSupabase>,
  req: FeatureRequestRow,
  correctedName?: string
) {
  const finalName = correctedName?.trim() || req.name

  if (req.type === 'category') {
    await supabase.from('categories').upsert({ name: finalName, active: true }, { onConflict: 'name' })
  } else if (req.type === 'area') {
    await supabase.from('areas').upsert({ city: req.city || '', name: finalName, active: true }, { onConflict: 'city,name' })
  } else if (req.type === 'city') {
    await supabase.from('cities').upsert({ name: finalName, active: true }, { onConflict: 'name' })
  }

  if (req.business_id) {
    const { data: biz } = await supabase
      .from('businesses')
      .select('category, areas, city')
      .eq('id', req.business_id)
      .single()

    if (biz) {
      if (req.type === 'city') {
        await supabase.from('businesses').update({ city: finalName }).eq('id', req.business_id)
      } else {
        const arrCol = req.type === 'category' ? 'category' : 'areas'
        const arr: string[] = req.type === 'category' ? (biz.category || []) : (biz.areas || [])
        const next = arr.map((n: string) => (n === req.name ? finalName : n))
        await supabase.from('businesses').update({ [arrCol]: next }).eq('id', req.business_id)
      }
    }
  }

  await supabase
    .from('feature_requests')
    .update({ status: 'approved', corrected_name: finalName === req.name ? '' : finalName })
    .eq('id', req.id)

  return finalName
}

/** Verifying a business verifies its location too: approve every pending
 * city/area request linked to it so the location lands in the approved
 * lists for future users. Categories stay manual. */
export async function autoApproveBusinessLocations(businessId: string) {
  const supabase = getSupabase()
  const { data: pending } = await supabase
    .from('feature_requests')
    .select('id, type, name, city, business_id')
    .eq('business_id', businessId)
    .in('type', ['city', 'area'])
    .eq('status', 'pending')

  for (const req of pending || []) {
    try {
      await approveFeatureRequest(supabase, req as FeatureRequestRow)
    } catch {
      // Non-blocking: one failed approval must not stop verification.
    }
  }
  return (pending || []).length
}
