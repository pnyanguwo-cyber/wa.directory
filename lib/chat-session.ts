import { getSupabase } from './supabase-server'

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