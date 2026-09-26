import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { colors } from '@/theme/colors';

const TABS = [
  { name: 'map', label: '포인트', icon: '🗺️' },
  { name: 'fish', label: '도감', icon: '🐟' },
  { name: 'index', label: '홈', icon: '🏠' },
  { name: 'log', label: '일지', icon: '📔' },
  { name: 'community', label: '커뮤니티', icon: '👥' },
] as const;

export default function TabsLayout() {
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
          height: 90,
          paddingBottom: 28,
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
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 22 }}>{tab.icon}</Text>
                <Text style={{ fontSize: 10, color: focused ? colors.accent : colors.textMuted, marginTop: 3 }}>
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
