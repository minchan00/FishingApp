import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { changePassword } from '@/data/auth';
import {
  PASSWORD_MIN, changePasswordSchema, type ChangePasswordFormInput, type ChangePasswordFormValues,
} from '@/schemas/auth';

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
    { name: 'currentPassword', label: '현재 비밀번호', placeholder: '현재 비밀번호', autoFocus: true },
    { name: 'newPassword', label: '새 비밀번호', placeholder: `${PASSWORD_MIN}자 이상`, autoFocus: false },
    { name: 'confirmPassword', label: '새 비밀번호 확인', placeholder: '새 비밀번호 다시 입력', autoFocus: false },
  ] as const;

  return (
    <BottomSheet visible={visible} title="비밀번호 변경" onClose={onClose}>
      <View className="gap-4">
        {fields.map((f) => (
          <Controller
            key={f.name}
            control={control}
            name={f.name}
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                label={f.label}
                placeholder={f.placeholder}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry
                autoFocus={f.autoFocus}
                error={errors[f.name]?.message}
              />
            )}
          />
        ))}
      </View>
      <Button label="변경하기" onPress={onSubmit} loading={isSubmitting} className="mt-6" />
    </BottomSheet>
  );
}
