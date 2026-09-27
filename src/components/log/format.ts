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
/** '맑음 ☀️' 같은 저장값에서 이모지를 빼고 글자만 보여준다 */
export function weatherText(weather: string): string {
  return weather.replace(/[p{Extended_Pictographic}️]/gu, '').trim();
}

export function formatKoreanDate(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  if (!m) return ymd;
  return `${Number(m[1])}. ${Number(m[2])}. ${Number(m[3])}.`;
}

/** '광어 45cm x2' 형태 */
export function formatCatch(c: Catch): string {
  return `${c.species}${c.sizeCm !== null ? ` ${c.sizeCm}cm` : ''}${c.count > 1 ? ` x${c.count}` : ''}`;
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
