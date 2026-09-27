import { router } from 'expo-router';
import { createContext, useContext, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { Icon, type IconName } from './Icon';
import { useOnSea } from './Sea';

/** 헤더 안에 놓인 IconButton이 배경(바다/남색/밝은 면)에 맞는 색을 자동으로 고르게 한다 */
const OnDarkContext = createContext(false);

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
  /** 제목 아래 헤더 안에 이어서 그릴 내용 */
  children?: ReactNode;
  /**
   * plain: 모래색 바탕 / brand: 남색 바탕 + 흰 글자 / sea: 투명(바다 배경이 비침) + 흰 글자.
   * 지정하지 않으면 SeaScreen 안에서는 sea, 그 밖에서는 plain.
   */
  tone?: 'brand' | 'plain' | 'sea';
};

/** 화면 맨 위 제목 영역. 상태바 높이만큼 자동으로 내려온다 */
export function ScreenHeader({ title, eyebrow, back, onBack, right, children, tone }: Props) {
  const { top } = useSafeAreaInsets();
  const onSea = useOnSea();
  const resolved = tone ?? (onSea ? 'sea' : 'plain');
  const onDark = resolved !== 'plain';
  const bgClass = resolved === 'brand' ? 'bg-navy' : resolved === 'sea' ? '' : 'bg-bg';
  const shadow = onDark ? { textShadowColor: 'rgba(0,30,50,0.3)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } } : undefined;
  return (
    <OnDarkContext.Provider value={onDark}>
      <View className={bgClass} style={{ paddingTop: top + 10 }}>
        <View className="flex-row items-center px-5 pb-3.5">
          {back ? (
            <Pressable
              onPress={onBack ?? (() => router.back())}
              accessibilityLabel="뒤로"
              className={`-ml-2 mr-1 h-10 w-10 items-center justify-center rounded-full ${onDark ? 'active:bg-white/15' : 'active:bg-surface'}`}
            >
              <Icon name="chevron-left" size={26} color={onDark ? colors.white : colors.ink} />
            </Pressable>
          ) : null}
          <View className="flex-1">
            {eyebrow ? <Text className={`text-label ${onDark ? 'text-white/80' : 'text-mute'}`} style={shadow}>{eyebrow}</Text> : null}
            <Text
              className={`font-serif ${back ? 'text-[20px] leading-[28px]' : 'text-[24px] leading-[32px]'} ${onDark ? 'text-white' : 'text-ink'}`}
              style={shadow}
            >
              {title}
            </Text>
          </View>
          {right ? <View className="flex-row items-center gap-1">{right}</View> : null}
        </View>
        {children}
      </View>
    </OnDarkContext.Provider>
  );
}

type IconButtonProps = {
  icon: IconName;
  onPress: () => void;
  label: string;
  /** 지정하지 않으면 어두운 헤더(바다·남색) 안에서는 흰 원 버튼, 그 밖에서는 본문 색 */
  color?: string;
};

/** 헤더 오른쪽 등에 쓰는 원형 아이콘 버튼 */
export function IconButton({ icon, onPress, label, color }: IconButtonProps) {
  const onDark = useContext(OnDarkContext);
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      className={`h-10 w-10 items-center justify-center rounded-full ${onDark ? 'bg-card active:opacity-80' : 'active:bg-surface'}`}
    >
      <Icon name={icon} size={20} color={color ?? colors.ink} />
    </Pressable>
  );
}
