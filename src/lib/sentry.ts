import * as Sentry from '@sentry/react-native';
import { isRunningInExpoGo } from 'expo';
import { env } from './env';

export const sentryEnabled = !!env.sentryDsn;

/**
 * Expo Router의 네비게이션 컨테이너를 등록하면 화면 전환이 트랜잭션으로 기록된다.
 * (@sentry/react-native 7.11에는 expoRouterIntegration이 없어 reactNavigationIntegration을 쓴다)
 */
export const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: !isRunningInExpoGo(),
});

// DSN이 없으면(로컬 개발 등) 아예 초기화하지 않는다
if (sentryEnabled) {
  Sentry.init({
    dsn: env.sentryDsn,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    sendDefaultPii: false,
    integrations: [navigationIntegration],
    enableNativeFramesTracking: !isRunningInExpoGo(),
  });
}

/** 예상 못 한 에러를 Sentry로 보낸다. DSN이 없으면 개발 콘솔에만 남긴다. */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (!sentryEnabled) {
    if (__DEV__) console.warn('[captureError]', error, context);
    return;
  }
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

/** 로그인한 사용자 id만 붙인다(이메일 등 개인정보는 보내지 않는다). */
export function setSentryUser(userId: string | null): void {
  if (!sentryEnabled) return;
  Sentry.setUser(userId ? { id: userId } : null);
}

export { Sentry };
