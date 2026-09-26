import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSaveDogamMemo } from '@/hooks/queries';
import { dogamMemoSchema, type DogamMemoFormInput, type DogamMemoFormOutput } from '@/schemas/fish';
import { colors } from '@/theme/colors';
import type { DogamEntry } from '@/types/models';
import { CloseX, cls, DetailRow, FieldError, inputClass, PLACEHOLDER_COLOR, SheetModal } from './ui';

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
          Alert.alert('✅ 수정 완료!', '도감이 수정됐어요!');
        },
        onError: () => Alert.alert('오류', '수정 중 오류가 발생했어요.'),
      },
    );
  });

  const rows = entry
    ? [
        { label: '📏 최대 크기', value: entry.bestSizeCm !== null ? `${entry.bestSizeCm}cm` : '-' },
        { label: '📍 장소', value: entry.bestLocation || '-' },
        { label: '📅 최근 날짜', value: entry.lastCaughtOn },
        { label: '🎣 총 마릿수', value: `${entry.totalCount}마리` },
      ]
    : [];

  return (
    <SheetModal visible={entry !== null} onClose={onClose}>
      <View className={cls.modalHeader}>
        <Text className={cls.modalTitle}>✏️ {entry?.species}</Text>
        <CloseX onPress={onClose} />
      </View>
      {entry?.imageUrl ? (
        <Image
          source={{ uri: entry.imageUrl }}
          style={{ width: '100%', height: 130, borderRadius: 12, marginBottom: 14 }}
          contentFit="cover"
          transition={200}
        />
      ) : null}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className={cls.infoSection}>
          {rows.map((row) => (
            <DetailRow key={row.label} label={row.label} value={row.value} />
          ))}
        </View>
        <Text className={cls.inputLabel}>📝 메모</Text>
        <Controller
          control={control}
          name="memo"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              className={`${inputClass(!!errors.memo)} h-[70px]`}
              style={{ textAlignVertical: 'top' }}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="메모"
              placeholderTextColor={PLACEHOLDER_COLOR}
              multiline
            />
          )}
        />
        <FieldError message={errors.memo?.message} />
        <Text className={cls.hintText}>📔 크기·장소·날짜 기록은 일지 탭에서 관리해요</Text>
      </ScrollView>
      <TouchableOpacity className={`${cls.registerBtn} mt-[12px]`} onPress={save} disabled={saveMemo.isPending}>
        {saveMemo.isPending ? <ActivityIndicator color={colors.white} /> : <Text className={cls.btnText}>💾 수정 저장</Text>}
      </TouchableOpacity>
    </SheetModal>
  );
}
