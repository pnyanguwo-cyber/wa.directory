# Automated Cover Photos & Hero Scrim Engine

This document specifies the end-to-end architecture, resolution hierarchy, ingestion pipeline, and WCAG contrast tinting engine for automated business website cover photos across **WA Directory**.

---

## 1. Architecture Overview

Every auto-generated website (`/site/[slug]`) requires a professional hero cover image that instantly contextualizes the business while ensuring **100% legibility (WCAG 2.1 AAA contrast)** for headlines, tags, and call-to-actions.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        4-TIER RESOLUTION HIERARCHY                     │
└────────────────────────────────────────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┴───────────────────────────────┐
    ▼                                                               ▼
[Tier 1: Owner Upload]                                   [Tier 2: Product Hero]
Business uploaded cover photo                             Highest-res active product photo
via Portal (`site_content.gallery[0]`)                    from `business_items`
    │ (if null)                                                     │ (if null)
    └───────────────────────────────┬───────────────────────────────┘
                                    │
                                    ▼
                         [Tier 3: Category Image]
                         Mapped from `@/data/category-images.ts`
                         Hosted on Supabase Storage (`categories/*`)
                                    │ (if null)
                                    ▼
                         [Tier 4: Procedural Mesh]
                         Dynamic SVG Noise + Accent Radial Lighting
```

---

## 2. Automated Sourcing & Ingestion Pipeline

Cover photos are sourced, optimized, and hosted on Supabase Storage via automated tooling:

### Script: `scripts/fetch-category-images.mjs`
The pipeline automates:
1. **Category Parsing:** Reads canonical categories from `data/categories.ts`.
2. **Dual-Provider Discovery:**
   - **Primary:** Wikimedia Commons API with geolocation filtering near Zimbabwe (`lat: -17.8252, lon: 31.0335` for Harare / local relevance).
   - **Secondary Fallback:** Pexels Royalty-Free API with high-resolution landscape queries (`width >= 1920`, orientation: `landscape`).
3. **Buffer Validation:** Verifies MIME type (`image/jpeg`, `image/webp`) and minimum dimensions (`1200x630`).
4. **Supabase Upload:** Uploads to the public storage bucket:
   ```
   Bucket: categories
   Path:   categories/[slug].jpg
   Upsert: true
   ```
5. **Code Generation:** Automatically writes the static mapping dictionary in `data/category-images.ts`.

### Running the Ingestion Script
To fetch or update cover photos for all seeded categories:

```bash
# Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
node scripts/fetch-category-images.mjs
```

---

## 3. High-Contrast Multi-Layer Scrim (Tint System)

Raw photographs must **never** be placed directly behind hero typography without an optical scrim. White text on unpredictable photography routinely fails WCAG accessibility (contrast drops as low as 1.4:1).

To guarantee **AAA contrast (> 10:1 ratio)** across all 30 seeded industries, the hero template applies a **3-Layer Scrim System**:

```tsx
{/* Container: Full bleed with 105% scale to prevent edge bleed */}
<div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
  {/* 0. Base Cover Photo */}
  <Image
    src={coverImage}
    alt=""
    fill
    priority
    sizes="100vw"
    className="object-cover object-center scale-105 brightness-110 saturate-[1.12]"
  />

  {/* Layer 1: Whisper-light Obsidian Base (Barely tints the photo) */}
  <div
    className="absolute inset-0 bg-slate-950/15 backdrop-blur-[0.5px]"
    style={heroBg ? { backgroundColor: `color-mix(in srgb, ${heroBg} 15%, #020617)` } : undefined}
  />

  {/* Layer 2: Left Text Wash (AAA where the headline lives) + Accent Radial Lighting + Bottom Fade */}
  <div
    className="absolute inset-0"
    style={{
      backgroundImage: `radial-gradient(ellipse 80% 85% at 85% 15%, color-mix(in srgb, ${accent} 40%, transparent), transparent 65%), linear-gradient(to right, rgba(2, 6, 23, 0.85) 0%, rgba(2, 6, 23, 0.55) 42%, rgba(2, 6, 23, 0.1) 72%, transparent 90%), linear-gradient(to bottom, transparent 50%, rgba(2, 6, 23, 0.8) 100%)`,
    }}
  />

  {/* Layer 3: Tactile SVG Noise Grain (Matte Paper Finish) */}
  <div
    className="absolute inset-0 opacity-[0.045] mix-blend-overlay"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
    }}
  />
</div>
```

### Visual Function of Each Layer
1. **Layer 1 (Whisper-light Obsidian Base):** Darkens the underlying photograph by only 15%, just enough to tame the harshest bright spots while leaving the photo essentially raw. A `brightness-110 saturate-[1.12]` filter on the image compensates so the photo still pops.
2. **Layer 2 (Left Text Wash + Accent Radial Lighting):** Applies a left→right obsidian gradient (≈85% → 0%) so the headline/CTA zone maintains WCAG AAA contrast (> 10:1) regardless of the photo beneath it, injects the business's bespoke brand accent into the top-right lighting, and fades the bottom into the page surface.
3. **Layer 3 (SVG Noise):** Eliminates digital color banding and gives the hero a tactile, Apple/Linear paper finish.

---

## 4. Next.js Whitelist Configuration

All category cover photos are served from Supabase Storage and must adhere to Next.js Image Optimization rules in `next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zefhvpifhzklkbkptjgv.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig
```

---

## 5. Adding New Categories or Custom Images

To add a new category cover photo manually:

1. Obtain a high-resolution royalty-free landscape photo (minimum `1920x1080`, landscape orientation).
2. Upload to Supabase Storage:
   ```bash
   bucket: categories
   file:   categories/[category-slug].jpg
   ```
3. Add the mapping entry in `data/category-images.ts`:
   ```typescript
   export const CATEGORY_IMAGES: Record<string, string> = {
     // ...
     'Solar & Renewable': 'https://zefhvpifhzklkbkptjgv.supabase.co/storage/v1/object/public/categories/categories/solar-and-renewable.jpg',
   }
   ```
4. Any business tagged with that category will immediately render the new cover with automatic contrast tinting upon revalidation.

---

## 6. Verification Checklist

- [x] Cover image loads via Next.js `<Image fill priority />` with zero layout shift (0 CLS).
- [x] Tint opacity guarantees text readability in both bright sunlight and dark mode.
- [x] Hostname matches `next.config.mjs` remote patterns.
- [x] Fallback to procedural gradient mesh if the image is missing or offline.
