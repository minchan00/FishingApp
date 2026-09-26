import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import HomeSheet from '@/components/home/HomeSheet';
import NicknameEditModal from '@/components/home/NicknameEditModal';
import ObsPickerModal from '@/components/home/ObsPickerModal';
import PasswordChangeModal from '@/components/home/PasswordChangeModal';
import WeatherDetailModal from '@/components/WeatherDetailModal';
import { deleteAccount, signOut } from '@/data/auth';
import {
  DEFAULT_OBS, getConditionEmoji, getCurrentTideSlice, getFishingScore,
  getScoreGrade, kstHourNow, kstYmd, locateNearestObs, tideHour, tideTime, type ObsStation,
} from '@/data/weather';
import { useProfile } from '@/hooks/queries';
import { useUser } from '@/hooks/useSession';
import { useCurrentWeather, useTide, useTideForecastWeek } from '@/hooks/useWeather';
import { colors } from '@/theme/colors';

const QUICK_ACTIONS: { icon: string; title: string; sub: string; href: Href }[] = [
  { icon: '🗺️', title: '낚시 포인트', sub: '내 주변 명소', href: '/map' },
  { icon: '📔', title: '낚시 일지', sub: '기록 & 추억', href: '/log' },
  { icon: '🐟', title: '어종 도감', sub: '어종 & 공략법', href: '/fish' },
  { icon: '👥', title: '커뮤니티', sub: '낚시인 모임', href: '/community' },
];

const MENU_ITEM = 'flex-row items-center py-4';
const MENU_ITEM_DIVIDER = 'border-b border-white/[0.08]';

export default function HomeScreen() {
  const user = useUser();
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
  const [profileModal, setProfileModal] = useState(false);
  const [editNicknameModal, setEditNicknameModal] = useState(false);
  const [changePasswordModal, setChangePasswordModal] = useState(false);

  useEffect(() => {
    locateNearestObs()
      .catch((e: unknown) => { console.error('위치 오류:', e); return null; })
      .then((nearest) => setSelectedObs(nearest ?? DEFAULT_OBS));
  }, []);

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
    setSelectedObs(next);
  };

  const refetchAll = () => { weather.refetch(); tide.refetch(); tideForecast.refetch(); };

  const renderWeatherCard = () => {
    if (locating || weather.isPending || tide.isPending || tideForecast.isPending) {
      return (
        <View className="m-4 bg-ocean-surface rounded-2xl p-[30px] border border-card-border items-center">
          <ActivityIndicator color={colors.accent} size="large" />
          <Text className="text-muted mt-2.5 text-[13px]">날씨 & 조위 불러오는 중...</Text>
        </View>
      );
    }
    if (!weather.data) {
      return (
        <View className="m-4 bg-ocean-surface rounded-2xl p-[30px] border border-card-border items-center">
          <Text className="text-muted text-[13px]">날씨 정보를 불러올 수 없어요</Text>
          <TouchableOpacity onPress={refetchAll} className="mt-2.5">
            <Text className="text-accent text-[13px]">다시 시도</Text>
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
      <TouchableOpacity
        className="m-4 bg-ocean-surface rounded-2xl p-4 border border-card-border"
        onPress={() => setDetailModal(true)}
        activeOpacity={0.9}
      >
        {/* 위치 & 버튼 */}
        <View className="flex-row justify-between items-center mb-2.5">
          <Text className="text-muted text-[12px] font-medium">📍 {obs.name}</Text>
          <View className="flex-row">
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); autoSelectObs(); }} className="bg-white/10 rounded-lg px-2 py-1">
              <Text className="text-white text-[11px]">📍 내 위치</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); setObsModal(true); }} className="bg-white/10 rounded-lg px-2 py-1 ml-1.5">
              <Text className="text-white text-[11px]">🔍 검색</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-row justify-between items-start mb-3">
          <View>
            <View className="flex-row items-end">
              <Text className="text-white text-[36px] font-semibold">{temp}°C</Text>
              <Text className="text-[32px] ml-2 mb-1">{getConditionEmoji(w.weather[0]?.main)}</Text>
            </View>
            <Text className="text-muted text-[12px] mt-0.5">{w.weather[0]?.description} · 바람 {windSpeed}m/s</Text>
          </View>
          <View className="items-end">
            {/* 등급 색은 점수에 따라 달라지므로 style로 준다 */}
            <View
              className="border rounded-[10px] px-2.5 py-1.5 mb-1.5 items-center"
              style={{ borderColor: grade.color, backgroundColor: `${grade.color}22` }}
            >
              <Text className="text-[12px] font-bold" style={{ color: grade.color }}>{grade.grade}급 · {score}점</Text>
              <Text className="text-[10px] mt-0.5" style={{ color: grade.color }}>{grade.label}</Text>
            </View>
            <Text className="text-muted text-[11px] mt-0.5">습도 {w.main.humidity}% · 체감 {feelsLike}°C</Text>
          </View>
        </View>

        <View className="flex-row border-t border-card-border pt-3 mb-3">
          {[
            { label: '최저', value: `${tempMin}°C` },
            { label: '최고', value: `${tempMax}°C` },
            { label: '풍속', value: `${windSpeed}m/s` },
            { label: '구름', value: `${w.clouds.all}%` },
          ].map((item, i) => (
            <View key={item.label} className={`flex-1 items-center ${i > 0 ? 'border-l border-card-border' : ''}`}>
              <Text className="text-muted text-[10px]">{item.label}</Text>
              <Text className="text-white text-[13px] font-medium mt-0.5">{item.value}</Text>
            </View>
          ))}
        </View>

        <View className="border-t border-card-border pt-3">
          <Text className="text-white text-[12px] font-semibold">🌊 오늘의 조위</Text>
          {tideSlice.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
              {tideSlice.map((item, i) => {
                const isCurrent = tideHour(item) === nowHour;
                return (
                  <View
                    key={i}
                    className={`items-center mr-4 px-2 py-1.5 rounded-lg ${isCurrent ? 'bg-accent/15 border border-accent' : ''}`}
                  >
                    <Text className={`text-[11px] mb-1 ${isCurrent ? 'text-accent' : 'text-muted'}`}>{tideTime(item)}</Text>
                    <Text className="text-white text-[14px] font-semibold">{item.bscTdlvHgt ? `${item.bscTdlvHgt}cm` : '-'}</Text>
                    <Text className="text-ocean-light text-[10px] mt-0.5">예측 {item.tdlvHgt ? `${Math.round(Number(item.tdlvHgt))}` : '-'}</Text>
                  </View>
                );
              })}
            </ScrollView>
          ) : tideEvents.length === 0 ? (
            <Text className="text-white/40 text-[12px] text-center py-2.5">조위 데이터가 없어요</Text>
          ) : null}

          {/* 만조/간조 시간 */}
          {tideEvents.length > 0 && (
            <View className="flex-row flex-wrap mt-3 pt-2.5 border-t border-white/[0.08]">
              {tideEvents.map((e, i) => (
                <View key={i} className="items-center mr-5 mb-1">
                  <Text className={`text-[11px] font-semibold ${e.type === '만조' ? 'text-ocean-light' : 'text-muted'}`}>
                    {e.type === '만조' ? '🔵' : '⚪'} {e.type}
                  </Text>
                  <Text className="text-white text-[12px] font-semibold mt-0.5">{e.time}</Text>
                  <Text className="text-white/50 text-[10px]">{e.height}cm</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View className="items-center mt-2.5">
          <Text className="text-ocean-light text-[12px]">📅 일자별 상세 예보 보기 →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-ocean-deep">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="flex-row justify-between items-center px-5 pt-14 pb-2">
          <View>
            <Text className="text-muted text-[12px] tracking-[1px]">오늘의 낚시</Text>
            <Text className="text-white text-[22px] font-semibold mt-0.5">안녕하세요, {userNickname}님 👋</Text>
          </View>
          <TouchableOpacity
            className="w-11 h-11 rounded-[22px] bg-ocean-surface items-center justify-center border-2 border-ocean-light"
            onPress={() => setProfileModal(true)}
          >
            <Text className="text-[20px]">🎣</Text>
          </TouchableOpacity>
        </View>

        {renderWeatherCard()}

        <View className="px-4 mt-2">
          <Text className="text-muted text-[11px] tracking-[1px] mb-2.5">빠른 시작</Text>
          <View className="flex-row flex-wrap justify-between">
            {QUICK_ACTIONS.map((a) => (
              <TouchableOpacity
                key={a.title}
                className="w-[48%] bg-card border border-card-border rounded-[14px] p-3.5 mb-2.5"
                onPress={() => router.push(a.href)}
                activeOpacity={0.7}
              >
                <Text className="text-[28px] mb-2">{a.icon}</Text>
                <Text className="text-white text-[13px] font-medium">{a.title}</Text>
                <Text className="text-muted text-[11px] mt-0.5">{a.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="h-[30px]" />
      </ScrollView>

      {/* 일자별 상세 예보 모달 */}
      <Modal visible={detailModal} animationType="slide" onRequestClose={() => setDetailModal(false)}>
        <WeatherDetailModal obs={obs} onClose={() => setDetailModal(false)} />
      </Modal>

      {/* 프로필 모달 */}
      <HomeSheet visible={profileModal} title={`🎣 ${userNickname}`} onClose={() => setProfileModal(false)}>
        <TouchableOpacity className={`${MENU_ITEM} ${MENU_ITEM_DIVIDER}`} onPress={() => { setEditNicknameModal(true); setProfileModal(false); }}>
          <Text className="text-[18px] w-8">✏️</Text>
          <Text className="flex-1 text-white text-[15px]">정보 수정</Text>
          <Text className="text-white/40 text-[20px]">›</Text>
        </TouchableOpacity>
        <TouchableOpacity className={`${MENU_ITEM} ${MENU_ITEM_DIVIDER}`} onPress={() => { setChangePasswordModal(true); setProfileModal(false); }}>
          <Text className="text-[18px] w-8">🔑</Text>
          <Text className="flex-1 text-white text-[15px]">비밀번호 변경</Text>
          <Text className="text-white/40 text-[20px]">›</Text>
        </TouchableOpacity>
        <TouchableOpacity className={`${MENU_ITEM} ${MENU_ITEM_DIVIDER}`} onPress={() => { setProfileModal(false); handleLogout(); }}>
          <Text className="text-[18px] w-8">🚪</Text>
          <Text className="flex-1 text-accent-2 text-[15px]">로그아웃</Text>
          <Text className="text-white/40 text-[20px]">›</Text>
        </TouchableOpacity>
        <TouchableOpacity className={MENU_ITEM} onPress={() => { setProfileModal(false); handleDeleteAccount(); }}>
          <Text className="text-[18px] w-8">⚠️</Text>
          <Text className="flex-1 text-white/40 text-[13px]">회원 탈퇴</Text>
          <Text className="text-white/40 text-[20px]">›</Text>
        </TouchableOpacity>
      </HomeSheet>

      {/* 닉네임 수정 모달 */}
      <NicknameEditModal
        visible={editNicknameModal}
        currentNickname={userNickname}
        onClose={() => setEditNicknameModal(false)}
      />

      {/* 비밀번호 변경 모달 */}
      <PasswordChangeModal
        visible={changePasswordModal}
        email={user.email}
        onClose={() => setChangePasswordModal(false)}
      />

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
