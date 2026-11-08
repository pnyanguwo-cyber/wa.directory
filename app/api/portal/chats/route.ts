import { NextResponse } from 'next/server'
import { getActingPortalBusiness, isPaidSubscriber } from '@/lib/portal'
import {
  getBusinessChat,
  listBusinessChats,
  updateChat,
  type ChatAction,
} from '@/lib/chat-server'

const ACTIONS: ChatAction[] = ['read', 'resolve', 'reopen', 'archive', 'unarchive', 'block', 'unblock']

export async function GET(request: Request) {
  const url = new URL(request.url)
  const session = await getActingPortalBusiness(url.searchParams.get('branch'))
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const business = session.business
  if (!(await isPaidSubscriber(business.id))) {
    return NextResponse.json({ error: 'Conversations require an active subscription' }, { status: 403 })
  }

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
  const session = await getActingPortalBusiness(body?.branch_id)
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  if (!(await isPaidSubscriber(session.business.id))) {
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
