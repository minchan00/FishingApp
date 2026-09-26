import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSaveDogamMemo } from '@/hooks/queries';
import { colors } from '@/theme/colors';
import type { DogamEntry } from '@/types/models';
import { styles } from './fishStyles';

type Props = {
  entry: DogamEntry | null;
  onClose: () => void;
};

/** 내 도감 항목 보기 + 메모 수정. 크기·장소·날짜는 일지 기록에서 계산된다. */
export function DogamMemoModal({ entry, onClose }: Props) {
  const [memo, setMemo] = useState('');
  const saveMemo = useSaveDogamMemo();

  useEffect(() => {
    if (entry) setMemo(entry.memo);
  }, [entry]);

  const save = () => {
    if (!entry) return;
    saveMemo.mutate(
      { species: entry.species, memo: memo.trim() },
      {
        onSuccess: () => {
          onClose();
          Alert.alert('✅ 수정 완료!', '도감이 수정됐어요!');
        },
        onError: () => Alert.alert('오류', '수정 중 오류가 발생했어요.'),
      },
    );
  };

  const rows = entry
    ? [
        { label: '📏 최대 크기', value: entry.bestSizeCm !== null ? `${entry.bestSizeCm}cm` : '-' },
        { label: '📍 장소', value: entry.bestLocation || '-' },
        { label: '📅 최근 날짜', value: entry.lastCaughtOn },
        { label: '🎣 총 마릿수', value: `${entry.totalCount}마리` },
      ]
    : [];

  return (
    <Modal visible={entry !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>✏️ {entry?.species}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: colors.textMuted, fontSize: 20 }}>✕</Text>
            </TouchableOpacity>
          </View>
          {entry?.imageUrl ? (
            <Image source={{ uri: entry.imageUrl }} style={{ width: '100%', height: 130, borderRadius: 12, marginBottom: 14 }} resizeMode="cover" />
          ) : null}
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.infoSection}>
              {rows.map((row) => (
                <View key={row.label} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{row.label}</Text>
                  <Text style={styles.detailValue}>{row.value}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.inputLabel}>📝 메모</Text>
            <TextInput
              style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
              value={memo}
              onChangeText={setMemo}
              placeholder="메모"
              placeholderTextColor="rgba(255,255,255,0.4)"
              multiline
            />
            <Text style={styles.hintText}>📔 크기·장소·날짜 기록은 일지 탭에서 관리해요</Text>
          </ScrollView>
          <TouchableOpacity style={styles.registerBtn} onPress={save} disabled={saveMemo.isPending}>
            {saveMemo.isPending ? <ActivityIndicator color={colors.white} /> : <Text style={styles.registerBtnText}>💾 수정 저장</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
