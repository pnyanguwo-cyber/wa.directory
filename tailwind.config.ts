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
          700: '#075E54',
          800: '#0b4841',
          900: '#07381b',
        },
        surface: '#F0F2F5',
        'text-primary': '#111B21',
        'text-secondary': '#54656F',
        danger: '#EA4335',
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
        '3xl': '24px',
      },
      boxShadow: {
        card: '0 2px 8px -2px rgba(11,20,26,0.06), 0 1px 4px -1px rgba(11,20,26,0.04)',
        'card-hover': '0 12px 28px -6px rgba(18,140,126,0.15), 0 4px 12px -2px rgba(0,0,0,0.05)',
        dropdown: '0 12px 36px rgba(11,20,26,0.14)',
        'soft-lift': '0 10px 30px -5px rgba(18,140,126,0.12), 0 4px 12px -2px rgba(0,0,0,0.04)',
        'soft-glow': '0 0 24px -2px rgba(37,211,102,0.30)',
        'neo-flat': '5px 5px 12px #d1d5db, -5px -5px 12px #ffffff',
        'neo-inset': 'inset 2px 2px 5px rgba(0,0,0,0.06), inset -2px -2px 5px rgba(255,255,255,0.9)',
        'glass-lift': '0 10px 32px 0 rgba(11, 20, 26, 0.08)',
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
