import type { Config } from 'tailwindcss';

// Color tokens lifted from the Nocturne design system bundle shipped with
// the Ridge prototype (project/_ds/.../styles.css) so the real app matches
// the approved design exactly.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#161826',
        canvas: '#101220',
        surface: '#232532',
        text: '#e9e9ed',
        divider: 'rgba(233,233,237,0.12)',
        accent: {
          100: '#f5f4ff',
          200: '#e7e5fe',
          300: '#d2cefd',
          400: '#b5abfc',
          500: '#968ae0',
          600: '#796cbf',
          700: '#5d5294',
          800: '#423a6a',
          900: '#2b2741',
          DEFAULT: '#9184d9',
        },
        neutral: {
          100: '#f3f5fe',
          200: '#e4e7f5',
          300: '#cfd3e5',
          400: '#b2b6ca',
          500: '#9397ab',
          600: '#75798c',
          700: '#595d6c',
          800: '#3f424d',
          900: '#292b31',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '4px',
        md: '10px',
        lg: '14px',
      },
      keyframes: {
        ridgeIn: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'none' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '.35' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        ridgeIn: 'ridgeIn .3s ease both',
        pulseDot: 'pulseDot 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
