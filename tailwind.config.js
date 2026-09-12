/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        guard: {
          safe: '#16a34a',
          warning: '#d97706',
          danger: '#dc2626',
          primary: '#0284c7',
          surface: '#0f172a'
        }
      }
    },
  },
  plugins: [],
}
