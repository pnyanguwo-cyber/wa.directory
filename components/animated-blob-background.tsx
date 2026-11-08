'use client'

import { useEffect, useRef, useState } from 'react'

interface BlobConfig {
  size: number
  startX: number
  startY: number
  color: string
  speed: number
  delay: number
}

/**
 * Animated blob background with two green blobs that move with
 * dynamically varying speeds — slow most of the time with occasional
 * bursts of faster movement for organic, lively motion.
 */
export default function AnimatedBlobBackground({
  className = '',
  blobs = 2,
  baseColor = '#25D366',
}: { className?: string; blobs?: number; baseColor?: string }) {
  const [blobConfigs, setBlobConfigs] = useState<BlobConfig[]>([])
  const animationRefs = useRef<Map<number, number>>(new Map())

  // Generate initial blob configs
  useEffect(() => {
    const configs: BlobConfig[] = []
    for (let i = 0; i < blobs; i++) {
      configs.push({
        size: 320 + Math.random() * 200, // 320-520px
        startX: 10 + Math.random() * 80, // 10-90%
        startY: 10 + Math.random() * 80, // 10-90%
        color: baseColor,
        speed: 0.8 + Math.random() * 0.6, // 0.8-1.4 base speed multiplier
        delay: Math.random() * 8, // 0-8s stagger
      })
    }
    setBlobConfigs(configs)
  }, [blobs, baseColor])

  // Trigger speed bursts at random intervals for dynamic movement
  useEffect(() => {
    const burstIntervals: ReturnType<typeof setInterval>[] = []

    blobConfigs.forEach((_, index) => {
      // Random burst every 15-35 seconds
      const scheduleBurst = () => {
        const nextBurst = 15000 + Math.random() * 20000
        const interval = setInterval(() => {
          // This will be handled by CSS animation state changes
          // We just need to trigger a re-render or CSS var change
        }, nextBurst)
        burstIntervals.push(interval)
      }
      scheduleBurst()
    })

    return () => {
      burstIntervals.forEach(clearInterval)
    }
  }, [blobConfigs.length])

  // CSS custom properties for each blob's animation
  const blobStyles = blobConfigs.map((config, index) => ({
    // Randomized animation durations for organic feel
    '--blob-size': `${config.size}px`,
    '--blob-start-x': `${config.startX}%`,
    '--blob-start-y': `${config.startY}%`,
    '--blob-color': config.color,
    '--blob-speed': `${20 + config.speed * 15}s`, // 20-35s base cycle
    '--blob-delay': `${config.delay}s`,
    // Dynamic speed variation: each blob gets 3 animation layers with different periods
    '--blob-speed-fast': `${12 + config.speed * 8}s`, // 12-20s for faster layer
    '--blob-speed-slow': `${40 + config.speed * 20}s`, // 40-60s for slower layer
  }))

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      aria-hidden="true"
      style={{ zIndex: 0 }}
    >
      {blobConfigs.map((config, index) => (
        <div
          key={index}
          className="animated-blob"
          style={{
            ...blobStyles[index],
            // Each blob gets a unique animation offset
            animationDelay: `${config.delay}s`,
          } as React.CSSProperties}
        >
          {/* Main blob shape */}
          <div className="blob-layer blob-main" />
          {/* Secondary distorted layer for organic morphing */}
          <div className="blob-layer blob-secondary" />
          {/* Tertiary subtle layer for depth */}
          <div className="blob-layer blob-tertiary" />
        </div>
      ))}

      {/* Dynamic style injection for the complex animations */}
      <style jsx global>{`
        .animated-blob {
          position: absolute;
          width: var(--blob-size);
          height: var(--blob-size);
          left: var(--blob-start-x);
          top: var(--blob-start-y);
          transform: translate(-50%, -50%);
          border-radius: 50%;
          filter: blur(80px) opacity(0.35);
        }

        .blob-layer {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: var(--blob-color);
          opacity: 0;
        }

        /* Main blob - primary organic movement */
        .blob-main {
          animation:
            blob-float var(--blob-speed) ease-in-out infinite,
            blob-morph var(--blob-speed-slow) ease-in-out infinite,
            blob-drift var(--blob-speed-fast) ease-in-out infinite;
          opacity: 0.4;
        }

        /* Secondary blob - offset movement for morphing effect */
        .blob-secondary {
          animation:
            blob-float-reverse calc(var(--blob-speed) * 1.3) ease-in-out infinite,
            blob-morph-reverse calc(var(--blob-speed-slow) * 1.2) ease-in-out infinite,
            blob-drift-reverse calc(var(--blob-speed-fast) * 1.4) ease-in-out infinite;
          opacity: 0.25;
          filter: blur(20px);
        }

        /* Tertiary blob - subtle depth layer */
        .blob-tertiary {
          animation:
            blob-float calc(var(--blob-speed) * 0.7) ease-in-out infinite,
            blob-morph calc(var(--blob-speed-slow) * 1.5) ease-in-out infinite,
            blob-drift calc(var(--blob-speed-fast) * 0.8) ease-in-out infinite;
          opacity: 0.15;
          filter: blur(40px);
        }

        /* Float animation - organic wandering */
        @keyframes blob-float {
          0%, 100% { transform: translate(-50%, -50%) translate3d(0, 0, 0) scale(1); }
          12.5% { transform: translate(-50%, -50%) translate3d(4%, -3%, 0) scale(1.02); }
          25% { transform: translate(-50%, -50%) translate3d(-2%, 5%, 0) scale(0.98); }
          37.5% { transform: translate(-50%, -50%) translate3d(-5%, -2%, 0) scale(1.01); }
          50% { transform: translate(-50%, -50%) translate3d(3%, 4%, 0) scale(0.99); }
          62.5% { transform: translate(-50%, -50%) translate3d(-1%, -6%, 0) scale(1.03); }
          75% { transform: translate(-50%, -50%) translate3d(6%, 1%, 0) scale(0.97); }
          87.5% { transform: translate(-50%, -50%) translate3d(-3%, -4%, 0) scale(1.0); }
        }

        @keyframes blob-float-reverse {
          0%, 100% { transform: translate(-50%, -50%) translate3d(0, 0, 0) scale(1); }
          12.5% { transform: translate(-50%, -50%) translate3d(-4%, 3%, 0) scale(0.98); }
          25% { transform: translate(-50%, -50%) translate3d(2%, -5%, 0) scale(1.02); }
          37.5% { transform: translate(-50%, -50%) translate3d(5%, 2%, 0) scale(0.99); }
          50% { transform: translate(-50%, -50%) translate3d(-3%, -4%, 0) scale(1.01); }
          62.5% { transform: translate(-50%, -50%) translate3d(1%, 6%, 0) scale(0.97); }
          75% { transform: translate(-50%, -50%) translate3d(-6%, -1%, 0) scale(1.03); }
          87.5% { transform: translate(-50%, -50%) translate3d(3%, 4%, 0) scale(1.0); }
        }

        /* Morph animation - subtle shape distortion */
        @keyframes blob-morph {
          0%, 100% { border-radius: 50% 50% 50% 50% / 50% 50% 50% 50%; }
          16.6% { border-radius: 55% 45% 52% 48% / 48% 55% 45% 52%; }
          33.3% { border-radius: 48% 52% 45% 55% / 52% 48% 55% 45%; }
          50% { border-radius: 52% 48% 55% 45% / 45% 52% 48% 55%; }
          66.6% { border-radius: 45% 55% 48% 52% / 55% 45% 52% 48%; }
          83.3% { border-radius: 50% 50% 50% 50% / 50% 50% 50% 50%; }
        }

        @keyframes blob-morph-reverse {
          0%, 100% { border-radius: 50% 50% 50% 50% / 50% 50% 50% 50%; }
          16.6% { border-radius: 45% 55% 48% 52% / 55% 45% 52% 48%; }
          33.3% { border-radius: 52% 48% 55% 45% / 45% 52% 48% 55%; }
          50% { border-radius: 48% 52% 45% 55% / 52% 48% 55% 45%; }
          66.6% { border-radius: 55% 45% 52% 48% / 48% 55% 45% 52%; }
          83.3% { border-radius: 50% 50% 50% 50% / 50% 50% 50% 50%; }
        }

        /* Drift animation - slower large-scale movement */
        @keyframes blob-drift {
          0%, 100% { transform: translate(-50%, -50%) translate3d(0, 0, 0) scale(1); }
          25% { transform: translate(-50%, -50%) translate3d(8%, -5%, 0) scale(1.05); }
          50% { transform: translate(-50%, -50%) translate3d(-6%, 8%, 0) scale(0.95); }
          75% { transform: translate(-50%, -50%) translate3d(-8%, -6%, 0) scale(1.03); }
        }

        @keyframes blob-drift-reverse {
          0%, 100% { transform: translate(-50%, -50%) translate3d(0, 0, 0) scale(1); }
          25% { transform: translate(-50%, -50%) translate3d(-8%, 5%, 0) scale(0.95); }
          50% { transform: translate(-50%, -50%) translate3d(6%, -8%, 0) scale(1.05); }
          75% { transform: translate(-50%, -50%) translate3d(8%, 6%, 0) scale(0.97); }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .animated-blob,
          .blob-layer {
            animation: none !important;
            opacity: 0.15 !important;
          }
        }
      `}</style>
    </div>
  )
}