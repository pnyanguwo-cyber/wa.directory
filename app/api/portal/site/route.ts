import { NextResponse } from 'next/server'
import { getActingPortalBusiness } from '@/lib/portal'
import { getSupabase } from '@/lib/supabase-server'

const MAX_TEXT = 2000
const MAX_EMAIL = 320

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const session = await getActingPortalBusiness()
    if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    const businessId = session.business.id

    const site_hero = typeof body?.site_hero === 'string' ? body.site_hero.trim().slice(0, MAX_TEXT) : null
    const site_services = typeof body?.site_services === 'string' ? body.site_services.trim().slice(0, MAX_TEXT) : null
    const site_contact_email = typeof body?.site_contact_email === 'string' ? body.site_contact_email.trim().slice(0, MAX_EMAIL) : null
    const generate_site = typeof body?.generate_site === 'boolean' ? body.generate_site : null

    const updates: {
      generate_site?: boolean
      site_hero?: string
      site_services?: string
      site_contact_email?: string
    } = {}
    if (generate_site !== null) updates.generate_site = generate_site
    if (site_hero !== null) updates.site_hero = site_hero
    if (site_services !== null) updates.site_services = site_services
    if (site_contact_email !== null) updates.site_contact_email = site_contact_email

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const supabase = getSupabase()
    const { error } = await supabase.from('businesses').update(updates).eq('id', businessId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
