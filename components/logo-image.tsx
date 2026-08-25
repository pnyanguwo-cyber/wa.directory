import Image from 'next/image'

// Business logos come from two sources: uploads to our Supabase storage bucket
// (safe to run through the next/image optimizer) and arbitrary URLs typed by the
// owner (any host — NOT in next.config remotePatterns, so the optimizer would throw
// and crash the whole grid). We optimize the former and fall back to a plain <img>
// for the latter so a single odd URL can never take down a listing page.
const SUPABASE_HOST = 'zefhvpifhzklkbkptjgv.supabase.co'

export default function LogoImage({
  src,
  alt,
  width,
  height,
  sizes,
  className,
  priority,
}: {
  src: string
  alt: string
  width: number
  height: number
  sizes?: string
  className?: string
  priority?: boolean
}) {
  if (!src) return null

  if (src.includes(SUPABASE_HOST)) {
    return (
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        className={className}
        priority={priority}
      />
    )
  }

  // Arbitrary external URL — bypass the optimizer's host allowlist, but still set
  // explicit dimensions so it doesn't cause layout shift on load.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={width} height={height} loading="lazy" className={className} />
}
