export default function WhatsAppButton({ phone }: { phone: string }) {
  if (!phone) return null

  const cleaned = phone.replace(/[^0-9]/g, '')

  return (
    <a
      href={`https://wa.me/${cleaned}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full bg-whatsapp-500 text-white text-center py-3 rounded-lg text-lg font-medium hover:bg-whatsapp-600 transition-colors mt-6"
    >
      Chat on WhatsApp
    </a>
  )
}
