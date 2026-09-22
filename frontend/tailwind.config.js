/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2563EB', hover: '#1D4ED8', 50: '#EFF6FF', 100: '#DBEAFE', 600: '#2563EB', 700: '#1D4ED8' },
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        sidebar: '#0F172A',
        background: '#FFFFFF',
        surface: '#F8FAFC',
        'text-primary': '#1E293B',
        'text-secondary': '#64748B',
        border: '#E2E8F0',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        pop: '0 10px 30px -12px rgb(15 23 42 / 0.18)',
      },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
      animation: { 'fade-up': 'fade-up 0.35s ease-out both' },
    },
  },
  plugins: [],
};
