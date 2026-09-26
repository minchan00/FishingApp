import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@/theme/colors';
import type { FishingPoint } from '@/types/models';
import { formatDistance, type Coords } from './distance';
import { styles } from './mapStyles';

type Props = {
  point: FishingPoint | null;
  visible: boolean;
  userLocation: Coords | null;
  isFavorite: boolean;
  canDelete: boolean;
  deleting: boolean;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onClose: () => void;
};

export function PointDetailModal({
  point, visible, userLocation, isFavorite, canDelete, deleting, onToggleFavorite, onDelete, onClose,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {point && (
            <>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{point.name}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                    {point.address} · {point.type}
                  </Text>
                </View>
                <TouchableOpacity onPress={onToggleFavorite} style={{ marginRight: 12 }}>
                  <Text style={{ fontSize: 24 }}>{isFavorite ? '⭐' : '☆'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose}>
                  <Text style={{ color: colors.textMuted, fontSize: 20 }}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>📍 거리</Text>
                  <Text style={styles.detailValue}>{userLocation ? formatDistance(userLocation, point.lat, point.lng) : '-'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>🎣 어종</Text>
                  <Text style={styles.detailValue}>{point.species.join(', ') || '-'}</Text>
                </View>
                {point.rating > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>⭐ 평점</Text>
                    <Text style={styles.detailValue}>{point.rating}</Text>
                  </View>
                )}
                {point.memo ? (
                  <View style={{ marginTop: 12 }}>
                    <Text style={{ color: colors.white, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>📝 메모</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 20 }}>{point.memo}</Text>
                  </View>
                ) : null}
                {canDelete && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} disabled={deleting}>
                    {deleting ? <ActivityIndicator color={colors.accent2} /> : <Text style={styles.deleteBtnText}>🗑️ 포인트 삭제</Text>}
                  </TouchableOpacity>
                )}
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
