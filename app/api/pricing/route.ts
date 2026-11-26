import { NextResponse } from 'next/server'
import { getPricing } from '@/lib/pricing'

export async function GET() {
  const pricing = await getPricing()
  return NextResponse.json({ pricing })
}
