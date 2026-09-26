import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LogCard } from '@/components/log/LogCard';
import { LogDetailModal } from '@/components/log/LogDetailModal';
import { LogFormModal } from '@/components/log/LogFormModal';
import { errorMessage } from '@/components/log/format';
import { useDeleteLog, useLogs } from '@/hooks/queries';
import { colors } from '@/theme/colors';
import type { Catch, FishingLog } from '@/types/models';

type Tab = '일지' | '통계';
const TABS: readonly Tab[] = ['일지', '통계'];

const STAT_CARD = 'mr-2 flex-1 items-center rounded-xl border border-card-border bg-card p-3';
const SECTION_CARD = 'mb-3 rounded-[14px] border border-card-border bg-white/5 p-3.5';

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
      <View className="flex-1 items-center justify-center bg-ocean-deep">
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-ocean-deep">
      <View className="flex-row items-start justify-between px-5 pb-2 pt-14">
        <View>
          <Text className="text-[20px] font-semibold text-white">📔 낚시 일지</Text>
          <Text className="mt-0.5 text-[12px] text-muted">나의 낚시 기록</Text>
        </View>
        <TouchableOpacity className="rounded-xl bg-accent px-3.5 py-2" onPress={openNew}>
          <Text className="text-[13px] font-semibold text-white">+ 기록</Text>
        </TouchableOpacity>
      </View>

      <View className="mx-4 mb-3 flex-row rounded-xl bg-card p-1">
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            className={`flex-1 items-center rounded-[10px] py-2 ${activeTab === tab ? 'bg-accent' : ''}`}
            onPress={() => setActiveTab(tab)}
          >
            <Text className={`text-[13px] font-medium ${activeTab === tab ? 'text-white' : 'text-muted'}`}>
              {tab === '일지' ? '📋 일지' : '📊 통계'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === '일지' ? (
        <FlashList
          data={logsQuery.isError ? [] : logs}
          keyExtractor={(log) => String(log.id)}
          renderItem={({ item }) => <LogCard log={item} onPress={setSelectedLogId} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          ListEmptyComponent={
            logsQuery.isError ? (
              <View className="items-center py-[60px]">
                <Text className="mb-3 text-center text-[14px] text-muted">일지를 불러오지 못했어요.</Text>
                <TouchableOpacity onPress={() => logsQuery.refetch()}>
                  <Text className="text-[13px] font-semibold text-accent">다시 시도</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="items-center py-[60px]">
                <Text className="mb-3 text-[48px]">📔</Text>
                <Text className="text-center text-[14px] text-muted">
                  아직 기록이 없어요!{'\n'}첫 낚시 일지를 작성해보세요 😊
                </Text>
              </View>
            )
          }
          ListFooterComponent={<View className="h-[30px]" />}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="px-4">
            <View className="mb-3 flex-row">
              <View className={STAT_CARD}>
                <Text className="text-[20px] font-semibold text-white">{stats.totalTrips}</Text>
                <Text className="mt-1 text-[10px] text-muted">총 출조</Text>
              </View>
              <View className={STAT_CARD}>
                <Text className="text-[20px] font-semibold text-accent">{stats.totalCatch}</Text>
                <Text className="mt-1 text-[10px] text-muted">총 포획</Text>
              </View>
              <View className={STAT_CARD}>
                <Text className="text-[16px] font-semibold text-ocean-light">
                  {stats.maxFish ? `${stats.maxFish.sizeCm}cm` : '-'}
                </Text>
                <Text className="mt-1 text-[10px] text-muted">최대 어획</Text>
              </View>
            </View>
            {stats.maxFish && (
              <View className={SECTION_CARD}>
                <Text className="text-[14px] font-semibold text-white">🏆 최대 어획</Text>
                <View className="mt-2.5 flex-row justify-between">
                  <Text className="text-[15px] font-semibold text-white">{stats.maxFish.species}</Text>
                  <Text className="text-[15px] font-semibold text-accent">{stats.maxFish.sizeCm}cm</Text>
                </View>
              </View>
            )}
            {stats.topSpecies.length > 0 && (
              <View className={SECTION_CARD}>
                <Text className="text-[14px] font-semibold text-white">🐟 어종별 포획 순위</Text>
                {stats.topSpecies.map(([species, count], i) => (
                  <View
                    key={species}
                    className="flex-row items-center justify-between border-b border-white/[0.08] py-2.5"
                  >
                    <View className="flex-row items-center">
                      <Text className={`mr-2 text-[14px] font-semibold ${i === 0 ? 'text-accent' : 'text-muted'}`}>
                        {i + 1}위
                      </Text>
                      <Text className="text-[14px] text-white">{species}</Text>
                    </View>
                    <Text className="text-[14px] font-semibold text-ocean-light">{count}마리</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          <View className="h-[30px]" />
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
