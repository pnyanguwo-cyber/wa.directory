import ListBusinessForm from '@/components/list-business-form'

export default function ListBusinessPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">List Your Business</h1>
        <p className="text-gray-500">Get found by customers on WhatsApp</p>
      </div>
      <ListBusinessForm />
    </div>
  )
}
