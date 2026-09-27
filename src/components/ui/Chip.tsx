import { Pressable, Text } from 'react-native';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  className?: string;
};

/** 필터·선택용 칩. 선택되면 연한 바다색 배경 + 바다색 글자 */
export function Chip({ label, selected, onPress, className = '' }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      className={`h-[34px] items-center justify-center rounded-full px-3.5 ${selected ? 'bg-primary-soft' : 'bg-card active:bg-surface'} ${className}`}
    >
      <Text className={`text-label font-medium ${selected ? 'text-primary font-semibold' : 'text-sub'}`}>{label}</Text>
    </Pressable>
  );
}
