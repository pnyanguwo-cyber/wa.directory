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
      .select('category, areas, city, requested_category')
      .eq('id', req.business_id)
      .single()

    if (biz) {
      if (req.type === 'city') {
        await supabase.from('businesses').update({ city: finalName }).eq('id', req.business_id)
      } else {
        const arrCol = req.type === 'category' ? 'category' : 'areas'
        const arr: string[] = req.type === 'category' ? (biz.category || []) : (biz.areas || [])
        let next = arr.map((n: string) => (n === req.name ? finalName : n))
        // The listing was held as 'Other' until this decision; approval is the
        // decision, so replace the placeholder with the approved name.
        const provisional = (biz.requested_category || '').trim().toLowerCase()
        const replacesPlaceholder =
          req.type === 'category' && !!provisional && provisional === req.name.toLowerCase()
        if (replacesPlaceholder) {
          next = next.filter((n: string) => n !== 'Other')
          if (!next.includes(finalName)) next = [finalName, ...next]
        }
        await supabase
          .from('businesses')
          .update(replacesPlaceholder ? { [arrCol]: next, requested_category: '' } : { [arrCol]: next })
          .eq('id', req.business_id)
      }
    }
  }

  await supabase
    .from('feature_requests')
    .update({ status: 'approved', corrected_name: finalName === req.name ? '' : finalName })
    .eq('id', req.id)

  return finalName
}

/**
 * "Connect to": the requested category is another name for one we already
 * have. Files the business under the existing category, records the wording as
 * a learned alias (so future listings using it match automatically instead of
 * raising another request), and closes the request without creating a
 * near-duplicate category.
 */
export async function connectCategoryRequest(
  supabase: ReturnType<typeof getSupabase>,
  req: FeatureRequestRow,
  targetName: string
): Promise<{ ok: boolean; error?: string; name?: string }> {
  if (req.type !== 'category') {
    return { ok: false, error: 'Only category requests can be connected to an existing category.' }
  }
  const target = (targetName || '').trim()
  if (!target) return { ok: false, error: 'Pick the existing category to connect to.' }

  const { data: target_row } = await supabase
    .from('categories')
    .select('name')
    .ilike('name', target)
    .maybeSingle()
  if (!target_row) {
    return { ok: false, error: `"${target}" is not an existing category. Approve it as new instead.` }
  }
  const canonical = String(target_row.name)

  if (req.business_id) {
    const { data: biz } = await supabase
      .from('businesses')
      .select('category, requested_category')
      .eq('id', req.business_id)
      .maybeSingle()
    if (biz) {
      const current: string[] = biz.category || []
      let next = current.map(n => (n === req.name ? canonical : n))
      const provisional = (biz.requested_category || '').trim().toLowerCase()
      const replacesPlaceholder = !!provisional && provisional === req.name.toLowerCase()
      if (replacesPlaceholder || current.length === 0) {
        next = next.filter(n => n !== 'Other')
      }
      if (!next.some(n => n.toLowerCase() === canonical.toLowerCase())) next = [canonical, ...next]
      await supabase
        .from('businesses')
        .update(replacesPlaceholder ? { category: next, requested_category: '' } : { category: next })
        .eq('id', req.business_id)
    }
  }

  // Learn the alias for every future listing (best effort: the decision still
  // stands if the mapping table is unavailable).
  await supabase
    .rpc('record_learned', { p_kind: 'category', p_raw: req.name, p_canonical: canonical })
    .then(() => undefined, () => undefined)

  await supabase
    .from('feature_requests')
    .update({ status: 'approved', corrected_name: canonical })
    .eq('id', req.id)

  return { ok: true, name: canonical }
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
