import { NextResponse } from 'next/server'

const templates = [
  (desc: string) =>
    `We are a professional ${desc} service provider dedicated to quality and customer satisfaction. Contact us today for reliable and affordable services.`,
  (desc: string) =>
    `Looking for top-notch ${desc}? We offer expert solutions tailored to your needs. Fast response, fair pricing, and guaranteed quality.`,
  (desc: string) =>
    `Your trusted partner for ${desc}. With years of experience and a commitment to excellence, we deliver results that matter. Reach out now!`,
  (desc: string) =>
    `Specializing in ${desc}, we bring professionalism and reliability to every job. Get in touch for a free quote and experience the difference.`,
  (desc: string) =>
    `Expert ${desc} services at your fingertips. We pride ourselves on quality workmanship, transparent pricing, and exceptional customer care. Message us today!`,
]

export async function POST(request: Request) {
  try {
    const { description } = await request.json()

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    const template = templates[Math.floor(Math.random() * templates.length)]
    const bio = template(description.trim())

    return NextResponse.json({ bio })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
