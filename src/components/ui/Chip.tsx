import { Pressable, Text } from 'react-native';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  className?: string;
};

/** 필터·선택용 칩. 선택되면 진한 배경 + 흰 글자 */
export function Chip({ label, selected, onPress, className = '' }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      className={`h-[34px] items-center justify-center rounded-full px-3.5 ${selected ? 'bg-ink' : 'bg-surface active:bg-surface-strong'} ${className}`}
    >
      <Text className={`text-label font-medium ${selected ? 'text-white' : 'text-sub'}`}>{label}</Text>
    </Pressable>
  );
}
