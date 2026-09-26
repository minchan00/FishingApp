import { supabase, unwrap, check } from '@/lib/supabase';
import type { Json } from '@/types/database';
import type { Catch, FishingLog, FishingLogInput, Rating } from '@/types/models';
import { asRating } from './guards';
import { photoUrl, resolvePhoto } from './photos';

export function ratingFor(catches: Catch[]): Rating {
  const total = catches.reduce((sum, c) => sum + c.count, 0);
  return total > 3 ? '대박' : total > 0 ? '보통' : '꽝';
}

export async function listMyLogs(): Promise<FishingLog[]> {
  // RLS가 본인 일지만 돌려준다
  const rows = unwrap(
    await supabase
      .from('fishing_logs')
      .select('*, catches(species, size_cm, count)')
      .order('fished_on', { ascending: false })
      .order('created_at', { ascending: false }),
  );
  return rows.map((r) => ({
    id: r.id,
    fishedOn: r.fished_on,
    location: r.location,
    weather: r.weather,
    duration: r.duration,
    memo: r.memo,
    rating: asRating(r.rating),
    imageUrl: photoUrl(r.image_path),
    createdAt: r.created_at,
    catches: r.catches.map((c) => ({
      species: c.species,
      sizeCm: c.size_cm,
      count: c.count,
    })),
  }));
}

/** 일지와 조과를 한 트랜잭션으로 저장한다. logId가 있으면 수정. 저장된 일지 id를 반환. */
export async function saveLog(input: FishingLogInput, logId?: number): Promise<number> {
  const imagePath = await resolvePhoto(input.imageUri);
  const catches = input.catches.filter((c) => c.species.trim());
  const id = unwrap(
    await supabase.rpc('save_fishing_log', {
      p_log: {
        fished_on: input.fishedOn,
        location: input.location.trim(),
        weather: input.weather,
        duration: input.duration,
        memo: input.memo.trim(),
        rating: ratingFor(catches),
        image_path: imagePath,
      } satisfies Json,
      p_catches: catches.map((c) => ({
        species: c.species.trim(),
        size_cm: c.sizeCm,
        count: c.count,
      })) satisfies Json,
      p_log_id: logId,
    }),
  );
  return id;
}

export async function deleteLog(id: number): Promise<void> {
  check(await supabase.from('fishing_logs').delete().eq('id', id));
}
