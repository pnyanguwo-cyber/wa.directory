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
        <EditBusinessForm business={business} />
      </main>
      <Footer />
    </>
  )
}
