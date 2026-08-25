import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Allow only genuine PNG / JPEG / WebP, detected by magic bytes rather than the
// client-supplied MIME type or filename extension. This rejects SVG (which can
// carry <script> → stored XSS on the storage origin) and any disguised payload.
const SIGNATURES: { ext: string; type: string; test: (b: Uint8Array) => boolean }[] = [
  { ext: 'png', type: 'image/png', test: b => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { ext: 'jpg', type: 'image/jpeg', test: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    ext: 'webp',
    type: 'image/webp',
    test: b =>
      b.length >= 12 &&
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // "RIFF"
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50, // "WEBP"
  },
]

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

    if (file.size > 2 * 1024 * 1024) {
      return Response.json({ error: 'File too large (max 2MB)' }, { status: 400 })
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    const match = SIGNATURES.find(s => s.test(bytes))
    if (!match) {
      return Response.json({ error: 'Only PNG, JPEG or WebP images are allowed' }, { status: 400 })
    }

    // Filename and content type are derived server-side, never from the client.
    const fileName = `public/${Date.now()}_${Math.random().toString(36).slice(2)}.${match.ext}`

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(fileName, bytes, {
        contentType: match.type,
        upsert: false,
      })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('logos')
      .getPublicUrl(fileName)

    return Response.json({ url: publicUrl })
  } catch (err) {
    console.error('Upload error:', err)
    return Response.json({ error: 'Upload failed' }, { status: 500 })
  }
}
