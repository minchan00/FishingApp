import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { BottomSheet } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { SPECIES_OPTIONS, WEATHER_OPTIONS } from '@/constants/fishing';
import { useCreatePost, useSaveLog } from '@/hooks/queries';
import { logFormSchema, type LogFormOutput, type LogFormValues } from '@/schemas/log';
import { colors } from '@/theme/colors';
import type { FishingLog } from '@/types/models';
import { formatCatch, todayYmd } from './format';
import { CheckRow, FieldLabel, InlineError, PhotoPicker, SheetKeyboardBody } from './FormParts';
import { pickImageFromLibrary } from './pickImage';

const emptyForm = (): LogFormValues => ({
  fishedOn: todayYmd(),
  location: '',
  weather: WEATHER_OPTIONS[0],
  duration: '',
  memo: '',
  imageUri: null,
  catches: [],
});

const formFromLog = (log: FishingLog): LogFormValues => ({
  fishedOn: log.fishedOn,
  location: log.location,
  weather: log.weather,
  duration: log.duration,
  memo: log.memo,
  // 기존 사진의 공개 URL을 그대로 넘기면 데이터 레이어가 기존 사진을 유지한다
  imageUri: log.imageUrl,
  catches: log.catches.map((c) => ({
    species: c.species,
    size: c.sizeCm !== null ? String(c.sizeCm) : '',
    count: String(c.count),
  })),
});

type Props = {
  visible: boolean;
  /** 수정할 일지. null이면 새로 작성 */
  editingLog: FishingLog | null;
  onClose: () => void;
};

export function LogFormModal({ visible, editingLog, onClose }: Props) {
  const saveLog = useSaveLog();
  const createPost = useCreatePost();

  const { control, handleSubmit, reset, setValue, formState } = useForm<LogFormValues, unknown, LogFormOutput>({
    resolver: zodResolver(logFormSchema),
    defaultValues: emptyForm(),
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'catches' });
  const imageUri = useWatch({ control, name: 'imageUri' });
  const [shareToComm, setShareToComm] = useState(false);

  // 모달이 열릴 때마다 폼을 채우거나 비운다
  useEffect(() => {
    if (!visible) return;
    reset(editingLog ? formFromLog(editingLog) : emptyForm());
    setShareToComm(false);
  }, [visible, editingLog, reset]);

  const submitting = saveLog.isPending || createPost.isPending;

  const pickImage = async () => {
    const uri = await pickImageFromLibrary();
    if (uri) setValue('imageUri', uri);
  };

  const submitLog = async (input: LogFormOutput) => {
    try {
      await saveLog.mutateAsync({ input, logId: editingLog?.id });
    } catch (e) {
      console.error('일지 저장 실패:', e);
      Alert.alert('오류', '일지 저장에 실패했어요.');
      return;
    }

    if (!editingLog && shareToComm) {
      const speciesText = input.catches.map(formatCatch).join(', ');
      const content = `📍 ${input.location}${speciesText ? `\n🐟 ${speciesText}` : ''}${input.memo ? `\n\n${input.memo}` : ''}`;
      try {
        await createPost.mutateAsync({ category: '인증샷', content, imageUri: input.imageUri });
      } catch (e) {
        console.error('커뮤니티 공유 실패:', e);
        Alert.alert('알림', '일지는 저장됐지만 커뮤니티 공유에 실패했어요.');
      }
    }

    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={editingLog ? '낚시 일지 수정' : '낚시 일지 작성'}
      maxHeightClass="max-h-[92%]"
    >
      <SheetKeyboardBody>
        <ScrollView className="shrink" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View className="gap-4 pb-2">
            <Controller
              control={control}
              name="fishedOn"
              render={({ field, fieldState }) => (
                <TextField
                  ref={field.ref}
                  label="날짜"
                  placeholder="YYYY-MM-DD"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="location"
              render={({ field, fieldState }) => (
                <TextField
                  ref={field.ref}
                  label="장소 *"
                  placeholder="장소"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="duration"
              render={({ field, fieldState }) => (
                <TextField
                  ref={field.ref}
                  label="낚시 시간 (시간)"
                  placeholder="예: 3"
                  keyboardType="numeric"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                />
              )}
            />

            <View>
              <FieldLabel>날씨</FieldLabel>
              <Controller
                control={control}
                name="weather"
                render={({ field, fieldState }) => (
                  <>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                      {WEATHER_OPTIONS.map((w) => (
                        <Chip key={w} label={w} selected={field.value === w} onPress={() => field.onChange(w)} />
                      ))}
                    </ScrollView>
                    <InlineError message={fieldState.error?.message} />
                  </>
                )}
              />
            </View>

            <View>
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-label font-medium text-sub">어획 기록</Text>
                <Button
                  label="추가"
                  icon="plus"
                  variant="ghost"
                  size="md"
                  block={false}
                  onPress={() => append({ species: '광어', size: '', count: '1' })}
                />
              </View>
              {fields.length === 0 ? <Text className="text-label text-mute">잡은 물고기가 있으면 추가해주세요</Text> : null}
              <View className="gap-2.5">
                {fields.map((f, i) => {
                  const rowErrors = formState.errors.catches?.[i];
                  return (
                    <View key={f.id} className="rounded-card border border-line p-3">
                      <Controller
                        control={control}
                        name={`catches.${i}.species`}
                        render={({ field }) => (
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-1.5">
                            {SPECIES_OPTIONS.map((s) => (
                              <Chip key={s} label={s} selected={field.value === s} onPress={() => field.onChange(s)} />
                            ))}
                          </ScrollView>
                        )}
                      />
                      <InlineError message={rowErrors?.species?.message} />
                      <View className="mt-2.5 flex-row items-start gap-2">
                        <Controller
                          control={control}
                          name={`catches.${i}.size`}
                          render={({ field }) => (
                            <TextField
                              ref={field.ref}
                              className="flex-1"
                              placeholder="크기(cm)"
                              keyboardType="numeric"
                              value={field.value}
                              onChangeText={field.onChange}
                              onBlur={field.onBlur}
                              error={rowErrors?.size?.message}
                            />
                          )}
                        />
                        <Controller
                          control={control}
                          name={`catches.${i}.count`}
                          render={({ field }) => (
                            <TextField
                              ref={field.ref}
                              className="w-[84px]"
                              placeholder="마리수"
                              keyboardType="numeric"
                              value={field.value}
                              onChangeText={field.onChange}
                              onBlur={field.onBlur}
                              error={rowErrors?.count?.message}
                            />
                          )}
                        />
                        <Pressable
                          onPress={() => remove(i)}
                          accessibilityLabel="어획 기록 삭제"
                          className="h-[48px] w-10 items-center justify-center rounded-field active:bg-surface"
                        >
                          <Icon name="trash-2" size={18} color={colors.mute} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            <Controller
              control={control}
              name="memo"
              render={({ field, fieldState }) => (
                <TextField
                  ref={field.ref}
                  label="메모"
                  placeholder="메모 (날씨, 미끼, 포인트 등)"
                  multiline
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                />
              )}
            />

            <View>
              <FieldLabel>사진</FieldLabel>
              <PhotoPicker uri={imageUri} onPick={pickImage} onRemove={() => setValue('imageUri', null)} emptyLabel="사진 추가 (선택)" />
            </View>

            {/* 커뮤니티 공유 (수정 모드에서는 숨김) */}
            {!editingLog && (
              <CheckRow checked={shareToComm} onPress={() => setShareToComm(!shareToComm)} label="커뮤니티 인증샷에도 공유하기" />
            )}
          </View>
        </ScrollView>

        <View className="pt-3">
          <Button label={editingLog ? '수정 저장' : '일지 등록'} onPress={handleSubmit(submitLog)} loading={submitting} />
        </View>
      </SheetKeyboardBody>
    </BottomSheet>
  );
}
