// 디자인 기준 색상 (밝은 화이트 테마). tailwind.config.js의 colors와 같은 값.
// className을 쓸 수 없는 곳(아이콘 color, 탭바 style, 지도 등)에서만 직접 쓴다.
export const colors = {
  bg: '#FFFFFF',
  surface: '#F4F6F8',
  surfaceStrong: '#EAEEF2',
  line: '#E5E8EB',
  ink: '#191F28',
  sub: '#4E5968',
  mute: '#8B95A1',
  primary: '#0A7BB5',
  primaryPressed: '#086696',
  primarySoft: '#E7F3FA',
  danger: '#E5484D',
  dangerSoft: '#FDECEC',
  success: '#12A150',
  successSoft: '#E7F6EE',
  warning: '#D9820B',
  warningSoft: '#FFF4E3',
  kakao: '#FEE500',
  white: '#FFFFFF',
  overlay: 'rgba(25,31,40,0.45)',
} as const;
