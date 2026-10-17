import { NextResponse } from 'next/server'
import { adminGuard } from '@/lib/admin-auth'
import { getSupabase } from '@/lib/supabase-server'
import { slugify } from '@/lib/utils'

// Admin-only management of organizations (HQ + branches).
// Actions:
//   GET                        — orgs with their branch listings
//   POST { action: 'create' }  — create an org + mark its HQ listing
//   POST { action: 'link' }    — attach a business to an org as a branch
//   POST { action: 'unlink' }  — detach a branch back to standalone
//   POST { action: 'delete' }  — delete the org (branches become standalone)

export async function GET() {
  const denied = adminGuard()
  if (denied) return denied

  const supabase = getSupabase()
  const [orgsRes, branchesRes] = await Promise.all([
    supabase.from('organizations').select('*').order('created_at', { ascending: false }),
    supabase
      .from('businesses')
      .select('id, name, slug, phone, city, area, org_id, is_hq, branch_label, verified')
      .not('org_id', 'is', null)
      .order('is_hq', { ascending: false }),
  ])

  if (orgsRes.error) return NextResponse.json({ error: orgsRes.error.message }, { status: 500 })

  const branches = branchesRes.data || []
  const orgs = (orgsRes.data || []).map(o => ({
    ...o,
    branches: branches.filter(b => b.org_id === o.id),
  }))

  return NextResponse.json({ organizations: orgs })
}

export async function POST(request: Request) {
  const denied = adminGuard()
  if (denied) return denied

  const body = await request.json().catch(() => ({}))
  const action = body?.action
  const supabase = getSupabase()

  if (action === 'create') {
    const name = String(body?.name || '').trim()
    const hqBusinessId = String(body?.hqBusinessId || '').trim()
    if (!name) return NextResponse.json({ error: 'Organization name is required' }, { status: 400 })
    if (!hqBusinessId) return NextResponse.json({ error: 'Pick the HQ listing' }, { status: 400 })

    // The HQ listing must exist and not already belong to another org.
    const { data: hq } = await supabase
      .from('businesses')
      .select('id, name, org_id')
      .eq('id', hqBusinessId)
      .maybeSingle()
    if (!hq) return NextResponse.json({ error: 'HQ listing not found' }, { status: 404 })
    if (hq.org_id) return NextResponse.json({ error: 'That listing is already part of an organization' }, { status: 400 })

    const slug = slugify(name)

    const { data: org, error } = await supabase
      .from('organizations')
      .insert({ name, slug })
      .select('id, name, slug')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { error: hqErr } = await supabase
      .from('businesses')
      .update({ org_id: org.id, is_hq: true })
      .eq('id', hq.id)
    if (hqErr) return NextResponse.json({ error: hqErr.message }, { status: 500 })

    return NextResponse.json({ success: true, org })
  }

  if (action === 'link') {
    const orgId = String(body?.orgId || '')
    const businessId = String(body?.businessId || '')
    const branchLabel = String(body?.branchLabel || '').trim()
    if (!orgId || !businessId) return NextResponse.json({ error: 'orgId and businessId are required' }, { status: 400 })

    const { data: business } = await supabase
      .from('businesses')
      .select('id, org_id')
      .eq('id', businessId)
      .maybeSingle()
    if (!business) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    if (business.org_id) return NextResponse.json({ error: 'That listing already belongs to an organization' }, { status: 400 })

    const { error } = await supabase
      .from('businesses')
      .update({ org_id: orgId, is_hq: false, branch_label: branchLabel })
      .eq('id', businessId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  }

  if (action === 'set-label') {
    const businessId = String(body?.businessId || '')
    const branchLabel = String(body?.branchLabel || '').trim()
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    const { error } = await supabase
      .from('businesses')
      .update({ branch_label: branchLabel })
      .eq('id', businessId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'unlink') {
    const businessId = String(body?.businessId || '')
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    const { error } = await supabase
      .from('businesses')
      .update({ org_id: null, is_hq: false, branch_label: '' })
      .eq('id', businessId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'delete') {
    const orgId = String(body?.orgId || '')
    if (!orgId) return NextResponse.json({ error: 'orgId is required' }, { status: 400 })

    // Detach branches first so ON DELETE SET NULL / business state stays clean.
    await supabase.from('businesses').update({ org_id: null, is_hq: false, branch_label: '' }).eq('org_id', orgId)
    const { error } = await supabase.from('organizations').delete().eq('id', orgId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
