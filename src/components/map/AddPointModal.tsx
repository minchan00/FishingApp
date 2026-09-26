import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { BottomSheet } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { DEFAULT_POINT_FORM, pointSchema, type PointFormInput, type PointFormOutput } from '@/schemas/point';
import { colors } from '@/theme/colors';
import type { FishingPointInput } from '@/types/models';
import type { Coords } from './distance';

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

function FieldLabel({ children }: { children: string }) {
  return <Text className="mb-2 text-label font-medium text-sub">{children}</Text>;
}

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <Text className="mt-1.5 text-caption text-danger">{message}</Text>;
}

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
    <BottomSheet visible={visible} onClose={onClose} title="포인트 추가">
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View className="gap-4">
          <Controller
            control={control}
            name="name"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField label="포인트 이름 *" placeholder="포인트 이름" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.name?.message} />
            )}
          />
          <Controller
            control={control}
            name="address"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField label="주소" placeholder="주소 (예: 인천 중구)" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.address?.message} />
            )}
          />

          <View>
            <FieldLabel>포인트 유형</FieldLabel>
            <Controller
              control={control}
              name="type"
              render={({ field: { value, onChange } }) => (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                  {types.map((f) => (
                    <Chip key={f} label={f} selected={value === f} onPress={() => onChange(f)} />
                  ))}
                </ScrollView>
              )}
            />
            <FieldError message={errors.type?.message} />
          </View>

          <View>
            <FieldLabel>주요 어종 (복수 선택)</FieldLabel>
            <Controller
              control={control}
              name="species"
              render={({ field: { value, onChange } }) => (
                <View className="flex-row flex-wrap gap-2">
                  {speciesOptions.map((s) => {
                    const selected = value.includes(s);
                    return (
                      <Chip
                        key={s}
                        label={s}
                        selected={selected}
                        onPress={() => onChange(selected ? value.filter((v) => v !== s) : [...value, s])}
                      />
                    );
                  })}
                </View>
              )}
            />
            <FieldError message={errors.species?.message} />
          </View>

          <View>
            <FieldLabel>위치 선택</FieldLabel>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: mapTapMode }}
              className={`h-[48px] flex-row items-center justify-center gap-2 rounded-field border ${mapTapMode ? 'border-primary bg-primary-soft' : 'border-line bg-bg active:bg-surface'}`}
              onPress={() => {
                onToggleMapTapMode();
                if (!mapTapMode) Alert.alert('위치 선택', '지도에서 원하는 위치를 탭해주세요!\n탭 후 다시 추가 버튼을 누르세요.');
              }}
            >
              <Icon name={mapTapMode ? 'check-circle' : 'map'} size={18} color={mapTapMode ? colors.primary : colors.sub} />
              <Text className={`text-body ${mapTapMode ? 'font-semibold text-primary' : 'text-ink'}`}>
                {mapTapMode ? '지도 탭 모드 활성화됨' : '지도에서 위치 선택'}
              </Text>
            </Pressable>
            {userLocation && (
              <Button label="현재 내 위치로 설정" icon="navigation" variant="secondary" size="md" onPress={() => setCoords(userLocation)} className="mt-2" />
            )}
            {lat !== null && lng !== null && (
              <View className="mt-2 flex-row items-center gap-1.5">
                <Icon name="map-pin" size={14} color={colors.primary} />
                <Text className="text-label text-sub">
                  선택된 위치: {lat.toFixed(4)}, {lng.toFixed(4)}
                </Text>
              </View>
            )}
            <FieldError message={locationError} />
          </View>

          <Controller
            control={control}
            name="memo"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField label="메모" placeholder="메모 (조황 정보, 팁 등)" multiline value={value} onChangeText={onChange} onBlur={onBlur} error={errors.memo?.message} />
            )}
          />
        </View>
      </ScrollView>
      <Button label="포인트 등록 (전체 공유)" onPress={submit} loading={submitting} className="mt-4" />
    </BottomSheet>
  );
}
