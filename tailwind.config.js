/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sorella: {
          blue: '#8291a0',
          red: '#d52b2d',
          ink: '#15181c',
          mist: '#f4f6f8'
        }
      },
      boxShadow: {
        soft: '0 18px 55px rgba(24, 31, 39, 0.10)'
      }
    }
  },
  plugins: []
}
