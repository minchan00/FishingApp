import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon, type IconName } from '@/components/ui/Icon';
import { colors } from '@/theme/colors';
import type { DogamEntry } from '@/types/models';

type Props = {
  entries: DogamEntry[];
  isLoading: boolean;
  error: Error | null;
  onSelect: (entry: DogamEntry) => void;
};

function Meta({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View className="mt-1 flex-row items-center gap-1">
      <Icon name={icon} size={12} color={colors.mute} />
      <Text className="flex-1 text-caption text-mute" numberOfLines={1}>{text}</Text>
    </View>
  );
}

/** 내 도감: 일지의 조과에서 계산된 어종별 기록 그리드 */
export function MyDogamTab({ entries, isLoading, error, onSelect }: Props) {
  const data = isLoading || error ? [] : entries;

  return (
    <FlashList
      data={data}
      numColumns={2}
      keyExtractor={(fish) => fish.species}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4 }}
      ListHeaderComponent={
        <Text className="mb-3 text-label text-mute">총 {entries.length}종 기록됨 · 탭하면 메모 수정 가능</Text>
      }
      ListEmptyComponent={
        isLoading ? (
          <View className="items-center py-14">
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : error ? (
          <EmptyState icon="alert-circle" title="도감을 불러오지 못했어요." description={error.message} />
        ) : (
          <EmptyState icon="book-open" title="아직 기록이 없어요!" description={'카메라로 물고기를 찍어서\n도감에 등록해보세요'} />
        )
      }
      ListFooterComponent={<View className="h-[30px]" />}
      renderItem={({ item: fish, index }) => (
        // 열 너비가 50%씩이므로 카드 96%(= 전체의 48%)를 양 끝에 붙여 두 카드 사이 간격을 만든다
        <Pressable
          className={`mb-3 w-[96%] overflow-hidden rounded-card border border-line bg-bg active:opacity-70 ${index % 2 === 0 ? 'self-start' : 'self-end'}`}
          onPress={() => onSelect(fish)}
        >
          {fish.imageUrl ? (
            <Image source={{ uri: fish.imageUrl }} style={{ width: '100%', height: 110 }} contentFit="cover" transition={200} />
          ) : (
            <View className="h-[110px] w-full items-center justify-center bg-surface">
              <Icon name="fish" size={34} color={colors.mute} />
            </View>
          )}
          <View className="p-3">
            <Text className="text-body font-semibold text-ink" numberOfLines={1}>{fish.species}</Text>
            {fish.bestSizeCm !== null ? <Meta icon="maximize-2" text={`${fish.bestSizeCm}cm`} /> : null}
            {fish.bestLocation ? <Meta icon="map-pin" text={fish.bestLocation} /> : null}
            {fish.totalCount > 1 ? <Meta icon="hash" text={`${fish.totalCount}마리`} /> : null}
          </View>
          <View className="absolute right-2 top-2 h-7 w-7 items-center justify-center rounded-full border border-line bg-bg">
            <Icon name="edit-2" size={13} color={colors.sub} />
          </View>
        </Pressable>
      )}
    />
  );
}
