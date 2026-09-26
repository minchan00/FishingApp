// Sentry는 다른 모듈보다 먼저 초기화해야 초기 에러까지 잡힌다
import { navigationIntegration, Sentry, setSentryUser } from '@/lib/sentry';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useNavigationContainerRef } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from '@/hooks/useSession';
import { queryClient } from '@/lib/queryClient';
import { colors } from '@/theme/colors';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, loading } = useSession();
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  // 에러 리포트에 어떤 사용자인지 id만 붙인다 (이메일은 보내지 않음)
  useEffect(() => {
    setSentryUser(userId);
  }, [userId]);

  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.oceanDeep } }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
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
          <StatusBar style="light" />
          <RootNavigator />
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(RootLayout);
