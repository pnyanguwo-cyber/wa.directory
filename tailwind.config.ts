import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        whatsapp: {
          50: '#e6f7ed',
          100: '#c0ebd1',
          200: '#96deb3',
          300: '#6bd095',
          400: '#4bc67e',
          500: '#25D366',
          600: '#1da851',
          700: '#15803d',
          800: '#0e5c2d',
          900: '#07381b',
        },
      },
    },
  },
  plugins: [],
}

export default config
