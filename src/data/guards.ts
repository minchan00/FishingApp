// DB 생성 타입은 check 제약이나 뷰 컬럼의 non-null을 알지 못해 string·nullable로 나온다.
// 화면으로 넘기기 전에 여기서 도메인 타입으로 좁힌다.
import type { PostCategory, Rating } from '@/types/models';

const RATINGS: readonly Rating[] = ['대박', '보통', '꽝'];
const CATEGORIES: readonly PostCategory[] = ['조황 정보', '인증샷', '낚시 팁', '동출 모집', '방류 소식'];

export function asRating(value: string): Rating {
  return (RATINGS as readonly string[]).includes(value) ? (value as Rating) : '보통';
}

export function asCategory(value: string | null): PostCategory {
  return value && (CATEGORIES as readonly string[]).includes(value) ? (value as PostCategory) : '조황 정보';
}

/** 뷰에서 읽은 행 중 필수 키가 비어 있는 행을 거른다 (정상 데이터에서는 일어나지 않음) */
export function hasKeys<T, K extends keyof T>(row: T, ...keys: K[]): row is T & { [P in K]: NonNullable<T[P]> } {
  return keys.every((k) => row[k] !== null && row[k] !== undefined);
}
