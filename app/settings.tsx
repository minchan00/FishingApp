import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { useState, type ReactNode } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NicknameEditModal from '@/components/home/NicknameEditModal';
import PasswordChangeModal from '@/components/home/PasswordChangeModal';
import { Icon } from '@/components/ui/Icon';
import { ListRow } from '@/components/ui/ListRow';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { LINKS } from '@/constants/links';
import { deleteAccount, signOut } from '@/data/auth';
import { useProfile } from '@/hooks/queries';
import { useUser } from '@/hooks/useSession';
import { colors } from '@/theme/colors';

function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View className="mt-6">
      {title ? <Text className="mb-2 px-5 text-label font-medium text-mute">{title}</Text> : null}
      <View className="mx-5 overflow-hidden rounded-card border border-line">{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const { bottom } = useSafeAreaInsets();
  const user = useUser();
  const profile = useProfile();
  const nickname = profile.data?.nickname || '낚시꾼';
  // 카카오 등 소셜 로그인 계정은 비밀번호가 없다
  const isEmailAccount = user.app_metadata.provider === 'email';

  const [nicknameModal, setNicknameModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);

  const openDoc = (url: string) => {
    WebBrowser.openBrowserAsync(url).catch(() => Alert.alert('오류', '페이지를 열 수 없어요.'));
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

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="설정" back />

      <ScrollView contentContainerStyle={{ paddingBottom: bottom + 24 }} showsVerticalScrollIndicator={false}>
        <View className="mx-5 mt-2 flex-row items-center gap-3.5">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-primary-soft">
            <Icon name="user" size={26} color={colors.primary} />
          </View>
          <View className="flex-1">
            <Text className="text-heading text-ink">{nickname}</Text>
            <Text className="mt-0.5 text-label text-mute" numberOfLines={1}>
              {isEmailAccount ? user.email : '카카오 계정으로 로그인'}
            </Text>
          </View>
        </View>

        <Section title="계정">
          <ListRow icon="edit-3" title="닉네임 변경" onPress={() => setNicknameModal(true)} divider={isEmailAccount} />
          {isEmailAccount ? <ListRow icon="lock" title="비밀번호 변경" onPress={() => setPasswordModal(true)} divider={false} /> : null}
        </Section>

        <Section title="정보">
          <ListRow icon="shield" title="개인정보처리방침" onPress={() => openDoc(LINKS.privacy)} />
          <ListRow icon="info" title="앱 버전" value={Constants.expoConfig?.version ?? '-'} divider={false} />
        </Section>

        <Section>
          <ListRow icon="log-out" title="로그아웃" onPress={handleLogout} />
          <ListRow icon="user-x" title="회원 탈퇴" tone="muted" onPress={handleDeleteAccount} divider={false} />
        </Section>
      </ScrollView>

      <NicknameEditModal visible={nicknameModal} currentNickname={nickname} onClose={() => setNicknameModal(false)} />
      <PasswordChangeModal visible={passwordModal} email={user.email} onClose={() => setPasswordModal(false)} />
    </View>
  );
}
