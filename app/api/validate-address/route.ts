import { NextResponse } from 'next/server'

const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search'
const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse'

export async function POST(request: Request) {
  try {
    const { address, lat, lng } = await request.json()

    // Reverse geocode: convert lat/lng to a formatted address
    if (lat != null && lng != null && typeof lat === 'number' && typeof lng === 'number') {
      const url = `${NOMINATIM_REVERSE}?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'WADirectory/1.0 (https://wa.directory)' },
      })
      const data = await res.json()
      if (data?.display_name) {
        return NextResponse.json({
          valid: true,
          formatted_address: data.display_name,
          lat,
          lng,
        })
      }
      return NextResponse.json({ valid: false, message: 'Could not reverse-geocode location' })
    }

    // Forward geocode: validate an address string
    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 })
    }

    const query = encodeURIComponent(address + ', Zimbabwe')
    const url = `${NOMINATIM_SEARCH}?q=${query}&format=json&countrycodes=zw&limit=1&addressdetails=1`

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'WADirectory/1.0 (https://wa.directory)',
      },
    })
    const data = await res.json()

    if (Array.isArray(data) && data.length > 0) {
      const result = data[0]
      const resultLat = parseFloat(result.lat)
      const resultLng = parseFloat(result.lon)
      const formatted = result.display_name || address

      return NextResponse.json({
        valid: true,
        formatted_address: formatted,
        lat: resultLat,
        lng: resultLng,
        partial_match: false,
      })
    }

    return NextResponse.json({ valid: false, message: 'Address not found in Zimbabwe' })
  } catch {
    return NextResponse.json({ error: 'Failed to validate address' }, { status: 500 })
  }
}
