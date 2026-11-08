'use client'

import ChatWorkspace from '@/components/chat/chat-workspace'

export default function AdminChats({ onHarvest }: { onHarvest: (phone: string) => void }) {
  return (
    <ChatWorkspace
      endpoint="/api/admin/chats"
      subtitle="Every bot conversation across the directory. Manage unread state, resolve, archive, block and harvest."
      canBlock
      canClear
      onHarvest={onHarvest}
      harvestLabel="Harvest This Chat"
    />
  )
}
