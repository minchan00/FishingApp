// 방류 알림 (하굿둑·방조제 배수갑문). 시설·일정은 읽기만, 관심 시설은 본인 것만 추가·삭제한다.
import { check, supabase, unwrap } from '@/lib/supabase';
import type { Tables } from '@/types/database';
import type { ReleaseEvent, ReleaseFacility, ReleaseSource, ReleaseStatus } from '@/types/models';

const STATUSES: readonly ReleaseStatus[] = ['active', 'window', 'notice', 'ended'];
const SOURCES: readonly ReleaseSource[] = ['official', 'notice', 'report'];
const DAY = 24 * 60 * 60 * 1000;

function toFacility(r: Tables<'release_facilities'>): ReleaseFacility {
  return { id: r.id, name: r.name, kind: r.kind === '방조제' ? '방조제' : '하굿둑', region: r.region, operator: r.operator };
}

function toEvent(r: Tables<'release_events'>): ReleaseEvent {
  return {
    id: r.id,
    facilityId: r.facility_id,
    status: (STATUSES as readonly string[]).includes(r.status) ? (r.status as ReleaseStatus) : 'notice',
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    flowCms: r.flow_cms,
    source: (SOURCES as readonly string[]).includes(r.source) ? (r.source as ReleaseSource) : 'report',
    sourceUrl: r.source_url,
    note: r.note,
  };
}

export async function listReleaseFacilities(): Promise<ReleaseFacility[]> {
  const rows = unwrap(await supabase.from('release_facilities').select('*').order('sort_order'));
  return rows.map(toFacility);
}

/** 최근 3일 안에 끝났거나 아직 끝나지 않은 일정 */
export async function listReleaseEvents(now: number = Date.now()): Promise<ReleaseEvent[]> {
  const since = new Date(now - 3 * DAY).toISOString();
  const rows = unwrap(
    await supabase
      .from('release_events')
      .select('*')
      .or(`ends_at.is.null,ends_at.gte.${since}`)
      .gte('starts_at', new Date(now - 30 * DAY).toISOString())
      .order('starts_at', { ascending: true }),
  );
  return rows.map(toEvent);
}

export async function listReleaseSubscriptions(): Promise<string[]> {
  const rows = unwrap(await supabase.from('release_subscriptions').select('facility_id'));
  return rows.map((r) => r.facility_id);
}

export async function setReleaseSubscription(facilityId: string, on: boolean): Promise<void> {
  if (on) {
    check(await supabase.from('release_subscriptions').upsert({ facility_id: facilityId }, { onConflict: 'user_id,facility_id', ignoreDuplicates: true }));
  } else {
    check(await supabase.from('release_subscriptions').delete().eq('facility_id', facilityId));
  }
}

/**
 * 화면에 보여줄 단계.
 * live: 지금 방류 중(실측) / open: 방류 기간·공지 시간 안 / upcoming: 아직 시작 전 / ended: 끝남
 */
export type ReleasePhase = 'live' | 'open' | 'upcoming' | 'ended';

export function releasePhase(e: ReleaseEvent, now: number = Date.now()): ReleasePhase {
  const start = Date.parse(e.startsAt);
  const end = e.endsAt ? Date.parse(e.endsAt) : null;
  if (e.status === 'ended' || (end !== null && end < now)) return 'ended';
  if (start > now) return 'upcoming';
  return e.status === 'active' ? 'live' : 'open';
}

const PHASE_ORDER: Record<ReleasePhase, number> = { live: 0, open: 1, upcoming: 2, ended: 3 };

/**
 * 홈 배너에 띄울 일정 하나. 관심 시설을 먼저 보고, 없으면 전체에서 고른다.
 * 방류 중 > 기간 안 > 3일 안에 시작 순. 해당 없으면 null.
 */
export function pickReleaseHighlight(events: ReleaseEvent[], subscribed: string[], now: number = Date.now()): ReleaseEvent | null {
  const candidates = events
    .map((e) => ({ e, phase: releasePhase(e, now) }))
    .filter(({ e, phase }) => phase === 'live' || phase === 'open' || (phase === 'upcoming' && Date.parse(e.startsAt) - now <= 3 * DAY));
  const rank = (x: { e: ReleaseEvent; phase: ReleasePhase }) =>
    (subscribed.includes(x.e.facilityId) ? 0 : 10) + PHASE_ORDER[x.phase];
  candidates.sort((a, b) => rank(a) - rank(b) || Date.parse(a.e.startsAt) - Date.parse(b.e.startsAt));
  return candidates[0]?.e ?? null;
}
