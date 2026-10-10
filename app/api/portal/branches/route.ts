import { NextResponse } from 'next/server'
import { getPortalActor, createOrgBranch, listPendingBranchInvites } from '@/lib/org-auth'
import { toFullPhone } from '@/lib/phone'
import { getSupabase } from '@/lib/supabase-server'

// HQ-only branch self-service:
//   GET  — pending branch invites (created, awaiting manager setup / approval)
//   POST — create a branch listing under the HQ's org and send the
//          account-setup invite to the branch manager's WhatsApp.

export async function GET() {
  const actor = await getPortalActor()
  if (!actor) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  if (actor.role !== 'org-hq') {
    return NextResponse.json({ error: 'Only organization HQ accounts can manage branches' }, { status: 403 })
  }

  const pending = await listPendingBranchInvites(actor.orgId)

  // Which pending branches already claimed their account (password set)?
  // Used by the UI to show "Resend" only for unclaimed invites.
  const claimed = new Set<string>()
  if (pending.length > 0) {
    const { data: accounts } = await getSupabase()
      .from('business_accounts')
      .select('business_id')
      .in('business_id', pending.map(b => b.id))
    for (const a of accounts || []) claimed.add(a.business_id)
  }

  return NextResponse.json({
    pending: pending.map(b => ({
      id: b.id,
      name: b.name,
      slug: b.slug || null,
      phone: b.phone,
      city: b.city || '',
      branchLabel: b.branch_label || '',
      createdAt: b.created_at,
      claimed: claimed.has(b.id),
    })),
  })
}

export async function POST(request: Request) {
  const actor = await getPortalActor()
  if (!actor) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  if (actor.role !== 'org-hq') {
    return NextResponse.json({ error: 'Only organization HQ accounts can add branches' }, { status: 403 })
  }

  const body: Record<string, unknown> = await request.json().catch(() => ({}))
  const name = String(body?.name || '').trim()
  const branchLabel = String(body?.branch_label || '').trim()
  const phoneRaw = String(body?.phone || '').trim()
  const city = String(body?.city || '').trim()
  const area = String(body?.area || '').trim()
  const bio = String(body?.bio || '').trim()
  const category: string[] = Array.isArray(body?.category)
    ? (body.category as unknown[]).filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
    : []

  // --- Validation (mirrors the public listing rules) ---
  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: 'Branch name must be between 2 and 80 characters.' }, { status: 400 })
  }
  if (!branchLabel) {
    return NextResponse.json({ error: 'A short branch label (e.g. Chinhoyi) is required.' }, { status: 400 })
  }
  if (branchLabel.length > 40) {
    return NextResponse.json({ error: 'Branch label must be 40 characters or fewer.' }, { status: 400 })
  }
  if (!phoneRaw) {
    return NextResponse.json({ error: 'The branch WhatsApp number is required.' }, { status: 400 })
  }
  const fullPhone = toFullPhone('+263', phoneRaw)
  if (fullPhone.length < 10 || fullPhone.length > 15) {
    return NextResponse.json({ error: 'That WhatsApp number looks invalid.' }, { status: 400 })
  }
  if (!city) {
    return NextResponse.json({ error: 'Pick the branch location.' }, { status: 400 })
  }
  if (category.length === 0 || category.length > 4) {
    return NextResponse.json({ error: 'Select 1–4 categories for the branch.' }, { status: 400 })
  }

  // Categories must be on the approved list (same rule as public listing).
  const supabase = getSupabase()
  const { data: catRows } = await supabase.from('categories').select('name').eq('active', true)
  const approved = new Set((catRows || []).map((r: { name: string }) => r.name))
  const cleanCategories = [...new Set(category.map((c: string) => c.trim()))].filter(c => approved.has(c))
  if (cleanCategories.length === 0) {
    return NextResponse.json({ error: 'Selected categories are not on the approved list.' }, { status: 400 })
  }

  const result = await createOrgBranch({
    actor,
    name,
    branchLabel,
    phone: fullPhone,
    city,
    area: area || undefined,
    category: cleanCategories,
    bio,
  })
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  // Account-setup invite to the branch manager's WhatsApp. The manager proves
  // ownership by possessing this private link + their listed number, then
  // sets their own password. Best-effort, non-blocking.
  const siteUrl = process.env.SITE_URL || 'https://wadirectory.co.zw'
  const setupLink = `${siteUrl}/account-setup?token=${result.editToken}`
  const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
  sendWhatsAppMessage(
    fullPhone,
    [
      `🏢 *BRANCH INVITE: ${actor.orgName}*`,
      '',
      `You have been added as the manager of *${name}* (${branchLabel}) on WA Directory.`,
      '',
      'Set your portal password to manage this branch:',
      setupLink,
      '',
      'Your branch portal shows only your branch — HQ manages its own view separately.',
      'Keep this link safe: anyone with it can claim this branch account.',
    ].join('\n')
  ).catch(() => {})

  return NextResponse.json({
    success: true,
    id: result.id,
    slug: result.slug,
    name,
    branchLabel,
    phone: fullPhone,
  })
}

// PATCH { branch_id } — re-send a branch's account-setup invite (HQ only).
// For pending branches whose link was lost or never arrived.
export async function PATCH(request: Request) {
  const actor = await getPortalActor()
  if (!actor) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  if (actor.role !== 'org-hq') {
    return NextResponse.json({ error: 'Only organization HQ accounts can resend invites' }, { status: 403 })
  }

  const body: Record<string, unknown> = await request.json().catch(() => ({}))
  const branchId = String(body?.branch_id || '')
  if (!branchId) return NextResponse.json({ error: 'branch_id is required' }, { status: 400 })

  const supabase = getSupabase()

  // Hard scope: the branch must belong to the HQ's own org and be a branch
  // (not the HQ listing) that is still unverified — i.e. an invite pending.
  const { data: branch } = await supabase
    .from('businesses')
    .select('id, name, phone, branch_label, verified, is_hq')
    .eq('id', branchId)
    .eq('org_id', actor.orgId)
    .maybeSingle()

  if (!branch || branch.is_hq) {
    return NextResponse.json({ error: 'Branch not found in your organization' }, { status: 404 })
  }
  if (branch.verified) {
    return NextResponse.json({ error: 'This branch is already verified — no invite needed.' }, { status: 400 })
  }

  // If the manager already set a password, a fresh setup link would let
  // whoever intercepts it take the account over. Refuse and point to the
  // normal OTP-verified password reset on /login instead.
  const { data: account } = await supabase
    .from('business_accounts')
    .select('business_id')
    .eq('business_id', branchId)
    .maybeSingle()
  if (account) {
    return NextResponse.json(
      { error: 'This branch already has a portal account. Use Forgot Password on the login page instead.' },
      { status: 409 }
    )
  }

  // Rotate the edit token: the lost/leaked link stops working and the new
  // invite becomes the only way to claim the branch. Safe here because an
  // unclaimed branch has nothing relying on the old token yet.
  const newToken = crypto.randomUUID()
  const { error: updErr } = await supabase
    .from('businesses')
    .update({ edit_token: newToken })
    .eq('id', branchId)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  const siteUrl = process.env.SITE_URL || 'https://wadirectory.co.zw'
  const setupLink = `${siteUrl}/account-setup?token=${newToken}`
  const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
  sendWhatsAppMessage(
    branch.phone,
    [
      `🏢 *BRANCH INVITE (re-sent): ${actor.orgName}*`,
      '',
      `Here is your portal setup link again for *${branch.name}*${branch.branch_label ? ` (${branch.branch_label})` : ''}.`,
      'Any earlier link for this branch no longer works.',
      '',
      'Set your portal password to manage this branch:',
      setupLink,
      '',
      'Your branch portal shows only your branch — HQ manages its own view separately.',
      'Keep this link safe: anyone with it can claim this branch account.',
    ].join('\n')
  ).catch(() => {})

  return NextResponse.json({ success: true, resentTo: branch.phone })
}
