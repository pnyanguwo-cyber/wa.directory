/**
 * WhatsApp Flows Engine & Data Exchange Integration
 *
 * Handles native WhatsApp Flows (screens, data-exchange, encryption/decryption,
 * PhotoPicker processing with Gemini AI extraction, and fallback to chatbot).
 */

import crypto from 'crypto'
import { analyseBusinessMaterial, RegistrationDraft } from '@/lib/ai-registration'
import { categories } from '@/data/categories'
import { createListing } from '@/lib/listing-create'
import { sendWhatsAppMessage, sendInteractiveButtons } from '@/lib/whatsapp'
import { logOnboarding, maskPhone } from '@/lib/onboarding-log'

const CATEGORY_NAMES = categories.map(c => c.name)

/**
 * Flow Screen IDs
 */
export type FlowScreenId =
  | 'START_MATERIAL'
  | 'BUSINESS_INFO'
  | 'LOCATION_INFO'
  | 'BUSINESS_DETAILS'
  | 'REVIEW_SUBMIT'

export interface FlowPayload {
  version: string
  action: 'INIT' | 'data_exchange' | 'navigate' | 'ping'
  screen?: FlowScreenId
  data?: Record<string, any>
  flow_token?: string
}

export interface FlowResponse {
  version: string
  screen: FlowScreenId
  data: Record<string, any>
  error_message?: string
}

/**
 * Encrypt and Decrypt utilities for Meta WhatsApp Flows endpoint.
 * Meta uses AES-128-GCM / RSA-OAEP for end-to-end payload security.
 */
export function decryptFlowRequest(body: string, privateKeyPem: string) {
  // In development / testing environments without RSA key configured, returns parsed JSON directly
  try {
    const parsed = JSON.parse(body)
    if (parsed.encrypted_flow_data) {
      // Decode RSA encrypted AES key & payload
      // Production decryption routine
      const encryptedKey = Buffer.from(parsed.encrypted_aes_key, 'base64')
      const initialVector = Buffer.from(parsed.initial_vector, 'base64')
      const encryptedData = Buffer.from(parsed.encrypted_flow_data, 'base64')

      const decryptedAesKey = crypto.privateDecrypt(
        {
          key: privateKeyPem,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        encryptedKey
      )

      const authTag = encryptedData.slice(-16)
      const cipherText = encryptedData.slice(0, -16)

      const decipher = crypto.createDecipheriv('aes-128-gcm', decryptedAesKey, initialVector)
      decipher.setAuthTag(authTag)

      const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()])
      return JSON.parse(decrypted.toString('utf8'))
    }
    return parsed
  } catch (err) {
    console.warn('[whatsapp-flows] Decryption fallback to JSON parse:', err)
    return JSON.parse(body)
  }
}

/**
 * Process Flow Data Exchange requests
 */
export async function handleFlowDataExchange(
  payload: FlowPayload,
  phone: string
): Promise<FlowResponse> {
  const { action, screen, data = {}, flow_token } = payload

  // Handle PhotoPicker upload on Screen 1 FIRST. The previous order returned
  // the INIT screen for every START_MATERIAL payload, so the image branch was
  // unreachable and extraction never ran.
  if (screen === 'START_MATERIAL' && action !== 'INIT') {
    const imageMediaId = data.business_material_photo?.[0]?.id || data.photo_id

    if (imageMediaId) {
      try {
        // Fetch media URL from Meta Cloud API
        const { fetchMediaUrl } = await import('@/lib/whatsapp')
        const mediaUrl = await fetchMediaUrl(imageMediaId)

        if (mediaUrl) {
          const res = await fetch(mediaUrl)
          const bytes = new Uint8Array(await res.arrayBuffer())

          // Call existing Gemini AI extraction module
          const outcome = await analyseBusinessMaterial([bytes], CATEGORY_NAMES)

          if (outcome.ok) {
            const fields = outcome.draft.fields
            return {
              version: '3.0',
              screen: 'BUSINESS_INFO',
              data: {
                extracted: true,
                extracted_summary: `AI Extracted: ${fields.business_name.value || 'Name missing'}`,
                business_name: fields.business_name.value || '',
                category: fields.category.value || '',
                phone: fields.phone.value || phone,
                city: fields.city.value || '',
                area: fields.area.value || '',
                address: fields.address.value || '',
                description: fields.description.value || '',
                website: fields.website.value || '',
                categories: CATEGORY_NAMES.slice(0, 30).map(c => ({ id: c, title: c })),
              },
            }
          }
        }
      } catch (err) {
        console.error('[whatsapp-flows] Image processing error:', err)
      }
    }

    // Default / Skip image fallback -> Move to Screen 2
    return {
      version: '3.0',
      screen: 'BUSINESS_INFO',
      data: {
        extracted: false,
        business_name: '',
        category: '',
        phone,
        categories: CATEGORY_NAMES.slice(0, 30).map(c => ({ id: c, title: c })),
      },
    }
  }

  // INIT: Load categories and initial state
  if (action === 'INIT' || !screen) {
    return {
      version: '3.0',
      screen: 'START_MATERIAL',
      data: {
        categories: CATEGORY_NAMES.slice(0, 30).map(c => ({ id: c, title: c })),
      },
    }
  }

  // Navigation between screens
  if (screen === 'BUSINESS_INFO') {
    return {
      version: '3.0',
      screen: 'LOCATION_INFO',
      data: {
        ...data,
      },
    }
  }

  if (screen === 'LOCATION_INFO') {
    return {
      version: '3.0',
      screen: 'BUSINESS_DETAILS',
      data: {
        ...data,
      },
    }
  }

  if (screen === 'BUSINESS_DETAILS') {
    return {
      version: '3.0',
      screen: 'REVIEW_SUBMIT',
      data: {
        ...data,
        summary_name: data.business_name || 'N/A',
        summary_category: data.category || 'N/A',
        summary_phone: data.phone || phone,
        summary_location: [data.area, data.city, 'Zimbabwe'].filter(Boolean).join(', '),
      },
    }
  }

  // Final Submission
  if (screen === 'REVIEW_SUBMIT') {
    const listingInput = {
      name: data.business_name,
      categories: [data.category || 'Other'],
      city: data.city || 'Harare',
      phone: data.phone || phone,
      areas: data.area ? [data.area] : [],
      address: data.address || '',
      description: data.description || '',
      website: data.website || '',
      catalogLink: data.catalog_link || '',
      priceRange: data.prices || '',
    }

    const result = await createListing(listingInput)

    if ('error' in result) {
      return {
        version: '3.0',
        screen: 'REVIEW_SUBMIT',
        data: {
          ...data,
          error_message: result.error,
        },
      }
    }

    // Success response
    await sendWhatsAppMessage(
      phone,
      `🎉 *Listing Submitted via WhatsApp Flow!*

Your listing for *${result.name}* is received and pending admin review.
Business ID: ${result.businessId}
Username: @${result.username}

We will notify you as soon as your listing is verified.`
    )

    return {
      version: '3.0',
      screen: 'REVIEW_SUBMIT',
      data: {
        success: true,
        business_id: result.businessId,
      },
    }
  }

  return {
    version: '3.0',
    screen: 'START_MATERIAL',
    data: {},
  }
}

/**
 * Send WhatsApp Flow Launch Interactive Message
 * Uses native WhatsApp Flow interactive message to open Flow directly in WhatsApp
 */
export async function sendRegistrationFlowMessage(to: string): Promise<boolean> {
  const flowId = process.env.WHATSAPP_FLOW_ID

  // Never launch a placeholder Flow. Without a configured, published Flow ID
  // the only safe path is the image-first chatbot flow.
  if (!flowId) {
    logOnboarding('flow_launch_skipped', { phone: maskPhone(to), reason: 'WHATSAPP_FLOW_ID_not_set' })
    return false
  }

  const { sendWhatsAppFlow } = await import('@/lib/whatsapp')

  // Generate a flow token for this session
  const flowToken = `reg_${to}_${Date.now()}`

  const message = `🏪 *Register Your Business*

Open our native registration form inside WhatsApp.

You can upload a business card, flyer, banner or advert to auto-fill details!
Or skip and enter manually.`

  // Try to launch native Flow
  const flowLaunched = await sendWhatsAppFlow(
    to,
    flowId,
    message,
    flowToken,
    'navigate',
    'Open Form',
    '3.0'
  )

  logOnboarding(flowLaunched ? 'flow_launch_ok' : 'flow_launch_failed', {
    phone: maskPhone(to),
    flowId,
  })

  // If Flow launch fails, use the image-first fallback with real tappable
  // buttons. Never fall back to plain-text questions.
  if (!flowLaunched) {
    await sendInteractiveButtons(
      to,
      `🏪 *Register Your Business*

Let's get your business listed!

Have a business card, flyer, banner or advert?

Send us a picture and our AI will extract the business information it can identify.

You can also skip and enter your details manually.`,
      [
        { id: 'reg_upload', title: '📷 Send a picture' },
        { id: 'reg_skip', title: 'Skip and enter manually' },
      ]
    )
  }

  return flowLaunched
}
