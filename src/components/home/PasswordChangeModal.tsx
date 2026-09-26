import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity } from 'react-native';
import AuthFieldError from '@/components/ui/AuthFieldError';
import { changePassword } from '@/data/auth';
import {
  PASSWORD_MIN, changePasswordSchema, type ChangePasswordFormInput, type ChangePasswordFormValues,
} from '@/schemas/auth';
import { colors } from '@/theme/colors';
import HomeSheet, { SHEET_INPUT_CLASS, SHEET_PLACEHOLDER } from './HomeSheet';

type Props = {
  visible: boolean;
  /** 재인증에 쓸 로그인 이메일 */
  email: string | undefined;
  onClose: () => void;
};

const EMPTY: ChangePasswordFormInput = { currentPassword: '', newPassword: '', confirmPassword: '' };

export default function PasswordChangeModal({ visible, email, onClose }: Props) {
  const {
    control, handleSubmit, reset, clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormInput, unknown, ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY,
  });

  // 다시 열 때 지난번 오류 문구가 남아 있지 않게 한다 (입력값은 예전처럼 유지)
  useEffect(() => {
    if (visible) clearErrors();
  }, [visible, clearErrors]);

  const onSubmit = handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      await changePassword(email ?? '', currentPassword, newPassword);
      Alert.alert('완료', '비밀번호가 변경됐어요.');
      onClose();
      reset(EMPTY);
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '비밀번호 변경에 실패했어요.');
    }
  });

  const fields = [
    { name: 'currentPassword', placeholder: '현재 비밀번호', autoFocus: true },
    { name: 'newPassword', placeholder: `새 비밀번호 (${PASSWORD_MIN}자 이상)`, autoFocus: false },
    { name: 'confirmPassword', placeholder: '새 비밀번호 확인', autoFocus: false },
  ] as const;

  return (
    <HomeSheet visible={visible} title="🔑 비밀번호 변경" onClose={onClose}>
      {fields.map((f, i) => (
        <Controller
          key={f.name}
          control={control}
          name={f.name}
          render={({ field: { value, onChange, onBlur } }) => (
            <>
              <TextInput
                // 마지막 칸만 아래 여백 12, 나머지는 예전처럼 10
                className={`${SHEET_INPUT_CLASS} ${i < fields.length - 1 ? 'mb-2.5' : 'mb-3'}`}
                placeholder={f.placeholder}
                placeholderTextColor={SHEET_PLACEHOLDER}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry
                autoFocus={f.autoFocus}
              />
              <AuthFieldError message={errors[f.name]?.message} />
            </>
          )}
        />
      ))}
      <TouchableOpacity
        className="bg-accent rounded-xl py-3.5 items-center mt-1"
        onPress={onSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting
          ? <ActivityIndicator color={colors.white} />
          : <Text className="text-white text-[15px] font-semibold">변경하기</Text>}
      </TouchableOpacity>
    </HomeSheet>
  );
}
