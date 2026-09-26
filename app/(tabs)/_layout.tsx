import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/components/ui/Icon';
import { colors } from '@/theme/colors';

const TABS: readonly { name: string; label: string; icon: IconName }[] = [
  { name: 'index', label: '홈', icon: 'home' },
  { name: 'map', label: '포인트', icon: 'map-pin' },
  { name: 'log', label: '일지', icon: 'book-open' },
  { name: 'fish', label: '도감', icon: 'fish' },
  { name: 'community', label: '커뮤니티', icon: 'users' },
];

/** 아이콘 + 라벨이 들어가는 탭바 본체 높이 (시스템 내비게이션 바 영역 제외) */
const TAB_BAR_CONTENT_HEIGHT = 56;

export default function TabsLayout() {
  // 폰마다 하단 시스템 바(제스처 바, 3버튼 바) 높이가 달라서 실제 여백을 읽어 더한다
  const { bottom } = useSafeAreaInsets();
  const bottomPad = Math.max(bottom, 8);

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.mute,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          height: TAB_BAR_CONTENT_HEIGHT + bottomPad,
          paddingBottom: bottomPad,
          paddingTop: 6,
          elevation: 0,
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            tabBarIcon: ({ focused }) => <Icon name={tab.icon} size={22} color={focused ? colors.ink : colors.mute} />,
          }}
        />
      ))}
    </Tabs>
  );
}
