import { router } from 'expo-router';
import { createContext, useContext, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { Icon, type IconName } from './Icon';

/** 헤더 안에 놓인 IconButton이 배경(남색/흰색)에 맞는 색을 자동으로 고르게 한다 */
const OnNavyContext = createContext(false);

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
  /** 제목 아래 헤더 안에 이어서 그릴 내용 (예: 홈의 사진 배너) */
  children?: ReactNode;
  /** plain: 흰 배경 (기본) / brand: 남색 배경 + 흰 글자 */
  tone?: 'brand' | 'plain';
};

/** 화면 맨 위 제목 영역. 상태바 높이만큼 자동으로 내려온다 */
export function ScreenHeader({ title, eyebrow, back, onBack, right, children, tone = 'plain' }: Props) {
  const { top } = useSafeAreaInsets();
  const onNavy = tone === 'brand';
  return (
    <OnNavyContext.Provider value={onNavy}>
      <View className={onNavy ? 'bg-navy' : 'bg-bg'} style={{ paddingTop: top + 10 }}>
        <View className="flex-row items-center px-5 pb-3.5">
          {back ? (
            <Pressable
              onPress={onBack ?? (() => router.back())}
              accessibilityLabel="뒤로"
              className={`-ml-2 mr-1 h-10 w-10 items-center justify-center rounded-full ${onNavy ? 'active:bg-navy-light' : 'active:bg-surface'}`}
            >
              <Icon name="chevron-left" size={26} color={onNavy ? colors.white : colors.ink} />
            </Pressable>
          ) : null}
          <View className="flex-1">
            {eyebrow ? <Text className={`text-label ${onNavy ? 'text-white/70' : 'text-mute'}`}>{eyebrow}</Text> : null}
            <Text className={`${back ? 'text-heading' : 'text-title'} ${onNavy ? 'text-white' : 'text-ink'}`}>{title}</Text>
          </View>
          {right ? <View className="flex-row items-center gap-1">{right}</View> : null}
        </View>
        {children}
      </View>
    </OnNavyContext.Provider>
  );
}

type IconButtonProps = {
  icon: IconName;
  onPress: () => void;
  label: string;
  /** 지정하지 않으면 남색 헤더 안에서는 흰색, 그 밖에서는 본문 색 */
  color?: string;
};

/** 헤더 오른쪽 등에 쓰는 원형 아이콘 버튼 */
export function IconButton({ icon, onPress, label, color }: IconButtonProps) {
  const onNavy = useContext(OnNavyContext);
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      className={`h-10 w-10 items-center justify-center rounded-full ${onNavy ? 'active:bg-navy-light' : 'active:bg-surface'}`}
    >
      <Icon name={icon} size={22} color={color ?? (onNavy ? colors.white : colors.ink)} />
    </Pressable>
  );
}
