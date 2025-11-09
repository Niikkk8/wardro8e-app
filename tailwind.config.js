/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#E6F7F5',
          100: '#CCEFEB',
          200: '#99DFD7',
          300: '#66CFC3',
          400: '#33BFAF',
          500: '#208B84',
          600: '#1A6F69',
          700: '#145350',
          800: '#0D3836',
          900: '#071C1B',
        },
        neutral: {
          0: '#FFFFFF',
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0A0A0A',
        },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
      fontFamily: {
        sans: [
          'Montserrat-Thin',
          'Montserrat-Light',
          'Montserrat-Regular',
          'Montserrat-Medium',
          'Montserrat-SemiBold',
          'Montserrat-Bold',
        ],
        serif: [
          'PlayfairDisplay-Regular',
          'PlayfairDisplay-Medium',
          'PlayfairDisplay-Bold',
        ],
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [],
};
