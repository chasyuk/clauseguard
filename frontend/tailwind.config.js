/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        forest: {
          DEFAULT: '#18322B',
          deep: '#122721',
          card: '#1D3B33',
          soft: '#22453C',
          border: '#2C4E44',
          muted: '#8DA89F',
        },
        paper: {
          DEFAULT: '#F5F4F0',
          card: '#FFFFFF',
          soft: '#EEF1EE',
          border: '#DEDCD5',
          strong: '#C8C5BC',
        },
        signal: {
          DEFAULT: '#F26419',
          hover: '#D9530E',
          soft: '#FFF1E8',
          border: '#FDBA8C',
        },
        // Compatibility aliases mapped to the Forest + Paper palette
        surface: {
          bg: '#F5F4F0',
          card: '#FFFFFF',
          subtle: '#EEF1EE',
          border: '#DEDCD5',
          strong: '#C8C5BC',
        },
        ink: {
          primary: '#162620',
          secondary: '#465851',
          muted: '#74857E',
        },
        brand: {
          DEFAULT: '#F26419',
          hover: '#D9530E',
          subtle: '#FFF1E8',
          text: '#C2410C',
        },
        risk: {
          highBg: '#FFF1E8',
          highText: '#C2410C',
          highBorder: '#FDBA8C',
          medBg: '#FEF9C3',
          medText: '#A16207',
          medBorder: '#FDE047',
          lowBg: '#ECFDF5',
          lowText: '#15803D',
          lowBorder: '#86EFAC',
        },
      },
      borderRadius: {
        none: '0px',
        sm: '4px',
        DEFAULT: '8px',
        md: '8px',
        lg: '12px',
        xl: '14px',
      },
    },
  },
  plugins: [],
};
