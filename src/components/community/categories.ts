import type { PostCategory } from '@/types/models';

/** DB posts.category check 제약과 같은 값. zod enum에 쓰도록 튜플로 둔다 */
export const POST_CATEGORIES = ['조황 정보', '인증샷', '낚시 팁', '동출 모집'] as const satisfies readonly PostCategory[];

// PostCategory에 값이 추가되면 여기서 타입 오류가 나도록
type MissingCategory = Exclude<PostCategory, (typeof POST_CATEGORIES)[number]>;
const _allCategoriesCovered: [MissingCategory] extends [never] ? true : false = true;
void _allCategoriesCovered;

/** 피드 필터용. '전체'는 화면에서만 쓰는 값 */
export type CategoryFilter = '전체' | PostCategory;
export const CATEGORY_FILTERS: readonly CategoryFilter[] = ['전체', ...POST_CATEGORIES];
