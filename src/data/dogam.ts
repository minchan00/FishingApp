import { supabase, unwrap, check } from '@/lib/supabase';
import type { DogamEntry } from '@/types/models';
import { hasKeys } from './guards';
import { photoUrl } from './photos';

/**
 * 내 도감은 일지의 조과(catches)에서 계산된다.
 * 도감에 어종을 추가하려면 일지에 조과를 기록하면 된다(saveLog).
 */
export async function listMyDogam(): Promise<DogamEntry[]> {
  const rows = unwrap(await supabase.from('my_dogam').select('*').order('last_caught_on', { ascending: false }));
  return rows
    .filter((r) => hasKeys(r, 'species', 'last_caught_on'))
    .map((r) => ({
      species: r.species,
      bestSizeCm: r.best_size_cm,
      totalCount: r.total_count ?? 0,
      lastCaughtOn: r.last_caught_on,
      bestLocation: r.best_location,
      imageUrl: photoUrl(r.image_path),
      memo: r.memo ?? '',
    }));
}

export async function saveDogamMemo(species: string, memo: string): Promise<void> {
  check(await supabase.from('dogam_notes').upsert({ species, memo }, { onConflict: 'user_id,species' }));
}
