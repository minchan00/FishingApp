import { useEffect, useState } from 'react';
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
import { useCreatePost, useSaveLog } from '@/hooks/queries';
import { colors } from '@/theme/colors';
import type { Catch, FishingLog } from '@/types/models';
import { formatCatch, isValidYmd, parseCount, parseSize, todayYmd } from './format';
import { pickImageFromLibrary } from './pickImage';

/** 입력 중인 조과. 크기·마리수는 입력창 텍스트 그대로 들고 있다가 저장할 때 숫자로 바꾼다. */
type CatchDraft = { species: string; size: string; count: string };

type LogForm = {
  fishedOn: string;
  location: string;
  weather: string;
  duration: string;
  memo: string;
};

const emptyForm = (): LogForm => ({
  fishedOn: todayYmd(),
  location: '',
  weather: WEATHER_OPTIONS[0],
  duration: '',
  memo: '',
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

  const [form, setForm] = useState<LogForm>(emptyForm);
  const [catches, setCatches] = useState<CatchDraft[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [shareToComm, setShareToComm] = useState(false);

  // 모달이 열릴 때마다 폼을 채우거나 비운다
  useEffect(() => {
    if (!visible) return;
    if (editingLog) {
      setForm({
        fishedOn: editingLog.fishedOn,
        location: editingLog.location,
        weather: editingLog.weather,
        duration: editingLog.duration,
        memo: editingLog.memo,
      });
      setCatches(
        editingLog.catches.map((c) => ({
          species: c.species,
          size: c.sizeCm !== null ? String(c.sizeCm) : '',
          count: String(c.count),
        })),
      );
      // 기존 사진의 공개 URL을 그대로 넘기면 데이터 레이어가 기존 사진을 유지한다
      setImageUri(editingLog.imageUrl);
    } else {
      setForm(emptyForm());
      setCatches([]);
      setImageUri(null);
    }
    setShareToComm(false);
  }, [visible, editingLog]);

  const submitting = saveLog.isPending || createPost.isPending;

  const addCatch = () => setCatches([...catches, { species: '광어', size: '', count: '1' }]);
  const updateCatch = (idx: number, field: keyof CatchDraft, value: string) =>
    setCatches(catches.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  const removeCatch = (idx: number) => setCatches(catches.filter((_, i) => i !== idx));

  const pickImage = async () => {
    const uri = await pickImageFromLibrary();
    if (uri) setImageUri(uri);
  };

  const submitLog = async () => {
    if (!form.location.trim()) {
      Alert.alert('알림', '장소를 입력해주세요!');
      return;
    }
    if (!isValidYmd(form.fishedOn)) {
      Alert.alert('알림', '날짜를 YYYY-MM-DD 형식으로 입력해주세요!');
      return;
    }

    const parsedCatches: Catch[] = catches.map((c) => ({
      species: c.species,
      sizeCm: parseSize(c.size),
      count: parseCount(c.count),
    }));

    try {
      await saveLog.mutateAsync({
        input: { ...form, imageUri, catches: parsedCatches },
        logId: editingLog?.id,
      });
    } catch (e) {
      console.error('일지 저장 실패:', e);
      Alert.alert('오류', '일지 저장에 실패했어요.');
      return;
    }

    if (!editingLog && shareToComm) {
      const speciesText = parsedCatches.map(formatCatch).join(', ');
      const content = `📍 ${form.location}${speciesText ? `\n🐟 ${speciesText}` : ''}${form.memo ? `\n\n${form.memo}` : ''}`;
      try {
        await createPost.mutateAsync({ category: '인증샷', content, imageUri });
      } catch (e) {
        console.error('커뮤니티 공유 실패:', e);
        Alert.alert('알림', '일지는 저장됐지만 커뮤니티 공유에 실패했어요.');
      }
    }

    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingLog ? '✏️ 낚시 일지 수정' : '📔 낚시 일지 작성'}</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={{ color: colors.textMuted, fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                style={styles.input}
                placeholder="날짜 (YYYY-MM-DD)"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={form.fishedOn}
                onChangeText={(t) => setForm({ ...form, fishedOn: t })}
              />
              <TextInput
                style={styles.input}
                placeholder="장소 *"
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={form.location}
                onChangeText={(t) => setForm({ ...form, location: t })}
              />
              <TextInput
                style={styles.input}
                placeholder="낚시 시간 (시간)"
                placeholderTextColor="rgba(255,255,255,0.4)"
                keyboardType="numeric"
                value={form.duration}
                onChangeText={(t) => setForm({ ...form, duration: t })}
              />

              <Text style={styles.inputLabel}>날씨</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {WEATHER_OPTIONS.map((w) => (
                  <TouchableOpacity
                    key={w}
                    onPress={() => setForm({ ...form, weather: w })}
                    style={[styles.chip, form.weather === w && styles.chipActive, { marginRight: 8 }]}
                  >
                    <Text style={[styles.chipText, form.weather === w && { color: colors.white }]}>{w}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.inputLabel}>🎣 어획 기록</Text>
                <TouchableOpacity onPress={addCatch} style={styles.addCatchBtn}>
                  <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>+ 추가</Text>
                </TouchableOpacity>
              </View>
              {catches.map((c, i) => (
                <View key={i} style={styles.catchRow}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                    {SPECIES_OPTIONS.map((s) => (
                      <TouchableOpacity
                        key={s}
                        onPress={() => updateCatch(i, 'species', s)}
                        style={[styles.chip, c.species === s && styles.chipActive, { marginRight: 6 }]}
                      >
                        <Text style={[styles.chipText, c.species === s && { color: colors.white, fontSize: 11 }]}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <View style={{ flexDirection: 'row' }}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginRight: 8 }]}
                      placeholder="크기(cm)"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      keyboardType="numeric"
                      value={c.size}
                      onChangeText={(t) => updateCatch(i, 'size', t)}
                    />
                    <TextInput
                      style={[styles.input, { width: 70, marginRight: 8 }]}
                      placeholder="마리수"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      keyboardType="numeric"
                      value={c.count}
                      onChangeText={(t) => updateCatch(i, 'count', t)}
                    />
                    <TouchableOpacity onPress={() => removeCatch(i)} style={styles.removeCatchBtn}>
                      <Text style={{ color: colors.accent2, fontSize: 18 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="메모 (날씨, 미끼, 포인트 등)"
                placeholderTextColor="rgba(255,255,255,0.4)"
                multiline
                value={form.memo}
                onChangeText={(t) => setForm({ ...form, memo: t })}
              />

              {/* 사진 추가 */}
              <TouchableOpacity style={styles.imagePickBtn} onPress={pickImage}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                  {imageUri ? '📷 사진 변경' : '📷 사진 추가 (선택)'}
                </Text>
              </TouchableOpacity>
              {imageUri && (
                <View style={{ marginBottom: 12 }}>
                  <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
                  <TouchableOpacity onPress={() => setImageUri(null)} style={styles.removeImageBtn}>
                    <Text style={{ color: colors.white, fontSize: 11 }}>✕ 사진 제거</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 커뮤니티 공유 (수정 모드에서는 숨김) */}
              {!editingLog && (
                <TouchableOpacity style={styles.shareToggle} onPress={() => setShareToComm(!shareToComm)}>
                  <View style={[styles.toggleDot, shareToComm && styles.toggleDotActive]} />
                  <Text style={{ color: shareToComm ? colors.accent : colors.textMuted, fontSize: 13, marginLeft: 10 }}>
                    👥 커뮤니티 인증샷에도 공유하기
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.submitBtn} onPress={submitLog} disabled={submitting}>
              {submitting ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator color={colors.white} style={{ marginRight: 8 }} />
                  <Text style={styles.submitBtnText}>저장 중...</Text>
                </View>
              ) : (
                <Text style={styles.submitBtnText}>{editingLog ? '수정 저장' : '일지 등록'}</Text>
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
  modalTitle: { color: colors.white, fontSize: 16, fontWeight: '600', flex: 1 },
  input: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, padding: 14, color: colors.white, fontSize: 14, marginBottom: 10 },
  inputLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 8 },
  chip: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textMuted, fontSize: 12 },
  catchRow: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 10, marginBottom: 10 },
  addCatchBtn: { backgroundColor: 'rgba(244,168,38,0.15)', borderWidth: 1, borderColor: colors.accent, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  removeCatchBtn: { justifyContent: 'center', paddingHorizontal: 8 },
  imagePickBtn: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 },
  previewImage: { width: '100%', height: 180, borderRadius: 10 },
  removeImageBtn: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-end', marginTop: 6 },
  shareToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(244,168,38,0.08)', borderWidth: 1, borderColor: 'rgba(244,168,38,0.3)', borderRadius: 12, padding: 14, marginBottom: 10 },
  toggleDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  toggleDotActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  submitBtn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  submitBtnText: { color: colors.white, fontSize: 15, fontWeight: '600' },
});
