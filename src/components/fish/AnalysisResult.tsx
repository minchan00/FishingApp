import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { AiError } from '@/data/ai';
import { colors } from '@/theme/colors';
import type { FishAnalysis } from '@/types/models';
import { Badge, DetailRow, type BadgeTone } from '@/components/ui/Badge';

const CONFIDENCE: Record<'high' | 'medium' | 'low', { label: string; tone: BadgeTone }> = {
  high: { label: '확실해요', tone: 'success' },
  medium: { label: '아마도', tone: 'warning' },
  low: { label: '확신 낮음', tone: 'danger' },
};

type Props = {
  analysis: FishAnalysis | null;
  error: Error | null;
  onRegister: () => void;
};

function errorIcon(code: string): IconName {
  if (code === 'DAILY_LIMIT') return 'clock';
  if (code === 'AI_BUSY') return 'loader';
  if (code === 'NETWORK') return 'wifi-off';
  return 'alert-circle';
}

/** 가운데 정렬된 아이콘 + 안내 문구 */
function Notice({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <View className="items-center py-4">
      <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-surface">
        <Icon name={icon} size={26} color={colors.mute} />
      </View>
      {children}
    </View>
  );
}

export function AnalysisResult({ analysis, error, onRegister }: Props) {
  if (error) {
    const code = error instanceof AiError ? error.code : 'UNKNOWN';
    return (
      <Notice icon={errorIcon(code)}>
        <Text className="text-center text-body text-ink">{error.message}</Text>
        {code === 'DAILY_LIMIT' ? (
          <Text className="mt-2 text-center text-caption text-mute">어종 이름을 알면 위 검색창에서 직접 찾아볼 수 있어요</Text>
        ) : null}
      </Notice>
    );
  }
  if (!analysis) return null;

  const { identification: id, remainingToday } = analysis;
  const remaining = <Text className="mt-3 text-center text-caption text-mute">오늘 남은 분석 {remainingToday}회</Text>;

  if (!id.recognized) {
    return (
      <Notice icon="help-circle">
        <Text className="text-center text-body text-ink">어종을 인식할 수 없어요.{'\n'}물고기가 잘 보이게 다시 찍어주세요.</Text>
        {remaining}
      </Notice>
    );
  }

  const confidence = CONFIDENCE[id.confidence];
  const rows = [
    { label: '평균 크기', value: id.averageSize },
    { label: '서식지', value: id.habitat },
    { label: '낚시 방법', value: id.fishingMethod },
    { label: '추천 미끼', value: id.bait },
    { label: '제철', value: id.season },
    { label: '맛과 요리', value: id.taste },
    { label: '특징', value: id.features },
  ].filter((r) => r.value);

  return (
    <View>
      <View className="mb-1 flex-row items-center gap-2">
        <Text className="shrink text-heading text-ink">{id.species}</Text>
        <Badge label={confidence.label} tone={confidence.tone} />
      </View>
      {rows.map((r, i) => (
        <DetailRow key={r.label} label={r.label} value={r.value} divider={i < rows.length - 1} />
      ))}
      <Button label="도감 + 일지에 등록하기" onPress={onRegister} className="mt-4" />
      {remaining}
    </View>
  );
}
