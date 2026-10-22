import type { SVGProps } from 'react'

interface CategoryIconProps extends SVGProps<SVGSVGElement> {
  category?: string
  className?: string
  strokeWidth?: number
}

/**
 * Category-aware inline SVG icon component.
 * Maps category keywords (Baker, Plumber, Mining, Daycare, Courier, Goldsmith, etc.)
 * to handcrafted, lightweight 24x24 SVG vectors.
 * Zero external icon dependencies; 100% vector, responsive to currentColor.
 */
export default function CategoryIcon({
  category = '',
  className = 'w-5 h-5',
  strokeWidth = 1.8,
  ...props
}: CategoryIconProps) {
  const cat = category.toLowerCase()

  // Baker / Bakery / Bread / Pastry / Cakes
  if (cat.includes('bake') || cat.includes('bread') || cat.includes('cake') || cat.includes('pastr') || cat.includes('confection')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <path d="M4 10a8 8 0 0 1 16 0v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7Z" />
        <path d="M4 14h16" />
        <path d="M8.5 7.5c.5.8 1 1.5 2 1.5s1.5-.7 2-1.5" />
        <path d="M13.5 7.5c.5.8 1 1.5 2 1.5s1.5-.7 2-1.5" />
      </svg>
    )
  }

  // Plumber / Pipes / Water / Drainage
  if (cat.includes('plumb') || cat.includes('pipe') || cat.includes('drain') || cat.includes('water') || cat.includes('tap') || cat.includes('leak')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
      </svg>
    )
  }

  // Electrician / Wiring / Solar / Power
  if (cat.includes('electr') || cat.includes('solar') || cat.includes('power') || cat.includes('wiring') || cat.includes('circuit')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />
      </svg>
    )
  }

  // Food & Restaurant / Catering / Cafe / Takeaway
  if (cat.includes('food') || cat.includes('restaur') || cat.includes('cater') || cat.includes('meal') || cat.includes('cafe') || cat.includes('pizza') || cat.includes('eat')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2" />
        <path d="M15 2v20" />
        <path d="M5 2c0 2.5 1.5 5 4 5v15" />
        <path d="M5 2v5" />
      </svg>
    )
  }

  // Hair & Beauty / Salon / Barber / Nails / Cosmetics
  if (cat.includes('hair') || cat.includes('beaut') || cat.includes('salon') || cat.includes('barber') || cat.includes('nail') || cat.includes('spa') || cat.includes('cosmetic')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <circle cx="6" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <path d="M20 4 8.12 15.88" />
        <path d="M14.47 14.48 20 20" />
        <path d="M8.12 8.12 12 12" />
      </svg>
    )
  }

  // Building Materials / Hardware / Construction / Roofing
  if (cat.includes('build') || cat.includes('hardw') || cat.includes('construct') || cat.includes('timber') || cat.includes('cement') || cat.includes('brick')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M3 9h18" />
        <path d="M3 15h18" />
        <path d="M9 3v6" />
        <path d="M15 9v6" />
        <path d="M9 15v6" />
      </svg>
    )
  }

  // Clothing & Fashion / Tailor / Apparel / Boutique
  if (cat.includes('cloth') || cat.includes('fash') || cat.includes('tailor') || cat.includes('dress') || cat.includes('apparel') || cat.includes('boutique')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <path d="M6 3h12l3 5-4 3v10a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V11L3 8l3-5Z" />
        <path d="M10 3a2 2 0 0 0 4 0" />
      </svg>
    )
  }

  // Automotive / Mechanic / Garage / Car / Tyres
  if (cat.includes('auto') || cat.includes('car') || cat.includes('mechanic') || cat.includes('tyre') || cat.includes('garage') || cat.includes('vehicle')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2 10.9 2 11.2 2 11.5V16c0 .6.4 1 1 1h2" />
        <circle cx="7" cy="17" r="2" />
        <circle cx="17" cy="17" r="2" />
        <path d="M5 17h8" />
      </svg>
    )
  }

  // Mining / Minerals / Quarry / Platinum / Gold / Stone
  if (cat.includes('min') || cat.includes('quarr') || cat.includes('extract') || cat.includes('ore') || cat.includes('platinum')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <path d="m14 7 3-3 3 3-3 3" />
        <path d="m5 16 7-7" />
        <path d="m19 5-7 7" />
        <path d="M14.5 12.5 12 15l-6-6 2.5-2.5" />
        <path d="M3 21l3.5-3.5" />
        <path d="m16 2 4 4" />
      </svg>
    )
  }

  // Daycare / Preschool / Childcare / Kindergarten / Kids
  if (cat.includes('daycare') || cat.includes('child') || cat.includes('preschool') || cat.includes('kindergarten') || cat.includes('crèche') || cat.includes('creche')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <circle cx="12" cy="7" r="4" />
        <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
        <path d="M8 3.5a3 3 0 0 0-3 3c0 2 2 3.5 2 3.5" />
        <path d="M16 3.5a3 3 0 0 1 3 3c0 2-2 3.5-2 3.5" />
      </svg>
    )
  }

  // Courier / Logistics / Transport / Delivery / Moving
  if (cat.includes('courier') || cat.includes('deliver') || cat.includes('logist') || cat.includes('transport') || cat.includes('freight') || cat.includes('mov')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
        <path d="M15 18H9" />
        <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-2.48-3.08A1 1 0 0 0 18.52 9H14v9h1" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="17" cy="18" r="2" />
      </svg>
    )
  }

  // Goldsmith / Jewelry / Diamonds / Watches / Luxury
  if (cat.includes('gold') || cat.includes('jewel') || cat.includes('diamond') || cat.includes('watch') || cat.includes('ring') || cat.includes('silver')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <path d="M6 3h12l4 6-10 12L2 9l4-6Z" />
        <path d="M11 3 8 9l4 12 4-12-3-6" />
        <path d="M2 9h20" />
      </svg>
    )
  }

  // Legal / Lawyer / Attorney / Notary / Law
  if (cat.includes('legal') || cat.includes('law') || cat.includes('attorney') || cat.includes('notary') || cat.includes('court')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
        <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
        <path d="M7 21h10" />
        <path d="M12 3v18" />
        <path d="M3 7h18" />
      </svg>
    )
  }

  // Medical / Pharmacy / Health / Clinic / Doctor / Dental
  if (cat.includes('medic') || cat.includes('health') || cat.includes('pharm') || cat.includes('clinic') || cat.includes('doctor') || cat.includes('dent')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h5v5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2Z" />
      </svg>
    )
  }

  // Real Estate / Property / Letting / Accommodation / Housing
  if (cat.includes('estate') || cat.includes('proper') || cat.includes('house') || cat.includes('rent') || cat.includes('lodge') || cat.includes('hotel')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
        <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    )
  }

  // Cleaning / Laundry / Hygiene / Pest Control
  if (cat.includes('clean') || cat.includes('laund') || cat.includes('pest') || cat.includes('wash') || cat.includes('hygiene')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
        <path d="M5 3v4" />
        <path d="M3 5h4" />
      </svg>
    )
  }

  // Agriculture / Farming / Fresh Produce / Livestock / Gardening
  if (cat.includes('agri') || cat.includes('farm') || cat.includes('crop') || cat.includes('garden') || cat.includes('plant') || cat.includes('seed')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 21 2c0 5-.5 7-1.8 11.2A7 7 0 0 1 11 20Z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
      </svg>
    )
  }

  // Security / Locksmith / Guard / Alarms / CCTV
  if (cat.includes('secur') || cat.includes('lock') || cat.includes('guard') || cat.includes('alarm') || cat.includes('cctv')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    )
  }

  // Printing / Photography / Media / Design / Art
  if (cat.includes('print') || cat.includes('photo') || cat.includes('media') || cat.includes('design') || cat.includes('art') || cat.includes('sign')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" />
        <rect x="6" y="14" width="12" height="8" rx="1" />
      </svg>
    )
  }

  // Accounting / Finance / Insurance / Tax / Banking
  if (cat.includes('account') || cat.includes('finan') || cat.includes('tax') || cat.includes('audit') || cat.includes('bank') || cat.includes('insur')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
        <circle cx="15" cy="15" r="2" />
      </svg>
    )
  }

  // Education / School / Tutoring / Training / Lessons
  if (cat.includes('educat') || cat.includes('school') || cat.includes('tutor') || cat.includes('lesson') || cat.includes('train') || cat.includes('course')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    )
  }

  // Tech / IT / Phones / Computers / Electronics
  if (cat.includes('tech') || cat.includes('computer') || cat.includes('phone') || cat.includes('softw') || cat.includes('it') || cat.includes('repair')) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <rect width="18" height="12" x="3" y="4" rx="2" />
        <path d="M2 20h20" />
        <path d="M12 16v4" />
      </svg>
    )
  }

  // Default: premium verified badge / star spark icon
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}
