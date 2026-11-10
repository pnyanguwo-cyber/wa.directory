import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { decryptFlowRequest, handleFlowDataExchange, FlowPayload, FlowResponse } from '@/lib/whatsapp-flows'
import { logBotMessage } from '@/lib/bot-log'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { setConversationState, clearConversationState, updateConversationContext, getConversationState } from '@/lib/bot-state'
import { logOnboarding, maskPhone } from '@/lib/onboarding-log'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const APP_SECRET = process.env.WHATSAPP_APP_SECRET!
const FLOW_PRIVATE_KEY = process.env.WHATSAPP_FLOW_PRIVATE_KEY || ''

/**
 * WhatsApp Flows Data Exchange Endpoint
 *
 * Handles INIT, data_exchange, navigate, and COMPLETE actions from
 * native WhatsApp Flow screens.
 *
 * Flow schema version: 3.0
 * Screens: START_MATERIAL → BUSINESS_INFO → LOCATION_INFO → BUSINESS_DETAILS → REVIEW_SUBMIT
 *
 * Encryption: Meta encrypts payload using AES-GCM + RSA-OAEP.
 * This endpoint decrypts the incoming request, processes it,
 * and returns an encrypted response if client provided encryption params.
 */

export async function POST(request: NextRequest) {
  try {
    // 1. Verify HMAC signature (same as message webhook)
    const signature = request.headers.get('x-hub-signature-256')?.replace('sha256=', '')
    const body = await request.text()

    if (!signature || !APP_SECRET) {
      console.warn('[flow] Missing signature or APP_SECRET')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const expected = crypto.createHmac('sha256', APP_SECRET).update(body).digest('hex')

    if (signature !== expected) {
      console.warn('[flow] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // 2. Decrypt request body (Meta encrypts flow data if keys configured)
    const decrypted = decryptFlowRequest(body, FLOW_PRIVATE_KEY)
    const payload = decrypted as FlowPayload

    // Extract the phone from the Flow payload. Meta does not automatically
    // include it, so fall back to the phone embedded in the launch flow_token
    // (`reg_<phone>_<timestamp>`). Without this, every real Flow action 400s
    // and the user is dropped back to the old chat questions.
    const tokenPhone = /^reg_(\d{7,15})_/.exec(payload.flow_token || '')?.[1] || ''
    const phone = payload.data?.phone || payload.data?.user_phone || tokenPhone

    if (!phone) {
      logOnboarding('flow_missing_phone', { action: payload.action, screen: payload.screen })
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 })
    }

    // 3. Log inbound flow action for debugging
    logOnboarding('flow_action', {
      phone: maskPhone(phone),
      action: payload.action,
      screen: payload.screen || 'unknown',
    })
    await logBotMessage(phone, 'in', 'flow', `${payload.action} | ${payload.screen || 'unknown'}`)

    // 4. Handle flow action first (we need the response)
    const response = await handleFlowDataExchange(payload, phone)

    // 5. Track Flow state in conversation state
    if (payload.action === 'INIT' || (!payload.screen && !payload.action)) {
      // Flow started - set state to REGISTRATION_FLOW_ACTIVE
      await setConversationState(phone, 'REGISTRATION_FLOW_ACTIVE', {
        step: 'flow_active',
        flow_token: payload.flow_token,
        screen: 'START_MATERIAL',
      })
    } else if (payload.action === 'data_exchange' && payload.screen === 'REVIEW_SUBMIT' && response.data?.success) {
      // Flow completed successfully - clear registration state
      await clearConversationState(phone)
    } else if (payload.screen) {
      // Track current screen in context
      const stateData = await getConversationState(phone)
      if (stateData?.state === 'REGISTRATION_FLOW_ACTIVE') {
        await updateConversationContext(phone, {
          screen: payload.screen,
          flow_token: payload.flow_token,
        })
      }
    }

    // 6. Encrypt response if encryption requested by client
    // In production, this should use the client's public key
    const encryptedResponse = await encryptFlowResponse(response, payload)

    return NextResponse.json(encryptedResponse, { status: 200 })

  } catch (err) {
    console.error('[flow] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Encrypt Flow response using client's public key if provided.
 * Falls back to plaintext if encryption not configured.
 */
async function encryptFlowResponse(response: FlowResponse, requestPayload: FlowPayload): Promise<any> {
  const clientPublicKey = requestPayload.data?.public_key || process.env.WHATSAPP_FLOW_PUBLIC_KEY || ''

  if (!clientPublicKey || !FLOW_PRIVATE_KEY) {
    // No encryption configured - return plaintext
    return response
  }

  try {
    const aesKey = crypto.randomBytes(16)
    const iv = crypto.randomBytes(12)

    const cipher = crypto.createCipheriv('aes-128-gcm', aesKey, iv)
    const payloadStr = JSON.stringify(response)
    const encrypted = Buffer.concat([cipher.update(payloadStr, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()

    // Encrypt AES key with client's public RSA key
    const encryptedAesKey = crypto.publicEncrypt(
      {
        key: clientPublicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      aesKey
    )

    return {
      version: response.version,
      data: Buffer.concat([encrypted, authTag]).toString('base64'),
      encrypted_aes_key: encryptedAesKey.toString('base64'),
      initial_vector: iv.toString('base64'),
    }
  } catch (err) {
    console.error('[flow] Encryption error:', err)
    return response
  }
}

/**
 * GET endpoint for Flow health checks (optional)
 */
export async function GET(request: NextRequest) {
  const challenge = request.nextUrl.searchParams.get('challenge')
  if (challenge) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ status: 'ok', service: 'whatsapp-flows' })
}