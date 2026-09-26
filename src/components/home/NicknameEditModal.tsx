import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Text } from 'react-native';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { useUpdateNickname } from '@/hooks/queries';
import { NICKNAME_MAX, nicknameSchema, type NicknameFormInput, type NicknameFormValues } from '@/schemas/profile';

type Props = {
  visible: boolean;
  /** 열릴 때 입력칸에 채워 둘 현재 닉네임 */
  currentNickname: string;
  onClose: () => void;
};

export default function NicknameEditModal({ visible, currentNickname, onClose }: Props) {
  const updateNickname = useUpdateNickname();
  const { control, handleSubmit, reset, formState: { errors } } = useForm<NicknameFormInput, unknown, NicknameFormValues>({
    resolver: zodResolver(nicknameSchema),
    defaultValues: { nickname: currentNickname },
  });

  // 열 때마다 현재 닉네임으로 다시 채운다
  useEffect(() => {
    if (visible) reset({ nickname: currentNickname });
  }, [visible, currentNickname, reset]);

  const onSubmit = handleSubmit(({ nickname }) => {
    updateNickname.mutate(nickname, {
      onSuccess: onClose,
      onError: () => Alert.alert('오류', '저장에 실패했어요.'),
    });
  });

  return (
    <BottomSheet visible={visible} title="정보 수정" onClose={onClose}>
      <Text className="mb-3 text-label text-sub">변경할 닉네임을 입력해주세요</Text>
      <Controller
        control={control}
        name="nickname"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextField
            placeholder={`닉네임 (최대 ${NICKNAME_MAX}자)`}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            maxLength={NICKNAME_MAX}
            autoFocus
            error={errors.nickname?.message}
          />
        )}
      />
      <Button label="저장" onPress={onSubmit} loading={updateNickname.isPending} className="mt-5" />
    </BottomSheet>
  );
}
