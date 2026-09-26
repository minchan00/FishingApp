import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import type { FishingLog } from '@/types/models';
import { formatKoreanDate } from './format';

type Props = {
  log: FishingLog | null;
  visible: boolean;
  onClose: () => void;
  onEdit: (log: FishingLog) => void;
  onDelete: (log: FishingLog) => void;
};

const SECTION_CARD = 'mb-3 rounded-[14px] border border-card-border bg-white/5 p-3.5';

export function LogDetailModal({ log, visible, onClose, onEdit, onDelete }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/70">
        <View className="max-h-[92%] rounded-t-3xl bg-ocean-mid p-5">
          {log && (
            <>
              <View className="mb-4 flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="flex-1 text-[16px] font-semibold text-white">
                    {formatKoreanDate(log.fishedOn)} · {log.location}
                  </Text>
                  <Text className="mt-0.5 text-[12px] text-muted">
                    {log.weather} {log.duration ? `· ${log.duration}시간` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => onEdit(log)}
                  className="mr-2.5 rounded-lg border border-accent bg-accent/15 px-2.5 py-[5px]"
                >
                  <Text className="text-[12px] font-semibold text-accent">✏️ 수정</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose}>
                  <Text className="text-[20px] text-muted">✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {log.imageUrl && (
                  <Image
                    source={{ uri: log.imageUrl }}
                    style={{ width: '100%', height: 220, borderRadius: 14, marginBottom: 12 }}
                    contentFit="cover"
                    transition={200}
                  />
                )}
                {log.catches.length > 0 && (
                  <View className={SECTION_CARD}>
                    <Text className="text-[14px] font-semibold text-white">🎣 어획 기록</Text>
                    {log.catches.map((c, i) => (
                      <View key={i} className="flex-row justify-between border-b border-white/[0.08] py-2">
                        <Text className="text-[14px] text-white">{c.species}</Text>
                        <Text className="text-[14px] text-ocean-light">
                          {c.sizeCm !== null ? `${c.sizeCm}cm ` : ''}
                          {c.count > 1 ? `x${c.count}` : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                {log.memo ? (
                  <View className={SECTION_CARD}>
                    <Text className="text-[14px] font-semibold text-white">📝 메모</Text>
                    <Text className="mt-2 text-[14px] leading-[22px] text-white">{log.memo}</Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  className="mt-4 items-center rounded-xl border border-accent-2 bg-accent-2/20 p-3.5"
                  onPress={() => onDelete(log)}
                >
                  <Text className="text-[14px] font-semibold text-accent-2">🗑️ 일지 삭제</Text>
                </TouchableOpacity>
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
