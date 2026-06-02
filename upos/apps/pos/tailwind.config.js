/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        dulwich: {
          DEFAULT: '#003DA5',
          50:  '#e6edfa',
          100: '#ccdaf5',
          200: '#99b5eb',
          300: '#6690e1',
          400: '#336bd7',
          500: '#003DA5',
          600: '#003494',
          700: '#002b7a',
          800: '#002261',
          900: '#001947',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Thai', 'sans-serif'],
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
}
