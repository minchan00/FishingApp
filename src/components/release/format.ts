import { kstHm, kstYmd } from '@/data/weather';
import type { ReleasePhase } from '@/data/releases';
import type { ReleaseEvent, ReleaseSource } from '@/types/models';
import { colors } from '@/theme/colors';

export const PHASE_LABEL: Record<ReleasePhase, string> = {
  live: '방류 중',
  open: '방류 기간',
  upcoming: '예정',
  ended: '종료',
};

export const PHASE_COLOR: Record<ReleasePhase, { fg: string; bg: string }> = {
  live: { fg: colors.white, bg: colors.accent },
  open: { fg: colors.accentInk, bg: colors.accentSoft },
  upcoming: { fg: colors.primary, bg: colors.primarySoft },
  ended: { fg: colors.mute, bg: colors.surface },
};

export const SOURCE_LABEL: Record<ReleaseSource, string> = {
  official: '기관 자료',
  notice: '기관 공지',
  report: '제보',
};

/** '14:00' 또는 다른 날이면 '9.30 14:00' */
export function shortTime(isoTime: string, now: number = Date.now()): string {
  const ms = Date.parse(isoTime);
  if (kstYmd(ms) === kstYmd(now)) return kstHm(ms);
  const [, m, d] = kstYmd(ms).split('-').map(Number);
  return `${m}.${d} ${kstHm(ms)}`;
}

/** '14:00 ~ 17:30', 끝 시각이 없으면 '14:00부터' */
export function timeRange(e: ReleaseEvent, now: number = Date.now()): string {
  const start = shortTime(e.startsAt, now);
  return e.endsAt ? `${start} ~ ${shortTime(e.endsAt, now)}` : `${start}부터`;
}

/** '1,200톤/초' */
export function flowText(flowCms: number | null): string | null {
  return flowCms === null ? null : `${Math.round(flowCms).toLocaleString('ko-KR')}톤/초`;
}
