/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#e8e4dd',
        signal: '#e63b2e',
        canvas: '#f5f3ee',
        ink: '#111111',
        muted: '#66635e',
        acid: '#d8ff3e'
      },
      fontFamily: {
        sans: ['Space Grotesk', 'sans-serif'],
        display: ['DM Serif Display', 'serif'],
        mono: ['Space Mono', 'monospace']
      },
      boxShadow: {
        lift: '0 24px 60px rgba(17, 17, 17, 0.12)'
      }
    }
  },
  plugins: []
}
