import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-url'

// Answer engines and AI assistants need to be told they are welcome: several
// of them skip a site entirely when robots.txt does not mention them.
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'meta-externalagent',
  'cohere-ai',
]

// Private or transactional screens: nothing here is worth a crawl visit.
const DISALLOW = [
  '/admin',
  '/admin-login',
  '/api/',
  '/portal',
  '/edit',
  '/login',
  '/account-setup',
  '/pay',
  '/my-qr',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      ...AI_CRAWLERS.map(userAgent => ({ userAgent, allow: '/', disallow: DISALLOW })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
