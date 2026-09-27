import { Image } from 'expo-image';
import { createContext, useContext, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { Icon } from './Icon';

const SEA = require('../../../assets/images/sea.jpg');

/** 바다 배경 위에 놓인 글자·빈 화면 안내가 흰색을 쓰도록 알려준다 */
const OnSeaContext = createContext(false);
export const useOnSea = () => useContext(OnSeaContext);

/** 메인 화면 바탕: 바다 수면 사진을 전체에 깔고 카드는 그 위에 띄운다 */
export function SeaScreen({ children }: { children: ReactNode }) {
  return (
    <OnSeaContext.Provider value>
      <View className="flex-1" style={{ backgroundColor: colors.navyLight }}>
        <Image source={SEA} style={StyleSheet.absoluteFill} contentFit="cover" />
        {children}
      </View>
    </OnSeaContext.Provider>
  );
}

/** 바다 위 글자가 물결에 묻히지 않게 까는 옅은 그림자 */
export const SEA_TEXT_SHADOW = { textShadowColor: 'rgba(0,30,50,0.3)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } };

/** 바다 배경 위에 바로 놓이는 소제목 (흰 글자) */
export function SeaSectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View className="mb-2 mt-6 flex-row items-center justify-between px-1">
      <Text className="text-[17px] font-bold text-white" style={SEA_TEXT_SHADOW}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} className="flex-row items-center">
          <Text className="text-label text-white/85" style={SEA_TEXT_SHADOW}>{action}</Text>
          <Icon name="chevron-right" size={16} color={colors.onSeaMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}
