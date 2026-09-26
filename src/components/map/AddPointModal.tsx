import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { DEFAULT_POINT_FORM, pointSchema, type PointFormInput, type PointFormOutput } from '@/schemas/point';
import { colors } from '@/theme/colors';
import type { FishingPointInput } from '@/types/models';
import type { Coords } from './distance';
import { chipClass, chipTextClass, CloseX, cls, FieldError, inputClass, PLACEHOLDER_COLOR, SheetModal } from './ui';

type Props = {
  visible: boolean;
  types: readonly string[];
  speciesOptions: readonly string[];
  mapTapMode: boolean;
  onToggleMapTapMode: () => void;
  /** 지도 탭 모드에서 마지막으로 고른 좌표. 바뀔 때마다 폼의 위도/경도에 반영한다. */
  pickedCoords: Coords | null;
  userLocation: Coords | null;
  submitting: boolean;
  /** 검증을 통과한 입력. 등록에 성공하면 resetForm을 불러 폼을 비운다. */
  onSubmit: (input: FishingPointInput, resetForm: () => void) => void;
  onClose: () => void;
};

export function AddPointModal({
  visible, types, speciesOptions, mapTapMode, onToggleMapTapMode, pickedCoords, userLocation, submitting, onSubmit, onClose,
}: Props) {
  const { control, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitted } } = useForm<PointFormInput, unknown, PointFormOutput>({
    resolver: zodResolver(pointSchema),
    defaultValues: DEFAULT_POINT_FORM,
  });

  const lat = watch('lat');
  const lng = watch('lng');

  const setCoords = ({ latitude, longitude }: Coords) => {
    setValue('lat', latitude, { shouldValidate: isSubmitted });
    setValue('lng', longitude, { shouldValidate: isSubmitted });
  };

  useEffect(() => {
    if (!pickedCoords) return;
    setValue('lat', pickedCoords.latitude, { shouldValidate: isSubmitted });
    setValue('lng', pickedCoords.longitude, { shouldValidate: isSubmitted });
    // isSubmitted가 바뀔 때 '현재 내 위치'로 고른 값을 다시 덮어쓰지 않도록 좌표 변경에만 반응한다
  }, [pickedCoords, setValue]);

  const submit = handleSubmit((input) => onSubmit(input, () => reset(DEFAULT_POINT_FORM)));

  const locationError = errors.lat?.message ?? errors.lng?.message;

  return (
    <SheetModal visible={visible} onClose={onClose}>
      <View className={cls.modalHeader}>
        <Text className={cls.modalTitle}>📍 포인트 추가</Text>
        <CloseX onPress={onClose} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Controller
          control={control}
          name="name"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput className={inputClass(!!errors.name)} placeholder="포인트 이름 *" placeholderTextColor={PLACEHOLDER_COLOR} value={value} onChangeText={onChange} onBlur={onBlur} />
          )}
        />
        <FieldError message={errors.name?.message} />
        <Controller
          control={control}
          name="address"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput className={inputClass(!!errors.address)} placeholder="주소 (예: 인천 중구)" placeholderTextColor={PLACEHOLDER_COLOR} value={value} onChangeText={onChange} onBlur={onBlur} />
          )}
        />
        <FieldError message={errors.address?.message} />

        <Text className={cls.inputLabel}>포인트 유형</Text>
        <Controller
          control={control}
          name="type"
          render={({ field: { value, onChange } }) => (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-[12px]">
              {types.map((f) => (
                <TouchableOpacity key={f} onPress={() => onChange(f)} className={`${chipClass(value === f)} mr-[8px]`}>
                  <Text className={chipTextClass(value === f)}>{f}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        />
        <FieldError message={errors.type?.message} />

        <Text className={cls.inputLabel}>주요 어종 (복수 선택)</Text>
        <Controller
          control={control}
          name="species"
          render={({ field: { value, onChange } }) => (
            <View className="flex-row flex-wrap mb-[12px]">
              {speciesOptions.map((s) => {
                const selected = value.includes(s);
                return (
                  <TouchableOpacity
                    key={s}
                    onPress={() => onChange(selected ? value.filter((v) => v !== s) : [...value, s])}
                    className={`${chipClass(selected)} mr-[8px] mb-[8px]`}
                  >
                    <Text className={chipTextClass(selected)}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        />
        <FieldError message={errors.species?.message} />

        <Text className={cls.inputLabel}>위치 선택</Text>
        <TouchableOpacity
          className={`border rounded-[12px] p-[14px] items-center mb-[8px] ${mapTapMode ? 'border-accent bg-[rgba(244,168,38,0.1)]' : 'bg-card border-[rgba(255,255,255,0.2)]'}`}
          onPress={() => {
            onToggleMapTapMode();
            if (!mapTapMode) Alert.alert('위치 선택', '지도에서 원하는 위치를 탭해주세요!\n탭 후 다시 추가 버튼을 누르세요.');
          }}
        >
          <Text className={`text-[13px] ${mapTapMode ? 'text-accent' : 'text-white'}`}>
            {mapTapMode ? '✅ 지도 탭 모드 활성화됨' : '🗺️ 지도에서 위치 선택'}
          </Text>
        </TouchableOpacity>
        {lat !== null && lng !== null && (
          <Text className="text-ocean-light text-[12px] mb-[8px]">
            선택된 위치: {lat.toFixed(4)}, {lng.toFixed(4)}
          </Text>
        )}
        {userLocation && (
          <TouchableOpacity
            className="bg-[rgba(42,159,196,0.2)] border border-ocean-light rounded-[12px] p-[12px] items-center mb-[8px]"
            onPress={() => setCoords(userLocation)}
          >
            <Text className="text-white text-[13px]">📍 현재 내 위치로 설정</Text>
          </TouchableOpacity>
        )}
        {locationError ? <Text className="text-accent-2 text-[12px] mb-[8px]">{locationError}</Text> : null}

        <Controller
          control={control}
          name="memo"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              className={`${inputClass(!!errors.memo)} h-[80px] mt-[8px]`}
              style={{ textAlignVertical: 'top' }}
              placeholder="메모 (조황 정보, 팁 등)"
              placeholderTextColor={PLACEHOLDER_COLOR}
              multiline
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
          )}
        />
        <FieldError message={errors.memo?.message} />
      </ScrollView>
      <TouchableOpacity className="bg-accent rounded-[12px] py-[14px] items-center mt-[4px]" onPress={submit} disabled={submitting}>
        {submitting ? <ActivityIndicator color={colors.white} /> : <Text className="text-white text-[15px] font-semibold">포인트 등록 (전체 공유)</Text>}
      </TouchableOpacity>
    </SheetModal>
  );
}
