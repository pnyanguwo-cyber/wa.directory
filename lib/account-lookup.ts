import { getSupabase } from '@/lib/supabase-server'
import { normalizePhone } from '@/lib/business-auth'

export type PhoneBusiness = {
  id: string
  name: string
  slug: string | null
  phone: string | null
  branch_label: string | null
  is_hq: boolean | null
  verified: boolean | null
  created_at: string
}

export type BusinessAccount = {
  business_id: string
  password_hash: string | null
  otp_hash: string | null
  otp_expires_at: string | null
  disabled: boolean | null
}

export type BusinessChoice = {
  id: string
  name: string
  slug: string | null
  branchLabel: string | null
  isHq: boolean
  verified: boolean
  hasAccount: boolean
}

// A phone can belong to more than one listing. Every account flow must look
// at all of them, otherwise login checks the oldest listing only and reports
// "No password set" even when a newer listing has a working account.
export async function findBusinessesByPhone(phone: string): Promise<PhoneBusiness[]> {
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits.length < 9) return []

  const given = normalizePhone(phone)
  const { data } = await getSupabase()
    .from('businesses')
    .select('id, name, slug, phone, branch_label, is_hq, verified, created_at')
    .order('created_at', { ascending: true })
    .limit(1000)

  return ((data || []) as PhoneBusiness[]).filter(
    business => normalizePhone(business.phone || '') === given
  )
}


export async function getBusinessAccounts(
  businessIds: string[]
): Promise<Map<string, BusinessAccount>> {
  if (businessIds.length === 0) return new Map()

  const { data } = await getSupabase()
    .from('business_accounts')
    .select('business_id, password_hash, otp_hash, otp_expires_at, disabled')
    .in('business_id', businessIds)

  return new Map(
    ((data || []) as BusinessAccount[]).map(account => [account.business_id, account])
  )
}

export function toBusinessChoice(
  business: PhoneBusiness,
  account?: BusinessAccount
): BusinessChoice {
  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    branchLabel: business.branch_label,
    isHq: !!business.is_hq,
    verified: !!business.verified,
    hasAccount: !!account?.password_hash && !account.disabled,
  }
}

export function sortChoicesForDisplay(choices: BusinessChoice[]): BusinessChoice[] {
  return [...choices].sort((a, b) => {
    if (a.hasAccount !== b.hasAccount) return a.hasAccount ? -1 : 1
    if (a.verified !== b.verified) return a.verified ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}
