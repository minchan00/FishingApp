import { Image, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@/theme/colors';
import { styles } from './fishStyles';
import type { TaxonResult } from './inaturalist';

type Props = {
  fish: TaxonResult | null;
  onClose: () => void;
};

/** iNaturalist 검색 결과 상세 */
export function SpeciesDetailModal({ fish, onClose }: Props) {
  const rows = [
    { label: '학명', value: fish?.scientific },
    { label: '분류군', value: fish?.class },
    { label: '관찰 기록', value: fish?.observationsCount ? `${fish.observationsCount.toLocaleString()}건` : null },
  ].filter((i): i is { label: string; value: string } => !!i.value);

  return (
    <Modal visible={fish !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{fish?.name}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2, fontStyle: 'italic' }}>{fish?.scientific}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: colors.textMuted, fontSize: 20 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {fish?.photoUrl ? (
              <View style={{ marginBottom: 12 }}>
                <Image source={{ uri: fish.photoUrl }} style={styles.detailPhoto} resizeMode="cover" />
                {fish.photoAttr ? (
                  <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, textAlign: 'center', marginTop: 4 }}>📸 {fish.photoAttr}</Text>
                ) : null}
              </View>
            ) : null}
            <View style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>📋 분류 정보</Text>
              {rows.map((item) => (
                <View key={item.label} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{item.label}</Text>
                  <Text style={[styles.detailValue, item.label === '학명' && { fontStyle: 'italic' }]}>{item.value}</Text>
                </View>
              ))}
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, textAlign: 'center', marginTop: 4 }}>📚 iNaturalist</Text>
          </ScrollView>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>닫기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
