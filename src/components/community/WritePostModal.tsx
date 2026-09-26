import { Alert, ScrollView, Text, View } from 'react-native';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SPECIES_OPTIONS, WEATHER_OPTIONS } from '@/constants/fishing';
import { todayYmd } from '@/components/log/format';
import { CheckRow, FieldLabel, InlineError, PhotoPicker, SheetKeyboardBody } from '@/components/log/FormParts';
import { pickImageFromLibrary } from '@/components/log/pickImage';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Icon } from '@/components/ui/Icon';
import { BottomSheet } from '@/components/ui/Sheet';
import { TextField } from '@/components/ui/TextField';
import { useCreatePost, useSaveLog } from '@/hooks/queries';
import { postFormSchema, type PostFormOutput, type PostFormValues } from '@/schemas/post';
import { colors } from '@/theme/colors';
import { POST_CATEGORIES } from './categories';

const defaultValues = (): PostFormValues => ({
  category: '조황 정보',
  content: '',
  imageUri: null,
  registerToLog: false,
  logSpecies: '광어',
  logSize: '',
  logLocation: '',
});

type Props = {
  visible: boolean;
  nickname: string;
  onClose: () => void;
};

export function WritePostModal({ visible, nickname, onClose }: Props) {
  const createPost = useCreatePost();
  const saveLog = useSaveLog();

  const { control, handleSubmit, reset, setValue } = useForm<PostFormValues, unknown, PostFormOutput>({
    resolver: zodResolver(postFormSchema),
    defaultValues: defaultValues(),
  });
  const [category, imageUri, registerToLog] = useWatch({ control, name: ['category', 'imageUri', 'registerToLog'] });

  const submitting = createPost.isPending || saveLog.isPending;

  const close = () => {
    onClose();
    reset(defaultValues());
  };

  const pickImage = async () => {
    const uri = await pickImageFromLibrary();
    if (uri) setValue('imageUri', uri);
  };

  const submitPost = async ({ post, log }: PostFormOutput) => {
    try {
      await createPost.mutateAsync(post);
    } catch (e) {
      console.error('게시글 등록 실패:', e);
      Alert.alert('오류', '게시글 등록에 실패했어요.');
      return;
    }

    if (log) {
      try {
        await saveLog.mutateAsync({
          input: {
            fishedOn: todayYmd(),
            location: log.location,
            weather: WEATHER_OPTIONS[0],
            duration: '',
            memo: post.content,
            imageUri: post.imageUri,
            catches: [log.catchItem],
          },
        });
      } catch (e) {
        console.error('일지 등록 실패:', e);
        Alert.alert('알림', '게시글은 등록됐지만 일지 등록에 실패했어요.');
      }
    }

    close();
  };

  return (
    <BottomSheet visible={visible} onClose={close} title="게시글 작성" maxHeightClass="max-h-[92%]">
      <SheetKeyboardBody>
        <ScrollView className="shrink" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View className="gap-4 pb-2">
            <View className="-mt-2 flex-row items-center gap-1.5">
              <Icon name="user" size={14} color={colors.mute} />
              <Text className="text-label text-mute">{nickname} 으로 작성됩니다</Text>
            </View>

            {/* 카테고리 */}
            <View>
              <FieldLabel>카테고리</FieldLabel>
              <Controller
                control={control}
                name="category"
                render={({ field, fieldState }) => (
                  <>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                      {POST_CATEGORIES.map((c) => (
                        <Chip
                          key={c}
                          label={c}
                          selected={field.value === c}
                          onPress={() => {
                            field.onChange(c);
                            if (c !== '인증샷') setValue('registerToLog', false);
                          }}
                        />
                      ))}
                    </ScrollView>
                    <InlineError message={fieldState.error?.message} />
                  </>
                )}
              />
            </View>

            {/* 내용 */}
            <Controller
              control={control}
              name="content"
              render={({ field, fieldState }) => (
                <TextField
                  ref={field.ref}
                  label="내용"
                  placeholder="낚시 이야기를 공유해주세요..."
                  multiline
                  numberOfLines={5}
                  style={{ minHeight: 120 }}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                />
              )}
            />

            {/* 사진 선택 */}
            <View>
              <FieldLabel>사진</FieldLabel>
              <PhotoPicker uri={imageUri} onPick={pickImage} onRemove={() => setValue('imageUri', null)} emptyLabel="사진 추가" />
            </View>

            {/* 인증샷: 일지 등록 옵션 */}
            {category === '인증샷' && (
              <CheckRow checked={registerToLog} onPress={() => setValue('registerToLog', !registerToLog)} label="낚시 일지에도 등록하기" />
            )}

            {category === '인증샷' && registerToLog && (
              <View className="gap-4 rounded-card border border-line p-4">
                <View>
                  <FieldLabel>어종 선택</FieldLabel>
                  <Controller
                    control={control}
                    name="logSpecies"
                    render={({ field, fieldState }) => (
                      <>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-1.5">
                          {SPECIES_OPTIONS.map((s) => (
                            <Chip key={s} label={s} selected={field.value === s} onPress={() => field.onChange(s)} />
                          ))}
                        </ScrollView>
                        <InlineError message={fieldState.error?.message} />
                      </>
                    )}
                  />
                </View>
                <Controller
                  control={control}
                  name="logSize"
                  render={({ field, fieldState }) => (
                    <TextField
                      ref={field.ref}
                      label="크기 (cm)"
                      placeholder="크기 (cm)"
                      keyboardType="numeric"
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      error={fieldState.error?.message}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="logLocation"
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
              </View>
            )}
          </View>
        </ScrollView>

        <View className="pt-3">
          <Button label="게시글 등록" onPress={handleSubmit(submitPost)} loading={submitting} />
        </View>
      </SheetKeyboardBody>
    </BottomSheet>
  );
}
