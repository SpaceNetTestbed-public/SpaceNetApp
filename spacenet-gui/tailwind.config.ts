import type { Config } from 'tailwindcss'
export default {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        maroon: { DEFAULT:'#861F41', hover:'#9A2A52', pressed:'#6E1733' },
        accent: { DEFAULT:'#F0A500' },
        light: { bg:'#F7F7F8', surface:'#FFFFFF', text:'#16181C', border:'#E6E6EA' },
        dark: { bg:'#0E0F12', surface:'#1A1C20', text:'#EAECEF', subtext:'#A9AFB8', border:'#2A2D33' }
      },
      boxShadow: { 'card-2':'0 6px 16px rgba(0,0,0,0.08)', 'modal-3':'0 12px 28px rgba(0,0,0,0.18)' },
      borderRadius: { btn:'8px', card:'12px' },
      fontFamily: { inter:['Inter','system-ui','sans-serif'] }
    }
  },
  plugins: [require('tailwindcss-animate')]
} satisfies Config

