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
        primary: {
          DEFAULT: '#2563EB', // Slate Blue
          dark: '#3B82F6',
          light: '#EFF6FF',
        },
        secondary: {
          DEFAULT: '#0F172A', // Navy/Dark Slate
          dark: '#1E293B',
          light: '#F1F5F9',
        },
      },
      borderRadius: {
        'dashboard': '14px',
      },
      boxShadow: {
        'dashboard': '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 8px -1px rgba(0, 0, 0, 0.03)',
      }
    },
  },
  plugins: [],
}
