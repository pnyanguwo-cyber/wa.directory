export interface Category {
  name: string
  keywords: string[]
  icon: string
}

export const categories: Category[] = [
  {
    name: 'Baker',
    keywords: ['cakes', 'bread', 'pastry', 'baking', 'confectionery', 'doughnuts', 'biscuits', 'chingwa', 'makeke', 'mabhanzi', 'zviroto', 'bakery', 'cookies', 'muffins', 'loaf', 'scones', 'fresh bread'],
    icon: '🍞',
  },
  {
    name: 'Plumber',
    keywords: ['plumbing', 'pipes', 'drain', 'water leak', 'toilet', 'tap', 'pombi', 'mvura', 'mabhubhu', 'drainage', 'sewer', 'water heater', 'pipe repair', 'blocked drain'],
    icon: '🔧',
  },
  {
    name: 'Electrician',
    keywords: ['electrical', 'wiring', 'lights', 'power', 'socket', 'generator', 'magetsi', 'tambo', 'zvigadziriso', 'rewiring', 'installation', 'switch', 'fuse', 'circuit', 'electric repair'],
    icon: '⚡',
  },
  {
    name: 'Food & Restaurant',
    keywords: ['restaurant', 'takeaway', 'meals', 'catering', 'fast food', 'pizza', 'chicken', 'sadza', 'nyama', 'huku', 'muriwo', 'chibage', 'madora', 'lunch', 'dinner', 'breakfast', 'snacks', 'food', 'eat', 'dining', 'menu', 'grocery', 'supermarket', 'tuckshop'],
    icon: '🍔',
  },
  {
    name: 'Hair & Beauty',
    keywords: ['hair', 'braids', 'cut', 'salon', 'barber', 'nails', 'makeup', 'cosmetics', 'bvudzi', 'mabhurekisi', 'kugera', 'spa', 'massage', 'manicure', 'pedicure', 'waxing', 'skincare', 'beauty', 'facials'],
    icon: '💇',
  },
  {
    name: 'Building Materials',
    keywords: ['construction', 'hardware', 'cement', 'bricks', 'timber', 'roofing', 'zvidhinha', 'simenti', 'matanda', 'denga', 'paint', 'tools', 'tiles', 'doors', 'windows', 'sand', 'gravel', 'iron sheets', 'building'],
    icon: '🏗️',
  },
  {
    name: 'Clothing & Fashion',
    keywords: ['fashion', 'apparel', 'dresses', 'shoes', 'tailor', 'designer', 'mbatya', 'shangu', 'zvipfeko', 'outfits', 'fabric', 'sewing', 'traditional', 'african', 'clothes', 'uniforms'],
    icon: '👗',
  },
  {
    name: 'Automotive',
    keywords: ['car', 'mechanic', 'repair', 'tyres', 'garage', 'spare parts', 'mota', 'matai', 'injini', 'car wash', 'service', 'maintenance', 'vehicle', 'battery', 'auto', 'engine', 'panel beater'],
    icon: '🚗',
  },
  {
    name: 'Cleaning Services',
    keywords: ['cleaning', 'janitor', 'housekeeping', 'laundry', 'kutsvaira', 'kugeza', 'kuchenesa', 'maid', 'carpet cleaning', 'office cleaning', 'house cleaning', 'sanitize', 'disinfect'],
    icon: '🧹',
  },
  {
    name: 'Farming & Agriculture',
    keywords: ['agriculture', 'livestock', 'crops', 'gardening', 'farm', 'kurima', 'mombe', 'mbeu', 'pamba', 'seeds', 'fertilizer', 'irrigation', 'poultry', 'cattle', 'garden', 'vegetables'],
    icon: '🌾',
  },
  {
    name: 'Health & Medical',
    keywords: ['doctor', 'clinic', 'pharmacy', 'dentist', 'hospital', 'chipatara', 'mushonga', 'chiremba', 'kurapa', 'pill', 'medicine', 'drugs', 'tablets', 'prescription', 'chemist', 'health', 'wellness', 'sick', 'surgery', 'specialist'],
    icon: '🏥',
  },
  {
    name: 'Education & Tutoring',
    keywords: ['tutor', 'lessons', 'training', 'school', 'teacher', 'chikoro', 'mudzidzisi', 'fundo', 'kudzidza', 'homework', 'exam prep', 'online classes', 'reading', 'math', 'science', 'university'],
    icon: '📚',
  },
  {
    name: 'IT & Web',
    keywords: ['software', 'web design', 'development', 'computer', 'graphic design', 'kombiyuta', 'nharembozha', 'app', 'tech', 'digital', 'programming', 'coding', 'design', 'it support', 'cyber', 'website'],
    icon: '💻',
  },
  {
    name: 'Transport & Delivery',
    keywords: ['delivery', 'logistics', 'truck', 'courier', 'shipping', 'bhazi', 'tekisi', 'kutakura', 'ride', 'taxi', 'moving', 'freight', 'transport'],
    icon: '🚚',
  },
  {
    name: 'Real Estate',
    keywords: ['property', 'rent', 'housing', 'agent', 'estate', 'imba', 'nzvimbo', 'roja', 'apartment', 'land', 'commercial', 'buy', 'sell', 'lease', 'valuation'],
    icon: '🏠',
  },
  {
    name: 'Financial Services',
    keywords: ['accounting', 'insurance', 'loans', 'banking', 'tax', 'mari', 'bhanga', 'inishuwarenzi', 'chikwereti', 'fintech', 'mobile money', 'ecocash', 'invest', 'savings', 'budget', 'finance'],
    icon: '💰',
  },
  {
    name: 'Legal Services',
    keywords: ['lawyer', 'attorney', 'legal advice', 'notary', 'gweta', 'mutemo', 'court', 'divorce', 'contract', 'immigration', 'legal', 'conveyancing'],
    icon: '⚖️',
  },
  {
    name: 'Photography',
    keywords: ['photos', 'videography', 'events', 'wedding', 'mifananidzo', 'kupururudza', 'photographer', 'shoot', 'camera', 'video', 'editing', 'album'],
    icon: '📷',
  },
  {
    name: 'Electronics',
    keywords: ['phones', 'laptops', 'gadgets', 'repair', 'tv', 'radio', 'computer', 'nharembozha', 'terevhizheni', 'devices', 'accessories', 'charger', 'cable', 'screen', 'battery', 'tablet', 'speaker'],
    icon: '📱',
  },
  {
    name: 'Pet Services',
    keywords: ['vet', 'pet', 'grooming', 'dog', 'imbwa', 'katsi', 'mhuka', 'pet shop', 'animal', 'veterinary', 'pet food', 'puppy', 'cat'],
    icon: '🐾',
  },
  {
    name: 'Mining',
    keywords: ['mining', 'coal', 'metal ore', 'gold', 'iron', 'copper', 'chrome', 'extraction', 'mine', 'mineral', 'quarry', 'smelting'],
    icon: '⛏️',
  },
  {
    name: 'Utilities',
    keywords: ['electricity', 'power generation', 'water supply', 'water treatment', 'utility', 'energy', 'distribution', 'power line', 'borehole'],
    icon: '💧',
  },
  {
    name: 'Manufacturing',
    keywords: ['manufacturing', 'factory', 'production', 'processing', 'packaging', 'textile', 'fabric', 'furniture production', 'food processing', 'plant', 'assembly'],
    icon: '🏭',
  },
  {
    name: 'Wholesale',
    keywords: ['wholesale', 'bulk', 'distributor', 'wholesale food', 'wholesale electronics', 'bulk supply', 'trade', 'wholesaler'],
    icon: '📦',
  },
  {
    name: 'Security Services',
    keywords: ['security', 'guards', 'surveillance', 'protection', 'armed response', 'cctv', 'security company', 'bodyguard', 'alarm', 'kuchengetedza'],
    icon: '🛡️',
  },
  {
    name: 'Funeral Services',
    keywords: ['funeral', 'burial', 'memorial', 'coffin', 'hearse', 'funeral services', 'burial services', 'cremation', 'kufirwa', 'rassure'],
    icon: '⚰️',
  },
  {
    name: 'Fitness & Gym',
    keywords: ['gym', 'fitness', 'workout', 'exercise', 'trainer', 'bodybuilding', 'crossfit', 'aerobics', 'yoga', 'pilates', 'wellness', 'personal trainer'],
    icon: '🏋️',
  },
  {
    name: 'Printing',
    keywords: ['printing', 'print shop', 'publishing', 'banner', 'flyers', 'brochures', 'business cards', 't-shirt printing', 'branding', 'print', 'posters'],
    icon: '🖨️',
  },
  {
    name: 'Jewelry',
    keywords: ['jewelry', 'jewellery', 'rings', 'watches', 'gold', 'silver', 'ornaments', 'beads', 'custom jewelry', 'earrings', 'necklace', 'wedding rings'],
    icon: '💍',
  },
  {
    name: 'Entertainment',
    keywords: ['entertainment', 'movies', 'music', 'events', 'concerts', 'cinema', 'theatre', 'dj', 'party', 'amusement', 'event planning', 'weddings', 'corporate events', 'fairs', 'games'],
    icon: '🎬',
  },
  {
    name: 'Hotel & Lodging',
    keywords: ['hotel', 'lodge', 'accommodation', 'lodging', 'guest house', 'motel', 'inn', 'bed and breakfast', 'backpackers', 'hostel', 'resort', 'airbnb'],
    icon: '🏨',
  },
  {
    name: 'Travel & Tourism',
    keywords: ['travel', 'tourism', 'tour', 'safari', 'booking', 'flight', 'visa', 'holiday', 'adventure', 'excursions', 'travel agency', 'tours'],
    icon: '✈️',
  },
  {
    name: 'Brewery',
    keywords: ['brewery', 'beer', 'brewing', 'beverages', 'cider', 'stout', 'lager', 'malt', 'craft beer'],
    icon: '🍺',
  },
  {
    name: 'Professional Services',
    keywords: ['consulting', 'business consulting', 'hr', 'recruiting', 'recruitment', 'staffing', 'architecture', 'engineering', 'strategy', 'management consulting', 'public relations', 'communications', 'audit'],
    icon: '👔',
  },
  {
    name: 'Music Studio',
    keywords: ['music studio', 'recording', 'mixing', 'mastering', 'production', 'sound', 'audio', 'music production', 'studio'],
    icon: '🎵',
  },
  {
    name: 'Translation',
    keywords: ['translation', 'translator', 'interpreting', 'interpretation', 'language services', 'document translation', 'shona', 'ndebele'],
    icon: '🌐',
  },
  {
    name: 'Nonprofit',
    keywords: ['nonprofit', 'charity', 'ngo', 'community', 'donations', 'fundraising', 'volunteer', 'welfare', 'trust', 'foundation'],
    icon: '🤝',
  },
  {
    name: 'Daycare',
    keywords: ['daycare', 'childcare', 'creche', 'nursery', 'babysitting', 'after school care', 'kindergarten', 'kids care'],
    icon: '👶',
  },
  {
    name: 'Coworking Space',
    keywords: ['coworking', 'shared office', 'office space', 'meeting rooms', 'workspace', 'hot desk', 'serviced office'],
    icon: '🏢',
  },
  {
    name: 'Landscaping',
    keywords: ['landscaping', 'garden design', 'lawn care', 'grounds maintenance', 'gardening', 'irrigation', 'turf', 'landscaper', 'garden service'],
    icon: '🌳',
  },
  { name: 'Other', keywords: [], icon: '📋' },
]

export function matchCategory(input: string): string {
  const lower = input.toLowerCase().trim()
  if (!lower) return 'Other'

  for (const cat of categories) {
    if (cat.name.toLowerCase() === lower) return cat.name
  }

  for (const cat of categories) {
    if (cat.name.toLowerCase().includes(lower) || lower.includes(cat.name.toLowerCase())) return cat.name
  }

  let bestMatch = 'Other'
  let bestScore = 0
  for (const cat of categories) {
    for (const kw of cat.keywords) {
      const kwLower = kw.toLowerCase()
      if (kwLower.includes(lower) || lower.includes(kwLower)) {
        const score = kwLower.includes(lower)
          ? kwLower.length / Math.max(lower.length, 1)
          : lower.length / Math.max(kwLower.length, 1)
        if (score > bestScore) {
          bestScore = score
          bestMatch = cat.name
        }
      }
    }
  }
  return bestMatch
}
