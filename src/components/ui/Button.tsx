import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'accent' | 'secondary' | 'light' | 'ghost' | 'danger' | 'kakao';
type Size = 'md' | 'lg';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  /** 부모 너비를 꽉 채운다 (기본 true) */
  block?: boolean;
  className?: string;
};

const CONTAINER: Record<Variant, string> = {
  primary: 'bg-primary active:bg-primary-pressed',
  accent: 'bg-accent active:bg-accent-pressed',
  light: 'bg-card active:opacity-80',
  secondary: 'bg-surface active:bg-surface-strong',
  ghost: 'bg-transparent active:bg-surface',
  danger: 'bg-danger-soft active:bg-surface-strong',
  kakao: 'bg-kakao active:opacity-80',
};

const TEXT: Record<Variant, string> = {
  primary: 'text-white',
  accent: 'text-white',
  light: 'text-ink',
  secondary: 'text-ink',
  ghost: 'text-primary',
  danger: 'text-danger',
  kakao: 'text-black/85',
};

const TEXT_COLOR: Record<Variant, string> = {
  primary: colors.white,
  accent: colors.white,
  light: colors.ink,
  secondary: colors.ink,
  ghost: colors.primary,
  danger: colors.danger,
  kakao: 'rgba(0,0,0,0.85)',
};

export function Button({ label, onPress, variant = 'primary', size = 'lg', icon, loading, disabled, block = true, className = '' }: Props) {
  const inactive = disabled || loading;
  const height = size === 'lg' ? 'h-[52px]' : 'h-[40px]';
  const text = size === 'lg' ? 'text-body font-semibold' : 'text-label font-semibold';

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      className={`${height} ${block ? 'self-stretch' : 'self-start px-4'} flex-row items-center justify-center rounded-field ${CONTAINER[variant]} ${inactive ? 'opacity-50' : ''} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={TEXT_COLOR[variant]} />
      ) : (
        <View className="flex-row items-center gap-1.5">
          {icon ? <Icon name={icon} size={size === 'lg' ? 18 : 16} color={TEXT_COLOR[variant]} /> : null}
          <Text className={`${text} ${TEXT[variant]}`}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}
