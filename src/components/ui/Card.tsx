import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  /** surface: 밝은 카드 면 (기본) / outline: 밝은 면 + 테두리 */
  tone?: 'surface' | 'outline';
  className?: string;
};

export function Card({ children, onPress, tone = 'surface', className = '' }: Props) {
  const base = `rounded-card p-4 ${tone === 'surface' ? 'bg-card' : 'bg-card border border-line'} ${className}`;
  if (!onPress) return <View className={base}>{children}</View>;
  return (
    <Pressable onPress={onPress} className={`${base} active:opacity-70`}>
      {children}
    </Pressable>
  );
}
