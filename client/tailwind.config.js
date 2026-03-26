/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        playfair: ['"Playfair Display"', 'serif'],
        dm: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        snow: '#f0f6ff',
        ice: '#c8e3f5',
        glacier: '#7ab8d9',
        'deep-sky': '#1e5b8a',
        midnight: '#0a1628',
        alpine: '#0d2340',
        pine: '#1a4a2e',
        'pine-light': '#2a6b42',
        gold: '#c9922a',
        'gold-light': '#e8b84b',
      },
      animation: {
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        snowfall: 'snowfall linear infinite',
        'fade-down': 'fadeDown 0.9s ease both',
        'fade-up': 'fadeUp 0.8s ease both',
        'slide-down': 'slideDown 0.2s ease',
        'pop-in': 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { filter: 'drop-shadow(0 0 10px rgba(232,184,75,0.4))' },
          '50%': { filter: 'drop-shadow(0 0 30px rgba(232,184,75,0.9))' },
        },
        snowfall: {
          '0%': { transform: 'translateY(-20px) translateX(0px)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '0.6' },
          '100%': { transform: 'translateY(110vh) translateX(35px)', opacity: '0' },
        },
        fadeDown: {
          from: { opacity: '0', transform: 'translateY(-20px)' },
          to: { opacity: '1', transform: 'none' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'none' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'none' },
        },
        popIn: {
          from: { transform: 'scale(0.3)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
