import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { Icon } from './Icon';

type Props = {
  title: string;
  /** 제목 위 작은 설명 */
  eyebrow?: string;
  /** 뒤로 가기 버튼 표시 */
  back?: boolean;
  /** 뒤로 버튼 동작. 없으면 router.back() (모달에서는 닫기 함수를 넘긴다) */
  onBack?: () => void;
  /** 오른쪽 버튼들 (IconButton 등) */
  right?: ReactNode;
};

/** 화면 맨 위 제목 영역. 상태바 높이만큼 자동으로 내려온다 */
export function ScreenHeader({ title, eyebrow, back, onBack, right }: Props) {
  const { top } = useSafeAreaInsets();
  return (
    <View className="flex-row items-center bg-bg px-5 pb-3" style={{ paddingTop: top + 12 }}>
      {back ? (
        <Pressable onPress={onBack ?? (() => router.back())} accessibilityLabel="뒤로" className="-ml-2 mr-1 h-10 w-10 items-center justify-center rounded-full active:bg-surface">
          <Icon name="chevron-left" size={26} color={colors.ink} />
        </Pressable>
      ) : null}
      <View className="flex-1">
        {eyebrow ? <Text className="text-label text-mute">{eyebrow}</Text> : null}
        <Text className={back ? 'text-heading text-ink' : 'text-title text-ink'}>{title}</Text>
      </View>
      {right ? <View className="flex-row items-center gap-1">{right}</View> : null}
    </View>
  );
}

type IconButtonProps = {
  icon: Parameters<typeof Icon>[0]['name'];
  onPress: () => void;
  label: string;
  color?: string;
};

/** 헤더 오른쪽 등에 쓰는 원형 아이콘 버튼 */
export function IconButton({ icon, onPress, label, color = colors.ink }: IconButtonProps) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} className="h-10 w-10 items-center justify-center rounded-full active:bg-surface">
      <Icon name={icon} size={22} color={color} />
    </Pressable>
  );
}
