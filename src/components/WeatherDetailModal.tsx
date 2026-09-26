import { format, getDay, parseISO } from 'date-fns';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: 13 }}>
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
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Text style={{ color: colors.white, fontSize: 16 }}>← 뒤로</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.title}>📅 일자별 예보</Text>
          <TouchableOpacity onPress={() => setSearchModal(true)} style={styles.searchBtn}>
            <Text style={styles.searchBtnText}>📍 {currentObs.name} ▾</Text>
          </TouchableOpacity>
        </View>
      </View>

      {forecast.isError && (
        <View style={{ alignItems: 'center', paddingVertical: 30 }}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>예보를 불러올 수 없어요</Text>
          <TouchableOpacity onPress={() => forecast.refetch()} style={{ marginTop: 10 }}>
            <Text style={{ color: colors.accent, fontSize: 13 }}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 날짜 탭 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabRow} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {days.map((day, i) => (
          <TouchableOpacity key={day.date} onPress={() => setSelectedDay(i)} style={[styles.dayTab, selectedDay === i && styles.dayTabActive]}>
            <Text style={styles.dayTabEmoji}>{getConditionEmoji(day.condition)}</Text>
            <Text style={[styles.dayTabDate, selectedDay === i && { color: colors.accent, fontWeight: '600' }]}>
              {isToday(day.date) ? '오늘' : formatDate(day.date)}
            </Text>
            <Text style={[styles.dayTabTemp, selectedDay === i && { color: colors.white }]}>
              {day.tempMin}°/{day.tempMax}°
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false}>
        {selectedForecast && (
          <>
            {/* 선택된 날 날씨 요약 */}
            <View style={styles.summaryCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View>
                  <Text style={styles.summaryDate}>
                    {isToday(selectedForecast.date) ? '오늘' : formatDate(selectedForecast.date)}
                  </Text>
                  <Text style={styles.summaryDesc}>{selectedForecast.conditionDesc}</Text>
                </View>
                <Text style={{ fontSize: 48 }}>{getConditionEmoji(selectedForecast.condition)}</Text>
              </View>
              <View style={styles.summaryStats}>
                {[
                  { label: '최저', value: `${selectedForecast.tempMin}°C` },
                  { label: '최고', value: `${selectedForecast.tempMax}°C` },
                  { label: '바람', value: `${selectedForecast.avgWind}m/s` },
                  { label: '습도', value: `${selectedForecast.humidity}%` },
                ].map((item, i) => (
                  <View key={item.label} style={[styles.statItem, i > 0 && { borderLeftWidth: 1, borderLeftColor: colors.cardBorder }]}>
                    <Text style={styles.statLabel}>{item.label}</Text>
                    <Text style={styles.statValue}>{item.value}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 시간별 날씨 */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>⏰ 시간별 날씨</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                {selectedForecast.hourly.map((item, i) => (
                  <View key={i} style={styles.hourItem}>
                    <Text style={styles.hourTime}>{forecastTime(item)}</Text>
                    <Text style={{ fontSize: 20, marginVertical: 4 }}>{getConditionEmoji(item.weather[0]?.main)}</Text>
                    <Text style={styles.hourTemp}>{Math.round(item.main.temp)}°</Text>
                    <Text style={styles.hourWind}>{Math.round(item.wind.speed)}m/s</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* 조위 데이터 */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>🌊 시간별 조위</Text>
              {selectedTide ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                  {selectedTide.map((item, i) => {
                    const isCurrent = isToday(selectedForecast.date) && tideHour(item) === nowHour;
                    return (
                      <View key={i} style={[styles.tideHourItem, isCurrent && styles.tideHourItemCurrent]}>
                        <Text style={[styles.tideHourTime, isCurrent && { color: colors.accent }]}>{tideTime(item)}</Text>
                        <Text style={styles.tideHourActual}>{item.bscTdlvHgt ? `${item.bscTdlvHgt}` : '-'}</Text>
                        <Text style={styles.tideHourPred}>{item.tdlvHgt != null ? Math.round(Number(item.tdlvHgt)) : '-'}</Text>
                        <Text style={styles.tideHourUnit}>cm</Text>
                      </View>
                    );
                  })}
                </ScrollView>
              ) : tideEvents.length === 0 ? (
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', paddingVertical: 16 }}>
                  조위 데이터가 없어요
                </Text>
              ) : null}
              {tideEvents.length > 0 && (
                <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
                  <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 8 }}>🌊 만조 / 간조</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {tideEvents.map((e, i) => (
                      <View key={i} style={{ alignItems: 'center', marginRight: 20, marginBottom: 4 }}>
                        <Text style={{ color: e.type === '만조' ? colors.oceanLight : colors.textMuted, fontSize: 11, fontWeight: '600' }}>
                          {e.type === '만조' ? '🔵' : '⚪'} {e.type}
                        </Text>
                        <Text style={{ color: colors.white, fontSize: 13, fontWeight: '600', marginTop: 2 }}>{e.time}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{e.height}cm</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* 지역 검색 모달 */}
      <Modal visible={searchModal} animationType="slide" transparent onRequestClose={() => setSearchModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📍 지역 선택</Text>
              <TouchableOpacity onPress={() => { setSearchModal(false); setSearchQuery(''); }}>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 22, lineHeight: 24 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.currentLocBtn} onPress={selectCurrentLocation} disabled={locating}>
              {locating ? (
                <ActivityIndicator size="small" color={colors.accent} style={{ marginRight: 8 }} />
              ) : (
                <Text style={{ fontSize: 16, marginRight: 8 }}>📡</Text>
              )}
              <Text style={styles.currentLocText}>{locating ? '위치 찾는 중...' : '현재 위치 사용'}</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.searchInput}
              placeholder="지역 이름 검색..."
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <FlatList
              data={filteredObs}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const active = item.code === currentObs.code;
                return (
                  <TouchableOpacity style={[styles.obsItem, active && styles.obsItemActive]} onPress={() => selectObs(item)}>
                    <Text style={[styles.obsItemText, active && { color: colors.accent, fontWeight: '700' }]}>
                      {active ? '✓ ' : ''}{item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />}
              style={{ maxHeight: 360 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.oceanDeep },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  backBtn: { marginBottom: 8 },
  title: { color: colors.white, fontSize: 20, fontWeight: '600' },
  searchBtn: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  searchBtnText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  dayTabRow: { marginBottom: 8 },
  dayTab: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, marginRight: 8, borderRadius: 14, backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder },
  dayTabActive: { borderColor: colors.accent, backgroundColor: 'rgba(244,168,38,0.1)' },
  dayTabEmoji: { fontSize: 20, marginBottom: 4 },
  dayTabDate: { color: colors.textMuted, fontSize: 12 },
  dayTabTemp: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 },
  summaryCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: colors.oceanSurface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.cardBorder },
  summaryDate: { color: colors.white, fontSize: 18, fontWeight: '600' },
  summaryDesc: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  summaryStats: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 12 },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { color: colors.textMuted, fontSize: 10 },
  statValue: { color: colors.white, fontSize: 13, fontWeight: '500', marginTop: 2 },
  sectionCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.cardBorder },
  sectionTitle: { color: colors.white, fontSize: 14, fontWeight: '600' },
  hourItem: { alignItems: 'center', marginRight: 16, minWidth: 50 },
  hourTime: { color: colors.textMuted, fontSize: 11 },
  hourTemp: { color: colors.white, fontSize: 14, fontWeight: '600' },
  hourWind: { color: colors.oceanLight, fontSize: 10, marginTop: 2 },
  tideHourItem: { alignItems: 'center', marginRight: 12, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, minWidth: 50 },
  tideHourItemCurrent: { backgroundColor: 'rgba(244,168,38,0.15)', borderWidth: 1, borderColor: colors.accent },
  tideHourTime: { color: colors.textMuted, fontSize: 11, marginBottom: 4 },
  tideHourActual: { color: colors.white, fontSize: 14, fontWeight: '600' },
  tideHourPred: { color: colors.oceanLight, fontSize: 12 },
  tideHourUnit: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#0f3a50', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: colors.white, fontSize: 16, fontWeight: '700' },
  searchInput: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: colors.white, fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  currentLocBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(244,168,38,0.12)', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(244,168,38,0.3)' },
  currentLocText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  obsItem: { paddingVertical: 14, paddingHorizontal: 8 },
  obsItemActive: { backgroundColor: 'rgba(244,168,38,0.1)', borderRadius: 8 },
  obsItemText: { color: 'rgba(255,255,255,0.85)', fontSize: 15 },
});
