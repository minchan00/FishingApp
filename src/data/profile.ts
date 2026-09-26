import { supabase, unwrap, check, currentUserId } from '@/lib/supabase';
import type { Profile } from '@/types/models';

export async function getMyProfile(): Promise<Profile> {
  const id = await currentUserId();
  const row = unwrap(await supabase.from('profiles').select('id, nickname, emoji').eq('id', id).single());
  return row;
}

export async function updateNickname(nickname: string): Promise<void> {
  const id = await currentUserId();
  check(await supabase.from('profiles').update({ nickname: nickname.trim() }).eq('id', id));
}
