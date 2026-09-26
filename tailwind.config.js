/** @type {import('tailwindcss').Config} */
// 디자인 기준: 남색 헤더 + 흰 본문. 값은 src/theme/colors.ts와 같게 유지한다.
// NativeWind는 1rem을 14px로 계산하므로 글자·모서리는 px로 고정한다.
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#FFFFFF',
        surface: { DEFAULT: '#F4F6F8', strong: '#EAEEF2' },
        line: '#E5E8EB',
        ink: '#191F28',
        sub: '#4E5968',
        mute: '#8B95A1',
        navy: { DEFAULT: '#0B2545', light: '#163A63', line: 'rgba(255,255,255,0.14)' },
        primary: { DEFAULT: '#1B4F9C', pressed: '#143D7A', soft: '#E8EEF8' },
        danger: { DEFAULT: '#E5484D', soft: '#FDECEC' },
        success: { DEFAULT: '#12A150', soft: '#E7F6EE' },
        warning: { DEFAULT: '#D9820B', soft: '#FFF4E3' },
        kakao: '#FEE500',
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
        card: '16px',
        field: '12px',
        sheet: '24px',
      },
    },
  },
  plugins: [],
};
