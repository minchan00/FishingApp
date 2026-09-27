// 디자인 기준 색상 ("모래와 바다"). tailwind.config.js의 colors와 같은 값.
// className을 쓸 수 없는 곳(아이콘 color, 탭바 style, 지도 등)에서만 직접 쓴다.
export const colors = {
  bg: '#F5F2EB',
  /** 카드·탭바 면 (바탕보다 밝음) */
  card: '#FFFEFB',
  /** 카드 안의 옅은 채움 (칩, 입력칸) */
  surface: '#EFEBE2',
  surfaceStrong: '#E6E1D6',
  line: '#E3DDD0',
  ink: '#232B30',
  sub: '#66706F',
  mute: '#98A09E',
  navy: '#1A516C',
  navyLight: '#236A8C',
  onNavyMuted: 'rgba(255,255,255,0.72)',
  primary: '#236A8C',
  primaryPressed: '#1A516C',
  primarySoft: '#E0EEF3',
  accent: '#E3845A',
  accentSoft: '#FBEAE2',
  accentInk: '#B55A33',
  danger: '#D9483B',
  dangerSoft: '#FBE9E6',
  success: '#3F8A5B',
  successSoft: '#E6F1E8',
  warning: '#B7791F',
  warningSoft: '#FFF4E0',
  kakao: '#FEE500',
  white: '#FFFFFF',
  /** 바다 배경 위 글자 */
  onSea: '#FFFFFF',
  onSeaMuted: 'rgba(255,255,255,0.82)',
  overlay: 'rgba(20,35,45,0.45)',
} as const;

/** 제목·큰 숫자용 명조 글꼴 (루트 레이아웃에서 불러온다) */
export const fonts = {
  serif: 'GowunBatang_700Bold',
} as const;
