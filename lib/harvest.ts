import { getSupabase } from '@/lib/supabase-server'
import { escapeCsv, redactPersonalData } from '@/lib/chat'
import { HARVEST_CATEGORIES } from '@/lib/harvest-constants'

export { HARVEST_CATEGORIES }

export interface TrainingExample {
  id: string
  phone: string
  user_message: string
  assistant_message: string
  category: string
  tags: string[]
  redacted: boolean
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by: string
  reviewed_at: string | null
  rejection_reason: string
  created_at: string
}

export interface HarvestFilters {
  status?: 'pending' | 'approved' | 'rejected' | 'all'
  category?: string
  q?: string
}

const EXAMPLE_COLUMNS =
  'id, phone, user_message, assistant_message, category, tags, redacted, status, reviewed_by, reviewed_at, rejection_reason, created_at'

export async function listTrainingExamples(filters: HarvestFilters = {}): Promise<TrainingExample[]> {
  let query = getSupabase()
    .from('training_examples')
    .select(EXAMPLE_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(300)

  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status)
  if (filters.category && filters.category !== 'all') query = query.eq('category', filters.category)
  if (filters.q) {
    const safe = filters.q.replace(/[%,()]/g, ' ').trim()
    if (safe) {
      query = query.or(`user_message.ilike.%${safe}%,assistant_message.ilike.%${safe}%`)
    }
  }

  const { data, error } = await query
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') return []
    throw new Error(error.message)
  }
  return (data || []).map(row => ({
    ...row,
    tags: Array.isArray(row.tags) ? row.tags : [],
    redacted: !!row.redacted,
  })) as TrainingExample[]
}

export async function harvestStats(): Promise<{
  pending: number
  approved: number
  rejected: number
  total: number
  ready: boolean
}> {
  const supabase = getSupabase()
  const statuses = ['pending', 'approved', 'rejected'] as const
  const results = await Promise.all(
    statuses.map(status =>
      supabase
        .from('training_examples')
        .select('id', { count: 'exact', head: true })
        .eq('status', status)
    )
  )
  const missing = results.some(
    result => result.error && (result.error.code === '42P01' || result.error.code === 'PGRST205')
  )
  const counts = results.map(result => (result.error ? 0 : result.count || 0))
  return {
    pending: counts[0],
    approved: counts[1],
    rejected: counts[2],
    total: counts[0] + counts[1] + counts[2],
    ready: !missing,
  }
}

export interface HarvestExchange {
  userMessage: string
  assistantMessage: string
}

export async function createTrainingExamples(input: {
  phone: string
  exchanges: HarvestExchange[]
  category: string
  tags: string[]
  redact: boolean
  reviewedBy: string
}): Promise<{ created: number; error?: string }> {
  const exchanges = input.exchanges
    .filter(item => (item.userMessage || '').trim() && (item.assistantMessage || '').trim())
    .slice(0, 25)
  if (!exchanges.length) return { created: 0, error: 'Select at least one complete exchange' }

  const category = HARVEST_CATEGORIES.includes(input.category as never)
    ? input.category
    : 'general'
  const tags = [...new Set(input.tags.map(tag => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 8)

  const rows = exchanges.map(item => {
    const user = input.redact ? redactPersonalData(item.userMessage) : item.userMessage.trim()
    const assistant = input.redact
      ? redactPersonalData(item.assistantMessage)
      : item.assistantMessage.trim()
    return {
      phone: input.phone,
      source: 'admin',
      user_message: user.slice(0, 4000),
      assistant_message: assistant.slice(0, 6000),
      category,
      tags,
      redacted: input.redact,
      status: 'pending' as const,
      reviewed_by: '',
    }
  })

  const { data, error } = await getSupabase()
    .from('training_examples')
    .insert(rows)
    .select('id')
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') {
      return { created: 0, error: 'Harvest storage is not migrated yet. Apply migration 035.' }
    }
    return { created: 0, error: error.message }
  }
  return { created: data?.length || 0 }
}

export async function reviewTrainingExample(input: {
  id: string
  action: 'approve' | 'reject'
  category?: string
  tags?: string[]
  reason?: string
  reviewedBy: string
}): Promise<{ ok: boolean; error?: string }> {
  if (!input.id) return { ok: false, error: 'Example id is required' }
  const now = new Date().toISOString()
  const patch: Record<string, unknown> = {
    status: input.action === 'approve' ? 'approved' : 'rejected',
    reviewed_by: input.reviewedBy,
    reviewed_at: now,
    updated_at: now,
    rejection_reason: input.action === 'reject' ? (input.reason || '').slice(0, 500) : '',
  }
  if (input.category) {
    patch.category = HARVEST_CATEGORIES.includes(input.category as never) ? input.category : 'general'
  }
  if (Array.isArray(input.tags)) {
    patch.tags = [...new Set(input.tags.map(tag => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 8)
  }

  const { error } = await getSupabase().from('training_examples').update(patch).eq('id', input.id)
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') {
      return { ok: false, error: 'Harvest storage is not migrated yet. Apply migration 035.' }
    }
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function deleteTrainingExample(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!id) return { ok: false, error: 'Example id is required' }
  const { error } = await getSupabase().from('training_examples').delete().eq('id', id)
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205') {
      return { ok: false, error: 'Harvest storage is not migrated yet. Apply migration 035.' }
    }
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export function trainingExamplesToCsv(examples: TrainingExample[]): string {
  const header = [
    'id',
    'status',
    'category',
    'tags',
    'user_message',
    'assistant_message',
    'redacted',
    'reviewed_by',
    'reviewed_at',
    'created_at',
  ]
  const lines = [header.join(',')]
  for (const row of examples) {
    lines.push(
      [
        row.id,
        row.status,
        row.category,
        row.tags.join('|'),
        row.user_message,
        row.assistant_message,
        row.redacted,
        row.reviewed_by,
        row.reviewed_at || '',
        row.created_at,
      ]
        .map(escapeCsv)
        .join(',')
    )
  }
  return lines.join('\r\n')
}
