import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { colors } from '@/theme/colors';

/**
 * 바텀시트 안의 폼 영역. 시트가 화면 아래에 붙어 있으므로
 * 키보드가 가리는 만큼 아래 여백을 넣어 내용을 위로 올린다.
 * (창이 이미 줄어든 경우엔 겹침이 0이라 아무 일도 하지 않는다)
 */
export function SheetKeyboardBody({ children }: { children: ReactNode }) {
  return (
    <KeyboardAvoidingView behavior="padding" className="shrink">
      {children}
    </KeyboardAvoidingView>
  );
}

/** 폼 안의 작은 항목 제목 */
export function FieldLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <Text className={`mb-2 text-label font-medium text-sub ${className}`}>{children}</Text>;
}

/** 필드 아래 오류 문구 (TextField를 쓰지 않는 칩 선택 등) */
export function InlineError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return (
    <Text className="mt-1.5 text-caption text-danger" accessibilityLiveRegion="polite">
      {message}
    </Text>
  );
}

type CheckRowProps = {
  checked: boolean;
  onPress: () => void;
  label: string;
};

/** 켜고 끄는 선택 한 줄 (체크박스 + 문구) */
export function CheckRow({ checked, onPress, label }: CheckRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      className="flex-row items-center gap-3 rounded-field bg-surface px-4 py-3.5 active:bg-surface-strong"
    >
      <View
        className={`h-[22px] w-[22px] items-center justify-center rounded-md ${checked ? 'bg-primary' : 'border-[1.5px] border-line bg-bg'}`}
      >
        {checked ? <Icon name="check" size={14} color={colors.white} /> : null}
      </View>
      <Text className="flex-1 text-body text-ink">{label}</Text>
    </Pressable>
  );
}

type PhotoPickerProps = {
  uri: string | null | undefined;
  onPick: () => void;
  onRemove: () => void;
  /** 사진이 없을 때 보이는 문구 */
  emptyLabel: string;
};

/** 사진 한 장 고르기: 없으면 추가 버튼, 있으면 미리보기 + 변경/제거 */
export function PhotoPicker({ uri, onPick, onRemove, emptyLabel }: PhotoPickerProps) {
  if (!uri) {
    return (
      <Pressable
        onPress={onPick}
        accessibilityRole="button"
        className="h-[88px] items-center justify-center gap-1.5 rounded-field border border-dashed border-line bg-surface active:bg-surface-strong"
      >
        <Icon name="camera" size={22} color={colors.mute} />
        <Text className="text-label text-sub">{emptyLabel}</Text>
      </Pressable>
    );
  }
  return (
    <View>
      <Image source={{ uri }} style={{ width: '100%', height: 180, borderRadius: 12 }} contentFit="cover" transition={150} />
      <View className="mt-2 flex-row gap-2">
        <Button label="사진 변경" icon="camera" variant="secondary" size="md" onPress={onPick} className="flex-1" />
        <Button label="사진 제거" icon="x" variant="secondary" size="md" onPress={onRemove} className="flex-1" />
      </View>
    </View>
  );
}
