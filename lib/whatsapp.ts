const WHATSAPP_API = 'https://graph.facebook.com/v18.0'

async function postToWhatsApp(phoneNumberId: string, accessToken: string, payload: unknown) {
  try {
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