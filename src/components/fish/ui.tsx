import type { ReactNode } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

// 어종 도감 화면들이 같이 쓰는 스타일 조각.
// NativeWind의 rem은 14px이라 원래 px 값을 그대로 옮기려고 임의값([..px])을 쓴다.

// 버튼 클래스에는 바깥 여백을 넣지 않는다(같은 속성 클래스가 겹치면 적용 순서가 보장되지 않음). 쓰는 곳에서 mt-[..]를 붙인다.
export const cls = {
  centerWrap: 'flex-1 items-center justify-center py-[40px]',
  modalHeader: 'flex-row justify-between items-start mb-[16px]',
  modalTitle: 'text-white text-[18px] font-semibold flex-1',
  infoSection: 'bg-[rgba(255,255,255,0.05)] rounded-[12px] p-[14px] mb-[12px]',
  infoSectionTitle: 'text-white text-[14px] font-semibold mb-[8px]',
  inputLabel: 'text-muted text-[12px] mb-[6px]',
  hintText: 'text-[rgba(255,255,255,0.45)] text-[11px] text-center mt-[10px]',
  errorText: 'text-accent-2 text-[13px] text-center',
  registerBtn: 'bg-ocean-light rounded-[12px] py-[14px] items-center',
  closeBtn: 'bg-accent rounded-[12px] py-[14px] items-center',
  btnText: 'text-white text-[15px] font-semibold',
} as const;

/** 텍스트 입력 칸. 에러가 있으면 테두리를 경고색으로 바꾼다. */
export function inputClass(hasError: boolean): string {
  return `bg-card border rounded-[12px] p-[14px] text-white text-[14px] mb-[10px] ${hasError ? 'border-accent-2' : 'border-card-border'}`;
}

export const PLACEHOLDER_COLOR = 'rgba(255,255,255,0.4)';

/** 필드 아래에 붙는 검증 메시지 */
export function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <Text className="text-accent-2 text-[12px] -mt-[6px] mb-[10px]">{message}</Text>;
}

/** 아래에서 올라오는 시트 모달 (오버레이 + 둥근 상단) */
export function SheetModal({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-[rgba(0,0,0,0.7)] justify-end">
        <View className="bg-ocean-mid rounded-t-[24px] p-[20px] max-h-[90%]">{children}</View>
      </View>
    </Modal>
  );
}

export function CloseX({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text className="text-muted text-[20px]">✕</Text>
    </TouchableOpacity>
  );
}

export function DetailRow({ label, value, italic = false }: { label: string; value: string; italic?: boolean }) {
  return (
    <View className="flex-row justify-between items-center py-[8px] border-b border-[rgba(255,255,255,0.08)]">
      <Text className="text-muted text-[12px]">{label}</Text>
      <Text className={`text-white text-[12px] font-medium max-w-[60%] text-right${italic ? ' italic' : ''}`}>{value}</Text>
    </View>
  );
}
