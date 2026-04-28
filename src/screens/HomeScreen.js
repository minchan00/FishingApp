import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, Modal, TextInput, FlatList, Alert } from 'react-native';
import * as Location from 'expo-location';
import { WEATHER_API_KEY, TIDE_API_KEY } from '../config/api';
import WeatherDetailScreen from './WeatherDetailScreen';
import { signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { getDoc, updateDoc, doc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

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

export default function HomeScreen({ navigation }) {
  const [weather, setWeather] = useState(null);
  const [tide, setTide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedObs, setSelectedObs] = useState(OBS_LIST[0]);
  const [obsModal, setObsModal] = useState(false);
  const [obsSearch, setObsSearch] = useState('');
  const [detailModal, setDetailModal] = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [editNicknameModal, setEditNicknameModal] = useState(false);
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const [userNickname, setUserNickname] = useState('낚시꾼');
  const [nicknameInput, setNicknameInput] = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');

  useEffect(() => { initLocation(); loadUserNickname(); }, []);

  const loadUserNickname = async () => {
    try {
      const snap = await getDoc(doc(db, 'users', auth.currentUser?.uid));
      if (snap.exists()) setUserNickname(snap.data().nickname || '낚시꾼');
    } catch (e) {}
  };

  const saveNickname = async () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed) { Alert.alert('알림', '닉네임을 입력해주세요!'); return; }
    try {
      await updateDoc(doc(db, 'users', auth.currentUser?.uid), { nickname: trimmed });
      setUserNickname(trimmed);
      setEditNicknameModal(false);
    } catch (e) { Alert.alert('오류', '저장에 실패했어요.'); }
  };

  const changePassword = async () => {
    if (!currentPw || !newPw) { Alert.alert('알림', '모두 입력해주세요.'); return; }
    if (newPw.length < 6) { Alert.alert('알림', '새 비밀번호는 6자 이상이어야 해요.'); return; }
    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, currentPw);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPw);
      Alert.alert('완료', '비밀번호가 변경됐어요.');
      setChangePasswordModal(false);
      setCurrentPw('');
      setNewPw('');
    } catch (e) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        Alert.alert('오류', '현재 비밀번호가 틀렸어요.');
      } else {
        Alert.alert('오류', '비밀번호 변경에 실패했어요.');
      }
    }
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃 할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut(auth) },
    ]);
  };

  const initLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const nearest = getNearestObs(loc.coords.latitude, loc.coords.longitude);
        setSelectedObs(nearest);
        await Promise.all([fetchWeatherByCoords(nearest.lat, nearest.lon), fetchTideByObs(nearest.code)]);
      } else {
        await Promise.all([fetchWeatherByCoords(OBS_LIST[0].lat, OBS_LIST[0].lon), fetchTideByObs(OBS_LIST[0].code)]);
      }
    } catch (e) {
      console.error('초기화 오류:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeatherByCoords = async (lat, lon) => {
    try {
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric&lang=kr`);
      const data = await res.json();
      if (data && data.main) setWeather(data);
    } catch (e) { console.error('날씨 오류:', e); }
  };

  const fetchTideByObs = async (obsCode) => {
    try {
      const today = new Date();
      const todayStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
      const url = `https://apis.data.go.kr/1192136/surveyTideLevel/GetSurveyTideLevelApiService?serviceKey=${TIDE_API_KEY}&type=json&obsCode=${obsCode}&reqDate=${todayStr}&min=60&pageNo=1&numOfRows=24`;
      const res = await fetch(url);
      const data = await res.json();
      const items = data?.body?.items?.item;
      if (items && items.length > 0) setTide(items);
      else setTide(null);
    } catch (e) { setTide(null); }
  };

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchWeatherByCoords(selectedObs.lat, selectedObs.lon), fetchTideByObs(selectedObs.code)]);
    setLoading(false);
  };

  const autoSelectObs = async () => {
    setObsModal(false);
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const nearest = getNearestObs(loc.coords.latitude, loc.coords.longitude);
        setSelectedObs(nearest);
        await Promise.all([fetchWeatherByCoords(nearest.lat, nearest.lon), fetchTideByObs(nearest.code)]);
      }
    } catch (e) { console.error('위치 오류:', e); }
    finally { setLoading(false); }
  };

  const changeObs = async (obs) => {
    setObsModal(false);
    setObsSearch('');
    setSelectedObs(obs);
    setLoading(true);
    await Promise.all([fetchWeatherByCoords(obs.lat, obs.lon), fetchTideByObs(obs.code)]);
    setLoading(false);
  };

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

  // 만조/간조 피크 감지
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

  // 낚시 종합 점수 (바람 + 물때 + 시간대)
  const getFishingScore = (windSpeed, tideItems) => {
    let score = 70;
    if (windSpeed <= 2) score += 20;
    else if (windSpeed <= 4) score += 10;
    else if (windSpeed <= 6) score -= 10;
    else if (windSpeed <= 8) score -= 25;
    else score -= 45;

    if (tideItems) {
      const events = findTideEvents(tideItems);
      const nowHour = new Date().getHours();
      const nearChange = events.some(e => Math.abs(parseInt(e.time.split(':')[0] || 0, 10) - nowHour) <= 1);
      if (nearChange) score += 15;
    }

    const hour = new Date().getHours();
    if ((hour >= 5 && hour <= 7) || (hour >= 17 && hour <= 19)) score += 10;
    return Math.max(0, Math.min(100, score));
  };

  const getScoreGrade = (score) => {
    if (score >= 85) return { grade: 'A', label: '낚시 최적 🔥', color: '#2a9fc4' };
    if (score >= 70) return { grade: 'B', label: '낚시 양호 👍', color: '#4caf50' };
    if (score >= 50) return { grade: 'C', label: '낚시 보통 😐', color: '#f4a826' };
    return { grade: 'D', label: '낚시 비추 💨', color: '#e05c1a' };
  };

  const getCurrentTideSlice = (items) => {
    const nowHour = new Date().getHours();
    const idx = items.findIndex((item) => parseInt(item.obsrvnDt?.split(' ')[1]?.split(':')[0] || '0', 10) >= nowHour);
    const start = Math.max(0, idx === -1 ? items.length - 4 : idx - 1);
    return items.slice(start, start + 6);
  };

  const filteredObs = OBS_LIST.filter((o) => o.name.includes(obsSearch));

  const renderWeatherCard = () => {
    if (loading) {
      return (
        <View style={styles.loadingCard}>
          <ActivityIndicator color="#f4a826" size="large" />
          <Text style={{ color: 'rgba(255,255,255,0.65)', marginTop: 10, fontSize: 13 }}>날씨 & 조위 불러오는 중...</Text>
        </View>
      );
    }
    if (!weather) {
      return (
        <View style={styles.loadingCard}>
          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>날씨 정보를 불러올 수 없어요</Text>
          <TouchableOpacity onPress={fetchAll} style={{ marginTop: 10 }}>
            <Text style={{ color: '#f4a826', fontSize: 13 }}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const temp = Math.round(weather.main.temp);
    const tempMin = Math.round(weather.main.temp_min);
    const tempMax = Math.round(weather.main.temp_max);
    const feelsLike = Math.round(weather.main.feels_like);
    const humidity = weather.main.humidity;
    const windSpeed = Math.round(weather.wind.speed);
    const clouds = weather.clouds.all;
    const conditionMain = weather.weather[0].main;
    const conditionDesc = weather.weather[0].description;
    const score = getFishingScore(weather.wind.speed, tide);
    const grade = getScoreGrade(score);
    const tideSlice = tide ? getCurrentTideSlice(tide) : [];
    const tideEvents = tide ? findTideEvents(tide) : [];

    return (
      <TouchableOpacity style={styles.weatherCard} onPress={() => setDetailModal(true)} activeOpacity={0.9}>
        {/* 위치 & 버튼 */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={styles.weatherLocation}>📍 {selectedObs.name}</Text>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); autoSelectObs(); }} style={styles.obsBtn}>
              <Text style={styles.obsBtnText}>📍 내 위치</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); setObsModal(true); }} style={[styles.obsBtn, { marginLeft: 6 }]}>
              <Text style={styles.obsBtnText}>🔍 검색</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.weatherTop}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <Text style={styles.weatherTemp}>{temp}°C</Text>
              <Text style={{ fontSize: 32, marginLeft: 8, marginBottom: 4 }}>{getConditionEmoji(conditionMain)}</Text>
            </View>
            <Text style={styles.weatherCondition}>{conditionDesc} · 바람 {windSpeed}m/s</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={[styles.scoreBadge, { borderColor: grade.color, backgroundColor: `${grade.color}22` }]}>
              <Text style={[styles.scoreGrade, { color: grade.color }]}>{grade.grade}급 · {score}점</Text>
              <Text style={[styles.scoreLabel, { color: grade.color }]}>{grade.label}</Text>
            </View>
            <Text style={styles.subText}>습도 {humidity}% · 체감 {feelsLike}°C</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          {[
            { label: '최저', value: `${tempMin}°C` },
            { label: '최고', value: `${tempMax}°C` },
            { label: '풍속', value: `${windSpeed}m/s` },
            { label: '구름', value: `${clouds}%` },
          ].map((item, i) => (
            <View key={item.label} style={[styles.statItem, i > 0 && { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.12)' }]}>
              <Text style={styles.statLabel}>{item.label}</Text>
              <Text style={styles.statValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.tideSection}>
          <Text style={styles.tideSectionTitle}>🌊 오늘의 조위</Text>
          {tideSlice.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {tideSlice.map((item, i) => {
                const time = item.obsrvnDt?.split(' ')[1]?.slice(0, 5) || '-';
                const actual = item.bscTdlvHgt;
                const predicted = item.tdlvHgt;
                const nowHour = new Date().getHours();
                const itemHour = parseInt(item.obsrvnDt?.split(' ')[1]?.split(':')[0] || '0', 10);
                const isCurrent = itemHour === nowHour;
                return (
                  <View key={i} style={[styles.tideItem, isCurrent && styles.tideItemCurrent]}>
                    <Text style={[styles.tideTime, isCurrent && { color: '#f4a826' }]}>{time}</Text>
                    <Text style={styles.tideActual}>{actual ? `${actual}cm` : '-'}</Text>
                    <Text style={styles.tidePredicted}>예측 {predicted ? `${Math.round(predicted)}` : '-'}</Text>
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', paddingVertical: 10 }}>조위 데이터가 없어요</Text>
          )}

          {/* 만조/간조 시간 */}
          {tideEvents.length > 0 && (
            <View style={styles.tideEventsRow}>
              {tideEvents.map((e, i) => (
                <View key={i} style={styles.tideEventItem}>
                  <Text style={{ color: e.type === '만조' ? '#2a9fc4' : 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '600' }}>
                    {e.type === '만조' ? '🔵' : '⚪'} {e.type}
                  </Text>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 2 }}>{e.time}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{e.height}cm</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ alignItems: 'center', marginTop: 10 }}>
          <Text style={{ color: '#2a9fc4', fontSize: 12 }}>📅 일자별 상세 예보 보기 →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>오늘의 낚시</Text>
            <Text style={styles.title}>안녕하세요, {userNickname}님 👋</Text>
          </View>
          <TouchableOpacity style={styles.avatar} onPress={() => setProfileModal(true)}>
            <Text style={{ fontSize: 20 }}>🎣</Text>
          </TouchableOpacity>
        </View>

        {renderWeatherCard()}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>빠른 시작</Text>
          <View style={styles.quickGrid}>
            {[
              { icon: '🗺️', title: '낚시 포인트', sub: '내 주변 명소', screen: 'Map' },
              { icon: '📔', title: '낚시 일지', sub: '기록 & 추억', screen: 'Log' },
              { icon: '🐟', title: '어종 도감', sub: '어종 & 공략법', screen: 'Fish' },
              { icon: '👥', title: '커뮤니티', sub: '낚시인 모임', screen: 'Community' },
            ].map((a) => (
              <TouchableOpacity key={a.title} style={styles.quickCard} onPress={() => navigation.navigate(a.screen)} activeOpacity={0.7}>
                <Text style={{ fontSize: 28, marginBottom: 8 }}>{a.icon}</Text>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '500' }}>{a.title}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 2 }}>{a.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* 일자별 상세 예보 모달 */}
      <Modal visible={detailModal} animationType="slide" onRequestClose={() => setDetailModal(false)}>
        <WeatherDetailScreen obs={selectedObs} onClose={() => setDetailModal(false)} />
      </Modal>

      {/* 프로필 모달 */}
      <Modal visible={profileModal} transparent animationType="slide" onRequestClose={() => setProfileModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🎣 {userNickname}</Text>
              <TouchableOpacity onPress={() => setProfileModal(false)}>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.profileMenuItem} onPress={() => { setNicknameInput(userNickname); setEditNicknameModal(true); setProfileModal(false); }}>
              <Text style={styles.profileMenuIcon}>✏️</Text>
              <Text style={styles.profileMenuText}>정보 수정</Text>
              <Text style={styles.profileMenuArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileMenuItem} onPress={() => { setChangePasswordModal(true); setProfileModal(false); }}>
              <Text style={styles.profileMenuIcon}>🔑</Text>
              <Text style={styles.profileMenuText}>비밀번호 변경</Text>
              <Text style={styles.profileMenuArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.profileMenuItem, { borderBottomWidth: 0 }]} onPress={() => { setProfileModal(false); handleLogout(); }}>
              <Text style={styles.profileMenuIcon}>🚪</Text>
              <Text style={[styles.profileMenuText, { color: '#e05c1a' }]}>로그아웃</Text>
              <Text style={styles.profileMenuArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 닉네임 수정 모달 */}
      <Modal visible={editNicknameModal} transparent animationType="slide" onRequestClose={() => setEditNicknameModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ 정보 수정</Text>
              <TouchableOpacity onPress={() => setEditNicknameModal(false)}>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginBottom: 12 }}>변경할 닉네임을 입력해주세요</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="닉네임 (최대 12자)"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={nicknameInput}
              onChangeText={setNicknameInput}
              maxLength={12}
              autoFocus
            />
            <TouchableOpacity style={styles.modalSubmitBtn} onPress={saveNickname}>
              <Text style={styles.modalSubmitText}>저장</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 비밀번호 변경 모달 */}
      <Modal visible={changePasswordModal} transparent animationType="slide" onRequestClose={() => setChangePasswordModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔑 비밀번호 변경</Text>
              <TouchableOpacity onPress={() => setChangePasswordModal(false)}>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.modalInput, { marginBottom: 10 }]}
              placeholder="현재 비밀번호"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={currentPw}
              onChangeText={setCurrentPw}
              secureTextEntry
              autoFocus
            />
            <TextInput
              style={styles.modalInput}
              placeholder="새 비밀번호 (6자 이상)"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={newPw}
              onChangeText={setNewPw}
              secureTextEntry
            />
            <TouchableOpacity style={styles.modalSubmitBtn} onPress={changePassword}>
              <Text style={styles.modalSubmitText}>변경하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 관측소 선택 모달 */}
      <Modal visible={obsModal} transparent animationType="slide" onRequestClose={() => setObsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🌊 지역 선택</Text>
              <TouchableOpacity onPress={() => setObsModal(false)}>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.autoBtn} onPress={autoSelectObs}>
              <Text style={styles.autoBtnText}>📍 내 위치에서 가장 가까운 지역 자동 선택</Text>
            </TouchableOpacity>
            <View style={styles.searchWrap}>
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>🔍</Text>
              <TextInput style={styles.searchInput} placeholder="지역 이름 검색..." placeholderTextColor="rgba(255,255,255,0.4)" value={obsSearch} onChangeText={setObsSearch} />
            </View>
            <FlatList
              data={filteredObs}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.obsItem, selectedObs.code === item.code && styles.obsItemActive]} onPress={() => changeObs(item)}>
                  <Text style={[styles.obsItemText, selectedObs.code === item.code && { color: '#f4a826', fontWeight: '600' }]}>
                    {selectedObs.code === item.code ? '✅ ' : ''}{item.name}
                  </Text>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 350 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a2a3a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  greeting: { color: 'rgba(255,255,255,0.65)', fontSize: 12, letterSpacing: 1 },
  title: { color: '#fff', fontSize: 22, fontWeight: '600', marginTop: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1a6a8a', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#2a9fc4' },
  loadingCard: { margin: 16, backgroundColor: '#1a6a8a', borderRadius: 16, padding: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center' },
  weatherCard: { margin: 16, backgroundColor: '#1a6a8a', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  weatherLocation: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '500' },
  weatherTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  weatherTemp: { color: '#fff', fontSize: 36, fontWeight: '600' },
  weatherCondition: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },
  scoreBadge: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 6, alignItems: 'center' },
  scoreGrade: { fontSize: 12, fontWeight: '700' },
  scoreLabel: { fontSize: 10, marginTop: 2 },
  subText: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 2 },
  obsBtn: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  obsBtnText: { color: '#fff', fontSize: 11 },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', paddingTop: 12, marginBottom: 12 },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 10 },
  statValue: { color: '#fff', fontSize: 13, fontWeight: '500', marginTop: 2 },
  tideSection: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', paddingTop: 12 },
  tideSectionTitle: { color: '#fff', fontSize: 12, fontWeight: '600' },
  tideItem: { alignItems: 'center', marginRight: 16, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  tideItemCurrent: { backgroundColor: 'rgba(244,168,38,0.15)', borderWidth: 1, borderColor: '#f4a826' },
  tideTime: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginBottom: 4 },
  tideActual: { color: '#fff', fontSize: 14, fontWeight: '600' },
  tidePredicted: { color: '#2a9fc4', fontSize: 10, marginTop: 2 },
  tideEventsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  tideEventItem: { alignItems: 'center', marginRight: 20, marginBottom: 4 },
  section: { paddingHorizontal: 16, marginTop: 8 },
  sectionLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 11, letterSpacing: 1, marginBottom: 10 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  quickCard: { width: '48%', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 14, marginBottom: 10 },
modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0e4060', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  autoBtn: { backgroundColor: 'rgba(244,168,38,0.15)', borderWidth: 1, borderColor: '#f4a826', borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 12 },
  autoBtnText: { color: '#f4a826', fontSize: 13, fontWeight: '500' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10 },
  searchInput: { flex: 1, color: '#fff', fontSize: 13, marginLeft: 8 },
  obsItem: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  obsItemActive: { backgroundColor: 'rgba(244,168,38,0.08)' },
  obsItemText: { color: '#fff', fontSize: 14 },
  profileMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  profileMenuIcon: { fontSize: 18, width: 32 },
  profileMenuText: { flex: 1, color: '#fff', fontSize: 15 },
  profileMenuArrow: { color: 'rgba(255,255,255,0.4)', fontSize: 20 },
  modalInput: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 14, color: '#fff', fontSize: 14, marginBottom: 12 },
  modalSubmitBtn: { backgroundColor: '#f4a826', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  modalSubmitText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
