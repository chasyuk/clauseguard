/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"IBM Plex Serif"', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        surface: {
          bg: '#F7F5F0',       // Warm archival stone canvas
          card: '#FDFCF9',     // Crisp document ivory
          subtle: '#EFECE6',   // Warm sand headers / recessed areas
          border: '#D4CFC7',   // Crisp graphite 1px border
          strong: '#141413',   // Ink rule for sharp structural lines
        },
        ink: {
          primary: '#141413',  // Deep charcoal
          secondary: '#4A4843',
          muted: '#78746C',
        },
        brand: {
          DEFAULT: '#0F4C3A',  // Deep forest green (single authoritative accent)
          hover: '#093528',
          subtle: '#E6EFEA',
        },
        risk: {
          highBg: '#FBEAEA',
          highText: '#9E2A2B',
          highBorder: '#D98282',
          medBg: '#FDF3E7',
          medText: '#8C5319',
          medBorder: '#D9A76C',
          lowBg: '#EAF4EE',
          lowText: '#14532D',
          lowBorder: '#79B491',
        },
      },
      borderRadius: {
        none: '0px',
        sm: '0px',
        DEFAULT: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        '3xl': '0px',
        full: '0px',
      },
    },
  },
  plugins: [],
};
