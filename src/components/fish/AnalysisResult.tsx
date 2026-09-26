import { Text, TouchableOpacity, View } from 'react-native';
import { AiError } from '@/data/ai';
import { colors } from '@/theme/colors';
import type { FishAnalysis } from '@/types/models';
import { cls, DetailRow } from './ui';

const CONFIDENCE = {
  high: { label: '확실해요', color: '#4caf50' },
  medium: { label: '아마도', color: colors.accent },
  low: { label: '확신 낮음', color: colors.accent2 },
} as const;

type Props = {
  analysis: FishAnalysis | null;
  error: Error | null;
  onRegister: () => void;
};

export function AnalysisResult({ analysis, error, onRegister }: Props) {
  if (error) {
    const code = error instanceof AiError ? error.code : 'UNKNOWN';
    const icon = code === 'DAILY_LIMIT' ? '⏳' : code === 'AI_BUSY' ? '🚦' : code === 'NETWORK' ? '📡' : '⚠️';
    return (
      <View className="items-center py-[16px]">
        <Text className="text-[36px] mb-[8px]">{icon}</Text>
        <Text className="text-white text-[14px] leading-[22px] text-center">{error.message}</Text>
        {code === 'DAILY_LIMIT' ? (
          <Text className={cls.hintText}>💡 어종 이름을 알면 위 검색창에서 직접 찾아볼 수 있어요</Text>
        ) : null}
      </View>
    );
  }
  if (!analysis) return null;

  const { identification: id, remainingToday } = analysis;
  const remaining = <Text className={cls.hintText}>오늘 남은 분석 {remainingToday}회</Text>;

  if (!id.recognized) {
    return (
      <View className="items-center py-[16px]">
        <Text className="text-[36px] mb-[8px]">🤔</Text>
        <Text className="text-white text-[14px] text-center">어종을 인식할 수 없어요.{'\n'}물고기가 잘 보이게 다시 찍어주세요.</Text>
        {remaining}
      </View>
    );
  }

  const confidence = CONFIDENCE[id.confidence];
  const rows = [
    { label: '📏 평균 크기', value: id.averageSize },
    { label: '🌊 서식지', value: id.habitat },
    { label: '🎣 낚시 방법', value: id.fishingMethod },
    { label: '🪱 추천 미끼', value: id.bait },
    { label: '⏰ 제철', value: id.season },
    { label: '🍽️ 맛과 요리', value: id.taste },
    { label: '📌 특징', value: id.features },
  ].filter((r) => r.value);

  return (
    <View>
      <View className="flex-row items-center mb-[8px]">
        <Text className="text-white text-[22px] font-bold">🐟 {id.species}</Text>
        {/* 신뢰도 색은 값에 따라 달라지므로 style로 둔다 */}
        <View className="ml-[10px] px-[8px] py-[3px] rounded-[10px]" style={{ backgroundColor: `${confidence.color}33` }}>
          <Text className="text-[11px] font-semibold" style={{ color: confidence.color }}>{confidence.label}</Text>
        </View>
      </View>
      {rows.map((r) => (
        <DetailRow key={r.label} label={r.label} value={r.value} />
      ))}
      <TouchableOpacity className={`${cls.registerBtn} mt-[14px]`} onPress={onRegister}>
        <Text className={cls.btnText}>🐟 도감 + 일지에 등록하기</Text>
      </TouchableOpacity>
      {remaining}
    </View>
  );
}
