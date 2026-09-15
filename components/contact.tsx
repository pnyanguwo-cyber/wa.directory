// Contact channels: a listing may be WhatsApp-reachable, voice-only
// (landline/hotline), or BOTH — a WhatsApp mobile plus a secondary voice
// number. phone_type='voice' → the main number is the voice line (Call
// button, no wa.me). phone_type='whatsapp' + voice_phone → render both.
export const WA_MSG = 'Hi%2C%20I%20found%20you%20on%20WA%20Directory'

export function cleanDigits(phone?: string | null): string {
  return (phone || '').replace(/[^0-9]/g, '')
}

export function whatsappHref(phone?: string | null): string {
  return `https://wa.me/${cleanDigits(phone)}?text=${WA_MSG}`
}

export function callHref(number?: string | null): string {
  return `tel:${number || ''}`
}

type PhoneSource = {
  phone?: string | null
  phone_type?: string | null
  whatsapp_link?: string | null
  voice_phone?: string | null
}

// True when the listing should show a WhatsApp chat button.
export function hasWhatsAppChannel(b: PhoneSource): boolean {
  if (b.phone_type === 'voice') return !!b.whatsapp_link
  return !!b.phone
}

// True when the listing should show a Call button.
export function hasVoiceChannel(b: PhoneSource): boolean {
  if (b.phone_type === 'voice') return !!b.phone
  return !!b.voice_phone
}

// The number to dial: the main number for voice-only listings, the secondary
// voice_phone otherwise.
export function voiceNumber(b: PhoneSource): string {
  if (b.phone_type === 'voice') return b.phone || ''
  return b.voice_phone || ''
}
