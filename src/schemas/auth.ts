import { z } from 'zod';
import { nicknameField } from './profile';

/** 새로 정하는 비밀번호의 최소 길이. 회원가입과 비밀번호 변경이 같은 규칙을 쓴다. */
export const PASSWORD_MIN = 8;

const emailField = z
  .string()
  .trim()
  .min(1, '이메일을 입력해주세요.')
  .pipe(z.email('이메일 형식이 올바르지 않아요.'));

/** 로그인·재인증용: 기존 비밀번호는 길이 규칙 없이 비어 있지만 않으면 된다. */
const existingPasswordField = (message: string) =>
  z.string().refine((v) => v.trim().length > 0, message);

const newPasswordField = z
  .string()
  .refine((v) => v.trim().length > 0, '비밀번호를 입력해주세요.')
  .refine((v) => v.length >= PASSWORD_MIN, `비밀번호는 ${PASSWORD_MIN}자 이상이어야 해요.`);

/** 로그인 폼. 회원가입 폼과 값 모양을 맞추려고 nickname도 두지만 검사하지 않는다. */
export const signInSchema = z.object({
  email: emailField,
  password: existingPasswordField('비밀번호를 입력해주세요.'),
  nickname: z.string(),
});

export const signUpSchema = z.object({
  email: emailField,
  password: newPasswordField,
  nickname: nicknameField,
});

export type AuthFormInput = z.input<typeof signUpSchema>;
export type AuthFormValues = z.output<typeof signUpSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: existingPasswordField('현재 비밀번호를 입력해주세요.'),
    newPassword: newPasswordField,
    confirmPassword: z.string().min(1, '새 비밀번호를 한 번 더 입력해주세요.'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: '새 비밀번호가 일치하지 않아요.',
    path: ['confirmPassword'],
  });

export type ChangePasswordFormInput = z.input<typeof changePasswordSchema>;
export type ChangePasswordFormValues = z.output<typeof changePasswordSchema>;
