/** @type {import('tailwindcss').Config} */
// 디자인 기준: "모래와 바다" — 모래색 바탕 + 바다 파랑 + 노을 주황 포인트. 값은 src/theme/colors.ts와 같게 유지한다.
// NativeWind는 1rem을 14px로 계산하므로 글자·모서리는 px로 고정한다.
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#F5F2EB',
        card: '#FFFEFB',
        surface: { DEFAULT: '#EFEBE2', strong: '#E6E1D6' },
        line: '#E3DDD0',
        ink: '#232B30',
        sub: '#66706F',
        mute: '#98A09E',
        navy: { DEFAULT: '#1A516C', light: '#236A8C', line: 'rgba(255,255,255,0.14)' },
        primary: { DEFAULT: '#236A8C', pressed: '#1A516C', soft: '#E0EEF3' },
        accent: { DEFAULT: '#E3845A', pressed: '#CC6F46', soft: '#FBEAE2', ink: '#B55A33' },
        danger: { DEFAULT: '#D9483B', soft: '#FBE9E6' },
        success: { DEFAULT: '#3F8A5B', soft: '#E6F1E8' },
        warning: { DEFAULT: '#B7791F', soft: '#FFF4E0' },
        kakao: '#FEE500',
      },
      fontFamily: {
        // 제목·큰 숫자용 명조. 본문은 시스템 글꼴 그대로
        serif: ['GowunBatang_700Bold'],
      },
      fontSize: {
        display: ['28px', { lineHeight: '36px', fontWeight: '700' }],
        title: ['22px', { lineHeight: '30px', fontWeight: '700' }],
        heading: ['18px', { lineHeight: '26px', fontWeight: '600' }],
        body: ['15px', { lineHeight: '22px' }],
        label: ['13px', { lineHeight: '18px' }],
        caption: ['12px', { lineHeight: '16px' }],
      },
      borderRadius: {
        card: '18px',
        field: '14px',
        sheet: '24px',
      },
    },
  },
  plugins: [],
};
