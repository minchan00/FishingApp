import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SPECIES_OPTIONS, WEATHER_OPTIONS } from '@/constants/fishing';
import { useCreatePost, useSaveLog } from '@/hooks/queries';
import { logFormSchema, type LogFormOutput, type LogFormValues } from '@/schemas/log';
import { colors } from '@/theme/colors';
import type { FishingLog } from '@/types/models';
import { formatCatch, todayYmd } from './format';
import { FieldError, FormTextInput } from './FormTextInput';
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

const INPUT = 'mb-2.5 rounded-xl border border-card-border bg-card p-3.5 text-[14px] text-white';
const chipClass = (active: boolean) =>
  `rounded-[20px] border px-3 py-[5px] ${active ? 'border-accent bg-accent' : 'border-card-border bg-card'}`;

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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <View className="flex-1 justify-end bg-black/70">
          <View className="max-h-[92%] rounded-t-3xl bg-ocean-mid p-5">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="flex-1 text-[16px] font-semibold text-white">
                {editingLog ? '✏️ 낚시 일지 수정' : '📔 낚시 일지 작성'}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Text className="text-[20px] text-muted">✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <FormTextInput control={control} name="fishedOn" className={INPUT} placeholder="날짜 (YYYY-MM-DD)" />
              <FormTextInput control={control} name="location" className={INPUT} placeholder="장소 *" />
              <FormTextInput
                control={control}
                name="duration"
                className={INPUT}
                placeholder="낚시 시간 (시간)"
                keyboardType="numeric"
              />

              <Text className="mb-2 text-[12px] text-muted">날씨</Text>
              <Controller
                control={control}
                name="weather"
                render={({ field }) => (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                    {WEATHER_OPTIONS.map((w) => (
                      <TouchableOpacity key={w} onPress={() => field.onChange(w)} className={`mr-2 ${chipClass(field.value === w)}`}>
                        <Text className={`text-[12px] ${field.value === w ? 'text-white' : 'text-muted'}`}>{w}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              />

              <View className="mb-2 flex-row items-center justify-between">
                <Text className="mb-2 text-[12px] text-muted">🎣 어획 기록</Text>
                <TouchableOpacity
                  onPress={() => append({ species: '광어', size: '', count: '1' })}
                  className="rounded-lg border border-accent bg-accent/15 px-3 py-[5px]"
                >
                  <Text className="text-[13px] font-semibold text-accent">+ 추가</Text>
                </TouchableOpacity>
              </View>
              {fields.map((f, i) => {
                const rowErrors = formState.errors.catches?.[i];
                return (
                  <View key={f.id} className="mb-2.5 rounded-xl bg-white/5 p-2.5">
                    <Controller
                      control={control}
                      name={`catches.${i}.species`}
                      render={({ field }) => (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-1.5">
                          {SPECIES_OPTIONS.map((s) => (
                            <TouchableOpacity
                              key={s}
                              onPress={() => field.onChange(s)}
                              className={`mr-1.5 ${chipClass(field.value === s)}`}
                            >
                              <Text className={field.value === s ? 'text-[11px] text-white' : 'text-[12px] text-muted'}>{s}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}
                    />
                    <View className="flex-row">
                      <FormTextInput
                        control={control}
                        name={`catches.${i}.size`}
                        showError={false}
                        className={`${INPUT} mr-2 flex-1`}
                        placeholder="크기(cm)"
                        keyboardType="numeric"
                      />
                      <FormTextInput
                        control={control}
                        name={`catches.${i}.count`}
                        showError={false}
                        className={`${INPUT} mr-2 w-[70px]`}
                        placeholder="마리수"
                        keyboardType="numeric"
                      />
                      <TouchableOpacity onPress={() => remove(i)} className="justify-center px-2">
                        <Text className="text-[18px] text-accent-2">✕</Text>
                      </TouchableOpacity>
                    </View>
                    <FieldError message={rowErrors?.species?.message} />
                    <FieldError message={rowErrors?.size?.message} />
                    <FieldError message={rowErrors?.count?.message} />
                  </View>
                );
              })}

              <FormTextInput
                control={control}
                name="memo"
                className={`${INPUT} h-20`}
                style={{ textAlignVertical: 'top' }}
                placeholder="메모 (날씨, 미끼, 포인트 등)"
                multiline
              />

              {/* 사진 추가 */}
              <TouchableOpacity
                className="mb-2.5 items-center rounded-xl border border-white/15 bg-card p-3.5"
                onPress={pickImage}
              >
                <Text className="text-[13px] text-muted">{imageUri ? '📷 사진 변경' : '📷 사진 추가 (선택)'}</Text>
              </TouchableOpacity>
              {imageUri && (
                <View className="mb-3">
                  <Image
                    source={{ uri: imageUri }}
                    style={{ width: '100%', height: 180, borderRadius: 10 }}
                    contentFit="cover"
                    transition={150}
                  />
                  <TouchableOpacity
                    onPress={() => setValue('imageUri', null)}
                    className="mt-1.5 self-end rounded-md bg-black/50 px-2.5 py-1"
                  >
                    <Text className="text-[11px] text-white">✕ 사진 제거</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 커뮤니티 공유 (수정 모드에서는 숨김) */}
              {!editingLog && (
                <TouchableOpacity
                  className="mb-2.5 flex-row items-center rounded-xl border border-accent/30 bg-accent/[0.08] p-3.5"
                  onPress={() => setShareToComm(!shareToComm)}
                >
                  <View
                    className={`h-5 w-5 rounded-full border-2 ${shareToComm ? 'border-accent bg-accent' : 'border-white/30'}`}
                  />
                  <Text className={`ml-2.5 text-[13px] ${shareToComm ? 'text-accent' : 'text-muted'}`}>
                    👥 커뮤니티 인증샷에도 공유하기
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
            <TouchableOpacity
              className="mt-1 items-center rounded-xl bg-accent py-3.5"
              onPress={handleSubmit(submitLog)}
              disabled={submitting}
            >
              {submitting ? (
                <View className="flex-row items-center">
                  <ActivityIndicator color={colors.white} className="mr-2" />
                  <Text className="text-[15px] font-semibold text-white">저장 중...</Text>
                </View>
              ) : (
                <Text className="text-[15px] font-semibold text-white">{editingLog ? '수정 저장' : '일지 등록'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
