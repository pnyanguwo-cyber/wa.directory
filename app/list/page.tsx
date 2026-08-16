import ListBusinessForm from '@/components/list-business-form'
import { getApprovedCategories, getApprovedAreas } from '@/lib/approved-data'

export const revalidate = 300

export default async function ListBusinessPage() {
  const [approvedCategories, approvedAreas] = await Promise.all([
    getApprovedCategories(),
    getApprovedAreas(),
  ])

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <div className="bg-gradient-to-br from-white/85 via-white/80 to-whatsapp-50/20 backdrop-blur-xl rounded-3xl border border-white/70 shadow-soft-lift p-6 sm:p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">List Your Business</h1>
          <p className="text-gray-500">Get found by customers on WhatsApp</p>
        </div>
        <ListBusinessForm
          categoryOptions={approvedCategories.map(c => ({ value: c.name, label: `${c.icon} ${c.name}` }))}
          approvedAreas={approvedAreas}
        />
      </div>
    </div>
  )
}
