import { FlashList } from '@shopify/flash-list';
import { format, getDay, parseISO } from 'date-fns';
import { useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  OBS_LIST, forecastTime, getConditionEmoji, isKstToday, kstHourNow, locateNearestObs, tideHour, tideTime, type ObsStation,
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

const ObsSeparator = () => <View className="h-px bg-white/[0.06]" />;

export default function WeatherDetailModal({ obs, onClose }: Props) {
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

  if (forecast.isPending || tideWeek.isPending || tideForecast.isPending) {
    return (
      <View className="flex-1 bg-ocean-deep justify-center items-center">
        <ActivityIndicator color={colors.accent} size="large" />
        <Text className="text-muted mt-3 text-[13px]">
          {currentObs.name} 예보 불러오는 중...
        </Text>
      </View>
    );
  }

  const days = forecast.data ?? [];
  const selectedForecast = days[selectedDay];
  const selectedTide = selectedForecast ? tideWeek.data?.[selectedForecast.date] : undefined;
  const tideEvents = (selectedForecast && tideForecast.data?.[selectedForecast.date]) || [];
  const nowHour = kstHourNow();

  return (
    <View className="flex-1 bg-ocean-deep">
      {/* 헤더 */}
      <View className="px-5 pt-14 pb-3">
        <TouchableOpacity onPress={onClose} className="mb-2">
          <Text className="text-white text-[16px]">← 뒤로</Text>
        </TouchableOpacity>
        <View className="flex-row justify-between items-center">
          <Text className="text-white text-[20px] font-semibold">📅 일자별 예보</Text>
          <TouchableOpacity
            onPress={() => setSearchModal(true)}
            className="bg-white/10 px-3 py-1.5 rounded-[20px] border border-white/20"
          >
            <Text className="text-accent text-[13px] font-semibold">📍 {currentObs.name} ▾</Text>
          </TouchableOpacity>
        </View>
      </View>

      {forecast.isError && (
        <View className="items-center py-[30px]">
          <Text className="text-muted text-[13px]">예보를 불러올 수 없어요</Text>
          <TouchableOpacity onPress={() => forecast.refetch()} className="mt-2.5">
            <Text className="text-accent text-[13px]">다시 시도</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 날짜 탭 (며칠치뿐이라 ScrollView로 충분) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2" contentContainerClassName="px-4">
        {days.map((day, i) => {
          const active = selectedDay === i;
          return (
            <TouchableOpacity
              key={day.date}
              onPress={() => setSelectedDay(i)}
              className={`items-center px-3.5 py-2.5 mr-2 rounded-[14px] border ${active ? 'border-accent bg-accent/10' : 'bg-card border-card-border'}`}
            >
              <Text className="text-[20px] mb-1">{getConditionEmoji(day.condition)}</Text>
              <Text className={`text-[12px] ${active ? 'text-accent font-semibold' : 'text-muted'}`}>
                {isToday(day.date) ? '오늘' : formatDate(day.date)}
              </Text>
              <Text className={`text-[11px] mt-0.5 ${active ? 'text-white' : 'text-white/50'}`}>
                {day.tempMin}°/{day.tempMax}°
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {selectedForecast && (
          <>
            {/* 선택된 날 날씨 요약 */}
            <View className="mx-4 mb-3 bg-ocean-surface rounded-2xl p-4 border border-card-border">
              <View className="flex-row justify-between items-center mb-3">
                <View>
                  <Text className="text-white text-[18px] font-semibold">
                    {isToday(selectedForecast.date) ? '오늘' : formatDate(selectedForecast.date)}
                  </Text>
                  <Text className="text-muted text-[13px] mt-0.5">{selectedForecast.conditionDesc}</Text>
                </View>
                <Text className="text-[48px]">{getConditionEmoji(selectedForecast.condition)}</Text>
              </View>
              <View className="flex-row border-t border-card-border pt-3">
                {[
                  { label: '최저', value: `${selectedForecast.tempMin}°C` },
                  { label: '최고', value: `${selectedForecast.tempMax}°C` },
                  { label: '바람', value: `${selectedForecast.avgWind}m/s` },
                  { label: '습도', value: `${selectedForecast.humidity}%` },
                ].map((item, i) => (
                  <View key={item.label} className={`flex-1 items-center ${i > 0 ? 'border-l border-card-border' : ''}`}>
                    <Text className="text-muted text-[10px]">{item.label}</Text>
                    <Text className="text-white text-[13px] font-medium mt-0.5">{item.value}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 시간별 날씨 */}
            <View className="mx-4 mb-3 bg-white/5 rounded-2xl p-4 border border-card-border">
              <Text className="text-white text-[14px] font-semibold">⏰ 시간별 날씨</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2.5">
                {selectedForecast.hourly.map((item, i) => (
                  <View key={i} className="items-center mr-4 min-w-[50px]">
                    <Text className="text-muted text-[11px]">{forecastTime(item)}</Text>
                    <Text className="text-[20px] my-1">{getConditionEmoji(item.weather[0]?.main)}</Text>
                    <Text className="text-white text-[14px] font-semibold">{Math.round(item.main.temp)}°</Text>
                    <Text className="text-ocean-light text-[10px] mt-0.5">{Math.round(item.wind.speed)}m/s</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* 조위 데이터 */}
            <View className="mx-4 mb-3 bg-white/5 rounded-2xl p-4 border border-card-border">
              <Text className="text-white text-[14px] font-semibold">🌊 시간별 조위</Text>
              {selectedTide ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2.5">
                  {selectedTide.map((item, i) => {
                    const isCurrent = isToday(selectedForecast.date) && tideHour(item) === nowHour;
                    return (
                      <View
                        key={i}
                        className={`items-center mr-3 px-2 py-1.5 rounded-lg min-w-[50px] ${isCurrent ? 'bg-accent/15 border border-accent' : ''}`}
                      >
                        <Text className={`text-[11px] mb-1 ${isCurrent ? 'text-accent' : 'text-muted'}`}>{tideTime(item)}</Text>
                        <Text className="text-white text-[14px] font-semibold">{item.bscTdlvHgt ? `${item.bscTdlvHgt}` : '-'}</Text>
                        <Text className="text-ocean-light text-[12px]">{item.tdlvHgt != null ? Math.round(Number(item.tdlvHgt)) : '-'}</Text>
                        <Text className="text-white/40 text-[10px]">cm</Text>
                      </View>
                    );
                  })}
                </ScrollView>
              ) : tideEvents.length === 0 ? (
                <Text className="text-white/40 text-[12px] text-center py-4">
                  조위 데이터가 없어요
                </Text>
              ) : null}
              {tideEvents.length > 0 && (
                <View className="mt-3.5 pt-3 border-t border-white/[0.08]">
                  <Text className="text-muted text-[11px] mb-2">🌊 만조 / 간조</Text>
                  <View className="flex-row flex-wrap">
                    {tideEvents.map((e, i) => (
                      <View key={i} className="items-center mr-5 mb-1">
                        <Text className={`text-[11px] font-semibold ${e.type === '만조' ? 'text-ocean-light' : 'text-muted'}`}>
                          {e.type === '만조' ? '🔵' : '⚪'} {e.type}
                        </Text>
                        <Text className="text-white text-[13px] font-semibold mt-0.5">{e.time}</Text>
                        <Text className="text-white/50 text-[10px]">{e.height}cm</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </>
        )}
        <View className="h-[30px]" />
      </ScrollView>

      {/* 지역 검색 모달 */}
      <Modal visible={searchModal} animationType="slide" transparent onRequestClose={() => setSearchModal(false)}>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-[#0f3a50] rounded-t-3xl p-5 pb-10">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-white text-[16px] font-bold">📍 지역 선택</Text>
              <TouchableOpacity onPress={() => { setSearchModal(false); setSearchQuery(''); }}>
                <Text className="text-white/60 text-[22px] leading-[24px]">✕</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              className="flex-row items-center bg-accent/[0.12] rounded-xl py-3 px-3.5 mb-3 border border-accent/30"
              onPress={selectCurrentLocation}
              disabled={locating}
            >
              {locating ? (
                <ActivityIndicator size="small" color={colors.accent} className="mr-2" />
              ) : (
                <Text className="text-[16px] mr-2">📡</Text>
              )}
              <Text className="text-accent text-[14px] font-semibold">{locating ? '위치 찾는 중...' : '현재 위치 사용'}</Text>
            </TouchableOpacity>
            <TextInput
              className="bg-white/[0.08] rounded-xl px-3.5 py-2.5 text-white text-[14px] mb-3 border border-white/15"
              placeholder="지역 이름 검색..."
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <FlashList
              data={filteredObs}
              keyExtractor={(item) => item.code}
              extraData={currentObs.code}
              renderItem={({ item }) => {
                const active = item.code === currentObs.code;
                return (
                  <TouchableOpacity
                    className={`py-3.5 px-2 ${active ? 'bg-accent/10 rounded-lg' : ''}`}
                    onPress={() => selectObs(item)}
                  >
                    <Text className={`text-[15px] ${active ? 'text-accent font-bold' : 'text-white/[0.85]'}`}>
                      {active ? '✓ ' : ''}{item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={ObsSeparator}
              style={{ maxHeight: 360 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
