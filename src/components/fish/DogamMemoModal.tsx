import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, ScrollView, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { useSaveDogamMemo } from '@/hooks/queries';
import { dogamMemoSchema, type DogamMemoFormInput, type DogamMemoFormOutput } from '@/schemas/fish';
import type { DogamEntry } from '@/types/models';
import { DetailRow } from '@/components/ui/Badge';

type Props = {
  entry: DogamEntry | null;
  onClose: () => void;
};

/** 내 도감 항목 보기 + 메모 수정. 크기·장소·날짜는 일지 기록에서 계산된다. */
export function DogamMemoModal({ entry, onClose }: Props) {
  const saveMemo = useSaveDogamMemo();
  const { control, handleSubmit, reset, formState: { errors } } = useForm<DogamMemoFormInput, unknown, DogamMemoFormOutput>({
    resolver: zodResolver(dogamMemoSchema),
    defaultValues: { memo: '' },
  });

  useEffect(() => {
    if (entry) reset({ memo: entry.memo });
  }, [entry, reset]);

  const save = handleSubmit(({ memo }) => {
    if (!entry) return;
    saveMemo.mutate(
      { species: entry.species, memo },
      {
        onSuccess: () => {
          onClose();
          Alert.alert('수정 완료!', '도감이 수정됐어요!');
        },
        onError: () => Alert.alert('오류', '수정 중 오류가 발생했어요.'),
      },
    );
  });

  const rows = entry
    ? [
        { label: '최대 크기', value: entry.bestSizeCm !== null ? `${entry.bestSizeCm}cm` : '-' },
        { label: '장소', value: entry.bestLocation || '-' },
        { label: '최근 날짜', value: entry.lastCaughtOn },
        { label: '총 마릿수', value: `${entry.totalCount}마리` },
      ]
    : [];

  return (
    <BottomSheet visible={entry !== null} onClose={onClose} title={entry?.species ?? ''}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {entry?.imageUrl ? (
          <Image
            source={{ uri: entry.imageUrl }}
            style={{ width: '100%', height: 140, borderRadius: 12, marginBottom: 12 }}
            contentFit="cover"
            transition={200}
          />
        ) : null}
        <View className="mb-5 rounded-card bg-surface px-4">
          {rows.map((row, i) => (
            <DetailRow key={row.label} label={row.label} value={row.value} divider={i < rows.length - 1} />
          ))}
        </View>
        <Controller
          control={control}
          name="memo"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextField
              label="메모"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="메모"
              multiline
              error={errors.memo?.message}
              hint="크기·장소·날짜 기록은 일지 탭에서 관리해요"
            />
          )}
        />
      </ScrollView>
      <Button label="수정 저장" onPress={save} loading={saveMemo.isPending} className="mt-4" />
    </BottomSheet>
  );
}
