import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@/theme/colors';
import type { FishingPoint } from '@/types/models';
import { formatDistance, type Coords } from './distance';
import { CloseX, cls, DetailRow, SheetModal } from './ui';

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
    <SheetModal visible={visible} onClose={onClose}>
      {point && (
        <>
          <View className={cls.modalHeader}>
            <View className="flex-1">
              <Text className={cls.modalTitle}>{point.name}</Text>
              <Text className="text-muted text-[12px] mt-[2px]">
                {point.address} · {point.type}
              </Text>
            </View>
            <TouchableOpacity onPress={onToggleFavorite} className="mr-[12px]">
              <Text className="text-[24px]">{isFavorite ? '⭐' : '☆'}</Text>
            </TouchableOpacity>
            <CloseX onPress={onClose} />
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <DetailRow label="📍 거리" value={userLocation ? formatDistance(userLocation, point.lat, point.lng) : '-'} />
            <DetailRow label="🎣 어종" value={point.species.join(', ') || '-'} />
            {point.rating > 0 && <DetailRow label="⭐ 평점" value={String(point.rating)} />}
            {point.memo ? (
              <View className="mt-[12px]">
                <Text className="text-white text-[13px] font-semibold mb-[8px]">📝 메모</Text>
                <Text className="text-[rgba(255,255,255,0.85)] text-[13px] leading-[20px]">{point.memo}</Text>
              </View>
            ) : null}
            {canDelete && (
              <TouchableOpacity
                className="bg-[rgba(224,92,26,0.2)] border border-accent-2 rounded-[12px] p-[14px] items-center mt-[16px]"
                onPress={onDelete}
                disabled={deleting}
              >
                {deleting ? <ActivityIndicator color={colors.accent2} /> : <Text className="text-accent-2 text-[14px] font-semibold">🗑️ 포인트 삭제</Text>}
              </TouchableOpacity>
            )}
          </ScrollView>
        </>
      )}
    </SheetModal>
  );
}
