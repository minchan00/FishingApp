import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SPECIES_OPTIONS, WEATHER_OPTIONS } from '@/constants/fishing';
import { parseSize, todayYmd } from '@/components/log/format';
import { pickImageFromLibrary } from '@/components/log/pickImage';
import { useCreatePost, useSaveLog } from '@/hooks/queries';
import { colors } from '@/theme/colors';
import type { PostCategory } from '@/types/models';
import { POST_CATEGORIES } from './categories';

type Props = {
  visible: boolean;
  nickname: string;
  onClose: () => void;
};

export function WritePostModal({ visible, nickname, onClose }: Props) {
  const createPost = useCreatePost();
  const saveLog = useSaveLog();

  const [category, setCategory] = useState<PostCategory>('조황 정보');
  const [content, setContent] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [registerToLog, setRegisterToLog] = useState(false);
  const [logSpecies, setLogSpecies] = useState<string>('광어');
  const [logSize, setLogSize] = useState('');
  const [logLocation, setLogLocation] = useState('');

  const submitting = createPost.isPending || saveLog.isPending;

  const resetForm = () => {
    setCategory('조황 정보');
    setContent('');
    setImageUri(null);
    setRegisterToLog(false);
    setLogSpecies('광어');
    setLogSize('');
    setLogLocation('');
  };

  const close = () => {
    onClose();
    resetForm();
  };

  const pickImage = async () => {
    const uri = await pickImageFromLibrary();
    if (uri) setImageUri(uri);
  };

  const submitPost = async () => {
    if (!content.trim()) {
      Alert.alert('알림', '내용을 입력해주세요!');
      return;
    }
    const alsoLog = category === '인증샷' && registerToLog;
    if (alsoLog && !logLocation.trim()) {
      Alert.alert('알림', '일지 등록을 위해 장소를 입력해주세요!');
      return;
    }

    try {
      await createPost.mutateAsync({ category, content: content.trim(), imageUri });
    } catch (e) {
      console.error('게시글 등록 실패:', e);
      Alert.alert('오류', '게시글 등록에 실패했어요.');
      return;
    }

    if (alsoLog) {
      try {
        await saveLog.mutateAsync({
          input: {
            fishedOn: todayYmd(),
            location: logLocation.trim(),
            weather: WEATHER_OPTIONS[0],
            duration: '',
            memo: content.trim(),
            imageUri,
            catches: [{ species: logSpecies, sizeCm: parseSize(logSize), count: 1 }],
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ 게시글 작성</Text>
              <TouchableOpacity onPress={close}>
                <Text style={{ color: colors.textMuted, fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 10 }}>🎣 {nickname} 으로 작성됩니다</Text>

              {/* 카테고리 */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {POST_CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => {
                      setCategory(c);
                      if (c !== '인증샷') setRegisterToLog(false);
                    }}
                    style={[styles.chip, category === c && styles.chipActive, { marginRight: 8 }]}
                  >
                    <Text style={[styles.chipText, category === c && { color: colors.white }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* 내용 */}
              <TextInput
                style={styles.textArea}
                placeholder="낚시 이야기를 공유해주세요..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                multiline
                numberOfLines={5}
                value={content}
                onChangeText={setContent}
              />

              {/* 사진 선택 */}
              <TouchableOpacity style={styles.imagePickBtn} onPress={pickImage}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>{imageUri ? '📷 사진 변경' : '📷 사진 추가'}</Text>
              </TouchableOpacity>
              {imageUri && (
                <View style={{ marginBottom: 12 }}>
                  <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
                  <TouchableOpacity onPress={() => setImageUri(null)} style={styles.removeImageBtn}>
                    <Text style={{ color: colors.white, fontSize: 11 }}>✕ 사진 제거</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 인증샷: 일지 등록 옵션 */}
              {category === '인증샷' && (
                <TouchableOpacity style={styles.logRegisterToggle} onPress={() => setRegisterToLog(!registerToLog)}>
                  <View style={[styles.toggleDot, registerToLog && styles.toggleDotActive]} />
                  <Text style={{ color: registerToLog ? colors.accent : colors.textMuted, fontSize: 13, marginLeft: 10 }}>
                    🎣 낚시 일지에도 등록하기
                  </Text>
                </TouchableOpacity>
              )}

              {category === '인증샷' && registerToLog && (
                <View style={styles.logSection}>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>어종 선택</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                    {SPECIES_OPTIONS.map((s) => (
                      <TouchableOpacity
                        key={s}
                        onPress={() => setLogSpecies(s)}
                        style={[styles.chip, logSpecies === s && styles.chipActive, { marginRight: 6 }]}
                      >
                        <Text style={[styles.chipText, logSpecies === s && { color: colors.white }]}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TextInput
                    style={styles.logInput}
                    placeholder="크기 (cm)"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    keyboardType="numeric"
                    value={logSize}
                    onChangeText={setLogSize}
                  />
                  <TextInput
                    style={styles.logInput}
                    placeholder="장소 *"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={logLocation}
                    onChangeText={setLogLocation}
                  />
                </View>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.submitBtn} onPress={submitPost} disabled={submitting}>
              {submitting ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator color={colors.white} style={{ marginRight: 8 }} />
                  <Text style={styles.submitBtnText}>등록 중...</Text>
                </View>
              ) : (
                <Text style={styles.submitBtnText}>게시글 등록</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.oceanMid, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: colors.white, fontSize: 16, fontWeight: '600' },
  chip: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textMuted, fontSize: 12 },
  textArea: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, padding: 14, color: colors.white, fontSize: 14, minHeight: 100, textAlignVertical: 'top', marginBottom: 10 },
  imagePickBtn: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 },
  previewImage: { width: '100%', height: 180, borderRadius: 10 },
  removeImageBtn: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-end', marginTop: 6 },
  logRegisterToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(244,168,38,0.08)', borderWidth: 1, borderColor: 'rgba(244,168,38,0.3)', borderRadius: 12, padding: 14, marginBottom: 10 },
  toggleDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'transparent' },
  toggleDotActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  logSection: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, marginBottom: 10 },
  logInput: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 10, padding: 12, color: colors.white, fontSize: 13, marginBottom: 8 },
  submitBtn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  submitBtnText: { color: colors.white, fontSize: 15, fontWeight: '600' },
});
