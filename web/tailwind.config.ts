import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
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
          50: '#e6faf6',
          100: '#b3f0e3',
          200: '#80e6d0',
          300: '#4ddcbd',
          400: '#26d2aa',
          500: '#00B894',
          600: '#009a7c',
          700: '#007a63',
          800: '#005a49',
          900: '#003a30',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        aurora: {
          from: { backgroundPosition: '50% 50%, 50% 50%' },
          to: { backgroundPosition: '350% 50%, 350% 50%' },
        },
      },
      animation: {
        aurora: 'aurora 60s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
