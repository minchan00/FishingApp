import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { Icon, type IconName } from './Icon';

type Props = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  /** 오른쪽에 보이는 값 (예: 앱 버전) */
  value?: string;
  /** value 대신 오른쪽에 둘 요소 */
  right?: ReactNode;
  onPress?: () => void;
  tone?: 'default' | 'danger' | 'muted';
  /** 아래 구분선 (기본 true) */
  divider?: boolean;
  /** onPress가 있을 때 오른쪽 화살표 표시 (기본 true). 선택 목록처럼 이동이 아닌 곳에서는 끈다 */
  chevron?: boolean;
};

export function ListRow({ title, subtitle, icon, value, right, onPress, tone = 'default', divider = true, chevron = true }: Props) {
  const titleClass = tone === 'danger' ? 'text-danger' : tone === 'muted' ? 'text-mute' : 'text-ink';
  const iconColor = tone === 'danger' ? colors.danger : tone === 'muted' ? colors.mute : colors.sub;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className={`min-h-[56px] flex-row items-center gap-3 px-4 py-3 active:bg-surface ${divider ? 'border-b border-line' : ''}`}
    >
      {icon ? <Icon name={icon} size={20} color={iconColor} /> : null}
      <View className="flex-1">
        <Text className={`text-body ${titleClass}`}>{title}</Text>
        {subtitle ? <Text className="mt-0.5 text-caption text-mute">{subtitle}</Text> : null}
      </View>
      {right ?? (value ? <Text className="text-label text-mute">{value}</Text> : null)}
      {onPress && chevron ? <Icon name="chevron-right" size={18} color={colors.mute} /> : null}
    </Pressable>
  );
}
