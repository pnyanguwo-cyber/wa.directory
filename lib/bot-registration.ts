/**
 * WhatsApp Image-First Business Registration Flow
 *
 * Integrates AI business material extraction into the beginning of registration.
 * Allows business owners to send a picture (business card, flyer, banner, poster, etc.)
 * or skip to manual entry.
 */

import { sendWhatsAppMessage, sendWhatsAppImage } from '@/lib/whatsapp'
import { setConversationState, getConversationState, updateConversationContext, clearConversationState } from '@/lib/bot-state'
import { analyseBusinessMaterial, RegistrationDraft, RegistrationFields } from '@/lib/ai-registration'
import { categories } from '@/data/categories'
import { createListing, ListingInput } from '@/lib/listing-create'
import { SITE_URL } from '@/lib/site-url'

const CATEGORY_NAMES = categories.map(c => c.name)

export async function startRegistrationFlow(phone: string) {
  await setConversationState(phone, 'REGISTRATION_AWAITING_IMAGE', {
    step: 'choose_mode',
  })
}

export async function handleRegistrationMessage(phone: string, text: string, context: any) {
  const lower = text.toLowerCase().trim()

  if (lower === 'cancel' || lower === 'quit') {
    await clearConversationState(phone)
    await sendWhatsAppMessage(phone, '❌ Registration cancelled. Type *register* whenever you are ready to start again.')
    return
  }

  if (lower === 'skip' || lower === 'manual' || lower === 'enter manually') {
    // Start manual registration flow from step 1 (business name)
    await setConversationState(phone, 'REGISTRATION_COLLECTING_FIELDS', {
      collected: {},
      currentField: 'business_name',
    })
    await sendWhatsAppMessage(
      phone,
      `📝 *Manual Registration (1/5)*\n\nWhat is your business name?\n\n(Type *cancel* at any time to abort)`
    )
    return
  }

  const currentStep = context.step || 'choose_mode'

  if (currentStep === 'choose_mode') {
    if (lower.includes('skip') || lower.includes('manual')) {
      await setConversationState(phone, 'REGISTRATION_COLLECTING_FIELDS', {
        collected: {},
        currentField: 'business_name',
      })
      await sendWhatsAppMessage(
        phone,
        `📝 *Manual Registration (1/5)*\n\What is your business name?\n\n(Type *cancel* at any time to abort)`
      )
      return
    } else {
      await sendWhatsAppMessage(
        phone,
        `Please send a picture of your business material (banner, flyer, card, etc.), or type *skip* to enter your details manually.`
      )
      return
    }
  }

  // If we are collecting fields manually or missing required fields after AI extraction
  if (context.state === 'REGISTRATION_COLLECTING_FIELDS' || currentStep === 'collecting_missing') {
    await handleFieldCollection(phone, text, context)
    return
  }

  // If reviewing extracted fields
  if (currentStep === 'review_extracted') {
    if (lower === 'proceed' || lower === 'yes' || lower === 'continue' || lower === 'ok') {
      // Proceed to review full listing
      await showFinalReview(phone, context)
      return
    } else if (lower.startsWith('edit ')) {
      // Format: Edit Name: Rent Zimbabwe
      const parts = text.slice(5).split(':')
      if (parts.length >= 2) {
        const fieldName = parts[0].trim().toLowerCase()
        const fieldValue = parts.slice(1).join(':').trim()
        const fields = context.fields || {}

        // Map field name
        let key = ''
        if (fieldName.includes('name')) key = 'business_name'
        else if (fieldName.includes('category')) key = 'category'
        else if (fieldName.includes('city')) key = 'city'
        else if (fieldName.includes('phone')) key = 'phone'
        else if (fieldName.includes('description')) key = 'description'
        else if (fieldName.includes('website')) key = 'website'
        else if (fieldName.includes('address')) key = 'address'
        else if (fieldName.includes('area')) key = 'area'

        if (key) {
          fields[key] = { value: fieldValue, confidence: 1.0, status: 'suggested' }
          await updateConversationContext(phone, { fields })
          await sendWhatsAppMessage(phone, `✅ Updated *${key}* to: ${fieldValue}\n\nType *proceed* when ready, or continue editing with ` + '`edit Field: New Value`')
          return
        }
      }
    }

    await sendWhatsAppMessage(
      phone,
      `To proceed, type *proceed*. To edit a field, type e.g. \`edit Name: My Business\`.`
    )
    return
  }

  // Final review stage
  if (currentStep === 'final_review') {
    if (lower === 'publish' || lower === 'submit' || lower === 'yes') {
      await submitRegistration(phone, context)
      return
    } else if (lower.startsWith('edit ')) {
      // Handle edits in final review
      const parts = text.slice(5).split(':')
      if (parts.length >= 2) {
        const fieldName = parts[0].trim().toLowerCase()
        const fieldValue = parts.slice(1).join(':').trim()
        const listing = context.listing || {}

        let key = ''
        if (fieldName.includes('name')) key = 'name'
        else if (fieldName.includes('category')) key = 'categories'
        else if (fieldName.includes('city')) key = 'city'
        else if (fieldName.includes('phone')) key = 'phone'
        else if (fieldName.includes('description') || fieldName.includes('bio')) key = 'bio'
        else if (fieldName.includes('website')) key = 'website'
        else if (fieldName.includes('address')) key = 'address'
        else if (fieldName.includes('price')) key = 'priceRange'

        if (key) {
          if (key === 'categories') listing[key] = [fieldValue]
          else listing[key] = fieldValue
          await updateConversationContext(phone, { listing })
          await sendWhatsAppMessage(phone, `✅ Updated *${fieldName}* to: ${fieldValue}\n\nType *publish* when ready, or continue editing.`)
          await showFinalReview(phone, { ...context, listing })
          return
        }
      }
    }

    await sendWhatsAppMessage(phone, `Type *publish* to submit your listing, or \`edit Field: Value\` to make changes.`)
  }
}

export async function handleRegistrationImage(phone: string, imageBytes: Uint8Array, caption: string) {
  await setConversationState(phone, 'REGISTRATION_PROCESSING_IMAGE', { step: 'processing' })
  await sendWhatsAppMessage(phone, `🔍 Reading your business material with AI... Please give us a moment.`)

  try {
    const outcome = await analyseBusinessMaterial([imageBytes], CATEGORY_NAMES)

    if (!outcome.ok) {
      await setConversationState(phone, 'REGISTRATION_AWAITING_IMAGE', { step: 'choose_mode' })
      await sendWhatsAppMessage(
        phone,
        `⚠️ *We couldn't read the information in that image.*\n\n` +
        `You can try another picture or enter your details manually.\n\n` +
        `[Try another picture]\n[Enter manually]`
      )
      return
    }

    const draft = outcome.draft
    const fields = draft.fields

    // Check mandatory fields: name, category, phone, city, description
    const missing: string[] = []
    if (!fields.business_name.value) missing.push('business_name')
    if (!fields.category.value) missing.push('category')
    if (!fields.phone.value) missing.push('phone')
    if (!fields.city.value) missing.push('city')
    if (!fields.description.value) missing.push('description')

    // Store draft in context
    await setConversationState(phone, 'REGISTRATION_REVIEW_EXTRACTED', {
      step: 'review_extracted',
      draft,
      fields: fields,
      missing,
    })

    // Format found vs missing summary
    const foundLines: string[] = []
    const missingLines: string[] = []

    if (fields.business_name.value) foundLines.push(`✓ Name: ${fields.business_name.value}`)
    else missingLines.push('○ Name')

    if (fields.category.value) foundLines.push(`✓ Category: ${fields.category.value}`)
    else missingLines.push('○ Category')

    if (fields.phone.value) foundLines.push(`✓ Phone: ${fields.phone.value}`)
    else missingLines.push('○ Phone')

    if (fields.city.value) foundLines.push(`✓ City: ${fields.city.value}`)
    else missingLines.push('○ City')

    if (fields.description.value) foundLines.push(`✓ Description: ${fields.description.value}`)
    else missingLines.push('○ Description')

    if (fields.website.value) foundLines.push(`✓ Website: ${fields.website.value}`)
    if (fields.address.value) foundLines.push(`✓ Address: ${fields.address.value}`)

    let msg = `🔍 *We've read your business information!*\n\nHere is what we found:\n\n` + foundLines.join('\n')

    if (missingLines.length > 0) {
      msg += `\n\nWe couldn't identify:\n\n` + missingLines.join('\n')
    }

    if (missing.length > 0) {
      // Ask for the first missing mandatory field immediately
      const firstMissing = missing[0]
      await setConversationState(phone, 'REGISTRATION_COLLECTING_FIELDS', {
        step: 'collecting_missing',
        draft,
        fields,
        missing,
        currentMissingIndex: 0,
      })

      msg += `\n\nLet's complete the missing details.\n\n` + getPromptForField(firstMissing)
    } else {
      msg += `\n\nAll required information found! Type *proceed* to review your listing.`
    }

    await sendWhatsAppMessage(phone, msg)
  } catch (err) {
    console.error('[bot-registration] Image analysis error:', err)
    await setConversationState(phone, 'REGISTRATION_AWAITING_IMAGE', { step: 'choose_mode' })
    await sendWhatsAppMessage(
      phone,
      `⚠️ An error occurred while processing your image. Please try again or type *skip* to enter details manually.`
    )
  }
}

function getPromptForField(field: string): string {
  switch (field) {
    case 'business_name':
      return `What is your business name?`
    case 'category':
      return `Which category best describes your business? (e.g. Food & Restaurant, Hardware, Clothing & Fashion)`
    case 'phone':
      return `Which phone number should customers use?`
    case 'city':
      return `📍 Which city or town does your business serve?`
    case 'description':
      return `In a few words, what products or services does your business offer?`
    default:
      return `Please provide: ${field}`
  }
}

async function handleFieldCollection(phone: string, text: string, context: any) {
  const fields = context.fields || {}
  const missing = context.missing || []
  let index = context.currentMissingIndex || 0

  const currentFieldKey = missing[index]
  if (currentFieldKey) {
    // Save the provided answer into fields
    if (fields[currentFieldKey]) {
      fields[currentFieldKey].value = text
      fields[currentFieldKey].confidence = 1.0
      fields[currentFieldKey].status = 'suggested'
    } else {
      fields[currentFieldKey] = { value: text, confidence: 1.0, status: 'suggested' }
    }
  }

  index++
  if (index < missing.length) {
    // Ask next missing field
    await updateConversationContext(phone, {
      fields,
      currentMissingIndex: index,
    })
    await sendWhatsAppMessage(phone, getPromptForField(missing[index]))
  } else {
    // All required fields collected, move to final review
    await updateConversationContext(phone, {
      fields,
      step: 'final_review',
    })
    await showFinalReview(phone, { ...context, fields })
  }
}

async function showFinalReview(phone: string, context: any) {
  const f = context.fields || {}

  const name = f.business_name?.value || 'Not set'
  const category = f.category?.value || 'Other'
  const city = f.city?.value || 'Harare'
  const phoneVal = f.phone?.value || phone
  const area = f.area?.value || ''
  const description = f.description?.value || ''
  const website = f.website?.value || ''
  const address = f.address?.value || ''

  const listing = {
    name,
    categories: [category],
    city,
    phone: phoneVal,
    area,
    description,
    website,
    address,
    notify: false, // Don't send default notify, we handle confirmation
  }

  await updateConversationContext(phone, {
    state: 'REGISTRATION_FINAL_REVIEW',
    step: 'final_review',
    listing,
  })

  await sendWhatsAppMessage(
    phone,
    `🏪 *Your listing — Ready to publish*

✓ Name: ${name}
✓ Category: ${category}
✓ City: ${city}
✓ Phone: ${phoneVal}
${area ? `✓ Area: ${area}\n` : ''}${description ? `✓ Description: ${description}\n` : ''}${website ? `✓ Website: ${website}\n` : ''}${address ? `✓ Address: ${address}\n` : ''}
To edit a field, reply with: \`edit Field: New Value\`
Example: \`edit City: Bulawayo\`

Tap or type *publish* when ready.`
  )
}

async function submitRegistration(phone: string, context: any) {
  const listingData = context.listing || {}

  const result = await createListing({
    name: listingData.name,
    categories: listingData.categories || ['Other'],
    city: listingData.city || 'Harare',
    phone: listingData.phone || phone,
    areas: listingData.area ? [listingData.area] : [],
    description: listingData.description || '',
    website: listingData.website || '',
    address: listingData.address || '',
  })

  if ('error' in result) {
    await sendWhatsAppMessage(phone, `❌ Error creating listing: ${result.error}\n\nPlease try again or type *cancel*.`)
    return
  }

  // Clear registration conversation state (createListing sets AWAITING_ADMIN_REVIEW state)
  await sendWhatsAppMessage(
    phone,
    `🎉 *Listing Submitted Successfully!*

Your business *${result.name}* has been submitted for review.
Business ID: ${result.businessId}
Username: @${result.username}

Our team will review your listing within 24 hours. Once approved, you'll receive a message to select a subscription plan and complete payment via EcoCash.`
  )
}
