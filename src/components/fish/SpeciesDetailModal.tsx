import { Image } from 'expo-image';
import { ScrollView, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/Sheet';
import type { TaxonResult } from './inaturalist';
import { DetailRow } from '@/components/ui/Badge';

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
    <BottomSheet visible={fish !== null} onClose={onClose} title={fish?.name ?? ''}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {fish?.scientific ? <Text className="-mt-3 mb-4 text-caption italic text-mute">{fish.scientific}</Text> : null}
        {fish?.photoUrl ? (
          <View className="mb-4">
            <Image
              source={{ uri: fish.photoUrl }}
              style={{ width: '100%', height: 220, borderRadius: 12 }}
              contentFit="cover"
              transition={200}
            />
            {fish.photoAttr ? (
              <Text className="mt-1 text-center text-[10px] text-mute">{fish.photoAttr}</Text>
            ) : null}
          </View>
        ) : null}
        <Text className="mb-1 text-label font-medium text-mute">분류 정보</Text>
        <View className="rounded-card bg-surface px-4">
          {rows.map((item, i) => (
            <DetailRow key={item.label} label={item.label} value={item.value} italic={item.label === '학명'} divider={i < rows.length - 1} />
          ))}
        </View>
        <Text className="mt-2 text-center text-caption text-mute">iNaturalist</Text>
      </ScrollView>
      <Button label="닫기" variant="secondary" onPress={onClose} className="mt-4" />
    </BottomSheet>
  );
}
