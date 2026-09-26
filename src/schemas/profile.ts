import { z } from 'zod';

export const NICKNAME_MAX = 12;

/** 닉네임: 앞뒤 공백 제거 후 1~12자. 가입 폼과 정보 수정 폼이 같은 규칙을 쓴다. */
export const nicknameField = z
  .string()
  .trim()
  .min(1, '닉네임을 입력해주세요.')
  .max(NICKNAME_MAX, `닉네임은 ${NICKNAME_MAX}자 이하로 입력해주세요.`);

export const nicknameSchema = z.object({
  nickname: nicknameField,
});

export type NicknameFormInput = z.input<typeof nicknameSchema>;
export type NicknameFormValues = z.output<typeof nicknameSchema>;
