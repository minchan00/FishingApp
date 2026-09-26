import { Image } from 'expo-image';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import type { TaxonResult } from './inaturalist';
import { CloseX, cls, DetailRow, SheetModal } from './ui';

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
    <SheetModal visible={fish !== null} onClose={onClose}>
      <View className={cls.modalHeader}>
        <View className="flex-1">
          <Text className={cls.modalTitle}>{fish?.name}</Text>
          <Text className="text-[rgba(255,255,255,0.4)] text-[11px] mt-[2px] italic">{fish?.scientific}</Text>
        </View>
        <CloseX onPress={onClose} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {fish?.photoUrl ? (
          <View className="mb-[12px]">
            <Image
              source={{ uri: fish.photoUrl }}
              style={{ width: '100%', height: 220, borderRadius: 12 }}
              contentFit="cover"
              transition={200}
            />
            {fish.photoAttr ? (
              <Text className="text-[rgba(255,255,255,0.25)] text-[9px] text-center mt-[4px]">📸 {fish.photoAttr}</Text>
            ) : null}
          </View>
        ) : null}
        <View className={cls.infoSection}>
          <Text className={cls.infoSectionTitle}>📋 분류 정보</Text>
          {rows.map((item) => (
            <DetailRow key={item.label} label={item.label} value={item.value} italic={item.label === '학명'} />
          ))}
        </View>
        <Text className="text-[rgba(255,255,255,0.25)] text-[10px] text-center mt-[4px]">📚 iNaturalist</Text>
      </ScrollView>
      <TouchableOpacity className={`${cls.closeBtn} mt-[4px]`} onPress={onClose}>
        <Text className={cls.btnText}>닫기</Text>
      </TouchableOpacity>
    </SheetModal>
  );
}
