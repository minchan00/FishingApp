import { z } from 'zod';
import { isValidYmd } from '@/components/log/format';
import type { Catch, FishingLogInput } from '@/types/models';

// DB 제약(supabase/migrations/20260926000000_init.sql, catches 테이블)
// species: char_length 1~40 / size_cm: numeric(5,1) > 0 / count: integer > 0
export const SPECIES_MAX_LENGTH = 40;
/** numeric(5,1)이 담을 수 있는 최대값 */
export const SIZE_CM_MAX = 9999.9;
export const COUNT_MAX = 9999;

const DECIMAL_RE = /^\d+(\.\d+)?$/;
const INTEGER_RE = /^\d+$/;

/** 크기 입력 텍스트 검사. 빈 값은 '모름'으로 허용. 문제가 있으면 오류 메시지 */
export function sizeTextError(text: string): string | null {
  const v = text.trim();
  if (v === '') return null;
  if (!DECIMAL_RE.test(v)) return '크기는 숫자로 입력해주세요';
  const n = Number(v);
  if (n <= 0) return '크기는 0보다 커야 해요';
  if (roundSize(n) > SIZE_CM_MAX) return `크기는 ${SIZE_CM_MAX}cm 이하로 입력해주세요`;
  if (roundSize(n) <= 0) return '크기는 0.1cm 이상이어야 해요';
  return null;
}

/** DB numeric(5,1)과 같게 소수 첫째 자리로 반올림 */
function roundSize(n: number): number {
  return Math.round(n * 10) / 10;
}

/** sizeTextError를 통과한 텍스트 → cm 숫자 또는 null */
export function toSizeCm(text: string): number | null {
  const v = text.trim();
  return v === '' ? null : roundSize(Number(v));
}

/** 크기 입력(텍스트) → number | null */
export const sizeCmTextSchema = z
  .string()
  .superRefine((v, ctx) => {
    const message = sizeTextError(v);
    if (message) ctx.addIssue({ code: 'custom', message });
  })
  .transform(toSizeCm);

/** 마리수 입력(텍스트) → 양의 정수. 비워두면 1마리 */
export const countTextSchema = z
  .string()
  .trim()
  .superRefine((v, ctx) => {
    if (v === '') return;
    if (!INTEGER_RE.test(v)) {
      ctx.addIssue({ code: 'custom', message: '마리수는 정수로 입력해주세요' });
      return;
    }
    const n = Number(v);
    if (n < 1) ctx.addIssue({ code: 'custom', message: '마리수는 1 이상이어야 해요' });
    else if (n > COUNT_MAX) ctx.addIssue({ code: 'custom', message: `마리수는 ${COUNT_MAX} 이하로 입력해주세요` });
  })
  .transform((v) => (v === '' ? 1 : Number(v)));

export const speciesSchema = z
  .string()
  .trim()
  .min(1, '어종을 선택해주세요')
  .max(SPECIES_MAX_LENGTH, `어종은 ${SPECIES_MAX_LENGTH}자 이하로 입력해주세요`);

/** 입력 중인 조과 한 줄. 크기·마리수는 입력창 텍스트 그대로 들고 있다가 검증 시 숫자로 바꾼다. */
export const catchDraftSchema = z
  .object({
    species: speciesSchema,
    size: sizeCmTextSchema,
    count: countTextSchema,
  })
  .transform(({ species, size, count }): Catch => ({ species, sizeCm: size, count }));

export const logFormSchema = z.object({
  fishedOn: z.string().trim().refine(isValidYmd, '날짜를 YYYY-MM-DD 형식으로 입력해주세요 (예: 2026-09-26)'),
  location: z.string().trim().min(1, '장소를 입력해주세요'),
  weather: z.string(),
  duration: z
    .string()
    .trim()
    .refine((v) => v === '' || DECIMAL_RE.test(v), '낚시 시간은 숫자로 입력해주세요')
    .refine((v) => v === '' || Number(v) > 0, '낚시 시간은 0보다 커야 해요'),
  memo: z.string(),
  imageUri: z.string().nullable(),
  catches: z.array(catchDraftSchema),
});

/** 폼이 들고 있는 값(입력 텍스트 그대로) */
export type LogFormValues = z.input<typeof logFormSchema>;
export type CatchDraft = z.input<typeof catchDraftSchema>;
/** 검증·변환이 끝난 값. 그대로 useSaveLog에 넘긴다 */
export type LogFormOutput = z.output<typeof logFormSchema>;

// 스키마 출력이 저장 입력 타입과 어긋나면 여기서 타입 오류가 난다
const _outputMatchesInput = (v: LogFormOutput): FishingLogInput => v;
void _outputMatchesInput;
