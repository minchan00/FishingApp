import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity } from 'react-native';
import AuthFieldError from '@/components/ui/AuthFieldError';
import { useUpdateNickname } from '@/hooks/queries';
import { NICKNAME_MAX, nicknameSchema, type NicknameFormInput, type NicknameFormValues } from '@/schemas/profile';
import { colors } from '@/theme/colors';
import HomeSheet, { SHEET_INPUT_CLASS, SHEET_PLACEHOLDER } from './HomeSheet';

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
    <HomeSheet visible={visible} title="✏️ 정보 수정" onClose={onClose}>
      <Text className="text-muted text-[12px] mb-3">변경할 닉네임을 입력해주세요</Text>
      <Controller
        control={control}
        name="nickname"
        render={({ field: { value, onChange, onBlur } }) => (
          <TextInput
            className={`${SHEET_INPUT_CLASS} mb-3`}
            placeholder={`닉네임 (최대 ${NICKNAME_MAX}자)`}
            placeholderTextColor={SHEET_PLACEHOLDER}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            maxLength={NICKNAME_MAX}
            autoFocus
          />
        )}
      />
      <AuthFieldError message={errors.nickname?.message} />
      <TouchableOpacity
        className="bg-accent rounded-xl py-3.5 items-center mt-1"
        onPress={onSubmit}
        disabled={updateNickname.isPending}
      >
        {updateNickname.isPending
          ? <ActivityIndicator color={colors.white} />
          : <Text className="text-white text-[15px] font-semibold">저장</Text>}
      </TouchableOpacity>
    </HomeSheet>
  );
}
