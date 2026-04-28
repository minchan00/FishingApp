import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';

import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import LogScreen from '../screens/LogScreen';
import FishScreen from '../screens/FishScreen';
import CommunityScreen from '../screens/CommunityScreen';
import AuthScreen from '../screens/AuthScreen';

const Tab = createBottomTabNavigator();

const tabs = [
  { name: 'Map', label: '포인트', icon: '🗺️', component: MapScreen },
  { name: 'Fish', label: '도감', icon: '🐟', component: FishScreen },
  { name: 'Home', label: '홈', icon: '🏠', component: HomeScreen },
  { name: 'Log', label: '일지', icon: '📔', component: LogScreen },
  { name: 'Community', label: '커뮤니티', icon: '👥', component: CommunityScreen },
];

export default function AppNavigator() {
  const [user, setUser] = useState(undefined); // undefined=로딩, null=비로그인

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  if (user === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a2a3a', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🎣</Text>
        <ActivityIndicator color="#f4a826" size="large" />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0a2a3a',
          borderTopColor: '#1a3a4a',
          borderTopWidth: 1,
          height: 90,
          paddingBottom: 28,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
        tabBarIcon: ({ focused }) => {
          const tab = tabs.find((t) => t.name === route.name);
          return (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 22 }}>{tab.icon}</Text>
              <Text style={{ fontSize: 10, color: focused ? '#f4a826' : 'rgba(255,255,255,0.65)', marginTop: 3 }}>
                {tab.label}
              </Text>
            </View>
          );
        },
      })}
    >
      {tabs.map((tab) => (
        <Tab.Screen key={tab.name} name={tab.name} component={tab.component} />
      ))}
    </Tab.Navigator>
  );
}
