/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'roboto': ['Roboto', 'sans-serif'],
      },
      boxShadow: {
        'pink': '5px 5px 10px rgba(255, 115, 179, 0.5)',
      },
    },
  },
  plugins: [],
}