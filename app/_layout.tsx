// Sentry는 다른 모듈보다 먼저 초기화해야 초기 에러까지 잡힌다
import { navigationIntegration, Sentry, sentryEnabled, setSentryUser } from '@/lib/sentry';
import '../global.css';
import { GowunBatang_400Regular, GowunBatang_700Bold, useFonts } from '@expo-google-fonts/gowun-batang';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useNavigationContainerRef } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoadingScreen } from '@/components/LoadingScreen';
import { OnboardingProvider, useOnboarding } from '@/hooks/useOnboarding';
import { SessionProvider, useSession } from '@/hooks/useSession';
import { queryClient } from '@/lib/queryClient';
import { colors } from '@/theme/colors';

SplashScreen.preventAutoHideAsync();

/** 그림 로딩 화면을 최소한 이만큼은 보여준다 (너무 빨리 깜빡이지 않게) */
const MIN_LOADING_MS = 1200;

function RootNavigator() {
  const { session, loading } = useSession();
  const { seen: onboardingSeen } = useOnboarding();
  const userId = session?.user.id ?? null;
  const [fontsLoaded, fontError] = useFonts({ GowunBatang_400Regular, GowunBatang_700Bold });
  const fontsReady = fontsLoaded || !!fontError;
  const [minElapsed, setMinElapsed] = useState(false);

  // 글꼴이 준비되면 시스템 스플래시를 내리고 그림 로딩 화면으로 넘긴다
  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync();
  }, [fontsReady]);

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), MIN_LOADING_MS);
    return () => clearTimeout(t);
  }, []);

  // 에러 리포트에 어떤 사용자인지 id만 붙인다 (이메일은 보내지 않음)
  useEffect(() => {
    setSentryUser(userId);
  }, [userId]);

  if (!fontsReady) return null;
  if (loading || !minElapsed) return <LoadingScreen />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="release" options={{ animation: 'slide_from_right' }} />
      </Stack.Protected>
      {/* 처음 설치했을 때만 소개 화면. 다 보면 시작하기로 넘어간다 */}
      <Stack.Protected guard={!session && !onboardingSeen}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" options={{ animation: 'fade' }} />
      </Stack.Protected>
    </Stack>
  );
}

function RootLayout() {
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    navigationIntegration.registerNavigationContainer(navigationRef);
  }, [navigationRef]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <OnboardingProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </OnboardingProvider>
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

// Sentry.wrap은 init 이후에만 의미가 있어 DSN이 없으면 감싸지 않는다
export default sentryEnabled ? Sentry.wrap(RootLayout) : RootLayout;
