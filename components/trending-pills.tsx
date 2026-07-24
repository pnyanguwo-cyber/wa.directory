import Link from 'next/link'

const trends = ['Electrician', 'Pharmacy', 'Web Designer', 'Phone Repair', 'Hardware']

export default function TrendingPills() {
  return (
    <div className="flex flex-wrap gap-2 mt-6 justify-center">
      {trends.map(t => (
        <Link
          key={t}
          href={`/search?q=${encodeURIComponent(t)}`}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm transition-colors"
        >
          {t}
        </Link>
      ))}
    </div>
  )
}
