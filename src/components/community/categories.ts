import type { PostCategory } from '@/types/models';

export const POST_CATEGORIES: readonly PostCategory[] = ['조황 정보', '인증샷', '낚시 팁', '동출 모집'];

/** 피드 필터용. '전체'는 화면에서만 쓰는 값 */
export type CategoryFilter = '전체' | PostCategory;
export const CATEGORY_FILTERS: readonly CategoryFilter[] = ['전체', ...POST_CATEGORIES];
