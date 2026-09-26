import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSaveLog } from '@/hooks/queries';
import { colors } from '@/theme/colors';
import { styles } from './fishStyles';

export type RegisterDraft = { name: string; size: string; location: string; memo: string };

type Props = {
  /** null이면 닫힘 */
  draft: RegisterDraft | null;
  imageUri: string | null;
  onClose: () => void;
  onRegistered: () => void;
};

function todayString(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** AI 분석 결과를 일지로 등록한다. 도감은 일지에서 자동 계산된다. */
export function RegisterCatchModal({ draft, imageUri, onClose, onRegistered }: Props) {
  const [data, setData] = useState<RegisterDraft>({ name: '', size: '', location: '', memo: '' });
  const saveLog = useSaveLog();

  useEffect(() => {
    if (draft) setData(draft);
  }, [draft]);

  const register = () => {
    const species = data.name.trim();
    if (!species) {
      Alert.alert('알림', '어종명을 입력해주세요!');
      return;
    }
    const size = parseFloat(data.size);
    const memo = data.memo.trim();
    saveLog.mutate(
      {
        input: {
          fishedOn: todayString(),
          location: data.location.trim() || '미입력',
          weather: '맑음 ☀️',
          duration: '',
          memo: `AI 분석으로 자동 등록${memo ? ': ' + memo : ''}`,
          imageUri,
          catches: [{ species, sizeCm: Number.isFinite(size) ? size : null, count: 1 }],
        },
      },
      {
        onSuccess: () => {
          onRegistered();
          Alert.alert('✅ 등록 완료!', `${species}이(가)\n내 도감 + 낚시 일지에 자동 등록됐어요!`);
        },
        onError: () => Alert.alert('오류', '등록 중 오류가 발생했어요.'),
      },
    );
  };

  return (
    <Modal visible={draft !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🐟 도감 + 일지 등록</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: colors.textMuted, fontSize: 20 }}>✕</Text>
            </TouchableOpacity>
          </View>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={{ width: '100%', height: 130, borderRadius: 12, marginBottom: 14 }} resizeMode="cover" />
          ) : null}
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>🐟 어종명 *</Text>
            <TextInput style={styles.input} value={data.name} onChangeText={(t) => setData({ ...data, name: t })} placeholder="어종명" placeholderTextColor="rgba(255,255,255,0.4)" />
            <Text style={styles.inputLabel}>📏 크기 (cm)</Text>
            <TextInput style={styles.input} value={data.size} onChangeText={(t) => setData({ ...data, size: t })} placeholder="크기 입력 (선택)" placeholderTextColor="rgba(255,255,255,0.4)" keyboardType="numeric" />
            <Text style={styles.inputLabel}>📍 잡은 장소</Text>
            <TextInput style={styles.input} value={data.location} onChangeText={(t) => setData({ ...data, location: t })} placeholder="장소 입력 (선택)" placeholderTextColor="rgba(255,255,255,0.4)" />
            <Text style={styles.inputLabel}>📝 메모</Text>
            <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]} value={data.memo} onChangeText={(t) => setData({ ...data, memo: t })} placeholder="메모 (선택)" placeholderTextColor="rgba(255,255,255,0.4)" multiline />
          </ScrollView>
          <TouchableOpacity style={styles.registerBtn} onPress={register} disabled={saveLog.isPending}>
            {saveLog.isPending ? <ActivityIndicator color={colors.white} /> : <Text style={styles.registerBtnText}>✅ 도감 + 일지에 등록하기</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
