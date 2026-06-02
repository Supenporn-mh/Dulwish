/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1264E3',
          light:   '#3D82F0',
          dark:    '#0A4BAD',
          tint:    '#EAF1FD',
        },
        success: { DEFAULT: '#03BA81', bg: '#E0FAF3' },
        danger:  { DEFAULT: '#FF5252', bg: '#FFEBEB' },
        warning: { DEFAULT: '#FF9800', bg: '#FFF3E0' },
        text: {
          primary:   '#111111',
          secondary: '#666666',
          tertiary:  '#999999',
        },
        border: {
          primary:   '#D0D0D0',
          secondary: '#C8C8C8',
          tertiary:  '#E8E8E8',
        },
        bg: {
          page:      '#F5F6FA',
          surface:   '#FFFFFF',
          secondary: '#F0F2F5',
        },
      },
      borderRadius: {
        sm:   '4px',
        md:   '8px',
        lg:   '12px',
        pill: '20px',
      },
      boxShadow: {
        card:       '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
        modal:      '0 8px 32px rgba(0,0,0,0.14)',
        'ios-md':   '0 4px 16px rgba(0,0,0,0.10)',
      },
      fontFamily: {
        sans: ['IBM Plex Sans Thai', '-apple-system', 'BlinkMacSystemFont', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      fontSize: {
        display:      ['28px', { lineHeight: '1.3', fontWeight: '400' }],
        'heading-xl': ['22px', { lineHeight: '1.3', fontWeight: '500' }],
        'heading-lg': ['18px', { lineHeight: '1.4', fontWeight: '500' }],
        'heading-md': ['16px', { lineHeight: '1.4', fontWeight: '500' }],
        'body-lg':    ['15px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md':    ['14px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm':    ['13px', { lineHeight: '1.5', fontWeight: '400' }],
        label:        ['12px', { lineHeight: '1.4', fontWeight: '500' }],
        caption:      ['11px', { lineHeight: '1.4', fontWeight: '400' }],
      },
    },
  },
  plugins: [],
}
