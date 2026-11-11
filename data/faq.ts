// Shared so the visible FAQ and its FAQPage structured data can never drift.
export interface FaqItem {
  q: string
  a: string
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: 'What is WA Directory?',
    a: "WA Directory is Zimbabwe's AI-powered business directory. We help you discover verified local shops, compare real-time prices, and connect directly on WhatsApp: all in one place.",
  },
  {
    q: 'How do I list my business?',
    a: 'Click the "List Your Business Free" button, fill in your details, and verify ownership via WhatsApp. Once approved, your business appears in search results and categories.',
  },
  {
    q: 'Is it free to list my business?',
    a: 'Yes! Basic listing is completely free. We also offer premium ranking and visibility boosts for businesses that want more exposure.',
  },
  {
    q: 'How does the AI search work?',
    a: 'Our AI understands natural language queries like "plumber near me" or "cheap solar panels in Harare". It matches your request to the most relevant verified businesses.',
  },
  {
    q: 'How are businesses verified?',
    a: 'Businesses verify ownership through WhatsApp confirmation and manual review. Verified badges appear on profiles you can trust.',
  },
]
