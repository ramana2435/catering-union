/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fef9ee',
          100: '#fdf0d5',
          200: '#faddaa',
          300: '#f6c374',
          400: '#f1a03b',
          500: '#ee8319',
          600: '#de680f',
          700: '#b84f0f',
          800: '#933f13',
          900: '#773512',
          950: '#401907',
        },
      },
    },
  },
  plugins: [],
}
