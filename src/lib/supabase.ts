import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import type { Database } from '@/types/database';
import { env } from './env';

export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// 앱이 백그라운드에 있을 때는 토큰 자동 갱신을 멈춘다 (Supabase RN 권장 설정)
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

/** 조회 결과를 꺼낸다. error가 있으면 throw해서 TanStack Query가 에러 상태로 처리하게 한다. */
export function unwrap<T>(result: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null || result.data === undefined) throw new Error('데이터를 찾을 수 없어요.');
  return result.data;
}

/** 결과 데이터가 필요 없는 변경(insert/update/delete)용. error만 확인한다. */
export function check(result: { error: { message: string } | null }): void {
  if (result.error) throw new Error(result.error.message);
}

/** 현재 로그인한 사용자 id. 로그인 화면 뒤에서만 호출된다는 전제. */
export async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('로그인이 필요해요.');
  return id;
}
