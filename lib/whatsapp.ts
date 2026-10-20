const WHATSAPP_API = 'https://graph.facebook.com/v18.0'

async function postToWhatsApp(phoneNumberId: string, accessToken: string, payload: unknown) {
  try {
    // Test mode: log instead of sending so message-flow changes can be
    // validated end-to-end without delivering anything to real users.
    if (process.env.WHATSAPP_DRY_RUN === '1') {
      const p = payload as { to?: string; text?: { body?: string } }
      console.log(`[whatsapp][dry-run] to=${p.to ?? '(n/a)'}\n${p.text?.body ?? JSON.stringify(payload)}`)
      return
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
    }
  } catch (err) {
    console.error('[whatsapp] Network error:', err)
  }
}

export async function sendWhatsAppMessage(to: string, message: string) {
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
  summaryForLog: string
) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    console.warn('[whatsapp] Missing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN')
    return
  }

  if (process.env.WHATSAPP_DRY_RUN === '1') {
    console.log(
      `[whatsapp][dry-run][${kind}] to=${to} (${summaryForLog})\n${bodyForLog}`
    )
    return
  }

  await postToWhatsApp(phoneNumberId, accessToken, {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: { type: kind, ...interactive },
  })
}

/** List message: a body plus a button that opens tappable rows. */
export async function sendInteractiveList(
  to: string,
  body: string,
  rows: InteractiveRow[],
  buttonLabel = 'Choose a business'
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
    `${safeRows.length} rows: ${safeRows.map(r => r.id).join(',')}`
  )
}

/** Button message: a body with up to three quick-reply buttons. */
export async function sendInteractiveButtons(
  to: string,
  body: string,
  buttons: InteractiveButton[]
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
    safeButtons.map(b => b.reply.id).join(',')
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