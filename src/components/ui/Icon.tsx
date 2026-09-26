import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { colors } from '@/theme/colors';

type FeatherName = ComponentProps<typeof Feather>['name'];

/** 앱에서 쓰는 선 아이콘. Feather 전체 + 물고기(Feather에 없어서 MaterialCommunityIcons) */
export type IconName = FeatherName | 'fish';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
};

export function Icon({ name, size = 20, color = colors.ink }: Props) {
  if (name === 'fish') return <MaterialCommunityIcons name="fish" size={size + 2} color={color} />;
  return <Feather name={name} size={size} color={color} />;
}
