import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Icon } from '@/components/ui/Icon';
import { colors } from '@/theme/colors';
import type { Catch, FishingLog } from '@/types/models';
import { formatKoreanDate, weatherText } from './format';

const RATING_BADGE: Record<FishingLog['rating'], { box: string; text: string }> = {
  대박: { box: 'bg-primary-soft', text: 'text-primary' },
  보통: { box: 'bg-surface', text: 'text-sub' },
  꽝: { box: 'bg-surface', text: 'text-mute' },
};

/** 등급 배지 (대박/보통/꽝) */
export function RatingBadge({ rating }: { rating: FishingLog['rating'] }) {
  const style = RATING_BADGE[rating];
  return (
    <View className={`rounded-full px-2 py-0.5 ${style.box}`}>
      <Text className={`text-caption font-semibold ${style.text}`}>{rating}</Text>
    </View>
  );
}

/** '광어 45cm ×2' */
export const catchLabel = (c: Catch) => `${c.species}${c.sizeCm !== null ? ` ${c.sizeCm}cm` : ''}${c.count > 1 ? ` ×${c.count}` : ''}`;

type Props = {
  log: FishingLog;
  onPress: (id: number) => void;
};

/** 일지 목록 한 줄 */
export const LogCard = memo(function LogCard({ log, onPress }: Props) {
  const totalCount = log.catches.reduce((s, c) => s + c.count, 0);
  return (
    <Pressable className="mx-4 mb-2.5 flex-row gap-3 rounded-card bg-card px-4 py-4 active:opacity-80" onPress={() => onPress(log.id)}>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-caption text-mute">{formatKoreanDate(log.fishedOn)}</Text>
          <RatingBadge rating={log.rating} />
        </View>
        <Text className="mt-1 text-heading text-ink" numberOfLines={1}>
          {log.location}
        </Text>

        <View className="mt-1 flex-row flex-wrap items-center gap-x-3 gap-y-1">
          <Text className="text-label text-sub">{weatherText(log.weather)}</Text>
          {log.duration ? (
            <View className="flex-row items-center gap-1">
              <Icon name="clock" size={13} color={colors.mute} />
              <Text className="text-label text-sub">{log.duration}시간</Text>
            </View>
          ) : null}
          <View className="flex-row items-center gap-1">
            <Icon name="fish" size={13} color={colors.mute} />
            <Text className="text-label text-sub">{totalCount}마리</Text>
          </View>
        </View>

        {log.catches.length > 0 && (
          <View className="mt-2 flex-row flex-wrap gap-1.5">
            {log.catches.map((c, i) => (
              <View key={i} className="rounded-md bg-surface px-2 py-1">
                <Text className="text-caption text-sub">{catchLabel(c)}</Text>
              </View>
            ))}
          </View>
        )}

        {log.memo ? (
          <Text className="mt-2 text-label text-mute" numberOfLines={2}>
            {log.memo}
          </Text>
        ) : null}
      </View>

      {log.imageUrl ? (
        <Image
          source={{ uri: log.imageUrl }}
          style={{ width: 72, height: 72, borderRadius: 12, backgroundColor: colors.surface }}
          contentFit="cover"
          transition={200}
        />
      ) : null}
    </Pressable>
  );
});
