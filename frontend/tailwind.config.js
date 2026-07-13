/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: {
          50:  '#fefef9',
          100: '#fbfaf7',
          200: '#f5f2ea',
          300: '#ede8db',
          400: '#ddd5c3',
          500: '#c9bfa8',
        },
        ink: {
          900: '#1a1a1a',
          800: '#2d2d2d',
          700: '#404040',
          600: '#5a5a5a',
          500: '#737373',
          400: '#8f8f8f',
          300: '#b0b0b0',
          200: '#d0d0d0',
          100: '#e8e8e8',
        },
        amber: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        parchment: {
          50: '#fdfdfc',
          100: '#fcfbf7',
          200: '#f8f6ee',
          300: '#f0edd8',
          400: '#e5dfc0',
          500: '#d0c697',
        },
        deepInk: {
          950: '#0b0e11',
          900: '#11161B',
          800: '#1c2229',
          700: '#2c353f',
        },
        brass: {
          50: '#fcfaf2',
          100: '#f7f1db',
          200: '#ede0b3',
          300: '#dfca80',
          400: '#d1b154',
          500: '#c3a36d', // primary border/light brass
          600: '#a37f43', // primary text/dark brass
          700: '#826130',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'ui-serif', 'serif'],
      },
      boxShadow: {
        'warm-sm': '0 1px 3px 0 rgba(26,20,10,0.08), 0 1px 2px -1px rgba(26,20,10,0.06)',
        'warm-md': '0 4px 12px 0 rgba(26,20,10,0.10), 0 2px 4px -2px rgba(26,20,10,0.06)',
        'warm-lg': '0 10px 30px 0 rgba(26,20,10,0.12), 0 4px 8px -4px rgba(26,20,10,0.08)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
