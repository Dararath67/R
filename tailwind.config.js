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
        brand: {
          red: '#E50914',
          crimson: '#B81D24',
          lightBg: '#F8FAFC',
          whiteBg: '#FFFFFF',
          cardBg: '#FFFFFF',
          navBg: '#FFFFFF',
          sidebarBg: '#FFFFFF',
          accent: '#FF2E4C',
          gold: '#D97706',
          darkText: '#0F172A',
          mutedText: '#64748B',
        },
      },
      fontFamily: {
        sans: ['"Kantumruy Pro"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        khmer: ['"Kantumruy Pro"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
