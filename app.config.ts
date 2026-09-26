import type { ExpoConfig } from 'expo/config';

// 빌드 시점 값(지도 키, Sentry 설정 등)은 .env 또는 EAS 환경변수로 주입한다.
const config: ExpoConfig = {
  name: '낚시 일지',
  slug: 'fishingapp',
  scheme: 'fishingapp',
  version: '1.0.0',
  orientation: 'portrait',
  platforms: ['ios', 'android', 'web'],
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  android: {
    package: 'com.chani.fishingapp',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#0a2a3a',
    },
    // 사진은 시스템 사진 선택기를 쓰므로 저장소 권한이 필요 없다.
    permissions: ['CAMERA', 'ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
    blockedPermissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
    ],
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.chani.fishingapp',
  },
  plugins: [
    'expo-router',
    // 네이버 지도: Expo Go에서는 동작하지 않아 개발 빌드가 필요하다
    ['@mj-studio/react-native-naver-map', { client_id: process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID ?? '' }],
    [
      'expo-build-properties',
      { android: { extraMavenRepos: ['https://repository.map.naver.com/archive/maven'] } },
    ],
    // 소스맵 업로드는 SENTRY_AUTH_TOKEN이 있을 때만 동작한다
    [
      '@sentry/react-native/expo',
      { organization: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT, url: 'https://sentry.io/' },
    ],
    'expo-web-browser',
    [
      'expo-image-picker',
      {
        photosPermission: '낚시 사진을 선택하기 위해 갤러리 접근이 필요해요.',
        cameraPermission: '어종 분석을 위해 카메라 접근이 필요해요.',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: '현재 위치의 날씨·물때와 주변 낚시 포인트를 보여주기 위해 위치 정보가 필요해요.',
      },
    ],
    'expo-status-bar',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#FFFFFF',
        imageWidth: 200,
      },
    ],
  ],
  owner: 'minchan00',
  extra: {
    eas: { projectId: 'b2051432-b2bf-41f1-b0ef-4e39b1a362dc' },
  },
  experiments: {
    typedRoutes: true,
  },
};

export default config;
