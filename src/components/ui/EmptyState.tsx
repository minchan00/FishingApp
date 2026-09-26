import { Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

type Props = {
  icon: IconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** 목록이 비었거나 불러오기에 실패했을 때 */
export function EmptyState({ icon, title, description, actionLabel, onAction }: Props) {
  return (
    <View className="items-center px-8 py-14">
      <View className="mb-4 h-14 w-14 items-center justify-center rounded-full bg-surface">
        <Icon name={icon} size={26} color={colors.mute} />
      </View>
      <Text className="text-center text-heading text-ink">{title}</Text>
      {description ? <Text className="mt-1.5 text-center text-label text-mute">{description}</Text> : null}
      {actionLabel && onAction ? (
        <View className="mt-5">
          <Button label={actionLabel} onPress={onAction} variant="secondary" size="md" block={false} />
        </View>
      ) : null}
    </View>
  );
}
