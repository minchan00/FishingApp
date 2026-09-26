import { useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { signIn, signInWithKakao, signUp } from '@/data/auth';
import { captureError } from '@/lib/sentry';
import { colors } from '@/theme/colors';

// 카카오 로그인 디자인 가이드: 컨테이너 #FEE500, 레이블 검정(85%)
const KAKAO_YELLOW = '#FEE500';
const KAKAO_LABEL = 'rgba(0,0,0,0.85)';

type Mode = 'login' | 'register';

// 로그인에 성공하면 루트 레이아웃이 세션 변화를 보고 탭 화면으로 전환한다
export default function SignInScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(false);
  const busy = loading || kakaoLoading;

  const handleKakao = async () => {
    setKakaoLoading(true);
    try {
      await signInWithKakao();
    } catch (e) {
      captureError(e, { where: 'signInWithKakao' });
      Alert.alert('카카오 로그인 실패', e instanceof Error ? e.message : '카카오 로그인에 실패했어요. 다시 시도해주세요.');
    } finally {
      setKakaoLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('알림', '이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (e) {
      Alert.alert('로그인 실패', e instanceof Error ? e.message : '이메일 또는 비밀번호가 올바르지 않아요.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !nickname.trim()) {
      Alert.alert('알림', '모든 항목을 입력해주세요.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('알림', '비밀번호는 8자 이상이어야 해요.');
      return;
    }
    setLoading(true);
    try {
      const { needsEmailConfirm } = await signUp(email, password, nickname);
      if (needsEmailConfirm) {
        Alert.alert('📧 이메일을 확인해주세요', `${email.trim()}로 보낸 인증 메일의 링크를 누른 뒤 로그인해주세요.`);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      Alert.alert('오류', message.includes('이미 사용 중') ? message : '회원가입에 실패했어요. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>🎣</Text>
        <Text style={styles.appName}>낚시 일지</Text>
        <Text style={styles.sub}>바다와 함께하는 낚시 기록</Text>

        <TouchableOpacity style={styles.kakaoBtn} onPress={handleKakao} disabled={busy} accessibilityRole="button">
          {kakaoLoading
            ? <ActivityIndicator color={KAKAO_LABEL} />
            : <Text style={styles.kakaoBtnText}>카카오로 시작하기</Text>}
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>또는 이메일로</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tab, mode === 'login' && styles.tabActive]} onPress={() => setMode('login')}>
            <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>로그인</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, mode === 'register' && styles.tabActive]} onPress={() => setMode('register')}>
            <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>회원가입</Text>
          </TouchableOpacity>
        </View>

        {mode === 'register' && (
          <TextInput
            style={styles.input}
            placeholder="닉네임 (최대 12자)"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={nickname}
            onChangeText={setNickname}
            maxLength={12}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="이메일"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="비밀번호 (8자 이상)"
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.submitBtn} onPress={mode === 'login' ? handleLogin : handleRegister} disabled={busy}>
          {loading
            ? <ActivityIndicator color={colors.white} />
            : <Text style={styles.submitBtnText}>{mode === 'login' ? '로그인' : '회원가입'}</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')} style={{ marginTop: 16 }}>
          <Text style={styles.switchText}>
            {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.oceanDeep, alignItems: 'center', justifyContent: 'center', padding: 32 },
  logo: { fontSize: 64, marginBottom: 8 },
  appName: { color: colors.white, fontSize: 26, fontWeight: '700', marginBottom: 6 },
  sub: { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginBottom: 40 },
  kakaoBtn: { width: '100%', backgroundColor: KAKAO_YELLOW, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  kakaoBtnText: { color: KAKAO_LABEL, fontSize: 16, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 24 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.25)' },
  dividerText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginHorizontal: 12 },
  tabRow: { flexDirection: 'row', backgroundColor: colors.cardBg, borderRadius: 14, padding: 4, marginBottom: 24, width: '100%' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
  tabActive: { backgroundColor: colors.accent },
  tabText: { color: 'rgba(255,255,255,0.55)', fontSize: 14, fontWeight: '500' },
  tabTextActive: { color: colors.white, fontWeight: '700' },
  input: { width: '100%', backgroundColor: colors.cardBg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 16, color: colors.white, fontSize: 14, marginBottom: 12 },
  submitBtn: { width: '100%', backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  switchText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, textDecorationLine: 'underline' },
});
