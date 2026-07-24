import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        whatsapp: {
          50: '#e6f7ed',
          100: '#c0ebd1',
          200: '#96deb3',
          300: '#6bd095',
          400: '#4bc67e',
          500: '#25D366',
          600: '#128C7E',
          700: '#15803d',
          800: '#0e5c2d',
          900: '#07381b',
        },
        surface: '#F0F2F5',
        'text-primary': '#111B21',
        'text-secondary': '#667781',
        danger: '#FF3B30',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.1)',
        dropdown: '0 4px 16px rgba(0,0,0,0.12)',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 1.5s infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}

export default config
