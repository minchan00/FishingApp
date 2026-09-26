import type { Catch } from '@/types/models';

/** 오늘 날짜(기기 로컬 기준)를 YYYY-MM-DD로 */
export function todayYmd(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function isValidYmd(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
}

/** YYYY-MM-DD → '2026. 9. 26.' (기존 toLocaleDateString('ko-KR') 표시와 같은 모양) */
export function formatKoreanDate(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return ymd;
  return `${Number(m[1])}. ${Number(m[2])}. ${Number(m[3])}.`;
}

/** 사용자가 입력한 크기 텍스트 → cm 숫자. 비었거나 숫자가 아니면 null */
export function parseSize(text: string): number | null {
  const n = parseFloat(text.trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** 사용자가 입력한 마리수 텍스트 → 정수. 비었거나 잘못된 값이면 1 */
export function parseCount(text: string): number {
  const n = parseInt(text.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** '광어 45cm x2' 형태 */
export function formatCatch(c: Catch): string {
  return `${c.species}${c.sizeCm !== null ? ` ${c.sizeCm}cm` : ''}${c.count > 1 ? ` x${c.count}` : ''}`;
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
