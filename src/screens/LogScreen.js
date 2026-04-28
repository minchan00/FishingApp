import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, getDoc, serverTimestamp, query, where
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/ditzwplkp/image/upload';
const UPLOAD_PRESET = 'FishingApp';

const WEATHER_OPTIONS = ['맑음 ☀️', '흐림 ☁️', '비 🌧️', '바람 💨', '안개 🌫️'];
const SPECIES_OPTIONS = ['광어', '우럭', '감성돔', '농어', '참돔', '고등어', '갈치', '주꾸미', '볼락', '숭어', '기타'];

export default function LogScreen() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [activeTab, setActiveTab] = useState('일지');
  const [catches, setCatches] = useState([]);
  const [editingLog, setEditingLog] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [shareImage, setShareImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [shareToComm, setShareToComm] = useState(false);
  const [registerToDogam, setRegisterToDogam] = useState(true);
  const [userNickname, setUserNickname] = useState('낚시꾼');
  const [newLog, setNewLog] = useState({
    date: new Date().toLocaleDateString('ko-KR'),
    location: '',
    weather: '맑음 ☀️',
    duration: '',
    memo: '',
  });

  const uid = auth.currentUser?.uid;

  useEffect(() => { loadLogs(); loadNickname(); }, []);
  useFocusEffect(useCallback(() => { loadLogs(); }, []));

  const loadNickname = async () => {
    try {
      const snap = await getDoc(doc(db, 'users', auth.currentUser?.uid));
      if (snap.exists()) setUserNickname(snap.data().nickname || '낚시꾼');
    } catch (e) {}
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('알림', '갤러리 접근 권한이 필요해요.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled) setShareImage(result.assets[0].uri);
  };

  const uploadToCloudinary = async (uri) => {
    const formData = new FormData();
    formData.append('file', { uri, type: 'image/jpeg', name: 'photo.jpg' });
    formData.append('upload_preset', UPLOAD_PRESET);
    const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
    const data = await res.json();
    if (!data.secure_url) throw new Error('업로드 실패');
    return data.secure_url;
  };

  const loadLogs = async () => {
    try {
      const q = query(collection(db, 'fishing_logs'), where('uid', '==', uid));
      const snapshot = await getDocs(q);
      const loaded = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.createdAt?.toDate?.() || new Date(0);
          const tb = b.createdAt?.toDate?.() || new Date(0);
          return tb - ta;
        });
      setLogs(loaded);
      await updateMyFishFromLogs(loaded);
    } catch (e) { console.error('일지 불러오기 실패:', e); }
    setLoading(false);
  };

  const updateMyFishFromLogs = async (allLogs) => {
    try {
      const fishMap = {};
      allLogs.forEach((log) => {
        (log.catches || []).forEach((c) => {
          const key = c.species;
          const size = parseFloat(c.size) || 0;
          if (!fishMap[key] || size > (parseFloat(fishMap[key].size) || 0)) {
            fishMap[key] = {
              id: `log_${key}`,
              name: c.species,
              size: c.size,
              date: log.date,
              location: log.location,
              image: c.image || log.imageUrl || log.image || null,
              memo: '일지에서 자동 기록됨',
              totalCount: 0,
            };
          }
        });
      });
      allLogs.forEach((log) => {
        (log.catches || []).forEach((c) => {
          if (fishMap[c.species]) {
            fishMap[c.species].totalCount = (fishMap[c.species].totalCount || 0) + (parseInt(c.count) || 1);
          }
        });
      });
      const existingSaved = await AsyncStorage.getItem('my_fish');
      const existing = existingSaved ? JSON.parse(existingSaved) : [];
      const manualFish = existing.filter(f => !f.id.startsWith('log_'));
      await AsyncStorage.setItem('my_fish', JSON.stringify([...manualFish, ...Object.values(fishMap)]));
    } catch (e) { console.error('도감 업데이트 실패:', e); }
  };

  const addCatch = () => setCatches([...catches, { species: '광어', size: '', count: '1', image: null }]);
  const updateCatch = (idx, field, value) => setCatches(catches.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  const removeCatch = (idx) => setCatches(catches.filter((_, i) => i !== idx));

  const resetForm = () => {
    setNewLog({ date: new Date().toLocaleDateString('ko-KR'), location: '', weather: '맑음 ☀️', duration: '', memo: '' });
    setCatches([]);
    setEditingLog(null);
    setShareImage(null);
    setShareToComm(false);
    setRegisterToDogam(true);
  };

  const updateDogam = async (catchesData, imageUrl, location) => {
    const today = new Date().toLocaleDateString('ko-KR');
    const saved = await AsyncStorage.getItem('my_fish');
    const fish = saved ? JSON.parse(saved) : [];
    catchesData.forEach((c) => {
      if (!c.species) return;
      const idx = fish.findIndex(f => f.name === c.species);
      if (idx >= 0) {
        if (parseFloat(c.size) > parseFloat(fish[idx].size || 0)) {
          fish[idx] = { ...fish[idx], size: c.size, date: today, location, image: imageUrl || fish[idx].image };
        }
        fish[idx].totalCount = (fish[idx].totalCount || 1) + 1;
      } else {
        fish.push({ id: `log_${c.species}_${Date.now()}`, name: c.species, size: c.size, date: today, location, memo: '', image: imageUrl || null, totalCount: 1 });
      }
    });
    await AsyncStorage.setItem('my_fish', JSON.stringify(fish));
  };

  const startEdit = (log) => {
    setDetailModal(false);
    setEditingLog(log);
    setNewLog({
      date: log.date,
      location: log.location,
      weather: log.weather,
      duration: log.duration || '',
      memo: log.memo || '',
    });
    setCatches(log.catches ? [...log.catches] : []);
    setAddModal(true);
  };

  const submitLog = async () => {
    if (!newLog.location.trim()) { Alert.alert('알림', '장소를 입력해주세요!'); return; }
    setSubmitting(true);
    try {
      let imageUrl = null;
      if (shareImage) {
        setUploading(true);
        imageUrl = await uploadToCloudinary(shareImage);
        setUploading(false);
      }

      const logData = {
        uid,
        date: newLog.date,
        location: newLog.location,
        weather: newLog.weather,
        duration: newLog.duration,
        memo: newLog.memo,
        catches,
        rating: catches.length > 3 ? '대박' : catches.length > 0 ? '보통' : '꽝',
        imageUrl,
        createdAt: serverTimestamp(),
      };

      if (editingLog) {
        await updateDoc(doc(db, 'fishing_logs', editingLog.id), logData);
      } else {
        await addDoc(collection(db, 'fishing_logs'), logData);
      }

      if (registerToDogam && catches.length > 0) {
        await updateDogam(catches, imageUrl, newLog.location);
      }

      if (!editingLog && shareToComm) {
        const speciesText = catches.length > 0
          ? catches.map(c => `${c.species}${c.size ? ` ${c.size}cm` : ''}${c.count > 1 ? ` x${c.count}` : ''}`).join(', ')
          : '';
        const content = `📍 ${newLog.location}${speciesText ? `\n🐟 ${speciesText}` : ''}${newLog.memo ? `\n\n${newLog.memo}` : ''}`;
        await addDoc(collection(db, 'community_posts'), {
          uid,
          user: userNickname,
          userEmoji: '🎣',
          category: '인증샷',
          content,
          imageUrl,
          likedBy: [],
          comments: [],
          createdAt: serverTimestamp(),
        });
      }

      await loadLogs();
      resetForm();
      setAddModal(false);
    } catch (e) {
      setUploading(false);
      console.error('일지 저장 실패:', e);
      Alert.alert('오류', '일지 저장에 실패했어요.');
    }
    setSubmitting(false);
  };

  const deleteLog = async (id) => {
    Alert.alert('삭제', '이 일지를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        await deleteDoc(doc(db, 'fishing_logs', id));
        await loadLogs();
        setDetailModal(false);
      }},
    ]);
  };

  const getStats = () => {
    const totalTrips = logs.length;
    const allCatches = logs.flatMap(l => l.catches || []);
    const totalCatch = allCatches.reduce((sum, c) => sum + (parseInt(c.count) || 1), 0);
    const maxFish = allCatches.reduce((max, c) => {
      const size = parseFloat(c.size) || 0;
      return size > (parseFloat(max.size) || 0) ? c : max;
    }, {});
    const speciesCount = {};
    allCatches.forEach(c => { speciesCount[c.species] = (speciesCount[c.species] || 0) + (parseInt(c.count) || 1); });
    const topSpecies = Object.entries(speciesCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { totalTrips, totalCatch, maxFish, topSpecies };
  };

  const stats = getStats();

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#f4a826" size="large" />
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
        <TouchableOpacity style={styles.addBtn} onPress={() => { resetForm(); setAddModal(true); }}>
          <Text style={styles.addBtnText}>+ 기록</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {['일지', '통계'].map((tab) => (
          <TouchableOpacity key={tab} style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab === '일지' ? '📋 일지' : '📊 통계'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === '일지' ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 16 }}>
            {logs.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>📔</Text>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, textAlign: 'center' }}>
                  아직 기록이 없어요!{'\n'}첫 낚시 일지를 작성해보세요 😊
                </Text>
              </View>
            ) : (
              logs.map((log) => (
                <TouchableOpacity key={log.id} style={styles.logCard} onPress={() => { setSelectedLog(log); setDetailModal(true); }} activeOpacity={0.8}>
                  <View style={styles.logHeader}>
                    <Text style={styles.logHeaderText}>{log.date} · {log.location}</Text>
                    <Text style={styles.logRating}>{log.rating === '대박' ? '🏆 대박' : log.rating === '보통' ? '😊 보통' : '😔 꽝'}</Text>
                  </View>
                  <View style={{ padding: 14 }}>
                    <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                      <Text style={styles.logMeta}>{log.weather}</Text>
                      {log.duration ? <Text style={[styles.logMeta, { marginLeft: 12 }]}>⏰ {log.duration}시간</Text> : null}
                      <Text style={[styles.logMeta, { marginLeft: 12 }]}>🎣 {(log.catches || []).reduce((s, c) => s + (parseInt(c.count) || 1), 0)}마리</Text>
                    </View>
                    {(log.catches || []).length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {log.catches.map((c, i) => (
                          <View key={i} style={styles.catchTag}>
                            <Text style={styles.catchTagText}>{c.species} {c.size ? `${c.size}cm` : ''} {c.count > 1 ? `x${c.count}` : ''}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {log.memo ? <Text style={styles.logMemo} numberOfLines={2}>{log.memo}</Text> : null}
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
                <Text style={[styles.statValue, { color: '#f4a826' }]}>{stats.totalCatch}</Text>
                <Text style={styles.statLabel}>총 포획</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: '#2a9fc4', fontSize: 16 }]}>
                  {stats.maxFish.size ? `${stats.maxFish.size}cm` : '-'}
                </Text>
                <Text style={styles.statLabel}>최대 어획</Text>
              </View>
            </View>
            {stats.maxFish.species && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>🏆 최대 어획</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{stats.maxFish.species}</Text>
                  <Text style={{ color: '#f4a826', fontSize: 15, fontWeight: '600' }}>{stats.maxFish.size}cm</Text>
                </View>
              </View>
            )}
            {stats.topSpecies.length > 0 && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>🐟 어종별 포획 순위</Text>
                {stats.topSpecies.map(([species, count], i) => (
                  <View key={species} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ color: i === 0 ? '#f4a826' : 'rgba(255,255,255,0.65)', fontSize: 14, marginRight: 8, fontWeight: '600' }}>{i + 1}위</Text>
                      <Text style={{ color: '#fff', fontSize: 14 }}>{species}</Text>
                    </View>
                    <Text style={{ color: '#2a9fc4', fontSize: 14, fontWeight: '600' }}>{count}마리</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {/* 상세 모달 */}
      <Modal visible={detailModal} transparent animationType="slide" onRequestClose={() => setDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedLog && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>{selectedLog.date} · {selectedLog.location}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 }}>{selectedLog.weather} {selectedLog.duration ? `· ${selectedLog.duration}시간` : ''}</Text>
                  </View>
                  <TouchableOpacity onPress={() => startEdit(selectedLog)} style={styles.editBtn}>
                    <Text style={styles.editBtnText}>✏️ 수정</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setDetailModal(false)}>
                    <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 20 }}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {selectedLog.imageUrl && (
                    <Image source={{ uri: selectedLog.imageUrl }} style={styles.detailImage} resizeMode="cover" />
                  )}
                  {(selectedLog.catches || []).length > 0 && (
                    <View style={styles.sectionCard}>
                      <Text style={styles.sectionTitle}>🎣 어획 기록</Text>
                      {selectedLog.catches.map((c, i) => (
                        <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
                          <Text style={{ color: '#fff', fontSize: 14 }}>{c.species}</Text>
                          <Text style={{ color: '#2a9fc4', fontSize: 14 }}>{c.size ? `${c.size}cm ` : ''}{c.count > 1 ? `x${c.count}` : ''}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {selectedLog.memo ? (
                    <View style={styles.sectionCard}>
                      <Text style={styles.sectionTitle}>📝 메모</Text>
                      <Text style={{ color: '#fff', fontSize: 14, lineHeight: 22, marginTop: 8 }}>{selectedLog.memo}</Text>
                    </View>
                  ) : null}
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteLog(selectedLog.id)}>
                    <Text style={styles.deleteBtnText}>🗑️ 일지 삭제</Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* 작성/수정 모달 */}
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => { setAddModal(false); resetForm(); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingLog ? '✏️ 낚시 일지 수정' : '📔 낚시 일지 작성'}</Text>
                <TouchableOpacity onPress={() => { setAddModal(false); resetForm(); }}>
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 20 }}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                <TextInput style={styles.input} placeholder="날짜" placeholderTextColor="rgba(255,255,255,0.4)" value={newLog.date} onChangeText={(t) => setNewLog({ ...newLog, date: t })} />
                <TextInput style={styles.input} placeholder="장소 *" placeholderTextColor="rgba(255,255,255,0.4)" value={newLog.location} onChangeText={(t) => setNewLog({ ...newLog, location: t })} />
                <TextInput style={styles.input} placeholder="낚시 시간 (시간)" placeholderTextColor="rgba(255,255,255,0.4)" keyboardType="numeric" value={newLog.duration} onChangeText={(t) => setNewLog({ ...newLog, duration: t })} />

                <Text style={styles.inputLabel}>날씨</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {WEATHER_OPTIONS.map((w) => (
                    <TouchableOpacity key={w} onPress={() => setNewLog({ ...newLog, weather: w })} style={[styles.chip, newLog.weather === w && styles.chipActive, { marginRight: 8 }]}>
                      <Text style={[styles.chipText, newLog.weather === w && { color: '#fff' }]}>{w}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={styles.inputLabel}>🎣 어획 기록</Text>
                  <TouchableOpacity onPress={addCatch} style={styles.addCatchBtn}>
                    <Text style={{ color: '#f4a826', fontSize: 13, fontWeight: '600' }}>+ 추가</Text>
                  </TouchableOpacity>
                </View>
                {catches.map((c, i) => (
                  <View key={i} style={styles.catchRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                      {SPECIES_OPTIONS.map((s) => (
                        <TouchableOpacity key={s} onPress={() => updateCatch(i, 'species', s)} style={[styles.chip, c.species === s && styles.chipActive, { marginRight: 6 }]}>
                          <Text style={[styles.chipText, c.species === s && { color: '#fff', fontSize: 11 }]}>{s}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <View style={{ flexDirection: 'row' }}>
                      <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} placeholder="크기(cm)" placeholderTextColor="rgba(255,255,255,0.4)" keyboardType="numeric" value={c.size} onChangeText={(t) => updateCatch(i, 'size', t)} />
                      <TextInput style={[styles.input, { width: 70, marginRight: 8 }]} placeholder="마리수" placeholderTextColor="rgba(255,255,255,0.4)" keyboardType="numeric" value={c.count} onChangeText={(t) => updateCatch(i, 'count', t)} />
                      <TouchableOpacity onPress={() => removeCatch(i)} style={styles.removeCatchBtn}>
                        <Text style={{ color: '#e05c1a', fontSize: 18 }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="메모 (날씨, 미끼, 포인트 등)" placeholderTextColor="rgba(255,255,255,0.4)" multiline value={newLog.memo} onChangeText={(t) => setNewLog({ ...newLog, memo: t })} />

                {/* 사진 추가 */}
                <TouchableOpacity style={styles.imagePickBtn} onPress={pickImage}>
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
                    {shareImage ? '📷 사진 변경' : '📷 사진 추가 (선택)'}
                  </Text>
                </TouchableOpacity>
                {shareImage && (
                  <View style={{ marginBottom: 12 }}>
                    <Image source={{ uri: shareImage }} style={styles.previewImage} resizeMode="cover" />
                    <TouchableOpacity onPress={() => setShareImage(null)} style={styles.removeImageBtn}>
                      <Text style={{ color: '#fff', fontSize: 11 }}>✕ 사진 제거</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* 도감 등록 토글 */}
                {!editingLog && catches.length > 0 && (
                  <TouchableOpacity style={styles.shareToggle} onPress={() => setRegisterToDogam(!registerToDogam)}>
                    <View style={[styles.toggleDot, registerToDogam && styles.toggleDotActive]} />
                    <Text style={{ color: registerToDogam ? '#f4a826' : 'rgba(255,255,255,0.65)', fontSize: 13, marginLeft: 10 }}>
                      🐟 내 도감에도 등록하기
                    </Text>
                  </TouchableOpacity>
                )}

                {/* 커뮤니티 공유 (수정 모드에서는 숨김) */}
                {!editingLog && (
                  <TouchableOpacity style={styles.shareToggle} onPress={() => setShareToComm(!shareToComm)}>
                    <View style={[styles.toggleDot, shareToComm && styles.toggleDotActive]} />
                    <Text style={{ color: shareToComm ? '#f4a826' : 'rgba(255,255,255,0.65)', fontSize: 13, marginLeft: 10 }}>
                      👥 커뮤니티 인증샷에도 공유하기
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
              <TouchableOpacity style={styles.submitBtn} onPress={submitLog} disabled={submitting || uploading}>
                {submitting || uploading
                  ? <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.submitBtnText}>{uploading ? '사진 업로드 중...' : '저장 중...'}</Text>
                    </View>
                  : <Text style={styles.submitBtnText}>{editingLog ? '수정 저장' : '일지 등록'}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a2a3a' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  title: { color: '#fff', fontSize: 20, fontWeight: '600' },
  sub: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },
  addBtn: { backgroundColor: '#f4a826', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: '#f4a826' },
  tabText: { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: '#fff' },
  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  logCard: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 14, overflow: 'hidden', marginBottom: 10 },
  logHeader: { backgroundColor: 'rgba(26,106,138,0.4)', paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logHeaderText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  logRating: { color: '#f4a826', fontSize: 12 },
  logImage: { width: '100%', height: 160, borderRadius: 10, marginTop: 8 },
  detailImage: { width: '100%', height: 220, borderRadius: 14, marginBottom: 12 },
  logMeta: { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  logMemo: { color: 'rgba(255,255,255,0.65)', fontSize: 12, lineHeight: 18, marginTop: 8 },
  catchTag: { backgroundColor: 'rgba(42,159,196,0.2)', borderWidth: 1, borderColor: '#2a9fc4', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginRight: 6, marginBottom: 4 },
  catchTagText: { color: '#2a9fc4', fontSize: 11 },
  statsGrid: { flexDirection: 'row', marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 12, alignItems: 'center', marginRight: 8 },
  statValue: { color: '#fff', fontSize: 20, fontWeight: '600' },
  statLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 10, marginTop: 4 },
  sectionCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 14, marginBottom: 12 },
  sectionTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0e4060', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '600', flex: 1 },
  editBtn: { backgroundColor: 'rgba(244,168,38,0.15)', borderWidth: 1, borderColor: '#f4a826', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginRight: 10 },
  editBtnText: { color: '#f4a826', fontSize: 12, fontWeight: '600' },
  input: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 14, color: '#fff', fontSize: 14, marginBottom: 10 },
  inputLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginBottom: 8 },
  chip: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  chipActive: { backgroundColor: '#f4a826', borderColor: '#f4a826' },
  chipText: { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  catchRow: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 10, marginBottom: 10 },
  addCatchBtn: { backgroundColor: 'rgba(244,168,38,0.15)', borderWidth: 1, borderColor: '#f4a826', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  removeCatchBtn: { justifyContent: 'center', paddingHorizontal: 8 },
  imagePickBtn: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 },
  previewImage: { width: '100%', height: 180, borderRadius: 10 },
  removeImageBtn: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-end', marginTop: 6 },
  shareToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(244,168,38,0.08)', borderWidth: 1, borderColor: 'rgba(244,168,38,0.3)', borderRadius: 12, padding: 14, marginBottom: 10 },
  toggleDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  toggleDotActive: { backgroundColor: '#f4a826', borderColor: '#f4a826' },
  submitBtn: { backgroundColor: '#f4a826', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  deleteBtn: { backgroundColor: 'rgba(224,92,26,0.2)', borderWidth: 1, borderColor: '#e05c1a', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  deleteBtnText: { color: '#e05c1a', fontSize: 14, fontWeight: '600' },
});
