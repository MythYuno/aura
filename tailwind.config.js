/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['class', '[data-mode="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontFeatureSettings: {
        'tnum': '"tnum", "cv11"',
      },
      colors: {
        bg: 'var(--bg)',
        'bg-1': 'var(--bg-1)',
        'bg-2': 'var(--bg-2)',
        'bg-3': 'var(--bg-3)',
        'bd-1': 'var(--bd-1)',
        'bd-2': 'var(--bd-2)',
        'bd-3': 'var(--bd-3)',
        'fg-1': 'var(--fg-1)',
        'fg-2': 'var(--fg-2)',
        'fg-3': 'var(--fg-3)',
        'fg-4': 'var(--fg-4)',
        'fg-5': 'var(--fg-5)',
        ok: 'var(--ok)',
        'ok-dim': 'var(--ok-dim)',
        info: 'var(--info)',
        pink: 'var(--pink)',
        gold: 'var(--gold)',
        blue: 'var(--blue)',
        red: 'var(--red)',
        purple: 'var(--purple)',
        orange: 'var(--orange)',
        teal: 'var(--teal)',
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '28px',
      },
      transitionTimingFunction: {
        'ease-out-soft': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'ease-back': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      animation: {
        'shimmer': 'shimmer 6s ease infinite',
        'orb-float': 'orbFloat 20s ease infinite',
        'pulse-soft': 'pulseSoft 2s ease infinite',
        'draw-line': 'drawLine 2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'breathe': 'breathe 3s ease infinite',
        'float-dot': 'floatDot 20s ease infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        orbFloat: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(30px, -20px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 15px) scale(0.95)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.6, transform: 'scale(1.15)' },
        },
        drawLine: {
          'to': { strokeDashoffset: 0 },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: 1 },
          '50%': { transform: 'scale(1.08)', opacity: 0.8 },
        },
        floatDot: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '25%': { transform: 'translate(20px, -30px)' },
          '50%': { transform: 'translate(-15px, -50px)' },
          '75%': { transform: 'translate(-30px, -10px)' },
        },
      },
    },
  },
  plugins: [],
};
