import { NextResponse } from 'next/server'
import { adminGuard } from '@/lib/admin-auth'
import { getAdminChat, listAdminChats, updateChat, type ChatAction } from '@/lib/chat-server'

const ACTIONS: ChatAction[] = [
  'read',
  'resolve',
  'reopen',
  'archive',
  'unarchive',
  'block',
  'unblock',
]

export async function GET(request: Request) {
  const denied = adminGuard()
  if (denied) return denied

  try {
    const params = new URL(request.url).searchParams
    const phone = params.get('phone') || ''
    const before = params.get('before') || ''
    if (phone) {
      const detail = await getAdminChat(phone, before)
      if (!detail) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
      return NextResponse.json({ detail })
    }
    const threads = await listAdminChats()
    return NextResponse.json({ threads })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load conversations' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  const denied = adminGuard()
  if (denied) return denied

  try {
    const body = await request.json()
    const phone = typeof body.phone === 'string' ? body.phone : ''
    const action = body.action as ChatAction
    if (!phone || !ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'phone and a valid action are required' }, { status: 400 })
    }
    const result = await updateChat('admin', phone, action)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
