/** @type {import('tailwindcss').Config} */
// 색상은 src/theme/colors.ts와 같은 값을 쓴다
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  // 앱은 항상 다크 테마(app.config userInterfaceStyle: 'dark'). 웹에서 시스템 설정을 따르지 않게 class 방식으로 둔다
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ocean: { deep: '#0a2a3a', mid: '#0e4060', surface: '#1a6a8a', light: '#2a9fc4' },
        foam: '#e8f7fc',
        sand: '#f5e9c8',
        accent: { DEFAULT: '#f4a826', 2: '#e05c1a' },
        muted: 'rgba(255,255,255,0.65)',
        card: { DEFAULT: 'rgba(255,255,255,0.07)', border: 'rgba(255,255,255,0.12)' },
      },
    },
  },
  plugins: [],
};
