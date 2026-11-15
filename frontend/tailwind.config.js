/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: '#040507',
          950: '#06080d',
          900: '#090d15',
          850: '#0d131f',
          800: '#121a2a',
        },
        cyan: {
          electric: '#6EE7FF',
        },
        blue: {
          royal: '#4F7DFF',
        },
        emerald: {
          neon: '#00E7A7',
        },
        amber: {
          warm: '#FFC857',
        },
        ruby: {
          neon: '#FF5D73',
        },
        purple: {
          neural: '#8B7DFF',
        },
        muted: {
          DEFAULT: '#98A2B3',
          dark: '#586274',
        },
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        'glass-edge': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.12), 0 20px 40px -15px rgba(0, 0, 0, 0.8)',
        'glass-glow-cyan': '0 0 35px -5px rgba(110, 231, 255, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        'glass-glow-emerald': '0 0 35px -5px rgba(0, 231, 167, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        'glass-glow-ruby': '0 0 35px -5px rgba(255, 93, 115, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        'glow-pill': '0 0 15px rgba(110, 231, 255, 0.3)',
      },
      keyframes: {
        'pulse-slow': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        'scanline': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'waveform': {
          '0%, 100%': { height: '4px' },
          '50%': { height: '18px' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'pulse-slow': 'pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
        'shimmer': 'shimmer 2.5s infinite linear',
        'waveform': 'waveform 1.2s ease-in-out infinite',
        'float-slow': 'float-slow 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
