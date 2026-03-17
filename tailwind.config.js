/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        app: '#09090B',
        sidebar: '#0C0C0F',
        card: '#111115',
        'card-hover': '#17171D',
        elevated: '#1A1A22',
      },
      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, #7C3AED, #A855F7)',
        'gradient-accent-h': 'linear-gradient(to right, #7C3AED, #A855F7)',
        'gradient-accent-br': 'linear-gradient(135deg, #7C3AED, #EC4899)',
      },
      boxShadow: {
        accent: '0 0 0 1px rgba(124,58,237,0.4), 0 4px 20px rgba(124,58,237,0.2)',
        'accent-lg': '0 0 0 1px rgba(124,58,237,0.5), 0 8px 32px rgba(124,58,237,0.3)',
        card: '0 1px 3px rgba(0,0,0,0.5)',
        glow: '0 0 24px rgba(124,58,237,0.25)',
      },
    },
  },
  plugins: [],
}
