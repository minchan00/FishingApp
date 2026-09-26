import { Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { useSession } from '@/hooks/useSession';
import { colors } from '@/theme/colors';

/**
 * 카카오 로그인 후 브라우저가 fishingapp://auth/callback 으로 돌아올 때 잠깐 거치는 화면.
 * 세션 처리는 signInWithKakao가 하므로 여기서는 알맞은 화면으로 보내기만 한다
 * (이 파일이 없으면 Android에서 "Unmatched Route"가 잠깐 보인다).
 */
export default function AuthCallbackScreen() {
  const { session, loading } = useSession();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <StatusBar style="dark" />
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return <Redirect href={session ? '/' : '/sign-in'} />;
}
