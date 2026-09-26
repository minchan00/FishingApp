import { Text, View } from 'react-native';

// 상태 배지와 라벨/값 한 줄. 여러 화면에서 같이 쓴다.

export type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

// NativeWind는 클래스 문자열을 정적으로 찾으므로 조합하지 않고 통째로 적는다
const BADGE: Record<BadgeTone, { box: string; text: string }> = {
  primary: { box: 'bg-primary-soft', text: 'text-primary' },
  success: { box: 'bg-success-soft', text: 'text-success' },
  warning: { box: 'bg-warning-soft', text: 'text-warning' },
  danger: { box: 'bg-danger-soft', text: 'text-danger' },
  neutral: { box: 'bg-surface', text: 'text-sub' },
};

/** 등급·상태 표시용 작은 배지 (soft 배경 + 진한 글자) */
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const t = BADGE[tone];
  return (
    <View className={`self-start rounded-full px-2 py-0.5 ${t.box}`}>
      <Text className={`text-caption font-semibold ${t.text}`}>{label}</Text>
    </View>
  );
}

/** 라벨/값 한 줄 */
export function DetailRow({ label, value, italic = false, divider = true }: { label: string; value: string; italic?: boolean; divider?: boolean }) {
  return (
    <View className={`flex-row items-start justify-between gap-4 py-3 ${divider ? 'border-b border-line' : ''}`}>
      <Text className="text-label text-mute">{label}</Text>
      <Text className={`flex-1 text-right text-label text-ink ${italic ? 'italic' : ''}`}>{value}</Text>
    </View>
  );
}
