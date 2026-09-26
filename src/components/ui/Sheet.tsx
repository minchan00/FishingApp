import type { ReactNode } from 'react';
import { Modal, View, type ModalProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
