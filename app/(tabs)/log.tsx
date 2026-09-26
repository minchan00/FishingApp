import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LogCard } from '@/components/log/LogCard';
import { LogDetailModal } from '@/components/log/LogDetailModal';
import { LogFormModal } from '@/components/log/LogFormModal';
import { errorMessage } from '@/components/log/format';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { IconButton, ScreenHeader } from '@/components/ui/ScreenHeader';
import { useDeleteLog, useLogs } from '@/hooks/queries';
import { colors } from '@/theme/colors';
import type { Catch, FishingLog } from '@/types/models';

type Tab = '일지' | '통계';
const TABS: readonly Tab[] = ['일지', '통계'];

function computeStats(logs: FishingLog[]) {
  const allCatches = logs.flatMap((l) => l.catches);
  const totalCatch = allCatches.reduce((sum, c) => sum + c.count, 0);
  const maxFish = allCatches.reduce<Catch | null>(
    (max, c) => (c.sizeCm !== null && (max === null || c.sizeCm > (max.sizeCm ?? 0)) ? c : max),
    null,
  );
  const speciesCount = new Map<string, number>();
  allCatches.forEach((c) => speciesCount.set(c.species, (speciesCount.get(c.species) ?? 0) + c.count));
  const topSpecies = [...speciesCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  return { totalTrips: logs.length, totalCatch, maxFish, topSpecies };
}

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <Card className="flex-1">
      <Text className="text-title text-ink" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text className="mt-1 text-caption text-mute">{label}</Text>
    </Card>
  );
}

export default function LogScreen() {
  const logsQuery = useLogs();
  const deleteLog = useDeleteLog();
  const logs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);

  const [activeTab, setActiveTab] = useState<Tab>('일지');
  const [addModal, setAddModal] = useState(false);
  const [editingLog, setEditingLog] = useState<FishingLog | null>(null);
  // 수정 후 목록이 다시 불러와지면 상세도 최신 값으로 보이도록 id로 들고 있는다
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const selectedLog = logs.find((l) => l.id === selectedLogId) ?? null;

  const stats = useMemo(() => computeStats(logs), [logs]);

  const openNew = () => {
    setEditingLog(null);
    setAddModal(true);
  };

  const startEdit = (log: FishingLog) => {
    setSelectedLogId(null);
    setEditingLog(log);
    setAddModal(true);
  };

  const closeForm = () => {
    setAddModal(false);
    setEditingLog(null);
  };

  const confirmDelete = (log: FishingLog) => {
    Alert.alert('삭제', '이 일지를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteLog.mutateAsync(log.id);
            setSelectedLogId(null);
          } catch (e) {
            Alert.alert('오류', errorMessage(e));
          }
        },
      },
    ]);
  };

  if (logsQuery.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="낚시 일지" eyebrow="나의 낚시 기록" right={<IconButton icon="plus" label="일지 기록" onPress={openNew} />} />

      {/* 일지 / 통계 전환 */}
      <View className="mx-5 mb-2 flex-row rounded-field bg-surface p-1">
        {TABS.map((tab) => {
          const active = activeTab === tab;
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              className={`h-9 flex-1 items-center justify-center rounded-[10px] ${active ? 'bg-bg' : ''}`}
            >
              <Text className={`text-label font-semibold ${active ? 'text-ink' : 'text-mute'}`}>{tab}</Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === '일지' ? (
        <FlashList
          data={logsQuery.isError ? [] : logs}
          keyExtractor={(log) => String(log.id)}
          renderItem={({ item }) => <LogCard log={item} onPress={setSelectedLogId} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            logsQuery.isError ? (
              <EmptyState
                icon="alert-circle"
                title="일지를 불러오지 못했어요."
                actionLabel="다시 시도"
                onAction={() => logsQuery.refetch()}
              />
            ) : (
              <EmptyState
                icon="book-open"
                title="아직 기록이 없어요!"
                description="첫 낚시 일지를 작성해보세요"
                actionLabel="일지 기록"
                onAction={openNew}
              />
            )
          }
          ListFooterComponent={<View className="h-[30px]" />}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-5 pt-2 pb-8">
          <View className="flex-row gap-2">
            <StatCard value={stats.totalTrips} label="총 출조" />
            <StatCard value={stats.totalCatch} label="총 포획" />
            <StatCard value={stats.maxFish ? `${stats.maxFish.sizeCm}cm` : '-'} label="최대 어획" />
          </View>

          {stats.maxFish && (
            <Card className="mt-3">
              <View className="flex-row items-center gap-1.5">
                <Icon name="award" size={16} color={colors.sub} />
                <Text className="text-label font-medium text-sub">최대 어획</Text>
              </View>
              <View className="mt-2 flex-row items-baseline justify-between">
                <Text className="text-heading text-ink">{stats.maxFish.species}</Text>
                <Text className="text-heading text-primary">{stats.maxFish.sizeCm}cm</Text>
              </View>
            </Card>
          )}

          {stats.topSpecies.length > 0 && (
            <Card className="mt-3">
              <View className="mb-1 flex-row items-center gap-1.5">
                <Icon name="bar-chart-2" size={16} color={colors.sub} />
                <Text className="text-label font-medium text-sub">어종별 포획 순위</Text>
              </View>
              {stats.topSpecies.map(([species, count], i) => (
                <View
                  key={species}
                  className={`flex-row items-center justify-between py-3 ${i < stats.topSpecies.length - 1 ? 'border-b border-line' : ''}`}
                >
                  <View className="flex-row items-center">
                    <Text className={`w-9 text-body font-semibold ${i === 0 ? 'text-primary' : 'text-mute'}`}>{i + 1}위</Text>
                    <Text className="text-body text-ink">{species}</Text>
                  </View>
                  <Text className="text-body font-semibold text-sub">{count}마리</Text>
                </View>
              ))}
            </Card>
          )}

          {logs.length === 0 && (
            <EmptyState icon="bar-chart-2" title="아직 통계가 없어요" description="일지를 기록하면 통계가 쌓여요" />
          )}
        </ScrollView>
      )}

      <LogDetailModal
        log={selectedLog}
        visible={selectedLog !== null}
        onClose={() => setSelectedLogId(null)}
        onEdit={startEdit}
        onDelete={confirmDelete}
      />

      <LogFormModal visible={addModal} editingLog={editingLog} onClose={closeForm} />
    </View>
  );
}
