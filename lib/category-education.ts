/**
 * Category-specific educational content for WhatsApp onboarding.
 *
 * After listing submission or payment activation, business owners receive
 * a relevant educational image with caption that provides practical guidance
 * tailored to their business category.
 *
 * Images are selected from existing category assets; captions explain how
 * to add relevant content to improve their listing visibility.
 */

import { sendWhatsAppImage, sendWhatsAppMessage } from '@/lib/whatsapp'
import { CATEGORY_IMAGES, getCategoryImage } from '@/data/category-images'

export interface EducationalContent {
  imageUrl: string
  caption: string
  nextAction: string
}

/**
 * Generate category-specific educational content.
 * Images are relevant to the business type and show practical examples.
 * Captions explain how to add photos/content for better visibility.
 */
export function getEducationalContent(category: string | string[] | null | undefined): EducationalContent | null {
  // Extract primary category from string, array, or null
  let primaryCat: string | null = null
  if (Array.isArray(category) && category[0]) {
    primaryCat = category[0]
  } else if (typeof category === 'string') {
    primaryCat = category
  }

  if (!primaryCat || !CATEGORY_IMAGES[primaryCat]) {
    return null
  }

  const imageUrl = CATEGORY_IMAGES[primaryCat]
  const content = CONTENT_MAP[primaryCat as keyof typeof CONTENT_MAP]

  if (!content) {
    // Fallback for categories without specific guidance
    return {
      imageUrl,
      caption: `📸 *Showcase your ${primaryCat} services*

Original, high-quality photos build trust with potential customers.
Upload clear images of your actual work/products.

• Use good lighting
• Show scale/detail when relevant
• Include before/after shots if helpful

Reply *help* for more photography tips.`,
      nextAction: '[Add photos]'
    }
  }

  return {
    imageUrl: content.imageUrl || imageUrl,
    caption: content.caption,
    nextAction: content.nextAction
  }
}

/**
 * Category-specific educational content with images and guidance.
 * All content is optional and non-blocking.
 */
const CONTENT_MAP: Record<string, { imageUrl?: string; caption: string; nextAction: string }> = {
  // Product/Sellers
  'Clothing & Fashion': {
    caption: `👗 *Style your listing with product photos*

Showcase your clothing line with clear, well-lit photos that capture:
• Full outfit looks (model shots)
• Fabric textures and details
• Size charts or fit guides

Customers buy confidence — great photos make the difference.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  'Electronics': {
    caption: `📱 *Electronics: Show, don’t tell*

Help buyers visualize your products:\n\n✓ Unboxing shots from multiple angles\n✓ Close-ups of ports, buttons, screens\n✓ Product in use (person holding it)\n\nInclude specs in the product description.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  'Jewelry': {
    caption: `💍 *Jewelry deserves close-up shots*

• Ring size reference (next to a coin)
• Side/profile views to show details
• Lifestyle shot (worn on hand/neck)

Use natural lighting to show true colors.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  'Food & Restaurant': {
    caption: `🍽️ *Food photography builds cravings*

• Appetizing plating – natural light, clean backgrounds\n• Menu shots showing variety\n• Behind-the-scenes kitchen shots\n\nFresh-looking photos get more clicks!\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  'Baker': {
    caption: `🥐 *Showcase your baked goods*

Fresh, professional photos make customers hungry:\n\n✓ Capture items in golden hour light\n✓ Show texture with close-ups\n✓ Include a "fresh from oven" shot\n\nHappy customers = repeat business!\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  'Brewery': {
    caption: `🍺 *Beer photography tells your story*

• Product shots with label clarity\n• Taproom atmosphere shots\n• Behind-the-scenes brewing process\n\nShow the craft behind your brand.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  // Accommodation
  'Hotel & Lodging': {
    caption: `🏨 *Accommodation photos drive bookings*

• Clean room photos – beds, bathrooms, views\n• Property exterior and entrance\n• Amenities (pool, restaurant, gym)\n\nUse good lighting – natural daylight works best.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  'Real Estate': {
    caption: `🏢 *Property photos sell listings*

• Wide shots of every room\n• High-quality exterior photos\n• Include measurements or floor plans\n\nGood photos reduce showing requests.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  // Services
  'Professional Services': {
    caption: `💼 *Professional services: show your work*

• Before/after transformations\n• Team photos and credentials\n• Project case studies\n\nSocial proof builds trust.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  'Construction': {
    caption: `🛠️ *Construction: show completed projects*

• High-quality project photos\n• "Before" and "After" shots\n• Team at work (safety gear on)\n\nQuality visuals = more clients.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  'Plumber': {
    caption: `🔧 *Plumbing services: build credibility*

• Clean, completed job shots\n• Before fixing (problem shown)\n• Team photos with proper tools\n\nProfessional photos = professional impression.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  'Electrician': {
    caption: `⚡ *Electrical work: safety first*

• Completed installations (neat, clean)\n• Team wearing safety gear\n• Close-ups of quality work\n\nShow code-compliant installations.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  // Personal Services
  'Hair & Beauty': {
    caption: `💇 *Beauty services: transform with photos*

• Before/after client transformations\n• Product shots (hairs, makeup)\n• Studio/ambiance shots\n\nClients want to see results.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  'Fitness & Gym': {
    caption: `💪 *Gym: show the experience*

• Equipment and facility shots\n• Trainer demonstrating techniques\n• Member progress photos (with permission)\n\nShow what members will experience.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  'Daycare': {
    caption: `🧸 *Daycare: show care and safety*

• Indoor/outdoor play areas\n• Staff at work with children\n• Clean, welcoming environment\n

Parents need to see a safe, happy space.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  // Automotive
  'Automotive': {
    caption: `🚗 *Auto services: show the details*

• Before/after car washes\n• Service bays and equipment\n• Staff photos\n\nClean cars sell clean services.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  'Building Materials': {
    caption: `🏗️ *Building materials: show quality*

• Product close-ups and textures\n• Installation examples\n• Bulk delivery shots\n\nHelp buyers visualize fit and quality.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  'Cleaning Services': {
    caption: `🧹 *Cleaning: show the transformation*

• "Before" dirty shots\n• "After" gleaming results\n• Clean, professional team\n\nSparkling results deserve photos!\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  // Travel & Tourism
  'Travel & Tourism': {
    caption: `✈️ *Tourism: inspire with visuals*

• Destination photography\n• Tour/experience shots\n• Local guides and culture\n\nGreat photography = customer wanderlust.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  // Agriculture
  'Farming & Agriculture': {
    caption: `🌾 *Farming: show harvest quality*

• Fresh produce close-ups\n• Farm fields and equipment\n• Harvest process photos\n\nQuality crops start with quality photos.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  // Finance
  'Financial Services': {
    caption: `💰 *Financial services: build trust*

• Professional office environment\n• Certificates/licenses displayed\n• Team at work\n\nTrustworthy visuals = credible business.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  'Legal Services': {
    caption: `📁 *Legal services: professional imagery*

• Clean, formal office shots\n• Key documents (redacted)\n• Team photos\n\nProfessional appearance matters.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  // Health
  'Health & Medical': {
    caption: `🏥 *Health services: show care*

• Clean, professional facilities\n• Staff in scrubs/uniforms\n• Equipment and amenities\n

Safety and cleanliness first!\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  // Education
  'Education & Tutoring': {
    caption: `📚 *Education: show learning in action*

• Classroom or tutoring setting\n• Students engaged (with permission)\n• Learning materials\n

Involve parents in the learning journey.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  // Technology
  'IT & Web': {
    caption: `💻 *IT services: show your work*

• Interface screenshots\n• Team at workstations\n• Project screenshots\n

Show, don't just tell.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  // Photography
  'Photography': {
    caption: `📸 *Photography: showcase your portfolio*

• Best client photos (with permission)\n• Studio setup\n• Equipment and process shots\n\nYour portfolio IS your marketing.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  // Transportation
  'Transport & Delivery': {
    caption: `🚚 *Transport: show your fleet*

• Vehicle fleet photos\n• Driver and team shots\n• Delivery in action\n

Reliability starts with visible service.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  // Entertainment
  'Beauty & Fashion': {
    caption: `💄 *Beauty services: show transformations*

• Makeup before/after\n• Salon ambiance\n• Product application\n

Clients want to see the results!\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  // Security Services
  'Security Services': {
    caption: `🛡️ *Security services: professional presence*

• Uniformed staff photos\n• Equipment and vehicles\n• Facility perimeter\n

Professional appearance builds client confidence.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  // Funeral Services
  'Funeral Services': {
    caption: `⚧️ *Funeral services: respectful professionalism*

• Facilities and chapels\n• Staff in uniform\n• Vehicles\n

Dignity and professionalism matter.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  // Mining
  'Mining': {
    caption: `⛏️ *Mining: showcase operations*

• Equipment and facilities\n• Safety training\n• Resource extraction\n

Safety and professionalism first.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  // Other categories with generic but relevant guidance
  'Pet Services': {
    caption: `🐕 *Pet services: show caring expertise*

• Pets being groomed\n• Staff with animals\n• Service facility\n

Happy pets = happy owners.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  'Printing': {
    caption: `🖨️ *Printing: show your products*

• Sample prints and products\n• Printing process shots\n• Quality close-ups\n\nGreat samples sell more business.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  'Music Studio': {
    caption: `🎵 *Music studio: show the creative space*

• Recording setup\n• Instruments\n• Artist sessions\n

Capture the creative energy!\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  'Translation': {
    caption: `🌐 *Translation services: professional credentials*

• Certificates and awards\n• Team multilingual skills\n• Office environment\n

Show language expertise.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  'Nonprofit': {
    caption: `🤝 *Nonprofit: show your mission*

• Community programs\n• Staff and volunteers\n• Impact stories\n

Demonstrate your cause in action.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  'Coworking Space': {
    caption: `🪑 *Coworking: show the workspace*

• Desks and meeting rooms\n• Community events\n• Amenities\n

Show the environment your members enjoy!\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  'Landscaping': {
    caption: `🌱 *Landscaping: before/after transformations*

• Completed garden designs\n• Plants and materials\n• Team at work\n

Transformative results deserve photos!\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  'Entertainment': {
    caption: `🎭 *Entertainment: showcase your act*

• Performance shots (stage/crowd)\n• Equipment/setup\n• Behind-the-scenes\n

Capture the energy of your event!\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  'Government Services': {
    caption: `🏛️ *Government services: official professionalism*

• Facility and service counters\n• Staff in uniform\n• Public service examples\n

Official presence builds trust.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  'Emergency Services': {
    caption: `🚨 *Emergency services: ready response*

• Equipment and vehicles\n• Staff in action\n• Facility readiness\n

Professional appearance matters.\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  },

  // Yellow Pages / Public Services
  'Yellow Pages': {
    caption: `📞 *Public services help your community*

• Service in action\n• Staff at work\n• Community impact\n

Show your essential service!\n\n[Add photos] [Maybe later]`,
    nextAction: '[Add photos]'
  }
}

/**
 * Send category-specific educational image to a business owner.
 * Uses existing category image assets from CATEGORY_IMAGES.
 * Falls back to text-only message if image send fails.
 */
export async function sendCategoryEducationalImage(
  phone: string,
  category: string | string[] | null | undefined
): Promise<void> {
  const content = getEducationalContent(category)

  if (!content) {
    // No content available for this category
    return
  }

  await sendWhatsAppImage(
    phone,
    content.imageUrl,
    content.caption
  ).catch(async () => {
    // Fallback to text message if image fails
    await sendWhatsAppMessage(phone, content.caption).catch(() => {})
  })
}