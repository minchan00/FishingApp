import { FlashList } from '@shopify/flash-list';
import { format, getDay, parseISO } from 'date-fns';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ObsSearchField } from '@/components/home/ObsPickerModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ListRow } from '@/components/ui/ListRow';
import { BottomSheet } from '@/components/ui/Sheet';
import {
  OBS_LIST, forecastTime, getConditionIcon, isKstToday, kstHourNow, locateNearestObs, tideHour, tideTime, type ObsStation,
} from '@/data/weather';
import { useForecast, useTideForecastWeek, useTideWeek } from '@/hooks/useWeather';
import { colors } from '@/theme/colors';

type Props = {
  /** 처음 보여줄 관측소. 모달 안에서 바꿔도 홈 화면의 선택은 그대로 둔다. */
  obs: ObsStation;
  onClose: () => void;
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 'yyyy-MM-dd'(KST 날짜) → 'M/d 요일'. parseISO는 날짜만 있는 문자열을 로컬 자정으로 읽어 날짜가 밀리지 않는다. */
const formatDate = (dateStr: string) => {
  const d = parseISO(dateStr);
  return `${format(d, 'M/d')} ${WEEKDAYS[getDay(d)]}`;
};

const isToday = isKstToday;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mx-5 mb-3">
      <Card tone="outline">
        <Text className="text-label font-semibold text-ink">{title}</Text>
        {children}
      </Card>
    </View>
  );
}

export default function WeatherDetailModal({ obs, onClose }: Props) {
  const { top, bottom } = useSafeAreaInsets();
  const [currentObs, setCurrentObs] = useState(obs);
  const [selectedDay, setSelectedDay] = useState(0);
  const [searchModal, setSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locating, setLocating] = useState(false);

  const forecast = useForecast(currentObs);
  const tideWeek = useTideWeek(currentObs);
  const tideForecast = useTideForecastWeek(currentObs);

  const selectObs = (next: ObsStation) => {
    setCurrentObs(next);
    setSelectedDay(0);
    setSearchModal(false);
    setSearchQuery('');
  };

  const closeSearch = () => {
    setSearchModal(false);
    setSearchQuery('');
  };

  const selectCurrentLocation = async () => {
    setLocating(true);
    try {
      const nearest = await locateNearestObs();
      if (nearest) selectObs(nearest);
    } catch (e) {
      console.error('위치 오류:', e);
    } finally {
      setLocating(false);
    }
  };

  const filteredObs = OBS_LIST.filter((o) => o.name.includes(searchQuery));

  const header = (
    <ScreenHeader
      title="일자별 예보"
      back
      onBack={onClose}
      right={
        <Pressable
          onPress={() => setSearchModal(true)}
          accessibilityRole="button"
          accessibilityLabel="지역 선택"
          className="h-9 flex-row items-center gap-1 rounded-full bg-card px-3 active:bg-surface"
        >
          <Icon name="map-pin" size={14} color={colors.sub} />
          <Text className="text-label font-medium text-ink">{currentObs.name}</Text>
          <Icon name="chevron-down" size={14} color={colors.sub} />
        </Pressable>
      }
    />
  );

  const searchSheet = (
    <BottomSheet visible={searchModal} title="지역 선택" onClose={closeSearch}>
      <Button
        label={locating ? '위치 찾는 중...' : '현재 위치 사용'}
        variant="secondary"
        size="md"
        icon="navigation"
        onPress={selectCurrentLocation}
        loading={locating}
        className="mb-3"
      />
      <ObsSearchField value={searchQuery} onChangeText={setSearchQuery} autoFocus />
      <FlashList
        data={filteredObs}
        keyExtractor={(item) => item.code}
        extraData={currentObs.code}
        renderItem={({ item }) => {
          const active = item.code === currentObs.code;
          return (
            <ListRow
              title={item.name}
              onPress={() => selectObs(item)}
              chevron={false}
              right={active ? <Icon name="check" size={20} color={colors.primary} /> : undefined}
            />
          );
        }}
        style={{ maxHeight: 360 }}
      />
    </BottomSheet>
  );

  if (forecast.isPending || tideWeek.isPending || tideForecast.isPending) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.primary} size="large" />
          <Text className="mt-3 text-label text-mute">{currentObs.name} 예보 불러오는 중...</Text>
        </View>
        {searchSheet}
      </View>
    );
  }

  const days = forecast.data ?? [];
  const selectedForecast = days[selectedDay];
  const selectedTide = selectedForecast ? tideWeek.data?.[selectedForecast.date] : undefined;
  const tideEvents = (selectedForecast && tideForecast.data?.[selectedForecast.date]) || [];
  const nowHour = kstHourNow();

  return (
    <View className="flex-1 bg-bg">
      {header}

      {forecast.isError && (
        <View className="items-center py-8">
          <Icon name="cloud-off" size={24} color={colors.mute} />
          <Text className="mt-2 text-label text-mute">예보를 불러올 수 없어요</Text>
          <Pressable onPress={() => forecast.refetch()} className="mt-2 px-3 py-1.5" accessibilityRole="button">
            <Text className="text-label font-semibold text-primary">다시 시도</Text>
          </Pressable>
        </View>
      )}

      {/* 날짜 탭 (며칠치뿐이라 ScrollView로 충분) */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-5 pb-3">
          {days.map((day, i) => {
            const active = selectedDay === i;
            return (
              <Pressable
                key={day.date}
                onPress={() => setSelectedDay(i)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                className={`min-w-[68px] items-center rounded-card px-3 py-2.5 ${active ? 'bg-navy' : 'bg-card active:bg-surface'}`}
              >
                <Text className={`text-caption ${active ? 'font-semibold text-white' : 'text-sub'}`}>
                  {isToday(day.date) ? '오늘' : formatDate(day.date)}
                </Text>
                <View className="my-1.5">
                  <Icon name={getConditionIcon(day.condition)} size={20} color={active ? colors.white : colors.sub} />
                </View>
                <Text className={`text-caption ${active ? 'text-white' : 'text-mute'}`}>
                  {day.tempMin}°/{day.tempMax}°
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottom + 24 }}>
        {selectedForecast && (
          <>
            {/* 선택된 날 날씨 요약 */}
            <View className="mx-5 mb-3">
              <Card>
                <View className="mb-4 flex-row items-center justify-between">
                  <View>
                    <Text className="text-heading text-ink">
                      {isToday(selectedForecast.date) ? '오늘' : formatDate(selectedForecast.date)}
                    </Text>
                    <Text className="mt-0.5 text-label text-sub">{selectedForecast.conditionDesc}</Text>
                  </View>
                  <Icon name={getConditionIcon(selectedForecast.condition)} size={40} color={colors.ink} />
                </View>
                <View className="flex-row rounded-field bg-bg py-3">
                  {[
                    { label: '최저', value: `${selectedForecast.tempMin}°C` },
                    { label: '최고', value: `${selectedForecast.tempMax}°C` },
                    { label: '바람', value: `${selectedForecast.avgWind}m/s` },
                    { label: '습도', value: `${selectedForecast.humidity}%` },
                  ].map((item, i) => (
                    <View key={item.label} className={`flex-1 items-center ${i > 0 ? 'border-l border-line' : ''}`}>
                      <Text className="text-caption text-mute">{item.label}</Text>
                      <Text className="mt-0.5 text-label font-semibold text-ink">{item.value}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            </View>

            {/* 시간별 날씨 */}
            <Section title="시간별 날씨">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
                {selectedForecast.hourly.map((item, i) => (
                  <View key={i} className="mr-4 min-w-[48px] items-center">
                    <Text className="text-caption text-mute">{forecastTime(item)}</Text>
                    <View className="my-1.5">
                      <Icon name={getConditionIcon(item.weather[0]?.main)} size={20} color={colors.sub} />
                    </View>
                    <Text className="text-body font-semibold text-ink">{Math.round(item.main.temp)}°</Text>
                    <Text className="mt-0.5 text-caption text-mute">{Math.round(item.wind.speed)}m/s</Text>
                  </View>
                ))}
              </ScrollView>
            </Section>

            {/* 조위 데이터 */}
            <Section title="시간별 조위 (cm)">
              {selectedTide ? (
                <>
                  <View className="mt-2 flex-row gap-3">
                    <Text className="text-caption text-mute">위: 실측</Text>
                    <Text className="text-caption text-mute">아래: 예측</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
                    {selectedTide.map((item, i) => {
                      const isCurrent = isToday(selectedForecast.date) && tideHour(item) === nowHour;
                      return (
                        <View
                          key={i}
                          className={`mr-2 min-w-[52px] items-center rounded-field px-2 py-1.5 ${isCurrent ? 'bg-primary-soft' : ''}`}
                        >
                          <Text className={`mb-1 text-caption ${isCurrent ? 'font-semibold text-primary' : 'text-mute'}`}>{tideTime(item)}</Text>
                          <Text className="text-body font-semibold text-ink">{item.bscTdlvHgt ? `${item.bscTdlvHgt}` : '-'}</Text>
                          <Text className="text-caption text-sub">{item.tdlvHgt != null ? Math.round(Number(item.tdlvHgt)) : '-'}</Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </>
              ) : tideEvents.length === 0 ? (
                <Text className="py-4 text-center text-caption text-mute">조위 데이터가 없어요</Text>
              ) : null}
              {tideEvents.length > 0 && (
                <View className="mt-3 border-t border-line pt-3">
                  <Text className="mb-2 text-caption text-mute">만조 / 간조</Text>
                  <View className="flex-row flex-wrap gap-x-4 gap-y-1.5">
                    {tideEvents.map((e) => (
                      <View key={`${e.type}-${e.at}`} className="flex-row items-center gap-1.5">
                        <Icon name={e.type === '만조' ? 'arrow-up' : 'arrow-down'} size={13} color={e.type === '만조' ? colors.primary : colors.mute} />
                        <Text className="text-caption text-sub">{e.type}</Text>
                        <Text className="text-label font-semibold text-ink">{e.time}</Text>
                        <Text className="text-caption text-mute">{e.height}cm</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </Section>
          </>
        )}
      </ScrollView>

      {searchSheet}
    </View>
  );
}
