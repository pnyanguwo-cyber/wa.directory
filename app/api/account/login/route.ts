import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { setBusinessSession } from '@/lib/business-auth'
import { findBusinessesByPhone, getBusinessAccounts } from '@/lib/account-lookup'

export async function POST(request: Request) {
  try {
    const { phone, password, business_id } = await request.json()
    if (!phone || !password || !business_id) {
      return NextResponse.json(
        { error: 'Phone number, password and business are required' },
        { status: 400 }
      )
    }

    const matches = await findBusinessesByPhone(phone)
    const business = matches.find(match => match.id === business_id)

    if (!business) {
      return NextResponse.json(
        { error: 'That business is not linked to this phone number.' },
        { status: 400 }
      )
    }

    const accounts = await getBusinessAccounts([business.id])
    const account = accounts.get(business.id)

    if (!account?.password_hash) {
      return NextResponse.json({ error: 'No password set for this account yet.' }, { status: 404 })
    }
    if (account.disabled) {
      return NextResponse.json({ error: 'This account is disabled. Contact support.' }, { status: 403 })
    }
    if (!(await bcrypt.compare(password, account.password_hash))) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
    }

    setBusinessSession(business.id)
    return NextResponse.json({
      success: true,
      name: business.name,
      slug: business.slug,
      verified: business.verified,
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        verified: business.verified,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
