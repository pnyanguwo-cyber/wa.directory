import { NextResponse } from 'next/server'
import { getPortalActor, getOrgDefaults, updateOrgDefaults } from '@/lib/org-auth'
import { getSupabase } from '@/lib/supabase-server'

// HQ-only management of the org's branch pre-fill defaults:
//   GET    — current defaults (logo, categories, bio template)
//   PUT    — update any subset of them
//   PATCH  — one-click retrofill: apply the default logo to existing branches
//            that have no logo of their own
// Logo images are uploaded by the client to /api/upload (magic-byte
// validated) and only the returned URL is stored here.

export async function GET() {
  const actor = await getPortalActor()
  if (!actor) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  if (actor.role !== 'org-hq') {
    return NextResponse.json({ error: 'Only organization HQ accounts can manage defaults' }, { status: 403 })
  }

  const defaults = await getOrgDefaults(actor.orgId)
  return NextResponse.json({ defaults })
}

export async function PUT(request: Request) {
  const actor = await getPortalActor()
  if (!actor) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  if (actor.role !== 'org-hq') {
    return NextResponse.json({ error: 'Only organization HQ accounts can manage defaults' }, { status: 403 })
  }

  const body: Record<string, unknown> = await request.json().catch(() => ({}))

  const patch: {
    defaultLogoUrl?: string
    defaultCategories?: string[]
    bioTemplate?: string
  } = {}

  if (body?.default_logo_url !== undefined) {
    const url = String(body.default_logo_url || '').trim()
    // Accept empty (clear) or an https URL — the value is rendered as an
    // <img src> on public profiles, so never store javascript:/data: payloads.
    if (url && !/^https:\/\//.test(url)) {
      return NextResponse.json({ error: 'Logo must be an https URL (upload it via the logo picker).' }, { status: 400 })
    }
    patch.defaultLogoUrl = url
  }

  if (body?.default_categories !== undefined) {
    if (!Array.isArray(body.default_categories)) {
      return NextResponse.json({ error: 'default_categories must be an array' }, { status: 400 })
    }
    const cats = (body.default_categories as unknown[])
      .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
      .map(c => c.trim())
    // Same 1–4 cap as listings (0 allowed = no category defaults).
    if (cats.length > 4) {
      return NextResponse.json({ error: 'Pick at most 4 default categories.' }, { status: 400 })
    }

    // Validate against the approved category list.
    if (cats.length > 0) {
      const { data: catRows } = await getSupabase().from('categories').select('name').eq('active', true)
      const approved = new Set((catRows || []).map((r: { name: string }) => r.name))
      const clean = [...new Set(cats)].filter(c => approved.has(c))
      if (clean.length !== cats.length) {
        return NextResponse.json({ error: 'Some selected categories are not on the approved list.' }, { status: 400 })
      }
      patch.defaultCategories = clean
    } else {
      patch.defaultCategories = []
    }
  }

  if (body?.bio_template !== undefined) {
    const tpl = String(body.bio_template || '').trim()
    if (tpl.length > 600) {
      return NextResponse.json({ error: 'Bio template must be 600 characters or fewer.' }, { status: 400 })
    }
    patch.bioTemplate = tpl
  }

  const result = await updateOrgDefaults(actor, patch)
  if (result.error) return NextResponse.json({ error: result.error }, { status: 500 })

  const defaults = await getOrgDefaults(actor.orgId)
  return NextResponse.json({ success: true, defaults })
}

// PATCH — retrofill the org's default logo onto existing branches that have
// no logo of their own. Non-destructive: a branch that uploaded its own logo
// (or the HQ listing itself) is never touched. Safe to click more than once —
// already-filled branches simply don't match the filter.
export async function PATCH() {
  const actor = await getPortalActor()
  if (!actor) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  if (actor.role !== 'org-hq') {
    return NextResponse.json({ error: 'Only organization HQ accounts can apply defaults' }, { status: 403 })
  }

  const supabase = getSupabase()

  const defaults = await getOrgDefaults(actor.orgId)
  if (!defaults.defaultLogoUrl) {
    return NextResponse.json({ error: 'Set a default logo first.' }, { status: 400 })
  }

  // Every org member missing a logo: branches AND the HQ listing itself
  // (e.g. freshly-created orgs where nobody uploaded a logo yet). Must
  // explicitly cover NULL and '' because the column allows both.
  const { data: targets, error } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('org_id', actor.orgId)
    .or('logo_url.is.null,logo_url.eq.""')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!targets || targets.length === 0) {
    return NextResponse.json({ success: true, updated: 0 })
  }

  const { error: updErr } = await supabase
    .from('businesses')
    .update({ logo_url: defaults.defaultLogoUrl })
    .in('id', targets.map(t => t.id))
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  return NextResponse.json({ success: true, updated: targets.length })
}
