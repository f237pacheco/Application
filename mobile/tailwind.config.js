/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6C5CE7',
          50: '#f0eeff',
          100: '#e3deff',
          200: '#cac1ff',
          300: '#a899ff',
          400: '#8a6fff',
          500: '#6C5CE7',
          600: '#5a48d4',
          700: '#4836b8',
          800: '#3a2a96',
          900: '#2e2278',
        },
        success: {
          DEFAULT: '#00B894',
          500: '#00B894',
        },
      },
    },
  },
  plugins: [],
};
