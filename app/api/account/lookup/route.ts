import { NextResponse } from 'next/server'
import {
  findBusinessesByPhone,
  getBusinessAccounts,
  sortChoicesForDisplay,
  toBusinessChoice,
} from '@/lib/account-lookup'

// Step 1 of login: resolve the WhatsApp number to the listing(s) on it.
// The password is only checked after the user has chosen one of these
// businesses, so a number with several listings never guesses which account
// the entered password belongs to.
export async function POST(request: Request) {
  try {
    const { phone } = await request.json()
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    const matches = await findBusinessesByPhone(phone)
    if (matches.length === 0) {
      return NextResponse.json(
        { error: 'No account found for that number. List your business first.' },
        { status: 404 }
      )
    }

    const accounts = await getBusinessAccounts(matches.map(business => business.id))
    return NextResponse.json({
      success: true,
      businesses: sortChoicesForDisplay(
        matches.map(business => toBusinessChoice(business, accounts.get(business.id)))
      ),
    })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
