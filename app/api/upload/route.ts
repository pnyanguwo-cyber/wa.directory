import { NextRequest } from 'next/server'
import { sniffImage, uploadLogoImage, MAX_LOGO_BYTES } from '@/lib/image-storage'
import { imageLuminanceFromBytes } from '@/lib/image-luminance'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size === 0) {
      return Response.json({ error: 'Empty file' }, { status: 400 })
    }

    if (file.size > MAX_LOGO_BYTES) {
      return Response.json({ error: 'File too large (max 2MB)' }, { status: 400 })
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    if (!sniffImage(bytes)) {
      return Response.json({ error: 'Only PNG, JPEG or WebP images are allowed' }, { status: 400 })
    }

    const url = await uploadLogoImage(bytes)
    if (!url) {
      console.error('Upload error: storage upload failed')
      return Response.json({ error: 'Upload failed' }, { status: 500 })
    }

    // Clients can persist this alongside the URL (hero scrim tiering).
    const luminance = await imageLuminanceFromBytes(bytes)
    return Response.json({ url, luminance })
  } catch (err) {
    console.error('Upload error:', err)
    return Response.json({ error: 'Upload failed' }, { status: 500 })
  }
}
