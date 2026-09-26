import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import AuthFieldError from '@/components/ui/AuthFieldError';
import { signIn, signInWithKakao, signUp } from '@/data/auth';
import { captureError } from '@/lib/sentry';
import {
  PASSWORD_MIN, signInSchema, signUpSchema, type AuthFormInput, type AuthFormValues,
} from '@/schemas/auth';
import { NICKNAME_MAX } from '@/schemas/profile';
import { colors } from '@/theme/colors';

// 카카오 로그인 디자인 가이드: 컨테이너 #FEE500, 레이블 검정(85%)
const KAKAO_LABEL = 'rgba(0,0,0,0.85)';
const PLACEHOLDER = 'rgba(255,255,255,0.4)';

const INPUT_CLASS = 'w-full bg-card border border-white/15 rounded-[14px] p-4 text-white text-[14px] mb-3';

type Mode = 'login' | 'register';

// 두 모드가 값 모양을 공유하므로 resolver만 바꿔 끼운다
const loginResolver = zodResolver(signInSchema);
const registerResolver = zodResolver(signUpSchema);

// 로그인에 성공하면 루트 레이아웃이 세션 변화를 보고 탭 화면으로 전환한다
export default function SignInScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [kakaoLoading, setKakaoLoading] = useState(false);

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
        Alert.alert('📧 이메일을 확인해주세요', `${email}로 보낸 인증 메일의 링크를 누른 뒤 로그인해주세요.`);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : '';
      Alert.alert('오류', message.includes('이미 사용 중') ? message : '회원가입에 실패했어요. 다시 시도해주세요.');
    }
  };

  const onSubmit = handleSubmit(mode === 'login' ? handleLogin : handleRegister);

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerClassName="grow bg-ocean-deep items-center justify-center p-8"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-[64px] mb-2">🎣</Text>
        <Text className="text-white text-[26px] font-bold mb-1.5">낚시 일지</Text>
        <Text className="text-white/[0.55] text-[13px] mb-10">바다와 함께하는 낚시 기록</Text>

        <TouchableOpacity
          className="w-full bg-[#FEE500] rounded-xl py-4 items-center"
          onPress={handleKakao}
          disabled={busy}
          accessibilityRole="button"
        >
          {kakaoLoading
            ? <ActivityIndicator color={KAKAO_LABEL} />
            : <Text className="text-black/[0.85] text-[16px] font-semibold">카카오로 시작하기</Text>}
        </TouchableOpacity>

        <View className="flex-row items-center w-full my-6">
          <View className="flex-1 bg-white/25" style={{ height: StyleSheet.hairlineWidth }} />
          <Text className="text-white/50 text-[12px] mx-3">또는 이메일로</Text>
          <View className="flex-1 bg-white/25" style={{ height: StyleSheet.hairlineWidth }} />
        </View>

        <View className="flex-row bg-card rounded-[14px] p-1 mb-6 w-full">
          {(['login', 'register'] as const).map((m) => {
            const active = mode === m;
            return (
              <TouchableOpacity
                key={m}
                className={`flex-1 py-2.5 items-center rounded-xl ${active ? 'bg-accent' : ''}`}
                onPress={() => switchMode(m)}
              >
                <Text className={`text-[14px] ${active ? 'text-white font-bold' : 'text-white/[0.55] font-medium'}`}>
                  {m === 'login' ? '로그인' : '회원가입'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {mode === 'register' && (
          <>
            <Controller
              control={control}
              name="nickname"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  className={INPUT_CLASS}
                  placeholder={`닉네임 (최대 ${NICKNAME_MAX}자)`}
                  placeholderTextColor={PLACEHOLDER}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  maxLength={NICKNAME_MAX}
                />
              )}
            />
            <AuthFieldError message={errors.nickname?.message} />
          </>
        )}

        <Controller
          control={control}
          name="email"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              className={INPUT_CLASS}
              placeholder="이메일"
              placeholderTextColor={PLACEHOLDER}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          )}
        />
        <AuthFieldError message={errors.email?.message} />

        <Controller
          control={control}
          name="password"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              className={INPUT_CLASS}
              placeholder={`비밀번호 (${PASSWORD_MIN}자 이상)`}
              placeholderTextColor={PLACEHOLDER}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              secureTextEntry
            />
          )}
        />
        <AuthFieldError message={errors.password?.message} />

        <TouchableOpacity
          className="w-full bg-accent rounded-[14px] py-4 items-center mt-2"
          onPress={onSubmit}
          disabled={busy}
        >
          {loading
            ? <ActivityIndicator color={colors.white} />
            : <Text className="text-white text-[16px] font-bold">{mode === 'login' ? '로그인' : '회원가입'}</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => switchMode(mode === 'login' ? 'register' : 'login')} className="mt-4">
          <Text className="text-white/50 text-[13px] underline">
            {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
