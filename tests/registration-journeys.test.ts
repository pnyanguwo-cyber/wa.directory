import { describe, it, expect, vi, beforeEach } from 'vitest'

// In-memory conversation state, so the tests exercise the real registration
// state machine without Supabase or WhatsApp.
const h = vi.hoisted(() => ({
  states: new Map<string, { state: string; context: any }>(),
  messages: [] as Array<{ to: string; text: string }>,
  buttons: [] as Array<{ to: string; body: string; buttons: Array<{ id: string; title: string }> }>,
  images: [] as Array<{ to: string; bytes: Uint8Array; caption: string }>,
  createListing: vi.fn(),
  requestTrial: vi.fn(),
  analyse: vi.fn(),
  dbRows: [] as any[],
}))

vi.mock('@/lib/whatsapp', () => ({
  sendWhatsAppMessage: vi.fn(async (to: string, text: string) => {
    h.messages.push({ to, text })
  }),
  sendInteractiveButtons: vi.fn(async (to: string, body: string, buttons: Array<{ id: string; title: string }>) => {
    h.buttons.push({ to, body, buttons })
  }),
  sendInteractiveList: vi.fn(async () => {}),
}))

vi.mock('@/lib/bot-state', () => ({
  setConversationState: vi.fn(async (phone: string, state: string, context: any = {}) => {
    h.states.set(phone, { state, context: { ...context } })
  }),
  getConversationState: vi.fn(async (phone: string) => h.states.get(phone) || null),
  updateConversationContext: vi.fn(async (phone: string, patch: any) => {
    const current = h.states.get(phone)
    if (current) h.states.set(phone, { ...current, context: { ...current.context, ...patch } })
  }),
  clearConversationState: vi.fn(async (phone: string) => {
    h.states.delete(phone)
  }),
}))

vi.mock('@/lib/ai-registration', () => ({
  analyseBusinessMaterial: h.analyse,
}))

vi.mock('@/lib/listing-create', () => ({
  createListing: h.createListing,
}))

vi.mock('@/lib/trial-helpers', () => ({
  requestTrial: h.requestTrial,
}))

vi.mock('@/lib/supabase-server', () => {
  const builder: any = {
    select: () => builder,
    ilike: () => builder,
    eq: () => builder,
    in: () => builder,
    maybeSingle: async () => ({ data: h.dbRows[0] || null, error: null }),
    single: async () => ({ data: h.dbRows[0] || null, error: null }),
  }
  return { getSupabase: () => ({ from: () => builder }), getSupabaseAdmin: () => ({ from: () => builder }) }
})

import {
  startRegistrationFlow,
  chooseRegistrationPlan,
  handleRegistrationMessage,
  handleRegistrationImage,
} from '@/lib/bot-registration'

const PHONE = '263771234567'

beforeEach(() => {
  h.states.clear()
  h.messages.length = 0
  h.buttons.length = 0
  h.images.length = 0
  h.dbRows.length = 0
  h.createListing.mockReset().mockResolvedValue({
    id: 'biz-1',
    businessId: 'WA-001',
    name: 'Acme Bakery',
    slug: 'acme-bakery',
    username: 'acmebakery',
  })
  h.requestTrial.mockReset().mockResolvedValue({ ok: true })
  h.analyse.mockReset()
})

async function state() {
  return h.states.get(PHONE)
}

async function answer(text: string) {
  const current = await state()
  await handleRegistrationMessage(PHONE, text, current?.context || {})
}

describe('Journey A — trial registration is image-first, then manual', () => {
  it('offers trial/paid, then upload/skip before any registration question', async () => {
    await startRegistrationFlow(PHONE)

    expect(h.buttons[0].buttons.map(b => b.id)).toEqual(['reg_plan_trial', 'reg_plan_paid'])
    expect((await state())?.state).toBe('REGISTRATION_STARTED')
    expect(h.messages.concat(h.buttons as any).map((m: any) => m.text || m.body).join('\n')).not.toMatch(/Question 1 of 11/i)

    await chooseRegistrationPlan(PHONE, 'reg_plan_trial')

    expect((await state())?.state).toBe('REGISTRATION_AWAITING_IMAGE')
    expect(h.buttons[1].buttons.map(b => b.id)).toEqual(['reg_upload', 'reg_skip'])
    expect(h.buttons[1].body).toMatch(/picture/i)
    expect(JSON.stringify(h.messages)).not.toMatch(/Question 1 of 11/i)
  })

  it('completes a manual trial registration and requests (does not start) the trial', async () => {
    await startRegistrationFlow(PHONE)
    await chooseRegistrationPlan(PHONE, 'reg_plan_trial')
    await answer('reg_skip')

    expect((await state())?.state).toBe('REGISTRATION_COLLECTING_FIELDS')
    expect(h.messages.some(m => /business name/i.test(m.text))).toBe(true)

    for (const value of ['Acme Bakery', 'Food & Restaurant', '0771234567', 'Harare', 'Fresh bread daily']) {
      await answer(value)
      const current = await state()
      if (current?.state === 'REGISTRATION_FINAL_REVIEW') break
    }

    await answer('publish')

    expect(h.createListing).toHaveBeenCalledTimes(1)
    expect(h.requestTrial).toHaveBeenCalledWith('biz-1')
    expect((await state())?.state).toBe('AWAITING_ADMIN_REVIEW')
    expect(h.messages.some(m => /trial requested/i.test(m.text))).toBe(true)
    expect(h.messages.some(m => /starts only after/i.test(m.text))).toBe(true)
  })
})

describe('Journey B — paid registration uses the same image-first step and $2', () => {
  it('extracts from an image, reviews, and submits a paid listing', async () => {
    h.analyse.mockResolvedValue({
      ok: true,
      draft: {
        fields: {
          business_name: { value: 'Acme Bakery', confidence: 1, status: 'suggested' },
          category: { value: 'Food & Restaurant', confidence: 1, status: 'suggested' },
          phone: { value: '0771234567', confidence: 1, status: 'suggested' },
          city: { value: 'Harare', confidence: 1, status: 'suggested' },
          description: { value: 'Fresh bread daily', confidence: 1, status: 'suggested' },
        },
      },
    })

    await startRegistrationFlow(PHONE)
    await chooseRegistrationPlan(PHONE, 'reg_plan_paid')
    await handleRegistrationImage(PHONE, new Uint8Array([1, 2, 3]), '')

    expect((await state())?.state).toBe('REGISTRATION_REVIEW_EXTRACTED')
    expect(h.buttons[h.buttons.length - 1].body).toContain('Acme Bakery')
    expect(h.buttons[h.buttons.length - 1].buttons.map(b => b.id)).toEqual(['reg_proceed', 'reg_edit'])

    await answer('reg_proceed')
    await answer('publish')

    expect(h.requestTrial).not.toHaveBeenCalled()
    expect(h.createListing).toHaveBeenCalledTimes(1)
    expect(h.messages.some(m => /USD \$2\.00\/month/.test(m.text))).toBe(true)
  })

  it('keeps the paid plan after AI finds missing fields', async () => {
    h.analyse.mockResolvedValue({
      ok: true,
      draft: {
        fields: {
          business_name: { value: 'Acme Bakery', confidence: 1, status: 'suggested' },
        },
      },
    })

    await startRegistrationFlow(PHONE)
    await chooseRegistrationPlan(PHONE, 'reg_plan_paid')
    await handleRegistrationImage(PHONE, new Uint8Array([1]), '')

    const current = await state()
    expect(current?.state).toBe('REGISTRATION_COLLECTING_FIELDS')
    expect(current?.context.approvedPlan).toBe('1m')
    expect(h.messages.some(m => /category/i.test(m.text))).toBe(true)
  })

  it('never falls through to "Question 1 of 11" when extraction fails', async () => {
    h.analyse.mockResolvedValue({ ok: false, reason: 'unreadable' })

    await startRegistrationFlow(PHONE)
    await chooseRegistrationPlan(PHONE, 'reg_plan_trial')
    await handleRegistrationImage(PHONE, new Uint8Array([9]), '')

    expect((await state())?.state).toBe('REGISTRATION_AWAITING_IMAGE')
    expect(h.buttons[h.buttons.length - 1].buttons.map(b => b.id)).toEqual(['reg_upload', 'reg_skip'])
    expect(JSON.stringify(h.messages)).not.toMatch(/Question 1 of 11/i)
  })
})
