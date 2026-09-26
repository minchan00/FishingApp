// Sentry: 배포 빌드의 에러 위치를 원본 코드 줄로 보여주기 위한 설정
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

module.exports = getSentryExpoConfig(__dirname);
