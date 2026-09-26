// Sentry: 배포 빌드의 에러 위치를 원본 코드 줄로 보여주기 위한 설정
// NativeWind: global.css의 Tailwind 클래스를 React Native 스타일로 변환
const path = require('path');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativeWind } = require('nativewind/metro');

const config = getSentryExpoConfig(__dirname);

// 웹 미리보기: 네이버 지도 SDK는 웹을 지원하지 않아 안내 화면으로 바꿔 끼운다
const NAVER_MAP_WEB = path.resolve(__dirname, 'src/lib/naver-map.web.tsx');
const resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === '@mj-studio/react-native-naver-map') {
    return { type: 'sourceFile', filePath: NAVER_MAP_WEB };
  }
  return (resolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
