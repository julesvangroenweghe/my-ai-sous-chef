import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand — amber/gold (logo color)
        amber: {
          50:  '#FFFBF2',
          100: '#FEF3D6',
          200: '#FDE4A8',
          300: '#F9CE71',
          400: '#F0B44A',
          500: '#E8A040',  // primary brand
          600: '#C4862A',
          700: '#9E6A1A',
          800: '#7A4F10',
          900: '#563608',
        },
        // Slate Pro — content/UI
        slate: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Gronda — sidebar
        sidebar: {
          bg:     '#0D0C0A',
          border: 'rgba(255,255,255,0.06)',
          text:   '#6B6560',
          active: '#F5F0EB',
          accent: '#E8A040',
        },
        // Semantic
        background: '#f8fafc',
        foreground:  '#0f172a',
        card:        '#ffffff',
        muted:       '#64748b',
        border:      '#e2e8f0',
        primary:     '#E8A040',
        // Legacy support for existing components
        brand: {
          DEFAULT: '#E8A040',
          light:   'rgba(232,160,64,0.15)',
          dark:    '#C4862A',
        },
      },
      fontFamily: {
        sans:  ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Georgia', '"Times New Roman"', 'serif'],
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '1.4' }],
        xs:    ['11px', { lineHeight: '1.4' }],
        sm:    ['13px', { lineHeight: '1.5' }],
        base:  ['14px', { lineHeight: '1.5' }],
        md:    ['15px', { lineHeight: '1.5' }],
        lg:    ['16px', { lineHeight: '1.4' }],
        xl:    ['18px', { lineHeight: '1.3' }],
        '2xl': ['22px', { lineHeight: '1.2' }],
        '3xl': ['28px', { lineHeight: '1.15' }],
        '4xl': ['36px', { lineHeight: '1.1' }],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '10px',
        xl: '14px',
        '2xl': '18px',
      },
      boxShadow: {
        sm:  '0 1px 2px rgba(0,0,0,0.05)',
        DEFAULT: '0 1px 4px rgba(0,0,0,0.08)',
        md:  '0 2px 8px rgba(0,0,0,0.08)',
        lg:  '0 4px 16px rgba(0,0,0,0.1)',
        xl:  '0 8px 32px rgba(0,0,0,0.12)',
        amber: '0 2px 8px rgba(232,160,64,0.25)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}

export default config
