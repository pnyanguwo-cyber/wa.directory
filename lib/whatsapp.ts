const WHATSAPP_API = 'https://graph.facebook.com/v18.0'

async function postToWhatsApp(phoneNumberId: string, accessToken: string, payload: unknown): Promise<boolean> {
  try {
    // Test mode: log instead of sending so message-flow changes can be
    // validated end-to-end without delivering anything to real users.
    if (process.env.WHATSAPP_DRY_RUN === '1') {
      const p = payload as { to?: string; text?: { body?: string } }
      console.log(`[whatsapp][dry-run] to=${p.to ?? '(n/a)'}\n${p.text?.body ?? JSON.stringify(payload)}`)
      return true
    }
    const res = await fetch(`${WHATSAPP_API}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[whatsapp] Send failed:', err)
      return false
    }
    return true
  } catch (err) {
    console.error('[whatsapp] Network error:', err)
    return false
  }
}

export async function sendWhatsAppMessage(to: string, message: string, replyTo?: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    console.warn('[whatsapp] Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN')
    return
  }

  await postToWhatsApp(phoneNumberId, accessToken, {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: message },
    ...(replyTo ? { context: { message_id: replyTo } } : {}),
  })
}

// Mark an inbound message as read (blue ticks), optionally lighting the
// composing indicator for ~30s or until the next outgoing message. Pure
// best-effort: failures are swallowed — never let cosmetics break a reply.
export async function markRead(messageId: string, typing = false) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  if (!messageId || !phoneNumberId || !accessToken) return

  if (process.env.WHATSAPP_DRY_RUN === '1') {
    console.log(`[whatsapp][dry-run][read${typing ? '+typing' : ''}] id=${messageId}`)
    return
  }

  try {
    const res = await fetch(`${WHATSAPP_API}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
        ...(typing ? { typing_indicator: { type: 'text' } } : {}),
      }),
    })
    if (!res.ok) return
  } catch {
    // Cosmetic only.
  }
}

// Native "share your location" prompt: one interactive message with the
// phone's location button. Falls back to a plain-text ask when the
// business account doesn't support the template type.
export async function sendLocationRequest(to: string, body: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneNumberId || !accessToken) {
    console.warn('[whatsapp] Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN')
    return
  }

  const cleanBody = clip(body, 1024)
  if (process.env.WHATSAPP_DRY_RUN === '1') {
    console.log(`[whatsapp][dry-run][location_request] to=${to}\n${cleanBody}`)
    return
  }

  const ok = await postToWhatsApp(phoneNumberId, accessToken, {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'location_request_message',
      body: { text: cleanBody, type: 'text' },
      action: { name: 'send_location' },
    },
  })

  if (!ok) {
    await postToWhatsApp(phoneNumberId, accessToken, {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: `${cleanBody}\n\n(Please send your location, or type your town — e.g. *harare*.)` },
    })
  }
}

// React to one of the user's own messages (best-effort cosmetics).
export async function sendReaction(to: string, messageId: string, emoji: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  if (!messageId || !phoneNumberId || !accessToken) return

  if (process.env.WHATSAPP_DRY_RUN === '1') {
    console.log(`[whatsapp][dry-run][reaction] to=${to} ${emoji} on ${messageId}`)
    return
  }

  await postToWhatsApp(phoneNumberId, accessToken, {
    messaging_product: 'whatsapp',
    to,
    type: 'reaction',
    reaction: { message_id: messageId, emoji },
  })
}

// ── Interactive (WhatsApp native) messages ────────────────────────────────
// Cloud API limits: body 1024, list button label 20, up to 10 rows over all
// sections (row title 24, description 72), up to 3 reply buttons (title 20,
// id 256). Helpers clip every field so oversized data can still go out
// instead of erroring the whole send.

function clip(text: string, max: number): string {
  const t = (text || '').trim()
  return t.length <= max ? t : t.slice(0, max - 1) + '…'
}

export interface InteractiveRow {
  id: string
  title: string
  description?: string
}

export interface InteractiveButton {
  id: string
  title: string
}

async function postInteractive(
  to: string,
  kind: 'list' | 'button',
  interactive: Record<string, unknown>,
  bodyForLog: string,
  summaryForLog: string,
  replyTo?: string
): Promise<boolean> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    console.warn('[whatsapp] Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN')
    return false
  }

  if (process.env.WHATSAPP_DRY_RUN === '1') {
    console.log(
      `[whatsapp][dry-run][${kind}] to=${to} (${summaryForLog})\n${bodyForLog}`
    )
    return true
  }

  return postToWhatsApp(phoneNumberId, accessToken, {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: { type: kind, ...interactive },
    ...(replyTo ? { context: { message_id: replyTo } } : {}),
  })
}

/**
 * CTA-URL message: body text with one native button that opens a link.
 * Some WhatsApp Business Accounts don't support cta_url yet (recent rollout),
 * so a failure degrades to plain text carrying the same (short) link.
 */
export async function sendCtaUrl(to: string, body: string, displayText: string, url: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    console.warn('[whatsapp] Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN')
    return
  }

  const cleanBody = clip(body, 1024)
  if (process.env.WHATSAPP_DRY_RUN === '1') {
    console.log(
      `[whatsapp][dry-run][cta_url] to=${to} [${clip(displayText, 25)}] → ${url}\n${cleanBody}`
    )
    return
  }

  const ok = await postToWhatsApp(phoneNumberId, accessToken, {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'cta_url',
      body: { text: cleanBody },
      action: {
        name: 'cta_url',
        parameters: { display_text: clip(displayText, 25), url },
      },
    },
  })

  if (!ok) {
    await postToWhatsApp(phoneNumberId, accessToken, {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: `${cleanBody}\n\n💬 ${url}` },
    })
  }
}

/** List message: a body plus a button that opens tappable rows. */
export async function sendInteractiveList(
  to: string,
  body: string,
  rows: InteractiveRow[],
  buttonLabel = 'Choose a business',
  replyTo?: string
) {
  const safeRows = rows.slice(0, 10).map(r => ({
    id: clip(r.id, 200),
    title: clip(r.title, 24),
    description: r.description ? clip(r.description, 72) : undefined,
  }))

  await postInteractive(
    to,
    'list',
    {
      body: { text: clip(body, 1024) },
      action: {
        button: clip(buttonLabel, 20),
        sections: [{ title: clip('Options', 24) as string, rows: safeRows }],
      },
    },
    clip(body, 1024),
    `${safeRows.length} rows: ${safeRows.map(r => `${r.id}: ${r.title}${r.description ? ` (${r.description})` : ''}`).join(' | ')}`,
    replyTo
  )
}

/** Button message: a body with up to three quick-reply buttons. */
export async function sendInteractiveButtons(
  to: string,
  body: string,
  buttons: InteractiveButton[],
  replyTo?: string
) {
  const safeButtons = buttons.slice(0, 3).map(b => ({
    type: 'reply' as const,
    reply: { id: clip(b.id, 256), title: clip(b.title, 20) },
  }))

  if (safeButtons.length === 0) {
    await sendWhatsAppMessage(to, clip(body, 4096))
    return
  }

  await postInteractive(
    to,
    'button',
    {
      body: { text: clip(body, 1024) },
      action: { buttons: safeButtons },
    },
    clip(body, 1024),
    safeButtons.map(b => b.reply.id).join(','),
    replyTo
  )
}

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  params: string[] = [],
  language = 'en'
) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    console.warn('[whatsapp] Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN')
    return
  }

  await postToWhatsApp(phoneNumberId, accessToken, {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: language },
      components:
        params.length > 0
          ? [{ type: 'body', parameters: params.map(p => ({ type: 'text', text: p })) }]
          : undefined,
    },
  })
}