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
