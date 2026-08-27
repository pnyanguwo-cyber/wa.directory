import { NextResponse } from 'next/server'

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY

export async function POST(request: Request) {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 })
    }

    const { address } = await request.json()
    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 })
    }

    const query = encodeURIComponent(address + ', Zimbabwe')
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${GOOGLE_MAPS_API_KEY}`

    const res = await fetch(url)
    const data = await res.json()

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const result = data.results[0]
      const formatted = result.formatted_address || address
      const location = result.geometry?.location

      return NextResponse.json({
        valid: true,
        formatted_address: formatted,
        lat: location?.lat,
        lng: location?.lng,
        partial_match: result.partial_match || false,
      })
    }

    return NextResponse.json({ valid: false, message: 'Address not found in Zimbabwe' })
  } catch {
    return NextResponse.json({ error: 'Failed to validate address' }, { status: 500 })
  }
}
