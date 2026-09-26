import { supabase, unwrap, check } from '@/lib/supabase';
import type { Tables } from '@/types/database';
import type { FishingPoint, FishingPointInput } from '@/types/models';

function toPoint(r: Tables<'fishing_points'>): FishingPoint {
  return {
    id: r.id,
    ownerId: r.user_id,
    isDefault: r.user_id === null,
    name: r.name,
    address: r.address,
    type: r.type,
    species: r.species,
    memo: r.memo,
    lat: r.lat,
    lng: r.lng,
    hot: r.hot,
    rating: r.rating,
  };
}

/** 기본 포인트 + 모든 사용자가 등록한 포인트 */
export async function listPoints(): Promise<FishingPoint[]> {
  const rows = unwrap(
    await supabase
      .from('fishing_points')
      .select('*')
      .order('user_id', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: false }),
  );
  return rows.map(toPoint);
}

export async function createPoint(input: FishingPointInput): Promise<FishingPoint> {
  const row = unwrap(
    await supabase
      .from('fishing_points')
      .insert({ ...input, name: input.name.trim(), address: input.address.trim() })
      .select('*')
      .single(),
  );
  return toPoint(row);
}

/** 본인이 등록한 포인트만 삭제된다(RLS). 권한이 없으면 에러. */
export async function deletePoint(id: number): Promise<void> {
  const rows = unwrap(await supabase.from('fishing_points').delete().eq('id', id).select('id'));
  if (rows.length === 0) throw new Error('내가 추가한 포인트만 삭제할 수 있어요.');
}

export async function listFavoritePointIds(): Promise<number[]> {
  const rows = unwrap(await supabase.from('point_favorites').select('point_id'));
  return rows.map((r) => r.point_id);
}

export async function setFavorite(pointId: number, favorite: boolean): Promise<void> {
  if (favorite) {
    check(await supabase.from('point_favorites').upsert({ point_id: pointId }, { onConflict: 'user_id,point_id', ignoreDuplicates: true }));
  } else {
    check(await supabase.from('point_favorites').delete().eq('point_id', pointId));
  }
}
