import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import CatchBanner from '@/components/home/CatchBanner';
import RecentLogs from '@/components/home/RecentLogs';
import ReleaseBanner from '@/components/home/ReleaseBanner';
import ObsPickerModal from '@/components/home/ObsPickerModal';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { IconButton, ScreenHeader } from '@/components/ui/ScreenHeader';
import { SeaScreen, SeaSectionTitle } from '@/components/ui/Sea';
import { AppModal } from '@/components/ui/Sheet';
import WeatherDetailModal from '@/components/WeatherDetailModal';
import {
  DEFAULT_OBS, getConditionIcon, getCurrentTideSlice, getFishingScore,
  getScoreGrade, kstHourNow, kstYmd, locateNearestObs, tideHour, tideTime, type ObsStation, type TideEvent, type TideItem,
} from '@/data/weather';
import { useCurrentWeather, useTide, useTideForecastWeek } from '@/hooks/useWeather';
import { colors } from '@/theme/colors';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** '9월 28일 일요일' (한국 시간 기준) */
function todayLabel(now = Date.now()): string {
  const kst = new Date(now + 9 * 60 * 60 * 1000);
  return `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일 ${WEEKDAYS[kst.getUTCDay()]}요일`;
}

/** 지금 이후 가장 가까운 만조 */
function nextHighTide(events: TideEvent[], now = Date.now()): TideEvent | null {
  return events.filter((e) => e.type === '만조' && e.at > now).sort((a, b) => a.at - b.at)[0] ?? null;
}

/** '1시간 5분 후' */
function untilLabel(at: number, now = Date.now()): string {
  const min = Math.max(0, Math.round((at - now) / 60000));
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}분 후`;
  return m === 0 ? `${h}시간 후` : `${h}시간 ${m}분 후`;
}

/** 실측값이 있으면 실측, 없으면 예측 조위(cm) */
const tideLevel = (item: TideItem): number | null => {
  const raw = item.bscTdlvHgt ?? item.tdlvHgt;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

/** 오늘의 조위: 시간별 높이를 작은 막대로 */
function TideStrip({ items, nowHour }: { items: TideItem[]; nowHour: number }) {
  const levels = items.map(tideLevel);
  const known = levels.filter((n): n is number => n !== null);
  const min = known.length > 0 ? Math.min(...known) : 0;
  const max = known.length > 0 ? Math.max(...known) : 0;
  const range = max - min || 1;

  return (
    <View className="flex-row items-end justify-between">
      {items.map((item, i) => {
        const level = levels[i] ?? null;
        const isCurrent = tideHour(item) === nowHour;
        // 가장 낮은 값도 막대가 보이도록 최소 높이를 둔다
        const barHeight = level === null ? 4 : 8 + ((level - min) / range) * 32;
        return (
          <View key={`${item.obsrvnDt ?? i}`} className="flex-1 items-center">
            <View className="h-10 justify-end">
              <View
                className={`w-2.5 rounded-full ${isCurrent ? 'bg-accent' : 'bg-primary-soft'}`}
                style={{ height: barHeight }}
              />
            </View>
            <Text className={`mt-1 text-caption ${isCurrent ? 'font-semibold text-accent-ink' : 'text-mute'}`}>{tideTime(item)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function SmallAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={(e) => { e.stopPropagation(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-8 flex-row items-center gap-1 rounded-full bg-surface px-2.5 active:bg-surface-strong"
    >
      <Icon name={icon} size={14} color={colors.sub} />
      <Text className="text-caption font-medium text-sub">{label}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  // null이면 아직 위치를 확인 중 — 그동안은 조회하지 않는다
  const [selectedObs, setSelectedObs] = useState<ObsStation | null>(null);
  const [locating, setLocating] = useState(false);
  const weather = useCurrentWeather(selectedObs);
  const tide = useTide(selectedObs);
  const tideForecast = useTideForecastWeek(selectedObs);
  const obs = selectedObs ?? DEFAULT_OBS;

  const [obsModal, setObsModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);

  useEffect(() => {
    locateNearestObs()
      .catch((e: unknown) => { console.error('위치 오류:', e); return null; })
      .then((nearest) => setSelectedObs(nearest ?? DEFAULT_OBS));
  }, []);

  const autoSelectObs = async () => {
    setObsModal(false);
    setLocating(true);
    try {
      const nearest = await locateNearestObs();
      if (nearest) setSelectedObs(nearest);
    } catch (e) {
      console.error('위치 오류:', e);
    } finally {
      setLocating(false);
    }
  };

  const changeObs = (next: ObsStation) => {
    setObsModal(false);
    setSelectedObs(next);
  };

  const refetchAll = () => { weather.refetch(); tide.refetch(); tideForecast.refetch(); };

  const renderCards = () => {
    if (locating || weather.isPending || tide.isPending || tideForecast.isPending) {
      return (
        <Card className="flex-row items-center gap-3">
          <ActivityIndicator color={colors.primary} />
          <Text className="text-label text-mute">날씨와 물때를 불러오는 중...</Text>
        </Card>
      );
    }
    if (!weather.data) {
      return (
        <Card className="flex-row items-center gap-3">
          <Icon name="cloud-off" size={20} color={colors.mute} />
          <Text className="flex-1 text-label text-mute">날씨 정보를 불러올 수 없어요</Text>
          <Pressable onPress={refetchAll} className="px-2 py-1" accessibilityRole="button">
            <Text className="text-label font-semibold text-primary">다시 시도</Text>
          </Pressable>
        </Card>
      );
    }

    const w = weather.data;
    // 조위는 실패해도 날씨는 보여준다
    const tideItems = tide.data && tide.data.length > 0 ? tide.data : null;
    const temp = Math.round(w.main.temp);
    const windSpeed = Math.round(w.wind.speed);
    // 고조·저조는 예보 API 기준. 자정 전후 물때도 잡도록 점수에는 5일치 전체를 넘긴다.
    const forecastWeek = tideForecast.data ?? {};
    const allTideEvents = Object.values(forecastWeek).flat();
    const lowTides = (forecastWeek[kstYmd()] ?? []).filter((e) => e.type === '간조');
    const next = nextHighTide(allTideEvents);
    const score = getFishingScore(w.wind.speed, allTideEvents.length > 0 ? allTideEvents : null);
    const grade = getScoreGrade(score);
    const tideSlice = tideItems ? getCurrentTideSlice(tideItems) : [];
    const nowHour = kstHourNow();

    return (
      <>
        {/* 물때: 다음 만조를 크게 */}
        <Card onPress={() => setDetailModal(true)}>
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-label text-sub">다음 만조</Text>
              <Text className="mt-0.5 font-serif text-[36px] leading-[44px] text-ink">{next ? next.time : '--:--'}</Text>
              {next ? (
                <Text className="text-label font-semibold text-accent-ink">{untilLabel(next.at)} · {next.height}cm</Text>
              ) : (
                <Text className="text-label text-mute">물때 예보가 없어요</Text>
              )}
            </View>
            <View className="flex-row gap-1.5">
              <SmallAction icon="navigation" label="내 위치" onPress={autoSelectObs} />
              <SmallAction icon="search" label="검색" onPress={() => setObsModal(true)} />
            </View>
          </View>

          <View className="mt-4">
            {tideSlice.length > 0 ? (
              <TideStrip items={tideSlice} nowHour={nowHour} />
            ) : (
              <Text className="py-2 text-center text-caption text-mute">조위 데이터가 없어요</Text>
            )}
          </View>

          <View className="mt-3.5 flex-row items-center gap-2">
            <View className="flex-1 flex-row items-center justify-between rounded-field bg-surface px-3 py-2.5">
              <Text className="text-caption text-sub">간조</Text>
              <Text className="text-label font-semibold text-ink">
                {lowTides.length > 0 ? lowTides.map((e) => e.time).join(' · ') : '-'}
              </Text>
            </View>
            <View className="flex-row items-center gap-0.5 px-1">
              <Text className="text-label font-medium text-primary">상세</Text>
              <Icon name="chevron-right" size={16} color={colors.primary} />
            </View>
          </View>
        </Card>

        {/* 낚시 지수 + 날씨 */}
        <View className="mt-3 flex-row gap-3">
          <Card className="flex-[1.3]">
            <Text className="text-label text-sub">낚시 지수</Text>
            <View className="mt-1 flex-row items-baseline gap-1">
              <Text className="font-serif text-[30px] leading-[38px] text-ink">{score}</Text>
              <Text className="text-caption text-mute">/ 100</Text>
            </View>
            <View className="mt-1 self-start rounded-full px-2.5 py-1" style={{ backgroundColor: grade.soft }}>
              <Text className="text-caption font-semibold" style={{ color: grade.color }}>{grade.label}</Text>
            </View>
            <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
              <View className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, score))}%`, backgroundColor: grade.color }} />
            </View>
          </Card>
          <Card className="flex-1 justify-between">
            <View className="flex-row items-center justify-between">
              <Icon name={getConditionIcon(w.weather[0]?.main)} size={22} color={colors.primary} />
              <Text className="font-serif text-[24px] leading-[30px] text-ink">{temp}°</Text>
            </View>
            <View className="mt-2 gap-1.5">
              <View className="flex-row justify-between"><Text className="text-caption text-sub">바람</Text><Text className="text-label font-semibold text-ink">{windSpeed}m/s</Text></View>
              <View className="flex-row justify-between"><Text className="text-caption text-sub">습도</Text><Text className="text-label font-semibold text-ink">{w.main.humidity}%</Text></View>
            </View>
          </Card>
        </View>
      </>
    );
  };

  return (
    <SeaScreen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-8" bounces={false}>
        <ScreenHeader
          eyebrow={todayLabel()}
          title={obs.name}
          right={<IconButton icon="menu" label="설정" onPress={() => router.push('/settings')} />}
        />
        <View className="px-4">
          {renderCards()}
          <ReleaseBanner />
          <SeaSectionTitle title="오늘의 인증샷" action="커뮤니티" onAction={() => router.push('/community')} />
          <CatchBanner />
          <RecentLogs />
        </View>
      </ScrollView>

      {/* 일자별 상세 예보 모달 */}
      <AppModal visible={detailModal} animationType="slide" onRequestClose={() => setDetailModal(false)}>
        <WeatherDetailModal obs={obs} onClose={() => setDetailModal(false)} />
      </AppModal>

      {/* 관측소 선택 모달 */}
      <ObsPickerModal
        visible={obsModal}
        selected={obs}
        onSelect={changeObs}
        onAutoSelect={autoSelectObs}
        onClose={() => setObsModal(false)}
      />
    </SeaScreen>
  );
}
