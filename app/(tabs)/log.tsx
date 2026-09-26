import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LogDetailModal } from '@/components/log/LogDetailModal';
import { LogFormModal } from '@/components/log/LogFormModal';
import { errorMessage, formatKoreanDate } from '@/components/log/format';
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

const ratingLabel = (rating: FishingLog['rating']) =>
  rating === '대박' ? '🏆 대박' : rating === '보통' ? '😊 보통' : '😔 꽝';

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
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>📔 낚시 일지</Text>
          <Text style={styles.sub}>나의 낚시 기록</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openNew}>
          <Text style={styles.addBtnText}>+ 기록</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === '일지' ? '📋 일지' : '📊 통계'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === '일지' ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 16 }}>
            {logsQuery.isError ? (
              <View style={styles.emptyWrap}>
                <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 12 }}>
                  일지를 불러오지 못했어요.
                </Text>
                <TouchableOpacity onPress={() => logsQuery.refetch()}>
                  <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>다시 시도</Text>
                </TouchableOpacity>
              </View>
            ) : logs.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>📔</Text>
                <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center' }}>
                  아직 기록이 없어요!{'\n'}첫 낚시 일지를 작성해보세요 😊
                </Text>
              </View>
            ) : (
              logs.map((log) => (
                <TouchableOpacity
                  key={log.id}
                  style={styles.logCard}
                  onPress={() => setSelectedLogId(log.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.logHeader}>
                    <Text style={styles.logHeaderText}>
                      {formatKoreanDate(log.fishedOn)} · {log.location}
                    </Text>
                    <Text style={styles.logRating}>{ratingLabel(log.rating)}</Text>
                  </View>
                  <View style={{ padding: 14 }}>
                    <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                      <Text style={styles.logMeta}>{log.weather}</Text>
                      {log.duration ? <Text style={[styles.logMeta, { marginLeft: 12 }]}>⏰ {log.duration}시간</Text> : null}
                      <Text style={[styles.logMeta, { marginLeft: 12 }]}>
                        🎣 {log.catches.reduce((s, c) => s + c.count, 0)}마리
                      </Text>
                    </View>
                    {log.catches.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {log.catches.map((c, i) => (
                          <View key={i} style={styles.catchTag}>
                            <Text style={styles.catchTagText}>
                              {c.species} {c.sizeCm !== null ? `${c.sizeCm}cm` : ''} {c.count > 1 ? `x${c.count}` : ''}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {log.memo ? (
                      <Text style={styles.logMemo} numberOfLines={2}>
                        {log.memo}
                      </Text>
                    ) : null}
                    {log.imageUrl ? <Image source={{ uri: log.imageUrl }} style={styles.logImage} resizeMode="cover" /> : null}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
          <View style={{ height: 30 }} />
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 16 }}>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.totalTrips}</Text>
                <Text style={styles.statLabel}>총 출조</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: colors.accent }]}>{stats.totalCatch}</Text>
                <Text style={styles.statLabel}>총 포획</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: colors.oceanLight, fontSize: 16 }]}>
                  {stats.maxFish ? `${stats.maxFish.sizeCm}cm` : '-'}
                </Text>
                <Text style={styles.statLabel}>최대 어획</Text>
              </View>
            </View>
            {stats.maxFish && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>🏆 최대 어획</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                  <Text style={{ color: colors.white, fontSize: 15, fontWeight: '600' }}>{stats.maxFish.species}</Text>
                  <Text style={{ color: colors.accent, fontSize: 15, fontWeight: '600' }}>{stats.maxFish.sizeCm}cm</Text>
                </View>
              </View>
            )}
            {stats.topSpecies.length > 0 && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>🐟 어종별 포획 순위</Text>
                {stats.topSpecies.map(([species, count], i) => (
                  <View key={species} style={styles.rankRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text
                        style={{
                          color: i === 0 ? colors.accent : colors.textMuted,
                          fontSize: 14,
                          marginRight: 8,
                          fontWeight: '600',
                        }}
                      >
                        {i + 1}위
                      </Text>
                      <Text style={{ color: colors.white, fontSize: 14 }}>{species}</Text>
                    </View>
                    <Text style={{ color: colors.oceanLight, fontSize: 14, fontWeight: '600' }}>{count}마리</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          <View style={{ height: 30 }} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.oceanDeep },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  title: { color: colors.white, fontSize: 20, fontWeight: '600' },
  sub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  addBtn: { backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: colors.white, fontSize: 13, fontWeight: '600' },
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: colors.cardBg, borderRadius: 12, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: colors.accent },
  tabText: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: colors.white },
  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  logCard: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 14, overflow: 'hidden', marginBottom: 10 },
  logHeader: { backgroundColor: 'rgba(26,106,138,0.4)', paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logHeaderText: { color: colors.white, fontSize: 13, fontWeight: '500' },
  logRating: { color: colors.accent, fontSize: 12 },
  logImage: { width: '100%', height: 160, borderRadius: 10, marginTop: 8 },
  logMeta: { color: colors.textMuted, fontSize: 12 },
  logMemo: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 8 },
  catchTag: { backgroundColor: 'rgba(42,159,196,0.2)', borderWidth: 1, borderColor: colors.oceanLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginRight: 6, marginBottom: 4 },
  catchTagText: { color: colors.oceanLight, fontSize: 11 },
  statsGrid: { flexDirection: 'row', marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, padding: 12, alignItems: 'center', marginRight: 8 },
  statValue: { color: colors.white, fontSize: 20, fontWeight: '600' },
  statLabel: { color: colors.textMuted, fontSize: 10, marginTop: 4 },
  sectionCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 14, padding: 14, marginBottom: 12 },
  sectionTitle: { color: colors.white, fontSize: 14, fontWeight: '600' },
  rankRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
});
