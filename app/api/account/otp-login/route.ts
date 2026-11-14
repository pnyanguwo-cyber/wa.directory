import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { setBusinessSession } from '@/lib/business-auth'
import { getSupabase } from '@/lib/supabase-server'
import {
  findBusinessesByPhone,
  getBusinessAccounts,
  sortChoicesForDisplay,
  toBusinessChoice,
} from '@/lib/account-lookup'

export async function POST(request: Request) {
  try {
    const { phone, otp, business_id } = await request.json()
    if (!phone || !otp) {
      return NextResponse.json({ error: 'Phone and code are required' }, { status: 400 })
    }

    const matches = await findBusinessesByPhone(phone)
    if (matches.length === 0) {
      return NextResponse.json({ error: 'No account found for this number.' }, { status: 404 })
    }

    const scoped = business_id
      ? matches.filter(business => business.id === business_id)
      : matches

    if (scoped.length === 0) {
      return NextResponse.json(
        { error: 'That business is not linked to this phone number.' },
        { status: 400 }
      )
    }

    const accounts = await getBusinessAccounts(scoped.map(business => business.id))
    const withCode = scoped
      .map(business => ({ business, account: accounts.get(business.id) }))
      .filter(entry => !!entry.account?.otp_hash)

    if (withCode.length === 0) {
      return NextResponse.json({ error: 'No code was sent. Request a new one first.' }, { status: 400 })
    }

    if (withCode.every(entry => entry.account?.disabled)) {
      return NextResponse.json({ error: 'This account is disabled. Contact support.' }, { status: 403 })
    }

    const valid = []
    let expired = 0
    for (const entry of withCode) {
      if (entry.account?.disabled) continue
      if (
        entry.account?.otp_expires_at &&
        new Date(entry.account.otp_expires_at) < new Date()
      ) {
        expired += 1
        continue
      }
      if (await bcrypt.compare(String(otp).trim(), entry.account!.otp_hash!)) {
        valid.push(entry)
      }
    }

    if (valid.length === 0) {
      return NextResponse.json(
        {
          error:
            expired === withCode.length
              ? 'That code has expired. Request a new one.'
              : 'Incorrect code. Try again.',
        },
        { status: 400 }
      )
    }

    if (valid.length > 1) {
      return NextResponse.json(
        {
          error: 'This number is linked to more than one business. Choose the business you want to manage.',
          needsBusinessSelection: true,
          businesses: sortChoicesForDisplay(
            valid.map(entry => toBusinessChoice(entry.business, entry.account))
          ),
        },
        { status: 409 }
      )
    }

    const { business } = valid[0]

    await getSupabase()
      .from('business_accounts')
      .update({ otp_hash: '', otp_expires_at: null })
      .eq('business_id', business.id)

    setBusinessSession(business.id)
    return NextResponse.json({
      success: true,
      business: { id: business.id, name: business.name, slug: business.slug },
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
