import { NextResponse } from 'next/server'
import { getActingPortalBusiness } from '@/lib/portal'
import { isPremiumActive } from '@/lib/premium-entitlement'
import {
  getBusinessChat,
  listBusinessChats,
  updateChat,
  type ChatAction,
} from '@/lib/chat-server'

const ACTIONS: ChatAction[] = ['read', 'resolve', 'reopen', 'archive', 'unarchive', 'block', 'unblock']

export async function GET(request: Request) {
  const url = new URL(request.url)
  const branchId = url.searchParams.get('branch')
  const session = await getActingPortalBusiness(branchId)
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  if (!(await isPremiumActive(branchId))) {
    return NextResponse.json({ error: 'Conversations require an active subscription' }, { status: 403 })
  }

  const business = session.business

  try {
    const phone = url.searchParams.get('phone') || ''
    if (phone) {
      const detail = await getBusinessChat(business.id, business.name, business.city || '', phone)
      if (!detail) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      return NextResponse.json({ detail })
    }
    const threads = await listBusinessChats(business.id, business.name, business.city || '')
    return NextResponse.json({ threads })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load conversations' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}))
  const branchId = body?.branch_id || null
  const session = await getActingPortalBusiness(branchId)
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  if (!(await isPremiumActive(branchId))) {
    return NextResponse.json({ error: 'Conversations require an active subscription' }, { status: 403 })
  }

  const phone = typeof body?.phone === 'string' ? body.phone : ''
  const action = body?.action as ChatAction
  if (!phone || !ACTIONS.includes(action)) {
    return NextResponse.json({ error: 'phone and a valid action are required' }, { status: 400 })
  }

  const result = await updateChat(`biz:${session.business.id}`, phone, action)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ success: true })
}
