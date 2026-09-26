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
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SPECIES_OPTIONS, WEATHER_OPTIONS } from '@/constants/fishing';
import { todayYmd } from '@/components/log/format';
import { FieldError, FormTextInput } from '@/components/log/FormTextInput';
import { pickImageFromLibrary } from '@/components/log/pickImage';
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

const chipClass = (active: boolean) =>
  `rounded-[10px] border px-3 py-1 ${active ? 'border-accent bg-accent' : 'border-card-border bg-card'}`;
const LOG_INPUT = 'mb-2 rounded-[10px] border border-card-border bg-card p-3 text-[13px] text-white';

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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <View className="flex-1 justify-end bg-black/70">
          <View className="max-h-[92%] rounded-t-3xl bg-ocean-mid p-5">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-[16px] font-semibold text-white">✏️ 게시글 작성</Text>
              <TouchableOpacity onPress={close}>
                <Text className="text-[20px] text-muted">✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="mb-2.5 text-[12px] text-muted">🎣 {nickname} 으로 작성됩니다</Text>

              {/* 카테고리 */}
              <Controller
                control={control}
                name="category"
                render={({ field, fieldState }) => (
                  <>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                      {POST_CATEGORIES.map((c) => (
                        <TouchableOpacity
                          key={c}
                          onPress={() => {
                            field.onChange(c);
                            if (c !== '인증샷') setValue('registerToLog', false);
                          }}
                          className={`mr-2 ${chipClass(field.value === c)}`}
                        >
                          <Text className={`text-[12px] ${field.value === c ? 'text-white' : 'text-muted'}`}>{c}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <FieldError message={fieldState.error?.message} />
                  </>
                )}
              />

              {/* 내용 */}
              <FormTextInput
                control={control}
                name="content"
                className="mb-2.5 min-h-[100px] rounded-xl border border-card-border bg-card p-3.5 text-[14px] text-white"
                style={{ textAlignVertical: 'top' }}
                placeholder="낚시 이야기를 공유해주세요..."
                multiline
                numberOfLines={5}
              />

              {/* 사진 선택 */}
              <TouchableOpacity
                className="mb-2.5 items-center rounded-xl border border-white/15 bg-card p-3.5"
                onPress={pickImage}
              >
                <Text className="text-[13px] text-muted">{imageUri ? '📷 사진 변경' : '📷 사진 추가'}</Text>
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

              {/* 인증샷: 일지 등록 옵션 */}
              {category === '인증샷' && (
                <TouchableOpacity
                  className="mb-2.5 flex-row items-center rounded-xl border border-accent/30 bg-accent/[0.08] p-3.5"
                  onPress={() => setValue('registerToLog', !registerToLog)}
                >
                  <View
                    className={`h-5 w-5 rounded-full border-2 ${registerToLog ? 'border-accent bg-accent' : 'border-white/30 bg-transparent'}`}
                  />
                  <Text className={`ml-2.5 text-[13px] ${registerToLog ? 'text-accent' : 'text-muted'}`}>
                    🎣 낚시 일지에도 등록하기
                  </Text>
                </TouchableOpacity>
              )}

              {category === '인증샷' && registerToLog && (
                <View className="mb-2.5 rounded-xl bg-white/5 p-3">
                  <Text className="mb-2 text-[12px] text-muted">어종 선택</Text>
                  <Controller
                    control={control}
                    name="logSpecies"
                    render={({ field, fieldState }) => (
                      <>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2.5">
                          {SPECIES_OPTIONS.map((s) => (
                            <TouchableOpacity
                              key={s}
                              onPress={() => field.onChange(s)}
                              className={`mr-1.5 ${chipClass(field.value === s)}`}
                            >
                              <Text className={`text-[12px] ${field.value === s ? 'text-white' : 'text-muted'}`}>{s}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                        <FieldError message={fieldState.error?.message} />
                      </>
                    )}
                  />
                  <FormTextInput
                    control={control}
                    name="logSize"
                    className={LOG_INPUT}
                    placeholder="크기 (cm)"
                    keyboardType="numeric"
                  />
                  <FormTextInput control={control} name="logLocation" className={LOG_INPUT} placeholder="장소 *" />
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              className="mt-1 items-center rounded-xl bg-accent py-3.5"
              onPress={handleSubmit(submitPost)}
              disabled={submitting}
            >
              {submitting ? (
                <View className="flex-row items-center">
                  <ActivityIndicator color={colors.white} className="mr-2" />
                  <Text className="text-[15px] font-semibold text-white">등록 중...</Text>
                </View>
              ) : (
                <Text className="text-[15px] font-semibold text-white">게시글 등록</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
