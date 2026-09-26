import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@/theme/colors';
import type { DogamEntry } from '@/types/models';
import { cls } from './ui';

type Props = {
  entries: DogamEntry[];
  isLoading: boolean;
  error: Error | null;
  onSelect: (entry: DogamEntry) => void;
};

/** 내 도감: 일지의 조과에서 계산된 어종별 기록 그리드 */
export function MyDogamTab({ entries, isLoading, error, onSelect }: Props) {
  const data = isLoading || error ? [] : entries;

  return (
    <FlashList
      data={data}
      numColumns={2}
      keyExtractor={(fish) => fish.species}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
      ListHeaderComponent={
        <Text className="text-muted text-[12px] mb-[12px]">총 {entries.length}종 기록됨 · 탭하면 메모 수정 가능</Text>
      }
      ListEmptyComponent={
        isLoading ? (
          <View className={cls.centerWrap}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : error ? (
          <View className={cls.centerWrap}>
            <Text className={cls.errorText}>도감을 불러오지 못했어요.{'\n'}{error.message}</Text>
          </View>
        ) : (
          <View className={cls.centerWrap}>
            <Text className="text-[48px] mb-[12px]">🎣</Text>
            <Text className="text-muted text-[14px] text-center">
              아직 기록이 없어요!{'\n'}카메라로 물고기를 찍어서{'\n'}도감에 등록해보세요 😊
            </Text>
          </View>
        )
      }
      ListFooterComponent={<View className="h-[30px]" />}
      renderItem={({ item: fish, index }) => (
        // 열 너비가 50%씩이므로 카드 96%(= 전체의 48%)를 양 끝에 붙여 원래 space-between 간격을 재현한다
        <TouchableOpacity
          className={`w-[96%] bg-card border border-card-border rounded-[14px] mb-[12px] overflow-hidden ${index % 2 === 0 ? 'self-start' : 'self-end'}`}
          onPress={() => onSelect(fish)}
          activeOpacity={0.8}
        >
          {fish.imageUrl ? (
            <Image source={{ uri: fish.imageUrl }} style={{ width: '100%', height: 110 }} contentFit="cover" transition={200} />
          ) : (
            <View className="w-full h-[110px] bg-[rgba(255,255,255,0.05)] items-center justify-center">
              <Text className="text-[36px]">🐟</Text>
            </View>
          )}
          <View className="p-[10px]">
            <Text className="text-white text-[14px] font-semibold" numberOfLines={1}>{fish.species}</Text>
            {fish.bestSizeCm !== null ? <Text className="text-accent text-[12px] mt-[3px]">📏 {fish.bestSizeCm}cm</Text> : null}
            {fish.bestLocation ? <Text className="text-muted text-[11px] mt-[2px]" numberOfLines={1}>📍 {fish.bestLocation}</Text> : null}
            {fish.totalCount > 1 ? <Text className="text-ocean-light text-[11px] mt-[2px]">🎣 {fish.totalCount}마리</Text> : null}
          </View>
          <View className="absolute top-[8px] right-[8px] bg-[rgba(0,0,0,0.5)] rounded-[12px] w-[24px] h-[24px] items-center justify-center">
            <Text className="text-white text-[10px]">✏️</Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}
