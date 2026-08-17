import { NextResponse } from 'next/server'
import { getBusinessId } from '@/lib/business-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ loggedIn: !!getBusinessId() })
}