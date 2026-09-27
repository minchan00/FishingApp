import type { ReactNode } from 'react';
import { Modal, Pressable, Text, View, type ModalProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { Icon } from './Icon';

/**
 * 앱의 모든 모달은 이걸 쓴다.
 * Android에서 모달을 상태바·내비게이션 바 아래까지 그리게 통일해야
 * 아래 SheetPanel의 여백 계산이 폰마다 같게 나온다.
 */
export function AppModal(props: ModalProps) {
  return <Modal statusBarTranslucent navigationBarTranslucent {...props} />;
}

type SheetPanelProps = {
  className?: string;
  children: ReactNode;
  /** 시트 안쪽 기본 아래 여백(px). 여기에 폰의 하단 시스템 바 높이가 더해진다 */
  basePadding?: number;
};

/** 아래에서 올라오는 시트 본체. 하단 제스처 바·3버튼 바에 내용이 가려지지 않게 한다 */
export function SheetPanel({ className, children, basePadding = 20 }: SheetPanelProps) {
  const { bottom } = useSafeAreaInsets();
  return (
    <View className={className} style={{ paddingBottom: basePadding + bottom }}>
      {children}
    </View>
  );
}

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** 시트 최대 높이 (기본 90%) */
  maxHeightClass?: string;
};

/**
 * 표준 바텀시트: 어두운 배경 + 흰 시트 + 손잡이 + 제목/닫기.
 * 새 시트는 SheetPanel을 직접 쓰지 말고 이걸 쓴다.
 */
export function BottomSheet({ visible, onClose, title, children, maxHeightClass = 'max-h-[90%]' }: BottomSheetProps) {
  return (
    <AppModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: colors.overlay }}>
        <Pressable className="flex-1" onPress={onClose} accessibilityLabel="닫기" />
        <SheetPanel className={`rounded-t-sheet bg-card px-5 pt-2.5 ${maxHeightClass}`}>
          <View className="mb-2 items-center">
            <View className="h-1 w-10 rounded-full bg-line" />
          </View>
          {title ? (
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-heading text-ink">{title}</Text>
              <Pressable onPress={onClose} accessibilityLabel="닫기" className="-mr-2 h-10 w-10 items-center justify-center rounded-full active:bg-surface">
                <Icon name="x" size={22} color={colors.sub} />
              </Pressable>
            </View>
          ) : null}
          {children}
        </SheetPanel>
      </View>
    </AppModal>
  );
}
