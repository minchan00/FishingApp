import { pickReleaseHighlight, releasePhase } from '../releases';
import type { ReleaseEvent } from '@/types/models';

jest.mock('@/lib/supabase', () => ({ supabase: {}, unwrap: jest.fn(), check: jest.fn() }));

const NOW = Date.parse('2026-09-28T12:00:00+09:00');
const H = 60 * 60 * 1000;
const iso = (ms: number) => new Date(ms).toISOString();

const ev = (over: Partial<ReleaseEvent>): ReleaseEvent => ({
  id: 1, facilityId: 'yeongsan', status: 'window', startsAt: iso(NOW - H), endsAt: iso(NOW + H),
  flowCms: null, source: 'official', sourceUrl: null, note: null, ...over,
});

describe('releasePhase', () => {
  it('실측 방류 중이면 live, 승인 기간 안이면 open', () => {
    expect(releasePhase(ev({ status: 'active' }), NOW)).toBe('live');
    expect(releasePhase(ev({ status: 'window' }), NOW)).toBe('open');
    expect(releasePhase(ev({ status: 'notice', endsAt: null }), NOW)).toBe('open');
  });

  it('시작 전이면 upcoming, 끝났거나 ended면 ended', () => {
    expect(releasePhase(ev({ startsAt: iso(NOW + H), endsAt: iso(NOW + 2 * H) }), NOW)).toBe('upcoming');
    expect(releasePhase(ev({ startsAt: iso(NOW - 3 * H), endsAt: iso(NOW - H) }), NOW)).toBe('ended');
    expect(releasePhase(ev({ status: 'ended' }), NOW)).toBe('ended');
  });
});

describe('pickReleaseHighlight', () => {
  it('관심 시설을 먼저, 그 안에서는 방류 중을 먼저 고른다', () => {
    const others = ev({ id: 1, facilityId: 'nakdong', status: 'active' });
    const mineOpen = ev({ id: 2, facilityId: 'geum', status: 'window' });
    const mineLive = ev({ id: 3, facilityId: 'yeongsan', status: 'active' });
    expect(pickReleaseHighlight([others, mineOpen, mineLive], ['geum', 'yeongsan'], NOW)?.id).toBe(3);
    expect(pickReleaseHighlight([others, mineOpen], ['geum'], NOW)?.id).toBe(2);
  });

  it('3일 넘게 남은 예정과 끝난 일정은 띄우지 않는다', () => {
    const far = ev({ startsAt: iso(NOW + 4 * 24 * H), endsAt: null, status: 'notice' });
    const done = ev({ status: 'ended' });
    expect(pickReleaseHighlight([far, done], [], NOW)).toBeNull();
  });
});
