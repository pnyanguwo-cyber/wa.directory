'use client'

import { useEffect, useState } from 'react'

export default function CountUp({ target, duration = 1500 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (target === 0) {
      setCount(0)
      return
    }
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      setCount(target)
      return
    }

    const start = performance.now()
    let raf: number

    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))
      if (progress < 1) raf = requestAnimationFrame(animate)
    }

    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return <>{count.toLocaleString()}</>
}
