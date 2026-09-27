import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { RatingBadge } from '@/components/log/LogCard';
import { formatKoreanDate } from '@/components/log/format';
import { Card } from '@/components/ui/Card';
import { SeaSectionTitle } from '@/components/ui/Sea';
import { useLogs } from '@/hooks/queries';

/** 홈의 "최근 기록": 최근 일지 두 개와 전체 보기 */
export default function RecentLogs() {
  const logs = useLogs();
  const recent = (logs.data ?? []).slice(0, 2);

  return (
    <View>
      <SeaSectionTitle title="최근 기록" action="전체 보기" onAction={() => router.push('/log')} />
      <Card className="py-1">
        {recent.length === 0 ? (
          <Pressable onPress={() => router.push('/log')} className="py-3 active:opacity-70">
            <Text className="text-label text-mute">아직 기록이 없어요. 첫 낚시를 기록해 보세요.</Text>
          </Pressable>
        ) : (
          recent.map((log, i) => {
            const total = log.catches.reduce((sum, c) => sum + c.count, 0);
            const species = log.catches.map((c) => c.species).join(', ');
            return (
              <Pressable
                key={log.id}
                onPress={() => router.push('/log')}
                className={`flex-row items-center gap-3 py-3 active:opacity-70 ${i < recent.length - 1 ? 'border-b border-line' : ''}`}
              >
                <View className="flex-1">
                  <Text className="text-body font-semibold text-ink" numberOfLines={1}>{log.location}</Text>
                  <Text className="mt-0.5 text-caption text-mute" numberOfLines={1}>
                    {formatKoreanDate(log.fishedOn)}
                    {total > 0 ? ` · ${species} ${total}마리` : ' · 조과 없음'}
                  </Text>
                </View>
                <RatingBadge rating={log.rating} />
              </Pressable>
            );
          })
        )}
      </Card>
    </View>
  );
}
