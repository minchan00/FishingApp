import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors } from '@/theme/colors';
import type { FishingPointInput } from '@/types/models';
import type { Coords } from './distance';
import { styles } from './mapStyles';

/** 아직 위치를 고르지 않았을 때의 기본 좌표 */
export const DEFAULT_NEW_POINT: FishingPointInput = { name: '', address: '', type: '방파제', species: [], memo: '', lat: 37.5, lng: 126.9 };

type Props = {
  visible: boolean;
  value: FishingPointInput;
  onChange: (next: FishingPointInput) => void;
  types: readonly string[];
  speciesOptions: readonly string[];
  mapTapMode: boolean;
  onToggleMapTapMode: () => void;
  userLocation: Coords | null;
  submitting: boolean;
  onSubmit: () => void;
  onClose: () => void;
};

export function AddPointModal({
  visible, value, onChange, types, speciesOptions, mapTapMode, onToggleMapTapMode, userLocation, submitting, onSubmit, onClose,
}: Props) {
  const toggleSpecies = (sp: string) => {
    const current = value.species;
    onChange({ ...value, species: current.includes(sp) ? current.filter((s) => s !== sp) : [...current, sp] });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📍 포인트 추가</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: colors.textMuted, fontSize: 20 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <TextInput style={styles.input} placeholder="포인트 이름 *" placeholderTextColor="rgba(255,255,255,0.4)" value={value.name} onChangeText={(t) => onChange({ ...value, name: t })} />
            <TextInput style={styles.input} placeholder="주소 (예: 인천 중구)" placeholderTextColor="rgba(255,255,255,0.4)" value={value.address} onChangeText={(t) => onChange({ ...value, address: t })} />

            <Text style={styles.inputLabel}>포인트 유형</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {types.map((f) => (
                <TouchableOpacity key={f} onPress={() => onChange({ ...value, type: f })} style={[styles.chip, value.type === f && styles.chipActive, { marginRight: 8 }]}>
                  <Text style={[styles.chipText, value.type === f && { color: colors.white }]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>주요 어종 (복수 선택)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
              {speciesOptions.map((s) => (
                <TouchableOpacity key={s} onPress={() => toggleSpecies(s)} style={[styles.chip, value.species.includes(s) && styles.chipActive, { marginRight: 8, marginBottom: 8 }]}>
                  <Text style={[styles.chipText, value.species.includes(s) && { color: colors.white }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>위치 선택</Text>
            <TouchableOpacity
              style={[styles.mapTapBtn, mapTapMode && styles.mapTapBtnActive]}
              onPress={() => {
                onToggleMapTapMode();
                if (!mapTapMode) Alert.alert('위치 선택', '지도에서 원하는 위치를 탭해주세요!\n탭 후 다시 추가 버튼을 누르세요.');
              }}
            >
              <Text style={{ color: mapTapMode ? colors.accent : colors.white, fontSize: 13 }}>
                {mapTapMode ? '✅ 지도 탭 모드 활성화됨' : '🗺️ 지도에서 위치 선택'}
              </Text>
            </TouchableOpacity>
            {value.lat !== DEFAULT_NEW_POINT.lat && (
              <Text style={{ color: colors.oceanLight, fontSize: 12, marginBottom: 8 }}>
                선택된 위치: {value.lat.toFixed(4)}, {value.lng.toFixed(4)}
              </Text>
            )}
            {userLocation && (
              <TouchableOpacity style={styles.myLocBtn} onPress={() => onChange({ ...value, lat: userLocation.latitude, lng: userLocation.longitude })}>
                <Text style={{ color: colors.white, fontSize: 13 }}>📍 현재 내 위치로 설정</Text>
              </TouchableOpacity>
            )}

            <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top', marginTop: 8 }]} placeholder="메모 (조황 정보, 팁 등)" placeholderTextColor="rgba(255,255,255,0.4)" multiline value={value.memo} onChangeText={(t) => onChange({ ...value, memo: t })} />
          </ScrollView>
          <TouchableOpacity style={styles.submitBtn} onPress={onSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitBtnText}>포인트 등록 (전체 공유)</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
