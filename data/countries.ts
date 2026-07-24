export interface CountryCode {
  code: string
  country: string
  flag: string
  prefix: string
  length: number
}

export const countryCodes: CountryCode[] = [
  { code: '+263', country: 'Zimbabwe', flag: '🇿🇼', prefix: '7', length: 9 },
  { code: '+260', country: 'Zambia', flag: '🇿🇲', prefix: '', length: 9 },
  { code: '+27', country: 'South Africa', flag: '🇿🇦', prefix: '', length: 9 },
  { code: '+254', country: 'Kenya', flag: '🇰🇪', prefix: '7', length: 9 },
  { code: '+255', country: 'Tanzania', flag: '🇹🇿', prefix: '', length: 9 },
  { code: '+256', country: 'Uganda', flag: '🇺🇬', prefix: '7', length: 9 },
  { code: '+267', country: 'Botswana', flag: '🇧🇼', prefix: '', length: 8 },
  { code: '+268', country: 'Eswatini', flag: '🇸🇿', prefix: '', length: 8 },
  { code: '+264', country: 'Namibia', flag: '🇳🇦', prefix: '', length: 9 },
  { code: '+265', country: 'Malawi', flag: '🇲🇼', prefix: '', length: 9 },
  { code: '+258', country: 'Mozambique', flag: '🇲🇿', prefix: '', length: 9 },
  { code: '+234', country: 'Nigeria', flag: '🇳🇬', prefix: '80', length: 10 },
  { code: '+233', country: 'Ghana', flag: '🇬🇭', prefix: '', length: 9 },
  { code: '+221', country: 'Senegal', flag: '🇸🇳', prefix: '', length: 9 },
  { code: '+212', country: 'Morocco', flag: '🇲🇦', prefix: '', length: 9 },
  { code: '+20', country: 'Egypt', flag: '🇪🇬', prefix: '', length: 10 },
  { code: '+251', country: 'Ethiopia', flag: '🇪🇹', prefix: '', length: 9 },
  { code: '+257', country: 'Burundi', flag: '🇧🇮', prefix: '', length: 8 },
  { code: '+250', country: 'Rwanda', flag: '🇷🇼', prefix: '', length: 9 },
  { code: '+211', country: 'South Sudan', flag: '🇸🇸', prefix: '', length: 9 },
  { code: '+249', country: 'Sudan', flag: '🇸🇩', prefix: '', length: 9 },
  { code: '+243', country: 'DRC', flag: '🇨🇩', prefix: '', length: 9 },
  { code: '+242', country: 'Congo', flag: '🇨🇬', prefix: '', length: 9 },
  { code: '+244', country: 'Angola', flag: '🇦🇴', prefix: '', length: 9 },
  { code: '+1', country: 'USA/Canada', flag: '🇺🇸', prefix: '', length: 10 },
  { code: '+44', country: 'UK', flag: '🇬🇧', prefix: '', length: 10 },
  { code: '+91', country: 'India', flag: '🇮🇳', prefix: '', length: 10 },
]

export function validatePhone(countryCode: string, phone: string): string | null {
  const country = countryCodes.find(c => c.code === countryCode)
  if (!country) return 'Select a country code'
  const digits = phone.replace(/[^0-9]/g, '')
  if (!digits) return 'Enter a phone number'
  if (digits.length < country.length) return `Must be ${country.length} digits for ${country.country}`
  if (digits.length > country.length) return `Must be ${country.length} digits for ${country.country}`
  if (country.prefix && !digits.startsWith(country.prefix)) {
    return `Must start with ${country.prefix} for ${country.country} mobile`
  }
  return null
}
