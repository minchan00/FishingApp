import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import WeatherDetailModal from '@/components/WeatherDetailModal';
import { changePassword, deleteAccount, signOut } from '@/data/auth';
import {
  DEFAULT_OBS, OBS_LIST, getConditionEmoji, getCurrentTideSlice, getFishingScore,
  getScoreGrade, kstHourNow, kstYmd, locateNearestObs, tideHour, tideTime, type ObsStation,
} from '@/data/weather';
import { useProfile, useUpdateNickname } from '@/hooks/queries';
import { useUser } from '@/hooks/useSession';
import { useCurrentWeather, useTide, useTideForecastWeek } from '@/hooks/useWeather';
import { colors } from '@/theme/colors';

const QUICK_ACTIONS: { icon: string; title: string; sub: string; href: Href }[] = [
  { icon: '🗺️', title: '낚시 포인트', sub: '내 주변 명소', href: '/map' },
  { icon: '📔', title: '낚시 일지', sub: '기록 & 추억', href: '/log' },
  { icon: '🐟', title: '어종 도감', sub: '어종 & 공략법', href: '/fish' },
  { icon: '👥', title: '커뮤니티', sub: '낚시인 모임', href: '/community' },
];

export default function HomeScreen() {
  const user = useUser();
  const profile = useProfile();
  const updateNickname = useUpdateNickname();
  const userNickname = profile.data?.nickname || '낚시꾼';

  // null이면 아직 위치를 확인 중 — 그동안은 조회하지 않는다
  const [selectedObs, setSelectedObs] = useState<ObsStation | null>(null);
  const [locating, setLocating] = useState(false);
  const weather = useCurrentWeather(selectedObs);
  const tide = useTide(selectedObs);
  const tideForecast = useTideForecastWeek(selectedObs);
  const obs = selectedObs ?? DEFAULT_OBS;

  const [obsModal, setObsModal] = useState(false);
  const [obsSearch, setObsSearch] = useState('');
  const [detailModal, setDetailModal] = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [editNicknameModal, setEditNicknameModal] = useState(false);
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');

  useEffect(() => {
    locateNearestObs()
      .catch((e: unknown) => { console.error('위치 오류:', e); return null; })
      .then((nearest) => setSelectedObs(nearest ?? DEFAULT_OBS));
  }, []);

  const saveNickname = () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed) { Alert.alert('알림', '닉네임을 입력해주세요!'); return; }
    updateNickname.mutate(trimmed, {
      onSuccess: () => setEditNicknameModal(false),
      onError: () => Alert.alert('오류', '저장에 실패했어요.'),
    });
  };

  const submitPasswordChange = async () => {
    if (!currentPw || !newPw) { Alert.alert('알림', '모두 입력해주세요.'); return; }
    if (newPw.length < 6) { Alert.alert('알림', '새 비밀번호는 6자 이상이어야 해요.'); return; }
    try {
      await changePassword(user.email!, currentPw, newPw);
      Alert.alert('완료', '비밀번호가 변경됐어요.');
      setChangePasswordModal(false);
      setCurrentPw('');
      setNewPw('');
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '비밀번호 변경에 실패했어요.');
    }
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '로그아웃 할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃', style: 'destructive',
        onPress: () => signOut().catch((e: unknown) => Alert.alert('오류', e instanceof Error ? e.message : '로그아웃에 실패했어요.')),
      },
    ]);
  };

  // 되돌릴 수 없는 작업이라 두 번 확인한다
  const handleDeleteAccount = () => {
    Alert.alert('회원 탈퇴', '탈퇴하면 그동안 기록한 낚시 일지, 게시글, 사진이 모두 영구 삭제되고 복구할 수 없어요.\n계속할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '계속', style: 'destructive',
        onPress: () =>
          Alert.alert('정말 탈퇴할까요?', '모든 데이터가 즉시 삭제돼요. 이 작업은 되돌릴 수 없어요.', [
            { text: '취소', style: 'cancel' },
            {
              text: '탈퇴하기', style: 'destructive',
              onPress: () => deleteAccount().catch((e: unknown) => Alert.alert('오류', e instanceof Error ? e.message : '회원 탈퇴에 실패했어요.')),
            },
          ]),
      },
    ]);
  };

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
    setObsSearch('');
    setSelectedObs(next);
  };

  const refetchAll = () => { weather.refetch(); tide.refetch(); tideForecast.refetch(); };

  const filteredObs = OBS_LIST.filter((o) => o.name.includes(obsSearch));

  const renderWeatherCard = () => {
    if (locating || weather.isPending || tide.isPending || tideForecast.isPending) {
      return (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={{ color: colors.textMuted, marginTop: 10, fontSize: 13 }}>날씨 & 조위 불러오는 중...</Text>
        </View>
      );
    }
    if (!weather.data) {
      return (
        <View style={styles.loadingCard}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>날씨 정보를 불러올 수 없어요</Text>
          <TouchableOpacity onPress={refetchAll} style={{ marginTop: 10 }}>
            <Text style={{ color: colors.accent, fontSize: 13 }}>다시 시도</Text>
          </TouchableOpacity>
        </View>
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
      <TouchableOpacity style={styles.weatherCard} onPress={() => setDetailModal(true)} activeOpacity={0.9}>
        {/* 위치 & 버튼 */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={styles.weatherLocation}>📍 {obs.name}</Text>
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
              <Text style={{ fontSize: 32, marginLeft: 8, marginBottom: 4 }}>{getConditionEmoji(w.weather[0]?.main)}</Text>
            </View>
            <Text style={styles.weatherCondition}>{w.weather[0]?.description} · 바람 {windSpeed}m/s</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={[styles.scoreBadge, { borderColor: grade.color, backgroundColor: `${grade.color}22` }]}>
              <Text style={[styles.scoreGrade, { color: grade.color }]}>{grade.grade}급 · {score}점</Text>
              <Text style={[styles.scoreLabel, { color: grade.color }]}>{grade.label}</Text>
            </View>
            <Text style={styles.subText}>습도 {w.main.humidity}% · 체감 {feelsLike}°C</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          {[
            { label: '최저', value: `${tempMin}°C` },
            { label: '최고', value: `${tempMax}°C` },
            { label: '풍속', value: `${windSpeed}m/s` },
            { label: '구름', value: `${w.clouds.all}%` },
          ].map((item, i) => (
            <View key={item.label} style={[styles.statItem, i > 0 && { borderLeftWidth: 1, borderLeftColor: colors.cardBorder }]}>
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
                const isCurrent = tideHour(item) === nowHour;
                return (
                  <View key={i} style={[styles.tideItem, isCurrent && styles.tideItemCurrent]}>
                    <Text style={[styles.tideTime, isCurrent && { color: colors.accent }]}>{tideTime(item)}</Text>
                    <Text style={styles.tideActual}>{item.bscTdlvHgt ? `${item.bscTdlvHgt}cm` : '-'}</Text>
                    <Text style={styles.tidePredicted}>예측 {item.tdlvHgt ? `${Math.round(Number(item.tdlvHgt))}` : '-'}</Text>
                  </View>
                );
              })}
            </ScrollView>
          ) : tideEvents.length === 0 ? (
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', paddingVertical: 10 }}>조위 데이터가 없어요</Text>
          ) : null}

          {/* 만조/간조 시간 */}
          {tideEvents.length > 0 && (
            <View style={styles.tideEventsRow}>
              {tideEvents.map((e, i) => (
                <View key={i} style={styles.tideEventItem}>
                  <Text style={{ color: e.type === '만조' ? colors.oceanLight : colors.textMuted, fontSize: 11, fontWeight: '600' }}>
                    {e.type === '만조' ? '🔵' : '⚪'} {e.type}
                  </Text>
                  <Text style={{ color: colors.white, fontSize: 12, fontWeight: '600', marginTop: 2 }}>{e.time}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{e.height}cm</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ alignItems: 'center', marginTop: 10 }}>
          <Text style={{ color: colors.oceanLight, fontSize: 12 }}>📅 일자별 상세 예보 보기 →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
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
            {QUICK_ACTIONS.map((a) => (
              <TouchableOpacity key={a.title} style={styles.quickCard} onPress={() => router.push(a.href)} activeOpacity={0.7}>
                <Text style={{ fontSize: 28, marginBottom: 8 }}>{a.icon}</Text>
                <Text style={{ color: colors.white, fontSize: 13, fontWeight: '500' }}>{a.title}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>{a.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* 일자별 상세 예보 모달 */}
      <Modal visible={detailModal} animationType="slide" onRequestClose={() => setDetailModal(false)}>
        <WeatherDetailModal obs={obs} onClose={() => setDetailModal(false)} />
      </Modal>

      {/* 프로필 모달 */}
      <Modal visible={profileModal} transparent animationType="slide" onRequestClose={() => setProfileModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🎣 {userNickname}</Text>
              <TouchableOpacity onPress={() => setProfileModal(false)}>
                <Text style={{ color: colors.textMuted, fontSize: 20 }}>✕</Text>
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
            <TouchableOpacity style={styles.profileMenuItem} onPress={() => { setProfileModal(false); handleLogout(); }}>
              <Text style={styles.profileMenuIcon}>🚪</Text>
              <Text style={[styles.profileMenuText, { color: colors.accent2 }]}>로그아웃</Text>
              <Text style={styles.profileMenuArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.profileMenuItem, { borderBottomWidth: 0 }]} onPress={() => { setProfileModal(false); handleDeleteAccount(); }}>
              <Text style={styles.profileMenuIcon}>⚠️</Text>
              <Text style={[styles.profileMenuText, { color: 'rgba(255,255,255,0.4)', fontSize: 13 }]}>회원 탈퇴</Text>
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
                <Text style={{ color: colors.textMuted, fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 12 }}>변경할 닉네임을 입력해주세요</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="닉네임 (최대 12자)"
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={nicknameInput}
              onChangeText={setNicknameInput}
              maxLength={12}
              autoFocus
            />
            <TouchableOpacity style={styles.modalSubmitBtn} onPress={saveNickname} disabled={updateNickname.isPending}>
              {updateNickname.isPending
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.modalSubmitText}>저장</Text>}
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
                <Text style={{ color: colors.textMuted, fontSize: 20 }}>✕</Text>
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
            <TouchableOpacity style={styles.modalSubmitBtn} onPress={submitPasswordChange}>
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
                <Text style={{ color: colors.textMuted, fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.autoBtn} onPress={autoSelectObs}>
              <Text style={styles.autoBtnText}>📍 내 위치에서 가장 가까운 지역 자동 선택</Text>
            </TouchableOpacity>
            <View style={styles.searchWrap}>
              <Text style={{ fontSize: 14, color: colors.textMuted }}>🔍</Text>
              <TextInput style={styles.searchInput} placeholder="지역 이름 검색..." placeholderTextColor="rgba(255,255,255,0.4)" value={obsSearch} onChangeText={setObsSearch} />
            </View>
            <FlatList
              data={filteredObs}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const active = obs.code === item.code;
                return (
                  <TouchableOpacity style={[styles.obsItem, active && styles.obsItemActive]} onPress={() => changeObs(item)}>
                    <Text style={[styles.obsItemText, active && { color: colors.accent, fontWeight: '600' }]}>
                      {active ? '✅ ' : ''}{item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              style={{ maxHeight: 350 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.oceanDeep },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  greeting: { color: colors.textMuted, fontSize: 12, letterSpacing: 1 },
  title: { color: colors.white, fontSize: 22, fontWeight: '600', marginTop: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.oceanSurface, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.oceanLight },
  loadingCard: { margin: 16, backgroundColor: colors.oceanSurface, borderRadius: 16, padding: 30, borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center' },
  weatherCard: { margin: 16, backgroundColor: colors.oceanSurface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.cardBorder },
  weatherLocation: { color: colors.textMuted, fontSize: 12, fontWeight: '500' },
  weatherTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  weatherTemp: { color: colors.white, fontSize: 36, fontWeight: '600' },
  weatherCondition: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  scoreBadge: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 6, alignItems: 'center' },
  scoreGrade: { fontSize: 12, fontWeight: '700' },
  scoreLabel: { fontSize: 10, marginTop: 2 },
  subText: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  obsBtn: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  obsBtnText: { color: colors.white, fontSize: 11 },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 12, marginBottom: 12 },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { color: colors.textMuted, fontSize: 10 },
  statValue: { color: colors.white, fontSize: 13, fontWeight: '500', marginTop: 2 },
  tideSection: { borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 12 },
  tideSectionTitle: { color: colors.white, fontSize: 12, fontWeight: '600' },
  tideItem: { alignItems: 'center', marginRight: 16, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  tideItemCurrent: { backgroundColor: 'rgba(244,168,38,0.15)', borderWidth: 1, borderColor: colors.accent },
  tideTime: { color: colors.textMuted, fontSize: 11, marginBottom: 4 },
  tideActual: { color: colors.white, fontSize: 14, fontWeight: '600' },
  tidePredicted: { color: colors.oceanLight, fontSize: 10, marginTop: 2 },
  tideEventsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  tideEventItem: { alignItems: 'center', marginRight: 20, marginBottom: 4 },
  section: { paddingHorizontal: 16, marginTop: 8 },
  sectionLabel: { color: colors.textMuted, fontSize: 11, letterSpacing: 1, marginBottom: 10 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  quickCard: { width: '48%', backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 14, padding: 14, marginBottom: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.oceanMid, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: colors.white, fontSize: 16, fontWeight: '600' },
  autoBtn: { backgroundColor: 'rgba(244,168,38,0.15)', borderWidth: 1, borderColor: colors.accent, borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 12 },
  autoBtnText: { color: colors.accent, fontSize: 13, fontWeight: '500' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10 },
  searchInput: { flex: 1, color: colors.white, fontSize: 13, marginLeft: 8 },
  obsItem: { paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  obsItemActive: { backgroundColor: 'rgba(244,168,38,0.08)' },
  obsItemText: { color: colors.white, fontSize: 14 },
  profileMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  profileMenuIcon: { fontSize: 18, width: 32 },
  profileMenuText: { flex: 1, color: colors.white, fontSize: 15 },
  profileMenuArrow: { color: 'rgba(255,255,255,0.4)', fontSize: 20 },
  modalInput: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 14, color: colors.white, fontSize: 14, marginBottom: 12 },
  modalSubmitBtn: { backgroundColor: colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  modalSubmitText: { color: colors.white, fontSize: 15, fontWeight: '600' },
});
