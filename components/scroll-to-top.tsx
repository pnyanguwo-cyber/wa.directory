'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Opening a new page should start at the top. Next keeps the scroll position
 * of the previous route when only the path changes, which used to drop people
 * halfway down a long directory page.
 */
export default function ScrollToTop() {
  const pathname = usePathname()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
