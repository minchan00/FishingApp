import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';

type SessionState = {
  session: Session | null;
  /** 저장된 세션을 불러오는 중이면 true */
  loading: boolean;
};

const SessionContext = createContext<SessionState>({ session: null, loading: true });

export function SessionProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<SessionState>({ session: null, loading: true });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setState({ session: data.session, loading: false }));

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // 다른 계정으로 바뀌면 이전 사용자의 캐시가 보이지 않도록 비운다
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') queryClient.clear();
      setState({ session, loading: false });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}

/** 로그인 화면 뒤(탭 화면)에서만 사용. */
export function useUser() {
  const { session } = useSession();
  if (!session) throw new Error('useUser는 로그인된 화면에서만 쓸 수 있어요.');
  return session.user;
}
