import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';

const TABS = [
  { name: 'map', label: '포인트', icon: '🗺️' },
  { name: 'fish', label: '도감', icon: '🐟' },
  { name: 'index', label: '홈', icon: '🏠' },
  { name: 'log', label: '일지', icon: '📔' },
  { name: 'community', label: '커뮤니티', icon: '👥' },
] as const;

/** 아이콘 + 라벨이 들어가는 탭바 본체 높이 (시스템 내비게이션 바 영역 제외) */
const TAB_BAR_CONTENT_HEIGHT = 62;

export default function TabsLayout() {
  // 폰마다 하단 시스템 바(제스처 바, 3버튼 바) 높이가 달라서 실제 여백을 읽어 더한다
  const { bottom } = useSafeAreaInsets();
  const bottomPad = Math.max(bottom, 8);

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.oceanDeep,
          borderTopColor: '#1a3a4a',
          borderTopWidth: 1,
          height: TAB_BAR_CONTENT_HEIGHT + bottomPad,
          paddingBottom: bottomPad,
          paddingTop: 8,
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            tabBarIcon: ({ focused }) => (
              <View className="items-center">
                <Text className="text-[22px]">{tab.icon}</Text>
                <Text className={`text-[10px] mt-[3px] ${focused ? 'text-accent' : 'text-muted'}`}>
                  {tab.label}
                </Text>
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
