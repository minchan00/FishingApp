import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, TextInput, Modal, FlatList
} from 'react-native';
import * as Location from 'expo-location';

import { WEATHER_API_KEY, TIDE_API_KEY } from '../config/api';

const OBS_LIST = [
  { code: 'DT_0001', name: '인천', lat: 37.45194, lon: 126.59222 },
  { code: 'DT_0002', name: '평택', lat: 36.98, lon: 126.82 },
  { code: 'DT_0003', name: '영광', lat: 35.27, lon: 126.43 },
  { code: 'DT_0004', name: '제주', lat: 33.527, lon: 126.543 },
  { code: 'DT_0005', name: '부산', lat: 35.096, lon: 129.037 },
  { code: 'DT_0006', name: '묵호', lat: 37.55, lon: 129.116 },
  { code: 'DT_0007', name: '목포', lat: 34.779, lon: 126.375 },
  { code: 'DT_0008', name: '안산', lat: 37.19, lon: 126.64 },
  { code: 'DT_0010', name: '서귀포', lat: 33.24, lon: 126.561 },
  { code: 'DT_0011', name: '후포', lat: 36.676, lon: 129.452 },
  { code: 'DT_0012', name: '속초', lat: 38.204, lon: 128.594 },
  { code: 'DT_0014', name: '통영', lat: 34.854, lon: 128.433 },
  { code: 'DT_0016', name: '여수', lat: 34.747, lon: 127.765 },
  { code: 'DT_0017', name: '대산', lat: 37.0, lon: 126.35 },
  { code: 'DT_0018', name: '군산', lat: 35.975, lon: 126.536 },
  { code: 'DT_0020', name: '울산', lat: 35.497, lon: 129.387 },
  { code: 'DT_0022', name: '성산포', lat: 33.474, lon: 126.927 },
  { code: 'DT_0024', name: '장항', lat: 36.0, lon: 126.7 },
  { code: 'DT_0025', name: '보령', lat: 36.4, lon: 126.5 },
  { code: 'DT_0027', name: '완도', lat: 34.317, lon: 126.755 },
  { code: 'DT_0028', name: '진도', lat: 34.486, lon: 126.268 },
  { code: 'DT_0029', name: '거제도', lat: 34.867, lon: 128.7 },
  { code: 'DT_0031', name: '거문도', lat: 34.025, lon: 127.308 },
  { code: 'DT_0032', name: '강화대교', lat: 37.713, lon: 126.489 },
  { code: 'DT_0043', name: '영흥도', lat: 37.238, lon: 126.437 },
  { code: 'DT_0044', name: '영종대교', lat: 37.538, lon: 126.618 },
  { code: 'DT_0050', name: '태안', lat: 36.75, lon: 126.3 },
  { code: 'DT_0065', name: '덕적도', lat: 37.23, lon: 126.14 },
  { code: 'DT_0091', name: '포항', lat: 36.05, lon: 129.38 },
];

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getNearestObs = (lat, lon) => {
  let nearest = OBS_LIST[0];
  let minDist = Infinity;
  OBS_LIST.forEach((obs) => {
    const dist = getDistance(lat, lon, obs.lat, obs.lon);
    if (dist < minDist) { minDist = dist; nearest = obs; }
  });
  return nearest;
};

const findTideEvents = (items) => {
  if (!items || items.length < 3) return [];
  const events = [];
  for (let i = 1; i < items.length - 1; i++) {
    const prev = parseFloat(items[i - 1].bscTdlvHgt || items[i - 1].tdlvHgt || 0);
    const curr = parseFloat(items[i].bscTdlvHgt || items[i].tdlvHgt || 0);
    const next = parseFloat(items[i + 1].bscTdlvHgt || items[i + 1].tdlvHgt || 0);
    if (!curr) continue;
    const time = items[i].obsrvnDt?.split(' ')[1]?.slice(0, 5) || '-';
    if (curr > prev && curr > next) events.push({ type: '만조', time, height: Math.round(curr) });
    else if (curr < prev && curr < next) events.push({ type: '간조', time, height: Math.round(curr) });
  }
  return events;
};

export default function WeatherDetailScreen({ route, navigation, obs: obsProp, onClose }) {
  const [currentObs, setCurrentObs] = useState(obsProp || route?.params?.obs || OBS_LIST[0]);
  const goBack = onClose || (() => navigation?.goBack());

  const [forecast, setForecast] = useState([]);
  const [tideData, setTideData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(0);

  const [searchModal, setSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [currentObs]);

  const fetchAll = async () => {
    setLoading(true);
    setForecast([]);
    setTideData({});
    setSelectedDay(0);
    await Promise.all([fetchForecast(), fetchTideWeek()]);
    setLoading(false);
  };

  const fetchForecast = async () => {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${currentObs.lat}&lon=${currentObs.lon}&appid=${WEATHER_API_KEY}&units=metric&lang=kr&cnt=40`
      );
      const data = await res.json();
      if (data && data.list) {
        const grouped = {};
        data.list.forEach((item) => {
          const date = item.dt_txt.split(' ')[0];
          if (!grouped[date]) grouped[date] = [];
          grouped[date].push(item);
        });
        const days = Object.keys(grouped).slice(0, 5).map((date) => {
          const items = grouped[date];
          const temps = items.map((i) => i.main.temp);
          const winds = items.map((i) => i.wind.speed);
          const noon = items.find((i) => i.dt_txt.includes('12:00')) || items[Math.floor(items.length / 2)];
          return {
            date,
            tempMin: Math.round(Math.min(...temps)),
            tempMax: Math.round(Math.max(...temps)),
            avgWind: Math.round(winds.reduce((a, b) => a + b, 0) / winds.length),
            condition: noon.weather[0].main,
            conditionDesc: noon.weather[0].description,
            humidity: noon.main.humidity,
            hourly: items,
          };
        });
        setForecast(days);
      }
    } catch (e) {
      console.error('예보 오류:', e);
    }
  };

  const fetchTideWeek = async () => {
    try {
      const results = {};
      const today = new Date();
      for (let i = 0; i < 5; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}${mm}${dd}`;
        const displayDate = `${yyyy}-${mm}-${dd}`;
        const url = `https://apis.data.go.kr/1192136/surveyTideLevel/GetSurveyTideLevelApiService?serviceKey=${TIDE_API_KEY}&type=json&obsCode=${currentObs.code}&reqDate=${dateStr}&min=60&pageNo=1&numOfRows=24`;
        const res = await fetch(url);
        const data = await res.json();
        const items = data?.body?.items?.item;
        if (items && items.length > 0) results[displayDate] = items;
      }
      setTideData(results);
    } catch (e) {
      console.error('조위 오류:', e);
    }
  };

  const selectObs = (obs) => {
    setCurrentObs(obs);
    setSearchModal(false);
    setSearchQuery('');
  };

  const selectCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocating(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const nearest = getNearestObs(loc.coords.latitude, loc.coords.longitude);
      selectObs(nearest);
    } catch (e) {
      console.error('위치 오류:', e);
    }
    setLocating(false);
  };

  const filteredObs = OBS_LIST.filter((o) => o.name.includes(searchQuery));

  const getConditionEmoji = (main) => {
    switch (main) {
      case 'Clear': return '☀️';
      case 'Clouds': return '☁️';
      case 'Rain': return '🌧️';
      case 'Snow': return '❄️';
      case 'Thunderstorm': return '⛈️';
      case 'Drizzle': return '🌦️';
      default: return '🌤️';
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${d.getMonth() + 1}/${d.getDate()} ${days[d.getDay()]}`;
  };

  const isToday = (dateStr) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#f4a826" size="large" />
        <Text style={{ color: 'rgba(255,255,255,0.65)', marginTop: 12, fontSize: 13 }}>
          {currentObs.name} 예보 불러오는 중...
        </Text>
      </View>
    );
  }

  const selectedForecast = forecast[selectedDay];
  const selectedTide = selectedForecast ? tideData[selectedForecast.date] : null;

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Text style={{ color: '#fff', fontSize: 16 }}>← 뒤로</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.title}>📅 일자별 예보</Text>
          <TouchableOpacity onPress={() => setSearchModal(true)} style={styles.searchBtn}>
            <Text style={styles.searchBtnText}>📍 {currentObs.name} ▾</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 날짜 탭 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabRow} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {forecast.map((day, i) => (
          <TouchableOpacity
            key={day.date}
            onPress={() => setSelectedDay(i)}
            style={[styles.dayTab, selectedDay === i && styles.dayTabActive]}
          >
            <Text style={[styles.dayTabEmoji]}>{getConditionEmoji(day.condition)}</Text>
            <Text style={[styles.dayTabDate, selectedDay === i && { color: '#f4a826', fontWeight: '600' }]}>
              {isToday(day.date) ? '오늘' : formatDate(day.date)}
            </Text>
            <Text style={[styles.dayTabTemp, selectedDay === i && { color: '#fff' }]}>
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
                  <View key={item.label} style={[styles.statItem, i > 0 && { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.12)' }]}>
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
                    <Text style={styles.hourTime}>{item.dt_txt.split(' ')[1].slice(0, 5)}</Text>
                    <Text style={{ fontSize: 20, marginVertical: 4 }}>{getConditionEmoji(item.weather[0].main)}</Text>
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
                    const time = item.obsrvnDt?.split(' ')[1]?.slice(0, 5) || '-';
                    const actual = item.bscTdlvHgt;
                    const predicted = Math.round(item.tdlvHgt);
                    const nowHour = new Date().getHours();
                    const itemHour = parseInt(item.obsrvnDt?.split(' ')[1]?.split(':')[0] || '0', 10);
                    const isCurrent = isToday(selectedForecast.date) && itemHour === nowHour;
                    return (
                      <View key={i} style={[styles.tideHourItem, isCurrent && styles.tideHourItemCurrent]}>
                        <Text style={[styles.tideHourTime, isCurrent && { color: '#f4a826' }]}>{time}</Text>
                        <Text style={styles.tideHourActual}>{actual ? `${actual}` : '-'}</Text>
                        <Text style={styles.tideHourPred}>{predicted}</Text>
                        <Text style={styles.tideHourUnit}>cm</Text>
                      </View>
                    );
                  })}
                </ScrollView>
              ) : (
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', paddingVertical: 16 }}>
                  조위 데이터가 없어요
                </Text>
              )}
              {selectedTide && (() => {
                const events = findTideEvents(selectedTide);
                return events.length > 0 ? (
                  <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, marginBottom: 8 }}>🌊 만조 / 간조</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {events.map((e, i) => (
                        <View key={i} style={{ alignItems: 'center', marginRight: 20, marginBottom: 4 }}>
                          <Text style={{ color: e.type === '만조' ? '#2a9fc4' : 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '600' }}>
                            {e.type === '만조' ? '🔵' : '⚪'} {e.type}
                          </Text>
                          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', marginTop: 2 }}>{e.time}</Text>
                          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{e.height}cm</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null;
              })()}
            </View>
          </>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* 지역 검색 모달 */}
      <Modal visible={searchModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📍 지역 선택</Text>
              <TouchableOpacity onPress={() => { setSearchModal(false); setSearchQuery(''); }}>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 22, lineHeight: 24 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.currentLocBtn}
              onPress={selectCurrentLocation}
              disabled={locating}
            >
              {locating ? (
                <ActivityIndicator size="small" color="#f4a826" style={{ marginRight: 8 }} />
              ) : (
                <Text style={{ fontSize: 16, marginRight: 8 }}>📡</Text>
              )}
              <Text style={styles.currentLocText}>
                {locating ? '위치 찾는 중...' : '현재 위치 사용'}
              </Text>
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
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.obsItem, item.code === currentObs.code && styles.obsItemActive]}
                  onPress={() => selectObs(item)}
                >
                  <Text style={[styles.obsItemText, item.code === currentObs.code && { color: '#f4a826', fontWeight: '700' }]}>
                    {item.code === currentObs.code ? '✓ ' : ''}{item.name}
                  </Text>
                </TouchableOpacity>
              )}
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
  container: { flex: 1, backgroundColor: '#0a2a3a' },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  backBtn: { marginBottom: 8 },
  title: { color: '#fff', fontSize: 20, fontWeight: '600' },
  searchBtn: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  searchBtnText: { color: '#f4a826', fontSize: 13, fontWeight: '600' },
  dayTabRow: { marginBottom: 8 },
  dayTab: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, marginRight: 8, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  dayTabActive: { borderColor: '#f4a826', backgroundColor: 'rgba(244,168,38,0.1)' },
  dayTabEmoji: { fontSize: 20, marginBottom: 4 },
  dayTabDate: { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  dayTabTemp: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 },
  summaryCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#1a6a8a', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  summaryDate: { color: '#fff', fontSize: 18, fontWeight: '600' },
  summaryDesc: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 2 },
  summaryStats: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', paddingTop: 12 },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 10 },
  statValue: { color: '#fff', fontSize: 13, fontWeight: '500', marginTop: 2 },
  sectionCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  sectionTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  hourItem: { alignItems: 'center', marginRight: 16, minWidth: 50 },
  hourTime: { color: 'rgba(255,255,255,0.65)', fontSize: 11 },
  hourTemp: { color: '#fff', fontSize: 14, fontWeight: '600' },
  hourWind: { color: '#2a9fc4', fontSize: 10, marginTop: 2 },
  tideHourItem: { alignItems: 'center', marginRight: 12, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, minWidth: 50 },
  tideHourItemCurrent: { backgroundColor: 'rgba(244,168,38,0.15)', borderWidth: 1, borderColor: '#f4a826' },
  tideHourTime: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginBottom: 4 },
  tideHourActual: { color: '#fff', fontSize: 14, fontWeight: '600' },
  tideHourPred: { color: '#2a9fc4', fontSize: 12 },
  tideHourUnit: { color: 'rgba(255,255,255,0.4)', fontSize: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#0f3a50', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  searchInput: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: '#fff', fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  currentLocBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(244,168,38,0.12)', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(244,168,38,0.3)' },
  currentLocText: { color: '#f4a826', fontSize: 14, fontWeight: '600' },
  obsItem: { paddingVertical: 14, paddingHorizontal: 8 },
  obsItemActive: { backgroundColor: 'rgba(244,168,38,0.1)', borderRadius: 8 },
  obsItemText: { color: 'rgba(255,255,255,0.85)', fontSize: 15 },
});
