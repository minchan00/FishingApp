import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import ObsPickerModal from '@/components/home/ObsPickerModal';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { IconButton, ScreenHeader } from '@/components/ui/ScreenHeader';
import { AppModal } from '@/components/ui/Sheet';
import WeatherDetailModal from '@/components/WeatherDetailModal';
import {
  DEFAULT_OBS, getConditionIcon, getCurrentTideSlice, getFishingScore,
  getScoreGrade, kstHourNow, kstYmd, locateNearestObs, tideHour, tideTime, type ObsStation, type TideItem,
} from '@/data/weather';
import { useProfile } from '@/hooks/queries';
import { useCurrentWeather, useTide, useTideForecastWeek } from '@/hooks/useWeather';
import { colors } from '@/theme/colors';

const QUICK_ACTIONS: { icon: IconName; title: string; sub: string; href: Href }[] = [
  { icon: 'map-pin', title: '낚시 포인트', sub: '내 주변 명소', href: '/map' },
  { icon: 'book-open', title: '낚시 일지', sub: '기록 & 추억', href: '/log' },
  { icon: 'fish', title: '어종 도감', sub: '어종 & 공략법', href: '/fish' },
  { icon: 'users', title: '커뮤니티', sub: '낚시인 모임', href: '/community' },
];

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
            <Text className={`mb-1 text-caption ${isCurrent ? 'font-semibold text-primary' : 'text-sub'}`}>
              {level === null ? '-' : Math.round(level)}
            </Text>
            <View className="h-10 justify-end">
              <View
                className={`w-2.5 rounded-full ${isCurrent ? 'bg-primary' : 'bg-surface-strong'}`}
                style={{ height: barHeight }}
              />
            </View>
            <Text className={`mt-1 text-caption ${isCurrent ? 'font-semibold text-primary' : 'text-mute'}`}>{tideTime(item)}</Text>
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
      className="h-8 flex-row items-center gap-1 rounded-full bg-bg px-2.5 active:bg-surface-strong"
    >
      <Icon name={icon} size={14} color={colors.sub} />
      <Text className="text-caption font-medium text-sub">{label}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const profile = useProfile();
  const userNickname = profile.data?.nickname || '낚시꾼';

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

  const renderWeatherCard = () => {
    if (locating || weather.isPending || tide.isPending || tideForecast.isPending) {
      return (
        <Card className="items-center py-10">
          <ActivityIndicator color={colors.primary} />
          <Text className="mt-3 text-label text-mute">날씨 & 조위 불러오는 중...</Text>
        </Card>
      );
    }
    if (!weather.data) {
      return (
        <Card className="items-center py-10">
          <Icon name="cloud-off" size={24} color={colors.mute} />
          <Text className="mt-2 text-label text-mute">날씨 정보를 불러올 수 없어요</Text>
          <Pressable onPress={refetchAll} className="mt-2 px-3 py-1.5" accessibilityRole="button">
            <Text className="text-label font-semibold text-primary">다시 시도</Text>
          </Pressable>
        </Card>
      );
    }

    const w = weather.data;
    // 조위는 실패해도 날씨는 보여준다
    const tideItems = tide.data && tide.data.length > 0 ? tide.data : null;
    const temp = Math.round(w.main.temp);
    const tempMin = Math.round(w.main.temp_min);
    const tempMax = Math.round(w.main.temp_max);
    const feelsLike = Math.round(w.main.feels_like);
    const windSpeed = Math.round(w.wind.speed);
    // 고조·저조는 예보 API 기준. 자정 전후 물때도 잡도록 점수에는 5일치 전체를 넘긴다.
    const forecastWeek = tideForecast.data ?? {};
    const allTideEvents = Object.values(forecastWeek).flat();
    const tideEvents = forecastWeek[kstYmd()] ?? [];
    const score = getFishingScore(w.wind.speed, allTideEvents.length > 0 ? allTideEvents : null);
    const grade = getScoreGrade(score);
    const tideSlice = tideItems ? getCurrentTideSlice(tideItems) : [];
    const nowHour = kstHourNow();

    return (
      <Card onPress={() => setDetailModal(true)}>
        {/* 위치 & 버튼 */}
        <View className="mb-3 flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center gap-1">
            <Icon name="map-pin" size={14} color={colors.mute} />
            <Text className="text-label font-medium text-sub" numberOfLines={1}>{obs.name}</Text>
          </View>
          <View className="flex-row gap-1.5">
            <SmallAction icon="navigation" label="내 위치" onPress={autoSelectObs} />
            <SmallAction icon="search" label="검색" onPress={() => setObsModal(true)} />
          </View>
        </View>

        {/* 기온 & 날씨 */}
        <View className="flex-row items-center">
          <Icon name={getConditionIcon(w.weather[0]?.main)} size={40} color={colors.ink} />
          <Text className="ml-3 text-[40px] font-bold leading-[48px] text-ink">{temp}°</Text>
          <View className="ml-3 flex-1">
            <Text className="text-body text-ink">{w.weather[0]?.description}</Text>
            <Text className="mt-0.5 text-caption text-mute">
              체감 {feelsLike}° · 최저 {tempMin}° / 최고 {tempMax}°
            </Text>
          </View>
        </View>

        <View className="mt-3 flex-row gap-4">
          {[
            { icon: 'wind' as const, value: `${windSpeed}m/s` },
            { icon: 'droplet' as const, value: `${w.main.humidity}%` },
            { icon: 'cloud' as const, value: `${w.clouds.all}%` },
          ].map((item) => (
            <View key={item.icon} className="flex-row items-center gap-1">
              <Icon name={item.icon} size={14} color={colors.mute} />
              <Text className="text-label text-sub">{item.value}</Text>
            </View>
          ))}
        </View>

        {/* 낚시 점수 — 등급 색은 점수에 따라 달라지므로 style로 준다 */}
        <View className="mt-4 rounded-field bg-bg p-3.5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-baseline gap-1">
              <Text className="text-label text-sub">낚시 지수</Text>
              <Text className="ml-1 text-title text-ink">{score}</Text>
              <Text className="text-caption text-mute">/ 100</Text>
            </View>
            <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: grade.soft }}>
              <Text className="text-caption font-semibold" style={{ color: grade.color }}>
                {grade.grade}등급 · {grade.label}
              </Text>
            </View>
          </View>
          <View className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-strong">
            <View className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, score))}%`, backgroundColor: grade.color }} />
          </View>
        </View>

        {/* 만조/간조 시간 */}
        {tideEvents.length > 0 && (
          <View className="mt-4 flex-row flex-wrap gap-x-4 gap-y-1.5">
            {tideEvents.map((e) => (
              <View key={`${e.type}-${e.at}`} className="flex-row items-center gap-1.5">
                <Icon name={e.type === '만조' ? 'arrow-up' : 'arrow-down'} size={13} color={e.type === '만조' ? colors.primary : colors.mute} />
                <Text className="text-caption text-sub">{e.type}</Text>
                <Text className="text-label font-semibold text-ink">{e.time}</Text>
                <Text className="text-caption text-mute">{e.height}cm</Text>
              </View>
            ))}
          </View>
        )}

        {/* 오늘의 조위 */}
        <View className="mt-4 border-t border-line pt-3.5">
          <Text className="mb-2.5 text-label font-semibold text-ink">오늘의 조위 (cm)</Text>
          {tideSlice.length > 0 ? (
            <TideStrip items={tideSlice} nowHour={nowHour} />
          ) : (
            <Text className="py-2 text-center text-caption text-mute">조위 데이터가 없어요</Text>
          )}
        </View>

        <View className="mt-3.5 flex-row items-center justify-center gap-1">
          <Text className="text-label font-medium text-primary">일자별 상세 예보 보기</Text>
          <Icon name="chevron-right" size={16} color={colors.primary} />
        </View>
      </Card>
    );
  };

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader
        eyebrow="오늘의 낚시"
        title={`안녕하세요, ${userNickname}님`}
        right={<IconButton icon="menu" label="설정" onPress={() => router.push('/settings')} />}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-5 pb-8 pt-2">
        {renderWeatherCard()}

        <Text className="mb-2.5 mt-6 text-label font-medium text-mute">빠른 시작</Text>
        <View className="flex-row flex-wrap justify-between gap-y-3">
          {QUICK_ACTIONS.map((a) => (
            <Card key={a.title} onPress={() => router.push(a.href)} className="w-[48.5%]">
              <View className="mb-3 h-10 w-10 items-center justify-center rounded-full bg-bg">
                <Icon name={a.icon} size={20} color={colors.primary} />
              </View>
              <Text className="text-body font-semibold text-ink">{a.title}</Text>
              <Text className="mt-0.5 text-caption text-mute">{a.sub}</Text>
            </Card>
          ))}
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
    </View>
  );
}
