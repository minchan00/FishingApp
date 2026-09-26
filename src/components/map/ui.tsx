import type { ReactNode } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { AppModal, SheetPanel } from '@/components/ui/Sheet';

// 낚시 포인트 화면들이 같이 쓰는 스타일 조각.
// NativeWind의 rem은 14px이라 원래 px 값을 그대로 옮기려고 임의값([..px])을 쓴다.
// 같은 속성을 두 클래스가 겹쳐 지정하면 적용 순서가 보장되지 않으므로 조건부 클래스는 서로 배타적으로 만든다.

export const cls = {
  modalHeader: 'flex-row justify-between items-start mb-[16px]',
  modalTitle: 'text-white text-[16px] font-semibold flex-1',
  inputLabel: 'text-muted text-[12px] mb-[8px]',
  tagText: 'text-muted text-[11px]',
} as const;

export const PLACEHOLDER_COLOR = 'rgba(255,255,255,0.4)';

type ChipVariant = 'accent' | 'ocean';

/** 필터·유형·어종 칩. 선택되면 accent(주황) 또는 ocean(파랑)으로 채운다. */
export function chipClass(active: boolean, variant: ChipVariant = 'accent'): string {
  const on = variant === 'accent' ? 'bg-accent border-accent' : 'bg-ocean-light border-ocean-light';
  return `border rounded-[20px] px-[12px] py-[5px] ${active ? on : 'bg-card border-card-border'}`;
}

/** 칩 글자. boldActive면 선택 시 font-medium까지 준다(목록 필터 칩). */
export function chipTextClass(active: boolean, boldActive = false): string {
  return `text-[12px] ${active ? `text-white${boldActive ? ' font-medium' : ''}` : 'text-muted'}`;
}

/** 텍스트 입력 칸. 에러가 있으면 테두리를 경고색으로 바꾼다. */
export function inputClass(hasError: boolean): string {
  return `bg-card border rounded-[12px] p-[14px] text-white text-[14px] mb-[10px] ${hasError ? 'border-accent-2' : 'border-card-border'}`;
}

/** 필드 아래에 붙는 검증 메시지 */
export function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <Text className="text-accent-2 text-[12px] -mt-[6px] mb-[10px]">{message}</Text>;
}

/** 아래에서 올라오는 시트 모달 (오버레이 + 둥근 상단) */
export function SheetModal({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <AppModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-[rgba(0,0,0,0.7)] justify-end">
        <SheetPanel className="bg-ocean-mid rounded-t-[24px] p-[20px] max-h-[90%]">{children}</SheetPanel>
      </View>
    </AppModal>
  );
}

export function CloseX({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text className="text-muted text-[20px]">✕</Text>
    </TouchableOpacity>
  );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center py-[10px] border-b border-[rgba(255,255,255,0.08)]">
      <Text className="text-muted text-[13px]">{label}</Text>
      <Text className="text-white text-[13px] font-medium">{value}</Text>
    </View>
  );
}
