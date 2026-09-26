import { z } from 'zod';

// DB 제약(supabase/migrations/20260926000000_init.sql의 fishing_points 테이블)과 맞춘다.
// name: 1~50자, lat: -90~90, lng: -180~180
const NAME_MAX = 50;
const LOCATION_REQUIRED = '지도에서 위치를 선택하거나 현재 위치로 설정해주세요.';

/** 폼에서는 아직 고르지 않은 좌표를 null로 두고, 제출 시 필수로 검사한다. */
function coordinate(min: number, max: number, label: string) {
  return z
    .number()
    .nullable()
    .transform((v, ctx) => {
      if (v === null) {
        ctx.addIssue({ code: 'custom', message: LOCATION_REQUIRED });
        return z.NEVER;
      }
      return v;
    })
    .pipe(
      z
        .number()
        .min(min, `${label}는 ${min}~${max} 사이여야 해요.`)
        .max(max, `${label}는 ${min}~${max} 사이여야 해요.`),
    );
}

export const pointSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '포인트 이름을 입력해주세요!')
    .max(NAME_MAX, `포인트 이름은 ${NAME_MAX}자 이하로 입력해주세요.`),
  address: z.string().trim(),
  type: z.string().min(1, '포인트 유형을 선택해주세요.'),
  species: z.array(z.string()),
  memo: z.string().trim(),
  lat: coordinate(-90, 90, '위도'),
  lng: coordinate(-180, 180, '경도'),
});

export type PointFormInput = z.input<typeof pointSchema>;
/** FishingPointInput과 같은 모양 */
export type PointFormOutput = z.output<typeof pointSchema>;

export const DEFAULT_POINT_FORM: PointFormInput = {
  name: '',
  address: '',
  type: '방파제',
  species: [],
  memo: '',
  lat: null,
  lng: null,
};
