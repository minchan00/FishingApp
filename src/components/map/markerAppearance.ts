import type { MarkerSymbol } from '@mj-studio/react-native-naver-map';

export type MarkerKind = 'favorite' | 'mine' | 'hot' | 'default' | 'shared';

type MarkerFlags = { isFavorite: boolean; isMine: boolean; hot: boolean; isDefault: boolean };

/** 우선순위: 즐겨찾기 > 내 포인트 > 핫 포인트 > 기본 포인트 > 공유 포인트 */
export function markerKind({ isFavorite, isMine, hot, isDefault }: MarkerFlags): MarkerKind {
  if (isFavorite) return 'favorite';
  if (isMine) return 'mine';
  if (hot) return 'hot';
  if (isDefault) return 'default';
  return 'shared';
}

type MarkerAppearance = { symbol: MarkerSymbol; subCaption: string; zIndex: number };

// 네이버 기본 마커 심볼 중에서 고른다 (라이브러리 MarkerSymbol 타입).
// 강조색(파랑)은 내 포인트, 나머지는 의미가 바로 읽히는 색으로.
export const MARKER_APPEARANCE: Record<MarkerKind, MarkerAppearance> = {
  favorite: { symbol: 'yellow', subCaption: '즐겨찾기', zIndex: 4 },
  mine: { symbol: 'blue', subCaption: '내 포인트', zIndex: 3 },
  hot: { symbol: 'red', subCaption: '핫', zIndex: 2 },
  default: { symbol: 'green', subCaption: '', zIndex: 1 },
  shared: { symbol: 'gray', subCaption: '공유', zIndex: 0 },
};

/** 네이버 지도 줌 레벨 (react-native-maps의 latitudeDelta 대략 환산) */
export const ZOOM = {
  fallback: 9, // ≈ delta 0.5
  userArea: 10, // ≈ delta 0.3
  point: 13, // ≈ delta 0.05
} as const;
