import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { PHASE_LABEL, timeRange } from '@/components/release/format';
import { Icon } from '@/components/ui/Icon';
import { pickReleaseHighlight, releasePhase } from '@/data/releases';
import { useReleaseEvents, useReleaseFacilities, useReleaseSubscriptions } from '@/hooks/queries';
import { colors } from '@/theme/colors';

/** 홈의 방류 한 줄 배너. 방류 중·기간 안·3일 안 예정이 없으면 "방류 알림" 입구만 작게 보여준다 */
export default function ReleaseBanner() {
  const events = useReleaseEvents();
  const facilities = useReleaseFacilities();
  const subs = useReleaseSubscriptions();

  const highlight = pickReleaseHighlight(events.data ?? [], subs.data ?? []);
  const facility = highlight ? facilities.data?.find((f) => f.id === highlight.facilityId) : undefined;
  const phase = highlight ? releasePhase(highlight) : null;
  const hot = phase === 'live' || phase === 'open';

  return (
    <Pressable
      onPress={() => router.push('/release')}
      accessibilityRole="button"
      className={`mt-3 flex-row items-center gap-2.5 rounded-field px-3.5 py-3 active:opacity-80 ${hot ? 'bg-accent-soft' : 'bg-card'}`}
    >
      <Icon name="sliders" size={18} color={hot ? colors.accentInk : colors.primary} />
      {highlight && facility && phase ? (
        <Text className="flex-1 text-label text-ink" numberOfLines={1}>
          <Text className={`font-bold ${hot ? 'text-accent-ink' : 'text-primary'}`}>{PHASE_LABEL[phase]}</Text>
          {` · ${facility.name} ${timeRange(highlight)}`}
        </Text>
      ) : (
        <Text className="flex-1 text-label text-sub">방류 알림 · 하굿둑·방조제 방류 일정 보기</Text>
      )}
      <Icon name="chevron-right" size={16} color={hot ? colors.accentInk : colors.mute} />
    </Pressable>
  );
}
