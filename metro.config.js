// Sentry: 배포 빌드의 에러 위치를 원본 코드 줄로 보여주기 위한 설정
// NativeWind: global.css의 Tailwind 클래스를 React Native 스타일로 변환
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativeWind } = require('nativewind/metro');

module.exports = withNativeWind(getSentryExpoConfig(__dirname), { input: './global.css' });
