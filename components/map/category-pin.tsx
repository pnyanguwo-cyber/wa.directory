'use client'

// Category pin rasterizer: turns the Lucide icon for a business category
// into MapLibre glyph images painted onto a consistent premium pin shape.
//
// One uniform geometry for every pin (requirement: consistent dimensions,
// stroke, spacing) and two states (default / selected). WA Directory green
// is reserved for the selected state + interactive accents. No emoji
// anywhere (requirement: emoji markers fully removed).

import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type maplibregl from 'maplibre-gl'
import { doodleFor, LUCIDE_DOODLES } from '@/lib/category-style'
import type { LucideProps } from 'lucide-react'

// ---- pin geometry (logical px; rendered @2x) -------------------------------
export const PIN_W = 40
export const PIN_H = 50
const PIN_BODY = { x: 1, y: 1, w: 38, h: 34, r: 11 }
const PIN_TAIL = { left: 14, right: 26, apexY: 46 } // tail tip = the point coordinate

export const BADGE_SIZE = 22

const GLYPH_BOX = 20 // glyph drawn into this square, centered in body
const GLYPH_COLOR = '#334155' // default glyph - quiet slate
const SEL_TOP = '#2BC36E' // slight lift off flat #25D366 for depth
const SEL_BOTTOM = '#128C7E'
const BORDER = 'rgba(148, 163, 184, 0.9)'
const BORDER_SEL = '#FFFFFF'
const SHADOW = 'rgba(15, 23, 42, 0.20)'

export type PinState = 'default' | 'selected'

export function sanitizeKey(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'other'
  )
}

export function pinImageName(categoryKey: string, state: PinState): string {
  return `wa-pin-${state}-${categoryKey}`
}

function iconForCategory(catNames: string[]): ComponentType<LucideProps> {
  const hit = doodleFor(catNames)
  return (hit?.icon || LUCIDE_DOODLES.Other) as ComponentType<LucideProps>
}

// Lucide components are React SVG trees; flatten to a string once per icon,
// bake in the stroke colour (currentColor does not resolve inside <img>),
// and rasterize onto the pin canvas via an svg:// data URL.
function iconToSvg(icon: ComponentType<LucideProps>, color: string): string {
  const markup = renderToStaticMarkup(createElement(icon, { size: 24, strokeWidth: 2.25 }))
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    markup.replace(/currentColor/g, color)
  )}`
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(24, 24)
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load pin glyph: ${src.slice(0, 64)}`))
    img.src = src
  })
}

function pathRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

async function renderPin(
  icon: ComponentType<LucideProps>,
  glyphColor: string,
  selected: boolean
): Promise<ImageData> {
  const canvas = document.createElement('canvas')
  canvas.width = PIN_W * 2
  canvas.height = PIN_H * 2
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no canvas 2d context')
  ctx.scale(2, 2)

  // Soft drop shadow baked under the pin (consistent for every marker).
  ctx.save()
  ctx.shadowColor = SHADOW
  ctx.shadowBlur = 5
  ctx.shadowOffsetY = 2.5
  const fill = ctx.createLinearGradient(0, PIN_BODY.y, 0, PIN_TAIL.apexY)
  if (selected) {
    fill.addColorStop(0, SEL_TOP)
    fill.addColorStop(1, SEL_BOTTOM)
  } else {
    fill.addColorStop(0, '#FFFFFF')
    fill.addColorStop(1, '#FDFEFE')
  }

  // Tail first, body over it - one fused shadow pass.
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.moveTo(PIN_TAIL.left, PIN_BODY.y + PIN_BODY.h - 2)
  ctx.lineTo(PIN_TAIL.right, PIN_BODY.y + PIN_BODY.h - 2)
  ctx.lineTo((PIN_TAIL.left + PIN_TAIL.right) / 2, PIN_TAIL.apexY)
  ctx.closePath()
  ctx.fill()
  pathRoundedRect(ctx, PIN_BODY.x, PIN_BODY.y, PIN_BODY.w, PIN_BODY.h, PIN_BODY.r)
  ctx.fill()
  ctx.restore()

  // Crisp border pass (no shadow).
  ctx.lineWidth = selected ? 2 : 1.5
  ctx.lineJoin = 'round'
  ctx.strokeStyle = selected ? BORDER_SEL : BORDER
  pathRoundedRect(ctx, PIN_BODY.x, PIN_BODY.y, PIN_BODY.w, PIN_BODY.h, PIN_BODY.r)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(PIN_TAIL.left, PIN_BODY.y + PIN_BODY.h - 1.5)
  ctx.lineTo((PIN_TAIL.left + PIN_TAIL.right) / 2, PIN_TAIL.apexY)
  ctx.lineTo(PIN_TAIL.right, PIN_BODY.y + PIN_BODY.h - 1.5)
  ctx.stroke()

  // Category glyph (rasterized Lucide icon), centered in the body.
  const glyph = await loadImage(iconToSvg(icon, glyphColor))
  const gx = (PIN_W - GLYPH_BOX) / 2
  const gy = PIN_BODY.y + (PIN_BODY.h - GLYPH_BOX) / 2 - 0.5
  ctx.drawImage(glyph, gx, gy, GLYPH_BOX, GLYPH_BOX)

  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

const IMG_OPTIONS = { pixelRatio: 2 } as const

function imageDataOf(canvas: HTMLCanvasElement): ImageData {
  return canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height)
}

// Featured badge: small amber star medallion baked once.
async function renderFeaturedBadge(): Promise<ImageData> {
  const canvas = document.createElement('canvas')
  canvas.width = BADGE_SIZE * 2
  canvas.height = BADGE_SIZE * 2
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no canvas 2d context')
  ctx.scale(2, 2)

  ctx.save()
  ctx.shadowColor = 'rgba(15, 23, 42, 0.25)'
  ctx.shadowBlur = 3
  ctx.shadowOffsetY = 1
  ctx.fillStyle = '#F59E0B'
  ctx.beginPath()
  ctx.arc(BADGE_SIZE / 2, BADGE_SIZE / 2, BADGE_SIZE / 2 - 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  ctx.lineWidth = 1.5
  ctx.strokeStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.arc(BADGE_SIZE / 2, BADGE_SIZE / 2, BADGE_SIZE / 2 - 2, 0, Math.PI * 2)
  ctx.stroke()

  // Star (5 outer / 5 inner vertices, centered).
  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  const cx = BADGE_SIZE / 2
  const cy = BADGE_SIZE / 2 + 0.5
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5
    const rad = i % 2 === 0 ? 5 : 2.4
    const x = cx + rad * Math.cos(angle)
    const y = cy + rad * Math.sin(angle)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()

  return imageDataOf(canvas)
}

// Raster cache: canvas rendering per (category, state) happens once per
// session; re-registration on style swaps only replays map.addImage.
const RASTER_CACHE = new Map<string, ImageData>()

function cachedPin(icon: ComponentType<LucideProps>, key: string, selected: boolean): Promise<ImageData> {
  const cacheKey = `${key}|${selected ? 'selected' : 'default'}`
  const hit = RASTER_CACHE.get(cacheKey)
  if (hit) return Promise.resolve(hit)
  return renderPin(icon, selected ? '#FFFFFF' : GLYPH_COLOR, selected).then((data) => {
    RASTER_CACHE.set(cacheKey, data)
    return data
  })
}

// Register every needed pin image (default + selected per category) plus the
// featured badge. Idempotent-safe: re-registration errors are swallowed.
export async function registerPinImages(
  map: maplibregl.Map,
  categoryNames: string[]
): Promise<void> {
  const jobs: Promise<unknown>[] = []

  const seen = new Set<string>()
  for (const canonical of categoryNames) {
    const key = sanitizeKey(canonical)
    if (!key || seen.has(key)) continue
    seen.add(key)

    for (const state of ['default', 'selected'] as const) {
      const name = pinImageName(key, state)
      if (map.hasImage(name)) continue
      jobs.push(
        cachedPin(iconForCategory([canonical]), key, state === 'selected')
          .then((data) => map.addImage(name, data, IMG_OPTIONS))
          .catch(() => {})
      )
    }
  }

  if (!map.hasImage('wa-featured-badge')) {
    jobs.push(
      renderFeaturedBadge()
        .then((data) => map.addImage('wa-featured-badge', data, IMG_OPTIONS))
        .catch(() => {})
    )
  }

  await Promise.all(jobs)
}
