import type { ReactNode } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { AppModal, SheetPanel } from '@/components/ui/Sheet';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/** 홈 화면의 아래에서 올라오는 시트(프로필·닉네임·비밀번호·지역 선택)가 공유하는 틀. */
export default function HomeSheet({ visible, title, onClose, children }: Props) {
  return (
    <AppModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/70 justify-end">
        <SheetPanel className="bg-ocean-mid rounded-t-3xl p-5 max-h-[80%]">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white text-[16px] font-semibold">{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text className="text-muted text-[20px]">✕</Text>
            </TouchableOpacity>
          </View>
          {children}
        </SheetPanel>
      </View>
    </AppModal>
  );
}

/** 시트 안 입력칸 공통 스타일 */
export const SHEET_INPUT_CLASS = 'bg-card border border-white/15 rounded-xl p-3.5 text-white text-[14px]';
export const SHEET_PLACEHOLDER = 'rgba(255,255,255,0.4)';
