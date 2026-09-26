import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, ScrollView, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { useSaveLog } from '@/hooks/queries';
import { registerCatchSchema, type RegisterCatchFormInput, type RegisterCatchFormOutput } from '@/schemas/fish';

export type RegisterDraft = RegisterCatchFormInput;

const EMPTY_DRAFT: RegisterDraft = { name: '', size: '', location: '', memo: '' };

type Props = {
  /** null이면 닫힘 */
  draft: RegisterDraft | null;
  imageUri: string | null;
  onClose: () => void;
  onRegistered: () => void;
};

function todayString(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** AI 분석 결과를 일지로 등록한다. 도감은 일지에서 자동 계산된다. */
export function RegisterCatchModal({ draft, imageUri, onClose, onRegistered }: Props) {
  const saveLog = useSaveLog();
  const { control, handleSubmit, reset, formState: { errors } } = useForm<RegisterCatchFormInput, unknown, RegisterCatchFormOutput>({
    resolver: zodResolver(registerCatchSchema),
    defaultValues: EMPTY_DRAFT,
  });

  useEffect(() => {
    if (draft) reset(draft);
  }, [draft, reset]);

  const register = handleSubmit(({ name: species, size, location, memo }) => {
    saveLog.mutate(
      {
        input: {
          fishedOn: todayString(),
          location: location || '미입력',
          weather: '맑음 ☀️',
          duration: '',
          memo: `AI 분석으로 자동 등록${memo ? ': ' + memo : ''}`,
          imageUri,
          catches: [{ species, sizeCm: size, count: 1 }],
        },
      },
      {
        onSuccess: () => {
          onRegistered();
          Alert.alert('등록 완료!', `${species}이(가)\n내 도감 + 낚시 일지에 자동 등록됐어요!`);
        },
        onError: () => Alert.alert('오류', '등록 중 오류가 발생했어요.'),
      },
    );
  });

  return (
    <BottomSheet visible={draft !== null} onClose={onClose} title="도감 + 일지 등록">
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{ width: '100%', height: 140, borderRadius: 12, marginBottom: 16 }}
            contentFit="cover"
            transition={200}
          />
        ) : null}
        <View className="gap-4">
          <Controller
            control={control}
            name="name"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField label="어종명 *" value={value} onChangeText={onChange} onBlur={onBlur} placeholder="어종명" error={errors.name?.message} />
            )}
          />
          <Controller
            control={control}
            name="size"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField label="크기 (cm)" value={value} onChangeText={onChange} onBlur={onBlur} placeholder="크기 입력 (선택)" keyboardType="numeric" error={errors.size?.message} />
            )}
          />
          <Controller
            control={control}
            name="location"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField label="잡은 장소" value={value} onChangeText={onChange} onBlur={onBlur} placeholder="장소 입력 (선택)" error={errors.location?.message} />
            )}
          />
          <Controller
            control={control}
            name="memo"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField label="메모" value={value} onChangeText={onChange} onBlur={onBlur} placeholder="메모 (선택)" multiline error={errors.memo?.message} />
            )}
          />
        </View>
      </ScrollView>
      <Button label="도감 + 일지에 등록하기" onPress={register} loading={saveLog.isPending} className="mt-4" />
    </BottomSheet>
  );
}
