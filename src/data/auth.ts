import { supabase } from '@/lib/supabase';

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
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw new Error(error.message);
  await supabase.auth.signOut({ scope: 'local' });
}
