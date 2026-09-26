import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState, type ReactNode } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NicknameEditModal from '@/components/home/NicknameEditModal';
import PasswordChangeModal from '@/components/home/PasswordChangeModal';
import { LINKS } from '@/constants/links';
import { deleteAccount, signOut } from '@/data/auth';
import { useProfile } from '@/hooks/queries';
import { useUser } from '@/hooks/useSession';

type RowProps = {
  icon: string;
  label: string;
  onPress?: () => void;
  value?: string;
  tone?: 'normal' | 'danger' | 'muted';
  last?: boolean;
};

function Row({ icon, label, onPress, value, tone = 'normal', last }: RowProps) {
  const labelClass = tone === 'danger' ? 'text-accent-2 text-[15px]' : tone === 'muted' ? 'text-white/40 text-[13px]' : 'text-white text-[15px]';
  return (
    <TouchableOpacity
      className={`flex-row items-center px-4 py-4 ${last ? '' : 'border-b border-white/[0.08]'}`}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.6}
    >
      <Text className="text-[18px] w-8">{icon}</Text>
      <Text className={`flex-1 ${labelClass}`}>{label}</Text>
      {value ? <Text className="text-muted text-[13px]">{value}</Text> : null}
      {onPress ? <Text className="text-white/40 text-[20px] ml-2">›</Text> : null}
    </TouchableOpacity>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mt-6">
      <Text className="text-muted text-[11px] tracking-[1px] mb-2 px-5">{title}</Text>
      <View className="mx-4 bg-card border border-card-border rounded-[14px] overflow-hidden">{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const { top, bottom } = useSafeAreaInsets();
  const user = useUser();
  const profile = useProfile();
  const nickname = profile.data?.nickname || '낚시꾼';
  // 카카오 등 소셜 로그인 계정은 비밀번호가 없다
  const isEmailAccount = user.app_metadata.provider === 'email';
  const providerLabel = isEmailAccount ? user.email : '카카오 계정';

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
    <View className="flex-1 bg-ocean-deep">
      <View className="flex-row items-center px-2 pb-2" style={{ paddingTop: top + 8 }}>
        <TouchableOpacity className="w-11 h-11 items-center justify-center" onPress={() => router.back()} accessibilityLabel="뒤로">
          <Text className="text-white text-[28px]">‹</Text>
        </TouchableOpacity>
        <Text className="text-white text-[18px] font-semibold">설정</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: bottom + 24 }} showsVerticalScrollIndicator={false}>
        <View className="mx-4 mt-2 flex-row items-center bg-card border border-card-border rounded-[14px] p-4">
          <View className="w-14 h-14 rounded-[28px] bg-ocean-surface items-center justify-center border-2 border-ocean-light">
            <Text className="text-[26px]">{profile.data?.emoji ?? '🎣'}</Text>
          </View>
          <View className="ml-3.5 flex-1">
            <Text className="text-white text-[18px] font-semibold">{nickname}</Text>
            <Text className="text-muted text-[12px] mt-0.5" numberOfLines={1}>{providerLabel}</Text>
          </View>
        </View>

        <Section title="계정">
          <Row icon="✏️" label="닉네임 변경" onPress={() => setNicknameModal(true)} last={!isEmailAccount} />
          {isEmailAccount ? <Row icon="🔑" label="비밀번호 변경" onPress={() => setPasswordModal(true)} last /> : null}
        </Section>

        <Section title="정보">
          <Row icon="🔒" label="개인정보처리방침" onPress={() => openDoc(LINKS.privacy)} />
          <Row icon="📱" label="앱 버전" value={Constants.expoConfig?.version ?? '-'} last />
        </Section>

        <Section title="">
          <Row icon="🚪" label="로그아웃" tone="danger" onPress={handleLogout} />
          <Row icon="⚠️" label="회원 탈퇴" tone="muted" onPress={handleDeleteAccount} last />
        </Section>
      </ScrollView>

      <NicknameEditModal visible={nicknameModal} currentNickname={nickname} onClose={() => setNicknameModal(false)} />
      <PasswordChangeModal visible={passwordModal} email={user.email} onClose={() => setPasswordModal(false)} />
    </View>
  );
}
