import { NextResponse } from 'next/server'
import { clearBusinessSession } from '@/lib/business-auth'

export async function POST() {
  clearBusinessSession()
  return NextResponse.json({ success: true })
}