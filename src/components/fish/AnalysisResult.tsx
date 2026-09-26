import { Text, TouchableOpacity, View } from 'react-native';
import { AiError } from '@/data/ai';
import { colors } from '@/theme/colors';
import type { FishAnalysis } from '@/types/models';
import { styles } from './fishStyles';

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
      <View style={{ alignItems: 'center', paddingVertical: 16 }}>
        <Text style={{ fontSize: 36, marginBottom: 8 }}>{icon}</Text>
        <Text style={{ color: colors.white, fontSize: 14, lineHeight: 22, textAlign: 'center' }}>{error.message}</Text>
        {code === 'DAILY_LIMIT' ? (
          <Text style={styles.hintText}>💡 어종 이름을 알면 위 검색창에서 직접 찾아볼 수 있어요</Text>
        ) : null}
      </View>
    );
  }
  if (!analysis) return null;

  const { identification: id, remainingToday } = analysis;
  const remaining = <Text style={styles.hintText}>오늘 남은 분석 {remainingToday}회</Text>;

  if (!id.recognized) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 16 }}>
        <Text style={{ fontSize: 36, marginBottom: 8 }}>🤔</Text>
        <Text style={{ color: colors.white, fontSize: 14, textAlign: 'center' }}>어종을 인식할 수 없어요.{'\n'}물고기가 잘 보이게 다시 찍어주세요.</Text>
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
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ color: colors.white, fontSize: 22, fontWeight: '700' }}>🐟 {id.species}</Text>
        <View style={{ marginLeft: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: `${confidence.color}33` }}>
          <Text style={{ color: confidence.color, fontSize: 11, fontWeight: '600' }}>{confidence.label}</Text>
        </View>
      </View>
      {rows.map((r) => (
        <View key={r.label} style={styles.detailRow}>
          <Text style={styles.detailLabel}>{r.label}</Text>
          <Text style={styles.detailValue}>{r.value}</Text>
        </View>
      ))}
      <TouchableOpacity style={[styles.registerBtn, { marginTop: 14 }]} onPress={onRegister}>
        <Text style={styles.registerBtnText}>🐟 도감 + 일지에 등록하기</Text>
      </TouchableOpacity>
      {remaining}
    </View>
  );
}
