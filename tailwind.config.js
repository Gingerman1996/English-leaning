/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          50: '#f5f7ff',
          100: '#e8ecff',
          200: '#c7d0ff',
          300: '#9aaaff',
          400: '#6a7eff',
          500: '#4856ff',
          600: '#3b3fe8',
          700: '#2e2fb6',
          800: '#252884',
          900: '#1a1d5c',
        },
        glow: {
          power: '#a855f7',
          space: '#3b82f6',
          reality: '#ef4444',
          soul: '#f97316',
          mind: '#eab308',
          time: '#10b981',
        },
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        ping3: {
          '0%': { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
        shimmer: 'shimmer 3s linear infinite',
        ping3: 'ping3 1.6s ease-out infinite',
      },
      boxShadow: {
        glow: '0 0 30px rgba(168, 85, 247, 0.5)',
        card: '0 20px 60px -20px rgba(34, 38, 100, 0.45)',
      },
    },
  },
  plugins: [],
};
