/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#e6edf8',
          100: '#ccdaf1',
          200: '#99b5e3',
          300: '#6690d5',
          400: '#336bc7',
          500: '#003DA5',
          600: '#003494',
          700: '#002b83',
          800: '#002272',
          900: '#001961',
        },
        dulwich: {
          blue:  '#003DA5',
          light: '#1a55b8',
          dark:  '#002d7d',
        },
      },
      fontFamily: {
        sans: ['Sarabun', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        mobile: '430px',
      },
      screens: {
        xs: '375px',
      },
    },
  },
  plugins: [],
}
