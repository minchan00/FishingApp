import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { flowText, PHASE_COLOR, PHASE_LABEL, SOURCE_LABEL, timeRange } from '@/components/release/format';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SEA_TEXT_SHADOW, SeaScreen, SeaSectionTitle } from '@/components/ui/Sea';
import { releasePhase, type ReleasePhase } from '@/data/releases';
import { useReleaseEvents, useReleaseFacilities, useReleaseSubscriptions, useToggleReleaseSubscription } from '@/hooks/queries';
import { colors } from '@/theme/colors';
import type { ReleaseEvent, ReleaseFacility } from '@/types/models';

type Filter = '관심 시설' | '전체';
const PHASE_ORDER: Record<ReleasePhase, number> = { live: 0, open: 1, upcoming: 2, ended: 3 };

function PhaseBadge({ phase }: { phase: ReleasePhase }) {
  const c = PHASE_COLOR[phase];
  return (
    <View className="flex-row items-center gap-1 rounded-full px-2.5 py-1" style={{ backgroundColor: c.bg }}>
      {phase === 'live' ? <View className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
      <Text className="text-caption font-bold" style={{ color: c.fg }}>{PHASE_LABEL[phase]}</Text>
    </View>
  );
}

/** 시설 하나: 지금 가장 중요한 일정 + 알림 토글 */
function FacilityCard({ facility, event, subscribed, onToggle }: {
  facility: ReleaseFacility;
  event: ReleaseEvent | null;
  subscribed: boolean;
  onToggle: () => void;
}) {
  const phase = event ? releasePhase(event) : null;
  const hot = phase === 'live' || phase === 'open';
  const flow = event ? flowText(event.flowCms) : null;
  return (
    <Card className={`mb-2.5 ${hot ? 'border-[1.5px] border-accent/40' : ''}`}>
      <View className="flex-row items-center gap-3">
        <View className={`h-10 w-10 items-center justify-center rounded-field ${hot ? 'bg-accent-soft' : 'bg-surface'}`}>
          <Icon name="sliders" size={18} color={hot ? colors.accentInk : colors.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-body font-bold text-ink" numberOfLines={1}>{facility.name}</Text>
          <Text className="text-caption text-mute" numberOfLines={1}>{facility.kind} · {facility.region}</Text>
        </View>
        {phase ? <PhaseBadge phase={phase} /> : null}
        <Pressable
          onPress={onToggle}
          hitSlop={8}
          accessibilityRole="switch"
          accessibilityState={{ checked: subscribed }}
          accessibilityLabel={`${facility.name} 관심 시설`}
          className="ml-1 h-9 w-9 items-center justify-center rounded-full active:bg-surface"
        >
          <Icon name={subscribed ? 'bell' : 'bell-off'} size={18} color={subscribed ? colors.primary : colors.mute} />
        </Pressable>
      </View>

      {event && phase ? (
        <View className="mt-3 flex-row rounded-field bg-surface px-1 py-2.5">
          <View className="flex-[1.6] items-center">
            <Text className="text-caption text-sub">{phase === 'live' ? '방류 시간' : phase === 'open' ? '방류 가능 기간' : '방류 시간'}</Text>
            <Text className="mt-0.5 font-serif text-[16px] leading-[22px] text-ink">{timeRange(event)}</Text>
          </View>
          {flow ? (
            <>
              <View className="w-px bg-line" />
              <View className="flex-1 items-center">
                <Text className="text-caption text-sub">{event.status === 'active' ? '방류량' : '최대 방류량'}</Text>
                <Text className="mt-0.5 font-serif text-[16px] leading-[22px] text-ink">{flow}</Text>
              </View>
            </>
          ) : null}
        </View>
      ) : (
        <Text className="mt-2.5 text-caption text-mute">예정된 방류가 없어요</Text>
      )}

      {event?.note ? <Text className="mt-2 text-caption text-sub">{event.note}</Text> : null}
      {event ? <Text className="mt-1.5 text-caption text-mute">출처: {SOURCE_LABEL[event.source]}</Text> : null}
    </Card>
  );
}

export default function ReleaseScreen() {
  const facilities = useReleaseFacilities();
  const events = useReleaseEvents();
  const subs = useReleaseSubscriptions();
  const toggle = useToggleReleaseSubscription();
  const subscribed = subs.data ?? [];
  const [filter, setFilter] = useState<Filter>(subscribed.length > 0 ? '관심 시설' : '전체');

  // 시설마다 지금 가장 중요한 일정 하나 (방류 중 > 기간 안 > 예정 > 종료)
  const eventFor = (facilityId: string): ReleaseEvent | null =>
    (events.data ?? [])
      .filter((e) => e.facilityId === facilityId)
      .sort((a, b) => PHASE_ORDER[releasePhase(a)] - PHASE_ORDER[releasePhase(b)] || Date.parse(a.startsAt) - Date.parse(b.startsAt))[0] ?? null;

  const rows = (facilities.data ?? [])
    .filter((f) => filter === '전체' || subscribed.includes(f.id))
    .map((f) => ({ facility: f, event: eventFor(f.id) }))
    .sort((a, b) =>
      (a.event ? PHASE_ORDER[releasePhase(a.event)] : 9) - (b.event ? PHASE_ORDER[releasePhase(b.event)] : 9));

  const loading = facilities.isPending || events.isPending;
  const failed = facilities.isError || events.isError;

  return (
    <SeaScreen>
      <ScreenHeader title="방류 알림" eyebrow="하굿둑·방조제 배수갑문" back />
      <ScrollView
        contentContainerClassName="px-4 pb-10"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={events.isRefetching}
            onRefresh={() => { events.refetch(); subs.refetch(); }}
            tintColor={colors.white}
            colors={[colors.primary]}
          />
        }
      >
        <View className="flex-row gap-2">
          <Chip label={`관심 시설 ${subscribed.length}`} selected={filter === '관심 시설'} onPress={() => setFilter('관심 시설')} />
          <Chip label="전체 시설" selected={filter === '전체'} onPress={() => setFilter('전체')} />
        </View>

        <View className="mt-3 flex-row items-start gap-2.5 rounded-field bg-warning-soft px-3.5 py-3">
          <Icon name="alert-triangle" size={16} color={colors.warning} />
          <Text className="flex-1 text-label leading-[19px] text-ink">
            방류 중에는 <Text className="font-bold">수문 주변 출입 금지</Text>예요. 물살이 갑자기 빨라지고 수위가 올라갈 수 있어요.
          </Text>
        </View>

        <SeaSectionTitle title={filter === '관심 시설' ? '관심 시설' : '전체 시설'} />

        {loading ? (
          <ActivityIndicator color={colors.white} size="large" className="py-10" />
        ) : failed ? (
          <EmptyState icon="alert-circle" title="방류 정보를 불러오지 못했어요." actionLabel="다시 시도" onAction={() => { facilities.refetch(); events.refetch(); }} />
        ) : rows.length === 0 ? (
          <EmptyState icon="bell" title="관심 시설이 없어요" description="전체 시설에서 종 모양을 눌러 추가하세요" actionLabel="전체 시설 보기" onAction={() => setFilter('전체')} />
        ) : (
          rows.map(({ facility, event }) => (
            <FacilityCard
              key={facility.id}
              facility={facility}
              event={event}
              subscribed={subscribed.includes(facility.id)}
              onToggle={() => toggle.mutate({ facilityId: facility.id, on: !subscribed.includes(facility.id) })}
            />
          ))
        )}

        <Text className="mt-2 px-1 text-caption leading-[17px] text-white/75" style={SEA_TEXT_SHADOW}>
          방류 기간은 기관이 승인한 기간이에요. 이 기간 안에서 물때에 맞춰 수문을 여닫기 때문에 실제 방류 시각과 다를 수 있어요.
        </Text>
      </ScrollView>
    </SeaScreen>
  );
}
