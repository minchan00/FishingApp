import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@/theme/colors';
import type { DogamEntry } from '@/types/models';
import { styles } from './fishStyles';

type Props = {
  entries: DogamEntry[];
  isLoading: boolean;
  error: Error | null;
  onSelect: (entry: DogamEntry) => void;
};

/** 내 도감: 일지의 조과에서 계산된 어종별 기록 그리드 */
export function MyDogamTab({ entries, isLoading, error, onSelect }: Props) {
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 12 }}>
          총 {entries.length}종 기록됨 · 탭하면 메모 수정 가능
        </Text>
        {isLoading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : error ? (
          <View style={styles.centerWrap}>
            <Text style={styles.errorText}>도감을 불러오지 못했어요.{'\n'}{error.message}</Text>
          </View>
        ) : entries.length === 0 ? (
          <View style={styles.centerWrap}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🎣</Text>
            <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center' }}>
              아직 기록이 없어요!{'\n'}카메라로 물고기를 찍어서{'\n'}도감에 등록해보세요 😊
            </Text>
          </View>
        ) : (
          <View style={styles.myFishGrid}>
            {entries.map((fish) => (
              <TouchableOpacity key={fish.species} style={styles.myFishGridCard} onPress={() => onSelect(fish)} activeOpacity={0.8}>
                {fish.imageUrl ? (
                  <Image source={{ uri: fish.imageUrl }} style={styles.myFishGridPhoto} resizeMode="cover" />
                ) : (
                  <View style={styles.myFishGridPhotoPlaceholder}>
                    <Text style={{ fontSize: 36 }}>🐟</Text>
                  </View>
                )}
                <View style={styles.myFishGridInfo}>
                  <Text style={styles.myFishGridName} numberOfLines={1}>{fish.species}</Text>
                  {fish.bestSizeCm !== null ? <Text style={styles.myFishGridSize}>📏 {fish.bestSizeCm}cm</Text> : null}
                  {fish.bestLocation ? <Text style={styles.myFishGridLocation} numberOfLines={1}>📍 {fish.bestLocation}</Text> : null}
                  {fish.totalCount > 1 ? <Text style={styles.myFishGridCount}>🎣 {fish.totalCount}마리</Text> : null}
                </View>
                <View style={styles.editBadge}>
                  <Text style={{ color: colors.white, fontSize: 10 }}>✏️</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}
