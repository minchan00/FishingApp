import { ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/Sheet';
import type { FishingLog } from '@/types/models';
import { formatKoreanDate } from './format';
import { RatingBadge } from './LogCard';

type Props = {
  log: FishingLog | null;
  visible: boolean;
  onClose: () => void;
  onEdit: (log: FishingLog) => void;
  onDelete: (log: FishingLog) => void;
};

export function LogDetailModal({ log, visible, onClose, onEdit, onDelete }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={log ? log.location : undefined} maxHeightClass="max-h-[92%]">
      {log && (
        <>
          <View className="-mt-2 mb-4 flex-row flex-wrap items-center gap-2">
            <Text className="text-label text-mute">
              {formatKoreanDate(log.fishedOn)} · {log.weather}
              {log.duration ? ` · ${log.duration}시간` : ''}
            </Text>
            <RatingBadge rating={log.rating} />
          </View>

          <ScrollView className="shrink" showsVerticalScrollIndicator={false}>
            {log.imageUrl && (
              <Image
                source={{ uri: log.imageUrl }}
                style={{ width: '100%', height: 220, borderRadius: 16, marginBottom: 20 }}
                contentFit="cover"
                transition={200}
              />
            )}

            {log.catches.length > 0 && (
              <View className="mb-6">
                <Text className="mb-1 text-label font-medium text-mute">어획 기록</Text>
                {log.catches.map((c, i) => (
                  <View key={i} className="flex-row justify-between border-b border-line py-3">
                    <Text className="text-body text-ink">{c.species}</Text>
                    <Text className="text-body text-sub">
                      {c.sizeCm !== null ? `${c.sizeCm}cm ` : ''}
                      {c.count > 1 ? `×${c.count}` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {log.memo ? (
              <View className="mb-6">
                <Text className="mb-2 text-label font-medium text-mute">메모</Text>
                <View className="rounded-card bg-surface p-4">
                  <Text className="text-body text-ink">{log.memo}</Text>
                </View>
              </View>
            ) : null}
          </ScrollView>

          <View className="mt-2 flex-row gap-2">
            <Button label="수정" icon="edit-3" variant="secondary" onPress={() => onEdit(log)} className="flex-1" />
            <Button label="일지 삭제" icon="trash-2" variant="danger" onPress={() => onDelete(log)} className="flex-1" />
          </View>
        </>
      )}
    </BottomSheet>
  );
}
