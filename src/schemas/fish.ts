import { z } from 'zod';

// DB 제약(supabase/migrations/20260926000000_init.sql의 catches 테이블)과 맞춘다.
// species: 1~40자, size_cm: numeric(5,1) 이고 0보다 커야 한다.
const SPECIES_MAX = 40;
const SIZE_MAX = 9999.9;

/** 어종명: 앞뒤 공백 제거 후 1~40자 */
export const speciesNameSchema = z
  .string()
  .trim()
  .min(1, '어종명을 입력해주세요!')
  .max(SPECIES_MAX, `어종명은 ${SPECIES_MAX}자 이하로 입력해주세요.`);

/** 크기 입력(문자열) → cm 숫자 또는 null(빈칸). 소수 첫째 자리까지 반올림한다. */
export const sizeCmSchema = z
  .string()
  .trim()
  .refine((s) => s === '' || Number.isFinite(Number(s)), '크기는 숫자로 입력해주세요.')
  .transform((s) => (s === '' ? null : Math.round(Number(s) * 10) / 10))
  .refine((n) => n === null || n > 0, '크기는 0보다 커야 해요.')
  .refine((n) => n === null || n <= SIZE_MAX, `크기는 ${SIZE_MAX}cm 이하로 입력해주세요.`);

/** AI 분석 결과를 일지로 등록하는 폼 */
export const registerCatchSchema = z.object({
  name: speciesNameSchema,
  size: sizeCmSchema,
  location: z.string().trim(),
  memo: z.string().trim(),
});

export type RegisterCatchFormInput = z.input<typeof registerCatchSchema>;
export type RegisterCatchFormOutput = z.output<typeof registerCatchSchema>;

/** 내 도감 메모 수정 폼 (dogam_notes.memo는 길이 제약이 없다) */
export const dogamMemoSchema = z.object({
  memo: z.string().trim(),
});

export type DogamMemoFormInput = z.input<typeof dogamMemoSchema>;
export type DogamMemoFormOutput = z.output<typeof dogamMemoSchema>;
