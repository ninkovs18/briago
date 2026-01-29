/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        barbershop: {
          gold: '#c6ff3e', // neon lime accent
          dark: '#0b1215', // deep charcoal teal
          gray: '#132128'  // dark slate
        }
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'Roc Grotesk', 'Poppins', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Poppins', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}