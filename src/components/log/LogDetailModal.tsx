import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@/theme/colors';
import type { FishingLog } from '@/types/models';
import { formatKoreanDate } from './format';

type Props = {
  log: FishingLog | null;
  visible: boolean;
  onClose: () => void;
  onEdit: (log: FishingLog) => void;
  onDelete: (log: FishingLog) => void;
};

export function LogDetailModal({ log, visible, onClose, onEdit, onDelete }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {log && (
            <>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>
                    {formatKoreanDate(log.fishedOn)} · {log.location}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                    {log.weather} {log.duration ? `· ${log.duration}시간` : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => onEdit(log)} style={styles.editBtn}>
                  <Text style={styles.editBtnText}>✏️ 수정</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose}>
                  <Text style={{ color: colors.textMuted, fontSize: 20 }}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {log.imageUrl && <Image source={{ uri: log.imageUrl }} style={styles.detailImage} resizeMode="cover" />}
                {log.catches.length > 0 && (
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>🎣 어획 기록</Text>
                    {log.catches.map((c, i) => (
                      <View key={i} style={styles.catchLine}>
                        <Text style={{ color: colors.white, fontSize: 14 }}>{c.species}</Text>
                        <Text style={{ color: colors.oceanLight, fontSize: 14 }}>
                          {c.sizeCm !== null ? `${c.sizeCm}cm ` : ''}
                          {c.count > 1 ? `x${c.count}` : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                {log.memo ? (
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>📝 메모</Text>
                    <Text style={{ color: colors.white, fontSize: 14, lineHeight: 22, marginTop: 8 }}>{log.memo}</Text>
                  </View>
                ) : null}
                <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(log)}>
                  <Text style={styles.deleteBtnText}>🗑️ 일지 삭제</Text>
                </TouchableOpacity>
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.oceanMid, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: colors.white, fontSize: 16, fontWeight: '600', flex: 1 },
  editBtn: { backgroundColor: 'rgba(244,168,38,0.15)', borderWidth: 1, borderColor: colors.accent, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginRight: 10 },
  editBtnText: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  detailImage: { width: '100%', height: 220, borderRadius: 14, marginBottom: 12 },
  sectionCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 14, padding: 14, marginBottom: 12 },
  sectionTitle: { color: colors.white, fontSize: 14, fontWeight: '600' },
  catchLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  deleteBtn: { backgroundColor: 'rgba(224,92,26,0.2)', borderWidth: 1, borderColor: colors.accent2, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  deleteBtnText: { color: colors.accent2, fontSize: 14, fontWeight: '600' },
});
