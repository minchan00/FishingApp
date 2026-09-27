import { zodResolver } from '@hookform/resolvers/zod';
import { StatusBar } from 'expo-status-bar';
import { openBrowserAsync } from 'expo-web-browser';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { ArtBackdrop } from '@/components/LoadingScreen';
import { TextField } from '@/components/ui/TextField';
import { LINKS } from '@/constants/links';
import { signIn, signInWithKakao, signUp } from '@/data/auth';
import { captureError } from '@/lib/sentry';
import {
  PASSWORD_MIN, signInSchema, signUpSchema, type AuthFormInput, type AuthFormValues,
} from '@/schemas/auth';
import { NICKNAME_MAX } from '@/schemas/profile';

type Mode = 'login' | 'register';


// 두 모드가 값 모양을 공유하므로 resolver만 바꿔 끼운다
const loginResolver = zodResolver(signInSchema);
const registerResolver = zodResolver(signUpSchema);

// 로그인에 성공하면 루트 레이아웃이 세션 변화를 보고 탭 화면으로 전환한다
export default function SignInScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [kakaoLoading, setKakaoLoading] = useState(false);
  // 처음엔 카카오 버튼과 '이메일로 시작하기'만, 누르면 이메일 입력칸을 펼친다
  const [emailOpen, setEmailOpen] = useState(false);
  const { bottom } = useSafeAreaInsets();

  const {
    control, handleSubmit, clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormInput, unknown, AuthFormValues>({
    resolver: mode === 'login' ? loginResolver : registerResolver,
    defaultValues: { email: '', password: '', nickname: '' },
  });

  const loading = isSubmitting;
  const busy = loading || kakaoLoading;

  const switchMode = (next: Mode) => {
    clearErrors();
    setMode(next);
  };

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

  const handleLogin = async ({ email, password }: AuthFormValues) => {
    try {
      await signIn(email, password);
    } catch (e) {
      Alert.alert('로그인 실패', e instanceof Error ? e.message : '이메일 또는 비밀번호가 올바르지 않아요.');
    }
  };

  const handleRegister = async ({ email, password, nickname }: AuthFormValues) => {
    try {
      const { needsEmailConfirm } = await signUp(email, password, nickname);
      if (needsEmailConfirm) {
        Alert.alert('이메일을 확인해주세요', `${email}로 보낸 인증 메일의 링크를 누른 뒤 로그인해주세요.`);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      Alert.alert('오류', message.includes('이미 사용 중') ? message : '회원가입에 실패했어요. 다시 시도해주세요.');
    }
  };

  const onSubmit = handleSubmit(mode === 'login' ? handleLogin : handleRegister);

  return (
    <View className="flex-1 bg-navy">
      <StatusBar style="light" />
      <ArtBackdrop />

      <KeyboardAvoidingView className="flex-1 justify-end" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="max-h-[78%] rounded-t-[28px] bg-bg" style={{ shadowColor: '#281E14', shadowOpacity: 0.18, shadowRadius: 30, shadowOffset: { width: 0, height: -10 }, elevation: 12 }}>
          <ScrollView
            contentContainerClassName="px-6 pt-7"
            contentContainerStyle={{ paddingBottom: 28 + bottom }}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <Text className="mb-5 text-center font-serif text-[19px] text-ink">오늘, 짬낚 갈까요?</Text>

            {/* 카카오 로그인 디자인 가이드: 컨테이너 #FEE500, 레이블 검정(85%) — Button kakao 변형이 맞춘다 */}
            <Button label="카카오로 시작하기" variant="kakao" icon="message-circle" onPress={handleKakao} loading={kakaoLoading} disabled={busy} />

            {!emailOpen ? (
              <Button label="이메일로 시작하기" variant="light" onPress={() => setEmailOpen(true)} disabled={busy} className="mt-2.5 border border-line" />
            ) : (
              <>
        <View className="my-6 flex-row items-center">
          <View className="flex-1 bg-line" style={{ height: StyleSheet.hairlineWidth }} />
          <Text className="mx-3 text-caption text-mute">이메일로</Text>
          <View className="flex-1 bg-line" style={{ height: StyleSheet.hairlineWidth }} />
        </View>

        <View className="mb-5 flex-row rounded-field bg-surface p-1">
          {(['login', 'register'] as const).map((m) => {
            const active = mode === m;
            return (
              <Pressable
                key={m}
                className={`h-10 flex-1 items-center justify-center rounded-[10px] ${active ? 'bg-card' : ''}`}
                onPress={() => switchMode(m)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text className={`text-label ${active ? 'font-semibold text-ink' : 'font-medium text-mute'}`}>
                  {m === 'login' ? '로그인' : '회원가입'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="gap-4">
          {mode === 'register' && (
            <Controller
              control={control}
              name="nickname"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextField
                  label="닉네임"
                  placeholder={`닉네임 (최대 ${NICKNAME_MAX}자)`}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  maxLength={NICKNAME_MAX}
                  error={errors.nickname?.message}
                />
              )}
            />
          )}

          <Controller
            control={control}
            name="email"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                label="이메일"
                placeholder="이메일"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { value, onChange, onBlur } }) => (
              <TextField
                label="비밀번호"
                placeholder={`비밀번호 (${PASSWORD_MIN}자 이상)`}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                secureTextEntry
                error={errors.password?.message}
              />
            )}
          />
        </View>

        <Button
          label={mode === 'login' ? '로그인' : '회원가입'}
          onPress={onSubmit}
          loading={loading}
          disabled={busy}
          className="mt-6"
        />

        <Pressable
          onPress={() => switchMode(mode === 'login' ? 'register' : 'login')}
          className="mt-4 items-center py-2"
          accessibilityRole="button"
        >
          <Text className="text-label text-sub">
            {mode === 'login' ? '계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
            <Text className="font-semibold text-primary">{mode === 'login' ? '회원가입' : '로그인'}</Text>
          </Text>
        </Pressable>
              </>
            )}

            <Pressable onPress={() => openBrowserAsync(LINKS.privacy)} className="mt-4 items-center py-1" accessibilityRole="link">
              <Text className="text-caption text-mute underline">개인정보처리방침</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
