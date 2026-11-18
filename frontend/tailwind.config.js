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
        surface: {
          bg: '#0A0A0A',       // Cal.com matte obsidian canvas
          card: '#111113',     // Elevated dark panel
          subtle: '#18181B',   // Recessed zinc container
          border: '#27272A',   // Crisp 1px zinc-800 border
          strong: '#3F3F46',   // Emphasized 1px zinc-700 border
        },
        ink: {
          primary: '#FAFAFA',  // Crisp white primary text
          secondary: '#A1A1AA',// Neutral zinc-400 body text
          muted: '#71717A',    // Zinc-500 labels
        },
        brand: {
          DEFAULT: '#2563EB',  // Restrained deep blue accent
          hover: '#1D4ED8',
          subtle: '#172554',
          text: '#93C5FD',
        },
        risk: {
          highBg: '#2A1215',
          highText: '#FCA5A5',
          highBorder: '#7F1D1D',
          medBg: '#271B0E',
          medText: '#FCD34D',
          medBorder: '#78350F',
          lowBg: '#0E2419',
          lowText: '#86EFAC',
          lowBorder: '#14532D',
        },
      },
      borderRadius: {
        none: '0px',
        sm: '2px',
        DEFAULT: '3px',
        md: '3px',
        lg: '4px',
        xl: '4px',
      },
    },
  },
  plugins: [],
};
