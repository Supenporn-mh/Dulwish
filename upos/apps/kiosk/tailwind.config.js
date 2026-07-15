/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#1264E3',
          tint:    '#EAF1FD',
          success: '#03BA81',
          danger:  '#FF5252',
        },
        dulwich: {
          50:  '#e8eef8',
          100: '#c6d4ee',
          200: '#a1b8e3',
          300: '#7b9cd7',
          400: '#5e85cf',
          500: '#4170c6',
          600: '#2d5aaf',
          700: '#1e4490',  // primary Dulwich blue
          800: '#143070',
          900: '#0b1f50',
          950: '#060f2d',
        },
      },
      fontSize: {
        'kiosk-sm':  ['1.25rem',  { lineHeight: '1.75rem' }],
        'kiosk-base':['1.5rem',   { lineHeight: '2rem' }],
        'kiosk-lg':  ['2rem',     { lineHeight: '2.5rem' }],
        'kiosk-xl':  ['2.5rem',   { lineHeight: '3rem' }],
        'kiosk-2xl': ['3rem',     { lineHeight: '3.5rem' }],
        'kiosk-3xl': ['4rem',     { lineHeight: '4.5rem' }],
        'kiosk-4xl': ['5rem',     { lineHeight: '5.5rem' }],
        'kiosk-hero':['7rem',     { lineHeight: '1' }],
      },
      spacing: {
        'tap': '4rem',
      },
      borderRadius: {
        'kiosk': '1.5rem',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
    },
  },
  plugins: [],
}
