/** ISO 시각 → '방금 전' / 'N분 전' / 'N시간 전' / 'N일 전' / 날짜 */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '방금 전';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '방금 전';
  const diff = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diff < 1) return '방금 전';
  if (diff < 60) return `${diff}분 전`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return date.toLocaleDateString('ko-KR');
}
