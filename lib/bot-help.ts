/**
 * WhatsApp chatbot HELP experience — redesigned for clarity and navigation.
 *
 * Provides structured help menus with interactive buttons/lists for:
 * - Finding a business
 * - Managing a business
 * - Payments & subscriptions
 * - Human support
 *
 * All responses include the configured human support contact footer.
 */

import { getSupabase } from '@/lib/supabase-server'
import { sendWhatsAppMessage, sendInteractiveList, sendInteractiveButtons } from '@/lib/whatsapp'
import { getBotSetting } from '@/lib/bot-settings'
import { PLAN_CONFIG, formatUsd, TRIAL_PLAN_LABEL } from '@/lib/bot-state'

export interface HelpCategory {
  key: string
  label: string
  icon: string
}

// The main HELP menu options
export const HELP_CATEGORIES: HelpCategory[] = [
  { key: 'find', label: 'Find a business', icon: '🔎' },
  { key: 'manage', label: 'Manage my business', icon: '🏪' },
  { key: 'payment', label: 'Payments & subscriptions', icon: '💳' },
  { key: 'other', label: 'Something else', icon: '❓' },
]

/**
 * Get the configured human support number.
 * Retrieves from bot settings or falls back to environment variable.
 */
export async function getSupportNumber(): Promise<string> {
  const settingsRaw = await getBotSetting('support_contact')
  if (settingsRaw) {
    try {
      const parsed = JSON.parse(settingsRaw)
      if (parsed.phone_number) return parsed.phone_number
    } catch {
      // Invalid JSON, fall through
    }
  }
  // Fallback to environment variable
  const envNumber = process.env.SUPPORT_PHONE_NUMBER || process.env.ADMIN_WHATSAPP || ''
  return envNumber || 'WhatsApp: +263773791864'
}

/**
 * Format the support footer for HELP-related messages.
 */
export async function getSupportFooter(): Promise<string> {
  const supportNumber = await getSupportNumber()
  return `
---
Need human assistance?

WhatsApp or call: ${supportNumber}`
}

/**
 * Handle the initial HELP command.
 * Shows the main menu with four options.
 */
export async function handleHelpCommand(phone: string) {
  const supportFooter = await getSupportFooter()

  await sendWhatsAppMessage(
    phone,
    `👋 How can we help you?

Choose what you need assistance with.

[🔎 Find a business]
[🏪 Manage my business]
[💳 Payments & subscriptions]
[❓ Something else]${supportFooter}`
  )
}

/**
 * Handle "Find a business" help.
 */
export async function handleFindBusinessHelp(phone: string) {
  const supportFooter = await getSupportFooter()

  await sendWhatsAppMessage(
    phone,
    `🔎 Finding businesses

How do I find a business?

Tell us what you're looking for and your location.

Example: Solar installers in Harare

How do I contact a business?

Open a listing and choose WhatsApp, Call or Directions.

How do I view business details?

Select a business from the search results to view its information.

[Search for a business]
[Back to help]${supportFooter}`
  )
}

/**
 * Handle "Manage my business" help.
 * Checks if the WhatsApp number is associated with an existing business.
 */
export async function handleManageBusinessHelp(phone: string) {
  const supabase = getSupabase()

  // Find business by owner's phone
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, phone')
    .eq('phone', phone)
    .maybeSingle()

  const supportFooter = await getSupportFooter()

  if (business) {
    // Existing business found
    await sendWhatsAppMessage(
      phone,
      `🏪 Manage your business

We found your registered business:
*${business.name}*

What would you like to do?

[View my listing]
[Edit my business]
[Listing verification]
[Subscription status]
[Register another business]
[Back to help]${supportFooter}`
    )
  } else {
    // No business found - start image-first registration flow
    const { startRegistrationFlow } = await import('./bot-registration')
    await startRegistrationFlow(phone)
  }
}

/**
 * Handle "Payments & subscriptions" help.
 */
export async function handlePaymentHelp(phone: string) {
  const supportFooter = await getSupportFooter()

  await sendWhatsAppMessage(
    phone,
    `💳 Payments & subscriptions

What do you need help with?

[View subscription packages]
[How do I pay?]
[Payment not received]
[My listing is not active]
[Renew my subscription]
[Back to help]${supportFooter}`
  )
}

/**
 * Handle "View subscription packages" help.
 */
export async function handleViewPackagesHelp(phone: string) {
  const supportFooter = await getSupportFooter()

  const packagesList = [
    `- ${TRIAL_PLAN_LABEL} — FREE (starts after admin approval, one per business)`,
    ...Object.entries(PLAN_CONFIG).map(([, plan]) => `- ${plan.label} — USD ${formatUsd(plan.price)}`),
  ].join('\n')

  await sendWhatsAppMessage(
    phone,
    `💰 Subscription packages

Current packages:

${packagesList}

Payment method:
EcoCash Push ONLY.

[Back to payments]${supportFooter}`
  )
}

/**
 * Handle "How do I pay?" help.
 */
export async function handleHowToPayHelp(phone: string) {
  const supportFooter = await getSupportFooter()

  await sendWhatsAppMessage(
    phone,
    `📱 How do I pay?

1. Your business listing must first pass verification.
2. Choose a subscription package.
3. Enter the EcoCash number that should receive the payment prompt.
4. Enter your EcoCash PIN on your phone.
5. Your listing activates automatically after payment is confirmed.

Payment must be confirmed by the actual payment callback.
Never activate a listing simply because a user says they have paid.

[Back to payments]${supportFooter}`
  )
}

/**
 * Handle "Payment not received" help.
 */
export async function handlePaymentNotReceivedHelp(phone: string) {
  const supportFooter = await getSupportFooter()

  await sendWhatsAppMessage(
    phone,
    `📲 Payment not received?

Your payment may still be processing.

Please check whether you received an EcoCash payment prompt.

If money was deducted but your listing has not activated,
contact our support team with your payment reference.

[Check payment status]
[Back to payments]${supportFooter}`
  )
}

/**
 * Handle "My listing is not active" help.
 */
export async function handleListingNotActiveHelp(phone: string) {
  const supportFooter = await getSupportFooter()

  await sendWhatsAppMessage(
    phone,
    `🏪 My listing is not active

Possible reasons:
• Business needs admin verification
• Payment has not been completed
• Subscription has expired

What to do:
• Check your subscription status: type \`paid\`
• If not verified, contact an admin
• If payment sent, wait for EcoCash confirmation

[Check subscription status]
[Back to payments]${supportFooter}`
  )
}

/**
 * Handle "Renew my subscription" help.
 */
export async function handleRenewSubscriptionHelp(phone: string) {
  const supportFooter = await getSupportFooter()

  await sendWhatsAppMessage(
    phone,
    `🔄 Renew my subscription

Your subscription can be renewed through the portal or by contacting support.

To renew:
1. Log into your business portal
2. Go to Billing → Renew Subscription
3. Or reply with your request

Packages available:
${Object.entries(PLAN_CONFIG).map(([, plan]) => `- ${plan.label} — USD ${formatUsd(plan.price)}`).join('\n')}

[Back to payments]${supportFooter}`
  )
}

/**
 * Handle "Something else" / human support option.
 */
export async function handleOtherHelp(phone: string) {
  const supportFooter = await getSupportFooter()

  await sendWhatsAppMessage(
    phone,
    `❓ Other assistance

What do you need help with?

Tell us briefly what happened and we'll try to assist.

[Contact human support]
[Back to help]${supportFooter}`
  )
}

/**
 * Route help based on the selected category.
 * Uses interactive callback IDs: help_<category>
 */
export async function routeHelpSelection(phone: string, selectionId: string) {
  const lower = selectionId.toLowerCase()

  if (lower === 'help_find' || lower === 'help_find_business') {
    await handleFindBusinessHelp(phone)
  } else if (lower === 'help_manage' || lower === 'help_manage_business') {
    await handleManageBusinessHelp(phone)
  } else if (lower === 'help_payment' || lower === 'help_payments_subscriptions') {
    await handlePaymentHelp(phone)
  } else if (lower === 'help_other' || lower === 'help_something_else') {
    await handleOtherHelp(phone)
  } else if (lower.startsWith('help_') && !lower.startsWith('help_pay')) {
    // Handle help_ prefixed callbacks from interactive lists
    const action = lower.replace('help_', '')
    if (action === 'view_packages') {
      await handleViewPackagesHelp(phone)
    } else if (action === 'how_to_pay') {
      await handleHowToPayHelp(phone)
    } else if (action === 'payment_not_received') {
      await handlePaymentNotReceivedHelp(phone)
    } else if (action === 'listing_not_active') {
      await handleListingNotActiveHelp(phone)
    } else if (action === 'renew_subscription') {
      await handleRenewSubscriptionHelp(phone)
    } else if (action === 'check_status') {
      await handlePaymentNotReceivedHelp(phone)
    } else if (action === 'contact_support') {
      await handleOtherHelp(phone)
    } else if (action === 'search') {
      // Trigger the normal search flow
      await sendWhatsAppMessage(phone, '🔎 How can I help you find?')
    } else if (action === 'register') {
      // Trigger registration flow
      const { startRegistrationFlow } = await import('./bot-registration')
      await startRegistrationFlow(phone)
    } else if (action === 'view_listing') {
      // Show their listing info
      const supabase = getSupabase()
      const { data: business } = await supabase
        .from('businesses')
        .select('name, category, city, phone, profile_url')
        .eq('phone', phone)
        .maybeSingle()
      if (business) {
        await sendWhatsAppMessage(phone, `${business.name}
Category: ${business.category?.join(', ') || 'N/A'}
Location: ${business.city || 'N/A'}

[Edit my business]
[Back to help]`)
      }
    } else {
      await sendWhatsAppMessage(phone, `Unknown option: ${action}. [Back to help]`)
    }
  } else if (lower === 'back_to_help' || lower === 'back') {
    await handleHelpCommand(phone)
  } else {
    // Unknown selection
    await sendWhatsAppMessage(phone, 'Please choose an option from the menu. [Back to help]')
    await handleHelpCommand(phone)
  }
}

/**
 * Show help with interactive buttons (for more than 4 options).
 */
export async function showHelpInteractiveList(phone: string, context: { businessName?: string }) {
  const rows = [
    {
      id: 'help_find_business',
      title: 'Find a business',
      description: 'Search for products and services',
    },
    {
      id: 'help_manage_business',
      title: 'Manage my business',
      description: 'View, edit, or check status of your listing',
    },
    {
      id: 'help_payments_subscriptions',
      title: 'Payments & subscriptions',
      description: 'Packages, how to pay, and subscription help',
    },
    {
      id: 'help_something_else',
      title: 'Something else',
      description: 'Contact human support or get other assistance',
    },
  ]

  await sendInteractiveList(
    phone,
    `👋 How can we help you?`,
    rows,
    'Choose help topic'
  )
}