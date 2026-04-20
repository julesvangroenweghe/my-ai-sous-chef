import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Outfit', 'system-ui', 'sans-serif'],
        sans: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'monospace'],
      },
      colors: {
        // Ordobox-inspired: warm zand + diep bordeauxrood
        brand: {
          50:  '#fdf4f5',
          100: '#fbe8eb',
          200: '#f5d0d5',
          300: '#eca8b2',
          400: '#df7589',
          500: '#cb4a63',
          600: '#a83050',
          700: '#8b2240',
          800: '#741e38',
          900: '#631c33',
          950: '#3a0c1c',
        },
        // Warme zand-achtergrond (Ordobox beige)
        sand: {
          50:  '#faf8f4',
          100: '#f5f0e8',
          200: '#ede4d4',
          300: '#dfd2ba',
          400: '#ccb99a',
          500: '#b89e7c',
          600: '#9e8363',
          700: '#836a51',
          800: '#6b5744',
          900: '#57473a',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#faf8f4',
          subtle: '#f5f0e8',
          border: '#e8e2d9',
        },
      },
      boxShadow: {
        'diffusion': '0 20px 40px -15px rgba(28, 20, 18, 0.05)',
        'diffusion-lg': '0 25px 50px -12px rgba(28, 20, 18, 0.08)',
        'brand-glow': '0 25px 50px -12px rgba(139, 34, 64, 0.10)',
        'sidebar': '4px 0 24px -2px rgba(0, 0, 0, 0.12)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
