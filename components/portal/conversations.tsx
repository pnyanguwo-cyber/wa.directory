'use client'

import ChatWorkspace from '@/components/chat/chat-workspace'

/**
 * Business-portal chat inbox. Conversations come from chat_logs, which the bot
 * writes when a customer opens a business chat. Replies stay in the WhatsApp
 * Business app on the owner's phone, so this workspace is intentionally
 * transcript-only (there is no outbound send path for business accounts).
 */
export default function PortalConversations({
  branchId,
  initialPhone,
}: {
  branchId?: string
  initialPhone?: string
}) {
  return (
    <ChatWorkspace
      endpoint="/api/portal/chats"
      branchId={branchId}
      initialPhone={initialPhone}
      subtitle="Customers who chatted with your business through the WA Directory bot. Private WhatsApp chats stay private."
      emptyTitle="No conversations yet"
      emptyBody="When customers find you through the bot, their chats appear here."
      canBlock
      canClear={false}
      harvestLabel="Harvest This Chat"
    />
  )
}
