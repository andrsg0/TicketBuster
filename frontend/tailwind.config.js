/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0a56ea',
        secondary: '#f42d53',
        accent: '#8852f6',
        success: '#4ed34e',
        warning: '#ffca0c',
        error: '#f42d53',
        dark: '#262626',
        gray: {
          DEFAULT: '#3e4649',
          light: '#f5f5f5',
          dark: '#999999',
        }
      },
      fontFamily: {
        sans: ['Rethink Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
