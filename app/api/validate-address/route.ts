import { NextResponse } from 'next/server'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

export async function POST(request: Request) {
  try {
    const { address } = await request.json()
    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 })
    }

    const query = encodeURIComponent(address + ', Zimbabwe')
    const url = `${NOMINATIM_URL}?q=${query}&format=json&countrycodes=zw&limit=1&addressdetails=1`

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'WADirectory/1.0 (https://wa.directory)',
      },
    })
    const data = await res.json()

    if (Array.isArray(data) && data.length > 0) {
      const result = data[0]
      const lat = parseFloat(result.lat)
      const lng = parseFloat(result.lon)
      const formatted = result.display_name || address

      return NextResponse.json({
        valid: true,
        formatted_address: formatted,
        lat,
        lng,
        partial_match: false,
      })
    }

    return NextResponse.json({ valid: false, message: 'Address not found in Zimbabwe' })
  } catch {
    return NextResponse.json({ error: 'Failed to validate address' }, { status: 500 })
  }
}
