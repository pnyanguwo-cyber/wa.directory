import { getSupabase } from './supabase-server'
import type { ResultCard } from './bot-templates'

export interface ChatSessionData {
  name?: string
  whatsapp_username?: string
  phone?: string
  country_code?: string
  category?: string
  description?: string
  city?: string
  area?: string
  rating_pending?: string
  // ── Bot search flow ────────────────────────────────────────────────
  // Term typed by the user while waiting for a town ("Which town?").
  pending_search_term?: string
  // Town captured first, waiting for the search term ("What do you need in X?").
  pending_city?: string
  // Render-ready numbered results currently on screen (taps + typed picks
  // route through the same order).
  results?: ResultCard[]
  // What the user is currently looking at, for ⬅ Back routing.
  lastScreen?: 'list' | 'detail'
  // Where the search originated, so Back can restore the previous prompt.
  origin?: 'search_loc' | 'search_term' | 'free'
  // Search label of the current results, for Back re-rendering.
  lastTerm?: string
  lastCity?: string | null
  // True when the on-screen list is the nearest-towns tier.
  nearby?: boolean
  // 0-based page of the results list (9 businesses per page).
  page?: number
}

export interface ChatSession {
  phone: string
  step: string
  data: ChatSessionData
}

export async function getSession(phone: string): Promise<ChatSession | null> {
  try {
    const { data } = await getSupabase()
      .from('chat_sessions')
      .select('phone, step, data')
      .eq('phone', phone)
      .maybeSingle()

    if (!data) return null
    return { phone: data.phone, step: data.step, data: data.data || {} }
  } catch {
    return null
  }
}

export async function saveSession(phone: string, step: string, data: ChatSessionData) {
  try {
    await getSupabase()
      .from('chat_sessions')
      .upsert({ phone, step, data, updated_at: new Date().toISOString() }, { onConflict: 'phone' })
  } catch (err) {
    console.error('[chat-session] save failed:', err)
  }
}

export async function clearSession(phone: string) {
  try {
    await getSupabase().from('chat_sessions').delete().eq('phone', phone)
  } catch (err) {
    console.error('[chat-session] clear failed:', err)
  }
}