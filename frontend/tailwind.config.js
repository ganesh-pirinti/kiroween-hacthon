/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ghost: {
          bg: '#0d1117',
          surface: '#161b22',
          border: '#30363d',
          accent: '#58a6ff',
          verified: '#238636',
          violation: '#da3633',
          blocked: '#d29922',
          unverified: '#8b949e',
        },
      },
    },
  },
  plugins: [],
};
