import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import EditBusinessForm from '@/components/edit-business-form'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'

export const dynamic = 'force-dynamic'

export default async function EditPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) {
    redirect('/')
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('edit_token', token)
    .single()

  if (!business) {
    redirect('/')
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen py-8 px-4">
        <div className="max-w-2xl mx-auto bg-gradient-to-br from-white/85 via-white/80 to-whatsapp-50/20 backdrop-blur-xl rounded-3xl border border-white/70 shadow-soft-lift p-6 sm:p-8">
          <EditBusinessForm business={business} />
        </div>
      </main>
      <Footer />
    </>
  )
}
