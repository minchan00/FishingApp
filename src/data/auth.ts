import { FunctionsHttpError } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';

// Android/웹에서 인증 탭이 앱으로 돌아왔을 때 세션을 마무리한다 (iOS에선 아무 일도 안 함)
WebBrowser.maybeCompleteAuthSession();

/** `?a=1&b=2`와 `#a=1&b=2`를 모두 읽는다. implicit 흐름은 토큰을 fragment(#)로 준다. */
function readAuthParams(url: string): Map<string, string> {
  const params = new Map<string, string>();
  const parts = [url.split('#')[1], url.split('#')[0]?.split('?')[1]];
  for (const part of parts) {
    if (!part) continue;
    for (const pair of part.split('&')) {
      const [key, value = ''] = pair.split('=');
      if (key && !params.has(key)) params.set(key, decodeURIComponent(value.replace(/\+/g, ' ')));
    }
  }
  return params;
}

/**
 * 카카오 로그인 (Supabase OAuth, 네이티브 SDK 없이 인앱 브라우저 사용).
 * 성공하면 setSession이 onAuthStateChange를 일으켜 루트 레이아웃이 탭 화면으로 전환한다.
 * 사용자가 브라우저를 닫으면 조용히 끝낸다.
 */
export async function signInWithKakao(): Promise<void> {
  const redirectTo = Linking.createURL('auth/callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) throw new Error('카카오 로그인을 시작하지 못했어요. 잠시 후 다시 시도해주세요.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return; // cancel / dismiss: 사용자가 닫음

  const params = readAuthParams(result.url);
  const oauthError = params.get('error_description') ?? params.get('error');
  if (oauthError) {
    if (params.get('error') === 'access_denied') return; // 카카오 동의 화면에서 취소
    throw new Error(`카카오 로그인에 실패했어요. (${oauthError})`);
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const code = params.get('code');

  if (accessToken && refreshToken) {
    // 기본 flowType('implicit'): 토큰이 fragment로 온다
    const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (sessionError) throw new Error('카카오 로그인 세션을 만들지 못했어요. 다시 시도해주세요.');
  } else if (code) {
    // flowType이 'pkce'로 바뀐 경우: code를 세션으로 교환한다
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw new Error('카카오 로그인 세션을 만들지 못했어요. 다시 시도해주세요.');
  } else {
    throw new Error('카카오 로그인 응답이 올바르지 않아요. 다시 시도해주세요.');
  }
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(error.message === 'Invalid login credentials' ? '이메일 또는 비밀번호가 올바르지 않아요.' : error.message);
}

/**
 * 가입과 동시에 DB 트리거가 profiles 행을 만든다(닉네임은 metadata로 전달).
 * 이메일 인증이 켜져 있으면 세션이 바로 생기지 않으므로 needsEmailConfirm: true를 돌려준다.
 */
export async function signUp(email: string, password: string, nickname: string): Promise<{ needsEmailConfirm: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { nickname: nickname.trim() } },
  });
  if (error) throw new Error(error.message.includes('already registered') ? '이미 사용 중인 이메일이에요.' : error.message);
  return { needsEmailConfirm: !data.session };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

/** 현재 비밀번호로 재인증한 뒤 비밀번호를 바꾼다. */
export async function changePassword(email: string, currentPassword: string, newPassword: string): Promise<void> {
  const { error: authError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (authError) throw new Error('현재 비밀번호가 올바르지 않아요.');
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

/** 계정과 모든 데이터(일지·게시글·사진)를 영구 삭제한다. */
export async function deleteAccount(): Promise<void> {
  // 사진 삭제와 계정 삭제는 서버 권한이 필요해 Edge Function(delete-account)에서 한다
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) {
    const body: { error?: string } | null =
      error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : null;
    throw new Error(body?.error ?? '계정을 삭제하지 못했어요. 잠시 후 다시 시도해주세요.');
  }
  await supabase.auth.signOut({ scope: 'local' });
}
