import { memo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import type { FishingLog } from '@/types/models';
import { formatKoreanDate } from './format';

const ratingLabel = (rating: FishingLog['rating']) =>
  rating === '대박' ? '🏆 대박' : rating === '보통' ? '😊 보통' : '😔 꽝';

type Props = {
  log: FishingLog;
  onPress: (id: number) => void;
};

/** 일지 목록 한 줄 */
export const LogCard = memo(function LogCard({ log, onPress }: Props) {
  return (
    <TouchableOpacity
      className="mb-2.5 overflow-hidden rounded-[14px] border border-card-border bg-card"
      onPress={() => onPress(log.id)}
      activeOpacity={0.8}
    >
      <View className="flex-row items-center justify-between bg-ocean-surface/40 px-3.5 py-2.5">
        <Text className="text-[13px] font-medium text-white">
          {formatKoreanDate(log.fishedOn)} · {log.location}
        </Text>
        <Text className="text-[12px] text-accent">{ratingLabel(log.rating)}</Text>
      </View>
      <View className="p-3.5">
        <View className="mb-2 flex-row">
          <Text className="text-[12px] text-muted">{log.weather}</Text>
          {log.duration ? <Text className="ml-3 text-[12px] text-muted">⏰ {log.duration}시간</Text> : null}
          <Text className="ml-3 text-[12px] text-muted">🎣 {log.catches.reduce((s, c) => s + c.count, 0)}마리</Text>
        </View>
        {log.catches.length > 0 && (
          <View className="flex-row flex-wrap">
            {log.catches.map((c, i) => (
              <View key={i} className="mb-1 mr-1.5 rounded-md border border-ocean-light bg-ocean-light/20 px-2 py-[3px]">
                <Text className="text-[11px] text-ocean-light">
                  {c.species} {c.sizeCm !== null ? `${c.sizeCm}cm` : ''} {c.count > 1 ? `x${c.count}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}
        {log.memo ? (
          <Text className="mt-2 text-[12px] leading-[18px] text-muted" numberOfLines={2}>
            {log.memo}
          </Text>
        ) : null}
        {log.imageUrl ? (
          <Image
            source={{ uri: log.imageUrl }}
            style={{ width: '100%', height: 160, borderRadius: 10, marginTop: 8 }}
            contentFit="cover"
            transition={200}
          />
        ) : null}
      </View>
    </TouchableOpacity>
  );
});
