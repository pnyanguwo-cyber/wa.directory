import { getSupabase } from '@/lib/supabase-server'
import { recordOrderOpen } from '@/lib/orders'
import { compileOrderText } from '@/lib/order-message'
import { digitsOnly } from '@/lib/phone'

export const dynamic = 'force-dynamic'

// Short order checkout: wa.directory/go/o/<token>. The bot (and later the
// web cart) hand buyers this short link instead of a 700-char wa.me URL;
// it doubles as the sales tracker — every open is counted and the row is
// promoted open → sent before the buyer lands in the supplier's chat.

const EXPIRED_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Link expired</title>
<style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f8f7f2;color:#2d2a24;text-align:center}
main{padding:2rem;max-width:30rem}h1{font-size:1.2rem}p{color:#6b665c;line-height:1.6}</style></head>
<body><main><h1>This order link expired</h1>
<p>Order links stay live for 24 hours. Re-open the directory and send your order again — it takes one message.</p>
<p><a href="/">wa.directory</a></p></main></body></html>`

export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  const row = await recordOrderOpen(params.token)

  if (!row) {
    return new Response(EXPIRED_HTML, {
      status: 404,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
  }

  const compiled = compileOrderText({
    businessName: row.biz_name,
    city: row.city || null,
    lines: (row.lines || []) as { name: string; qty: number; price: number | null }[],
    note: row.note || null,
  })

  // The buyer sends the order from their own WhatsApp, addressed to the
  // supplier's number. Voice-only suppliers get a dail-out instead.
  let target = ''
  try {
    const { data: biz } = await getSupabase()
      .from('businesses')
      .select('phone, phone_type')
      .eq('id', row.biz_id)
      .maybeSingle()
    if (biz?.phone_type === 'voice') {
      target = `tel:+${digitsOnly(String(biz.phone || ''))}`
    } else {
      const digits = digitsOnly(String(biz?.phone || ''))
      if (digits) {
        target = `https://wa.me/${digits}?text=${encodeURIComponent(compiled.text)}`
      }
    }
  } catch {
    // target stays empty → page expires gracefully
  }

  if (!target) {
    return new Response(EXPIRED_HTML, {
      status: 404,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
  }

  return new Response(null, { status: 302, headers: { Location: target } })
}
