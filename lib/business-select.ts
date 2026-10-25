export const BUSINESS_CARD_COLUMNS =
  'id, name, bio, category, phone, phone_type, voice_phone, verified, rating, review_count, location, city, area, areas, slug, logo_url, price_range, created_at, address, lat, lng, address_verified, show_location, is_remote, featured_eligible'

export const BUSINESS_PROFILE_COLUMNS =
  'id, name, bio, category, phone, phone_type, voice_phone, verified, rating, review_count, location, city, area, areas, slug, logo_url, price_range, catalog_link, website, whatsapp_username, whatsapp_link, business_id, username, payment_status, created_at, address, lat, lng, address_verified, show_location, is_remote, featured_eligible,   org_id, is_hq, branch_label, generate_site, site_hero, site_services, site_contact_email, site_theme, site_socials'

export type SupabaseClient = ReturnType<typeof import('@/lib/supabase-server').getSupabase>

// One shared "fetch these businesses by id" helper — used by the admin tables,
// cron notifications and org pages. Returns [] for an empty id list instead of
// issuing a pointless (or invalid) `.in('id', [])` query.
export async function fetchBusinessesByIds(
  supabase: SupabaseClient,
  ids: string[],
  columns = BUSINESS_CARD_COLUMNS
): Promise<Record<string, unknown>[]> {
  if (!ids.length) return []
  const { data } = await supabase.from('businesses').select(columns).in('id', ids)
  return (data as unknown as Record<string, unknown>[]) || []
}
