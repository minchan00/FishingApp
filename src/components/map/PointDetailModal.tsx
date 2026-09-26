import { ScrollView, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/ScreenHeader';
import { BottomSheet } from '@/components/ui/Sheet';
import { colors } from '@/theme/colors';
import type { FishingPoint } from '@/types/models';
import { formatDistance, type Coords } from './distance';
import { DetailRow } from '@/components/ui/Badge';

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
  const rows = point
    ? [
        { label: '거리', value: userLocation ? formatDistance(userLocation, point.lat, point.lng) : '-' },
        { label: '어종', value: point.species.join(', ') || '-' },
        ...(point.rating > 0 ? [{ label: '평점', value: String(point.rating) }] : []),
      ]
    : [];

  return (
    <BottomSheet visible={visible} onClose={onClose} title={point?.name ?? ''}>
      {point && (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="-mt-3 mb-3 flex-row items-center">
            <Text className="flex-1 text-label text-mute">
              {point.address} · {point.type}
            </Text>
            <IconButton
              icon="star"
              label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
              color={isFavorite ? colors.primary : colors.mute}
              onPress={onToggleFavorite}
            />
          </View>
          <View className="rounded-card bg-surface px-4">
            {rows.map((row, i) => (
              <DetailRow key={row.label} label={row.label} value={row.value} divider={i < rows.length - 1} />
            ))}
          </View>
          {point.memo ? (
            <View className="mt-5">
              <Text className="mb-1.5 text-label font-medium text-mute">메모</Text>
              <Text className="text-body text-ink">{point.memo}</Text>
            </View>
          ) : null}
          {canDelete && (
            <Button label="포인트 삭제" icon="trash-2" variant="danger" onPress={onDelete} loading={deleting} className="mt-6" />
          )}
        </ScrollView>
      )}
    </BottomSheet>
  );
}
