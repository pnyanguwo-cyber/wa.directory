export interface Category {
  name: string
  keywords: string[]
  icon: string
}

export const categories: Category[] = [
  {
    name: 'Baker',
    keywords: ['cakes', 'bread', 'pastry', 'baking', 'confectionery', 'doughnuts', 'biscuits', 'chingwa', 'makeke', 'mabhanzi', 'zviroto'],
    icon: '🍞',
  },
  {
    name: 'Plumber',
    keywords: ['plumbing', 'pipes', 'drain', 'water leak', 'toilet', 'tap', 'pombi', 'mvura', 'mabhubhu'],
    icon: '🔧',
  },
  {
    name: 'Electrician',
    keywords: ['electrical', 'wiring', 'lights', 'power', 'socket', 'generator', 'magetsi', 'tambo', 'zvigadziriso'],
    icon: '⚡',
  },
  {
    name: 'Food & Restaurant',
    keywords: ['restaurant', 'takeaway', 'meals', 'catering', 'fast food', 'pizza', 'chicken', 'sadza', 'nyama', 'huku', 'muriwo', 'chibage', 'madora'],
    icon: '🍔',
  },
  {
    name: 'Hair & Beauty',
    keywords: ['hair', 'braids', 'cut', 'salon', 'barber', 'nails', 'makeup', 'cosmetics', 'bvudzi', 'mabhurekisi', 'kugera'],
    icon: '💇',
  },
  {
    name: 'Building Materials',
    keywords: ['construction', 'hardware', 'cement', 'bricks', 'timber', 'roofing', 'zvidhinha', 'simenti', 'matanda', 'denga'],
    icon: '🏗️',
  },
  {
    name: 'Clothing & Fashion',
    keywords: ['fashion', 'apparel', 'dresses', 'shoes', 'tailor', 'designer', 'mbatya', 'shangu', 'zvipfeko'],
    icon: '👗',
  },
  {
    name: 'Automotive',
    keywords: ['car', 'mechanic', 'repair', 'tyres', 'garage', 'spare parts', 'mota', 'matai', 'injini'],
    icon: '🚗',
  },
  {
    name: 'Cleaning Services',
    keywords: ['cleaning', 'janitor', 'housekeeping', 'laundry', 'kutsvaira', 'kugeza', 'kuchenesa'],
    icon: '🧹',
  },
  {
    name: 'Farming & Agriculture',
    keywords: ['agriculture', 'livestock', 'crops', 'gardening', 'farm', 'kurima', 'mombe', 'mbeu', 'pamba'],
    icon: '🌾',
  },
  {
    name: 'Health & Medical',
    keywords: ['doctor', 'clinic', 'pharmacy', 'dentist', 'hospital', 'chipatara', 'mushonga', 'chiremba', 'kurapa'],
    icon: '🏥',
  },
  {
    name: 'Education & Tutoring',
    keywords: ['tutor', 'lessons', 'training', 'school', 'teacher', 'chikoro', 'mudzidzisi', 'fundo', 'kudzidza'],
    icon: '📚',
  },
  {
    name: 'IT & Web',
    keywords: ['software', 'web design', 'development', 'computer', 'graphic design', 'kombiyuta', 'nharembozha', 'app'],
    icon: '💻',
  },
  {
    name: 'Transport & Delivery',
    keywords: ['delivery', 'logistics', 'truck', 'courier', 'shipping', 'bhazi', 'tekisi', 'kutakura'],
    icon: '🚚',
  },
  {
    name: 'Real Estate',
    keywords: ['property', 'rent', 'housing', 'agent', 'estate', 'imba', 'nzvimbo', 'roja'],
    icon: '🏠',
  },
  {
    name: 'Financial Services',
    keywords: ['accounting', 'insurance', 'loans', 'banking', 'tax', 'mari', 'bhanga', 'inishuwarenzi', 'chikwereti'],
    icon: '💰',
  },
  {
    name: 'Legal Services',
    keywords: ['lawyer', 'attorney', 'legal advice', 'notary', 'gweta', 'mutemo'],
    icon: '⚖️',
  },
  {
    name: 'Photography',
    keywords: ['photos', 'videography', 'events', 'wedding', 'mifananidzo', 'kupururudza'],
    icon: '📷',
  },
  {
    name: 'Electronics',
    keywords: ['phones', 'laptops', 'gadgets', 'repair', 'tv', 'radio', 'computer', 'nharembozha', 'terevhizheni'],
    icon: '📱',
  },
  {
    name: 'Pet Services',
    keywords: ['vet', 'pet', 'grooming', 'dog', 'imbwa', 'katsi', 'mhuka'],
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
