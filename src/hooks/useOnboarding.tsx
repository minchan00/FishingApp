import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

// 처음 설치했을 때만 소개 화면을 보여준다. localStorage는 supabase.ts에서 expo-sqlite로 설치된다.
const KEY = 'onboarding_seen_v1';

function readSeen(): boolean {
  try {
    return globalThis.localStorage?.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

type Ctx = { seen: boolean; markSeen: () => void };
const OnboardingContext = createContext<Ctx>({ seen: true, markSeen: () => {} });

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [seen, setSeen] = useState(readSeen);
  const markSeen = useCallback(() => {
    try {
      globalThis.localStorage?.setItem(KEY, '1');
    } catch {
      // 저장에 실패해도 이번 실행에서는 다시 보이지 않게 한다
    }
    setSeen(true);
  }, []);
  return <OnboardingContext.Provider value={{ seen, markSeen }}>{children}</OnboardingContext.Provider>;
}

export const useOnboarding = () => useContext(OnboardingContext);
