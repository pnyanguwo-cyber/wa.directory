'use client'

import { useEffect, useState } from 'react'
import ChatWorkspace from '@/components/chat/chat-workspace'

export default function AdminChats({ onHarvest }: { onHarvest: (phone: string) => void }) {
  const [adminNumbers, setAdminNumbers] = useState<string[]>([])
  const [businessNumbers, setBusinessNumbers] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/admin/bot-settings')
        if (res.ok) {
          const data = await res.json()
          const nums = [data.root, ...(Array.isArray(data.allowlist) ? data.allowlist : [])].filter(Boolean)
          if (!cancelled) setAdminNumbers(nums)
        }
      } catch {
        // ignore — tags are a convenience, not a blocker
      }
      try {
        const res = await fetch('/api/admin/listings')
        if (res.ok) {
          const data = await res.json()
          const nums = (Array.isArray(data.businesses) ? data.businesses : [])
            .map((b: { phone?: string }) => b.phone)
            .filter(Boolean)
          if (!cancelled) setBusinessNumbers(nums)
        }
      } catch {
        // ignore
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <ChatWorkspace
      endpoint="/api/admin/chats"
      subtitle="Every bot conversation across the directory. Manage unread state, resolve, archive, block and harvest."
      canBlock
      canClear
      onHarvest={onHarvest}
      harvestLabel="Harvest This Chat"
      adminNumbers={adminNumbers}
      businessNumbers={businessNumbers}
    />
  )
}
