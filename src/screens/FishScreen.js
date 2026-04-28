import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, Image, ActivityIndicator, Alert, Modal, FlatList
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

import { GROQ_API_KEY } from '../config/api';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const RECOMMENDED = [
  { category: '🐟 바다낚시 인기', species: ['광어', '우럭', '감성돔', '농어', '참돔', '방어', '고등어', '갈치', '볼락', '노래미', '숭어', '전어', '삼치', '돌돔'] },
  { category: '🦑 두족류', species: ['주꾸미', '오징어', '갑오징어', '문어', '낙지', '꼴뚜기'] },
  { category: '🦀 갑각류', species: ['꽃게', '대게', '새우', '보리새우'] },
  { category: '🐟 민물낚시', species: ['붕어', '잉어', '배스', '쏘가리', '메기', '가물치', '피라미'] },
  { category: '🦈 대형 어종', species: ['참치', '부시리', '다랑어', '줄삼치'] },
];

// AI 결과에서 어종명 추출
const extractSpeciesName = (text) => {
  if (!text) return null;
  const match = text.match(/🐟\s*어종명\s*:\s*([^\n]+)/);
  if (match) return match[1].trim();
  return null;
};

export default function FishScreen() {
  const [activeTab, setActiveTab] = useState('전체');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [image, setImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [aiModal, setAiModal] = useState(false);
  const [myFish, setMyFish] = useState([]);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedFish, setSelectedFish] = useState(null);
  const [inatInfo, setInatInfo] = useState(null);
  const [registerModal, setRegisterModal] = useState(false);
  const [editModal, setEditModal] = useState(false);  // 수정 모달
  const [editData, setEditData] = useState({});       // 수정 데이터
  const [registerData, setRegisterData] = useState({ name: '', size: '', location: '', memo: '' });
  const [registering, setRegistering] = useState(false);
  const searchTimer = useRef(null);

  useFocusEffect(useCallback(() => { loadMyFish(); }, []));

  const loadMyFish = async () => {
    try {
      const saved = await AsyncStorage.getItem('my_fish');
      if (saved) setMyFish(JSON.parse(saved));
    } catch (e) {}
  };

  const handleSearch = (text) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!text.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(() => searchSpecies(text), 500);
  };

  const searchSpecies = async (keyword) => {
    setSearching(true);
    try {
      const res = await fetch(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(keyword)}&locale=ko&per_page=20&rank=species`);
      const data = await res.json();
      if (data.results) {
        setSearchResults(data.results.map(item => ({
          id: String(item.id),
          name: item.preferred_common_name || item.name,
          scientific: item.name,
          class: item.iconic_taxon_name || '',
          photoUrl: item.default_photo?.medium_url || null,
          photoAttr: item.default_photo?.attribution || '',
          observationsCount: item.observations_count || 0,
          rawData: item,
        })));
      }
    } catch (e) { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const searchRecommended = (name) => { setSearch(name); searchSpecies(name); };

  const openDetail = async (fish) => {
    setSelectedFish(fish);
    setInatInfo(fish.rawData || null);
    setDetailModal(true);
  };

  // 카메라로 찍기
  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') { Alert.alert('권한 필요', '카메라 권한이 필요해요!'); return; }
      const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], base64: true, quality: 0.7 });
      if (!res.canceled && res.assets?.[0]) {
        setImage(res.assets[0].uri);
        analyzeImage(res.assets[0].base64);
      }
    } catch (e) { Alert.alert('오류', '카메라를 열 수 없어요.'); }
  };

  // 갤러리에서 선택 (base64 포함)
  const pickImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.7 });
      if (!res.canceled && res.assets?.[0]) {
        setImage(res.assets[0].uri);
        analyzeImage(res.assets[0].base64);
      }
    } catch (e) { Alert.alert('오류', '갤러리를 열 수 없어요.'); }
  };

  // Groq AI 어종 분석
  const analyzeImage = async (base64) => {
    setAnalyzing(true);
    setResult(null);
    setAiModal(true);
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: `이 사진에 있는 물고기나 해양 생물을 정확하게 분석해주세요.

                특히 아래 어종들은 외형이 비슷하니 꼼꼼히 구분해주세요:
                - 문어(다리가 굵고 빨판이 2줄) vs 낙지(다리가 가늘고 김) vs 주꾸미(몸이 작고 둥글며 눈 주변에 금색 테두리)
                - 방어(몸이 길고 황금색 줄무늬) vs 부시리(방어보다 날씬하고 주둥이가 뾰족) vs 가다랑어(배에 줄무늬) vs 고등어(등에 물결무늬)

                다음 형식으로 답변해주세요:

                🐟 어종명: (한국어 이름)
                📏 평균 크기: (일반적인 크기)
                🌊 서식지: (주로 사는 곳)
                🎣 낚시 방법: (효과적인 낚시 방법)
                🪱 추천 미끼: (잘 먹히는 미끼)
                ⏰ 제철: (잘 잡히는 계절)
                🍽️ 맛과 요리: (맛 특징과 요리법)
                📌 특징: (외형적 특징이나 주의사항)

                만약 물고기가 아니거나 잘 모르겠다면 "어종을 인식할 수 없어요"라고 답해주세요.` },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
            ]
          }],
          max_tokens: 1000,
        })
      });
      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      if (text) setResult(text);
      else if (data?.error) setResult('API 오류: ' + data.error.message);
      else setResult('분석 결과를 가져올 수 없어요.');
    } catch (e) {
      setResult('오류: ' + e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  // 도감 등록 모달 열기
  const openRegisterModal = async () => {
    const speciesName = extractSpeciesName(result);
    let locationStr = '';
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const geo = await Location.reverseGeocodeAsync(loc.coords);
        if (geo?.[0]) {
          const g = geo[0];
          locationStr = `${g.city || g.region || ''} ${g.district || ''}`.trim();
        }
      }
    } catch (e) {}
    setRegisterData({ name: speciesName || '', size: '', location: locationStr, memo: '' });
    setRegisterModal(true);
  };

  // 도감 + 일지 동시 등록
  const registerToMyFish = async () => {
    if (!registerData.name.trim()) { Alert.alert('알림', '어종명을 입력해주세요!'); return; }
    setRegistering(true);
    try {
      const today = new Date().toLocaleDateString('ko-KR');

      // 1. 내 도감 업데이트
      const savedFish = await AsyncStorage.getItem('my_fish');
      const existingFish = savedFish ? JSON.parse(savedFish) : [];
      const idx = existingFish.findIndex(f => f.name === registerData.name.trim());
      if (idx >= 0) {
        if (parseFloat(registerData.size) > parseFloat(existingFish[idx].size || 0)) {
          existingFish[idx] = { ...existingFish[idx], size: registerData.size, date: today, location: registerData.location, image: image };
        }
        existingFish[idx].totalCount = (existingFish[idx].totalCount || 1) + 1;
      } else {
        existingFish.push({
          id: `fish_${Date.now()}`,
          name: registerData.name.trim(),
          size: registerData.size,
          date: today,
          location: registerData.location,
          memo: registerData.memo,
          image: image || null,
          totalCount: 1,
        });
      }
      await AsyncStorage.setItem('my_fish', JSON.stringify(existingFish));
      setMyFish(existingFish);

      // 2. 낚시 일지에도 자동 등록 (Firestore)
      await addDoc(collection(db, 'fishing_logs'), {
        uid: auth.currentUser?.uid,
        date: today,
        location: registerData.location || '미입력',
        weather: '맑음 ☀️',
        duration: '',
        memo: `AI 분석으로 자동 등록${registerData.memo ? ': ' + registerData.memo : ''}`,
        imageUrl: image || null,
        catches: [{
          species: registerData.name.trim(),
          size: registerData.size,
          count: '1',
        }],
        rating: '보통',
        createdAt: serverTimestamp(),
      });

      setRegisterModal(false);
      setAiModal(false);
      Alert.alert('✅ 등록 완료!', `${registerData.name}이(가)\n내 도감 + 낚시 일지에 자동 등록됐어요!`);
    } catch (e) {
      Alert.alert('오류', '등록 중 오류가 발생했어요.');
    } finally {
      setRegistering(false);
    }
  };

  // 수정 모달 열기
  const openEditModal = (fish) => {
    setEditData({ ...fish });
    setEditModal(true);
  };

  // 수정 저장
  const saveEdit = async () => {
    try {
      const updated = myFish.map(f => f.id === editData.id ? editData : f);
      setMyFish(updated);
      await AsyncStorage.setItem('my_fish', JSON.stringify(updated));
      setEditModal(false);
      Alert.alert('✅ 수정 완료!', '도감이 수정됐어요!');
    } catch (e) {
      Alert.alert('오류', '수정 중 오류가 발생했어요.');
    }
  };

  // 삭제
  const deleteFish = async (id) => {
    Alert.alert('삭제', '이 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: async () => {
          const updated = myFish.filter(f => f.id !== id);
          setMyFish(updated);
          await AsyncStorage.setItem('my_fish', JSON.stringify(updated));
          setEditModal(false);
        }
      }
    ]);
  };

  // 내 도감 그룹화 (어종별 최대 크기)
  const groupedMyFish = myFish.reduce((acc, fish) => {
    const existing = acc[fish.name];
    if (!existing || (parseFloat(fish.size) > parseFloat(existing.size || 0))) {
      acc[fish.name] = fish;
    }
    return acc;
  }, {});
  const myFishList = Object.values(groupedMyFish);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🐟 어종 도감</Text>
        <Text style={styles.sub}>AI 분석 · 자동 등록</Text>
      </View>

      {/* 탭 */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === '전체' && styles.tabBtnActive]} onPress={() => setActiveTab('전체')}>
          <Text style={[styles.tabText, activeTab === '전체' && styles.tabTextActive]}>📖 전체 도감</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === '내도감' && styles.tabBtnActive]} onPress={() => setActiveTab('내도감')}>
          <Text style={[styles.tabText, activeTab === '내도감' && styles.tabTextActive]}>🏆 내 도감 {myFishList.length > 0 ? `(${myFishList.length})` : ''}</Text>
        </TouchableOpacity>
      </View>

      {activeTab === '전체' && (
        <>
          {/* AI 분석 */}
          <View style={styles.aiSection}>
            <Text style={styles.aiTitle}>📸 AI 어종 분석 & 자동 등록</Text>
            <Text style={styles.aiSub}>사진을 찍으면 AI가 어종을 분석하고 도감 + 일지에 자동 등록해줘요!</Text>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.cameraBtn} onPress={takePhoto} activeOpacity={0.8}>
                <Text style={styles.cameraBtnText}>📷 카메라</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.galleryBtn} onPress={pickImage} activeOpacity={0.8}>
                <Text style={styles.galleryBtnText}>🖼️ 갤러리</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 검색 */}
          <View style={styles.searchWrap}>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>🔍</Text>
            <TextInput style={styles.searchInput} placeholder="어종 이름 검색..." placeholderTextColor="rgba(255,255,255,0.4)" value={search} onChangeText={handleSearch} />
            {search ? <TouchableOpacity onPress={() => { setSearch(''); setSearchResults([]); }}><Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>✕</Text></TouchableOpacity> : null}
          </View>

          {search ? (
            <View style={{ flex: 1 }}>
              {searching ? (
                <View style={styles.centerWrap}><ActivityIndicator color="#f4a826" size="large" /><Text style={{ color: 'rgba(255,255,255,0.65)', marginTop: 12, fontSize: 13 }}>검색 중...</Text></View>
              ) : searchResults.length > 0 ? (
                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.resultCard} onPress={() => openDetail(item)} activeOpacity={0.8}>
                      {item.photoUrl ? (
                        <Image source={{ uri: item.photoUrl }} style={styles.thumbnail} resizeMode="cover" />
                      ) : (
                        <View style={[styles.thumbnail, { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                          <Text style={{ fontSize: 24 }}>🐟</Text>
                        </View>
                      )}
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{item.name}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontStyle: 'italic', marginTop: 2 }}>{item.scientific}</Text>
                        {item.class ? <View style={[styles.taxonTag, { marginTop: 6, alignSelf: 'flex-start' }]}><Text style={styles.taxonText}>{item.class}</Text></View> : null}
                      </View>
                      <Text style={{ color: '#2a9fc4', fontSize: 18 }}>→</Text>
                    </TouchableOpacity>
                  )}
                  ListFooterComponent={<View style={{ height: 20 }} />}
                />
              ) : (
                <View style={styles.centerWrap}><Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text><Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, textAlign: 'center' }}>"{search}" 검색 결과가 없어요</Text></View>
              )}
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ paddingHorizontal: 16, marginTop: 4 }}>
                {RECOMMENDED.map((cat, ci) => (
                  <View key={ci} style={{ marginBottom: 20 }}>
                    <Text style={styles.catTitle}>{cat.category}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {cat.species.map((name, ni) => (
                        <TouchableOpacity key={ni} style={styles.recommendChip} onPress={() => searchRecommended(name)}>
                          <Text style={styles.recommendChipText}>{name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ))}
                <View style={styles.tipBox}>
                  <Text style={styles.tipText}>💡 카메라로 물고기를 찍으면{'\n'}AI가 자동으로 분석 & 도감 + 일지에 등록해줘요!</Text>
                </View>
              </View>
              <View style={{ height: 30 }} />
            </ScrollView>
          )}
        </>
      )}

      {/* 내 도감 탭 */}
      {activeTab === '내도감' && (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginBottom: 12 }}>
              총 {myFishList.length}종 기록됨 · 탭하면 수정 가능
            </Text>
            {myFishList.length === 0 ? (
              <View style={styles.centerWrap}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>🎣</Text>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, textAlign: 'center' }}>
                  아직 기록이 없어요!{'\n'}카메라로 물고기를 찍어서{'\n'}도감에 등록해보세요 😊
                </Text>
              </View>
            ) : (
              // 그리드 형태로 한눈에 보기
              <View style={styles.myFishGrid}>
                {myFishList.map((fish) => (
                  <TouchableOpacity key={fish.name} style={styles.myFishGridCard} onPress={() => openEditModal(fish)} activeOpacity={0.8}>
                    {fish.image ? (
                      <Image source={{ uri: fish.image }} style={styles.myFishGridPhoto} resizeMode="cover" />
                    ) : (
                      <View style={styles.myFishGridPhotoPlaceholder}>
                        <Text style={{ fontSize: 36 }}>🐟</Text>
                      </View>
                    )}
                    <View style={styles.myFishGridInfo}>
                      <Text style={styles.myFishGridName} numberOfLines={1}>{fish.name}</Text>
                      {fish.size ? <Text style={styles.myFishGridSize}>📏 {fish.size}cm</Text> : null}
                      {fish.location ? <Text style={styles.myFishGridLocation} numberOfLines={1}>📍 {fish.location}</Text> : null}
                      {fish.totalCount > 1 ? <Text style={styles.myFishGridCount}>🎣 {fish.totalCount}마리</Text> : null}
                    </View>
                    <View style={styles.editBadge}>
                      <Text style={{ color: '#fff', fontSize: 10 }}>✏️</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {/* AI 분석 모달 */}
      <Modal visible={aiModal} transparent animationType="slide" onRequestClose={() => setAiModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🤖 AI 어종 분석</Text>
              <TouchableOpacity onPress={() => setAiModal(false)}>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>
            {image && <Image source={{ uri: image }} style={styles.previewImage} resizeMode="cover" />}
            {analyzing ? (
              <View style={styles.centerWrap}>
                <ActivityIndicator color="#f4a826" size="large" />
                <Text style={{ color: 'rgba(255,255,255,0.65)', marginTop: 12, fontSize: 13 }}>AI가 분석하고 있어요...</Text>
              </View>
            ) : (
              <>
                <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
                  <Text style={{ color: '#fff', fontSize: 14, lineHeight: 24 }}>{result}</Text>
                </ScrollView>
                {result && !result.includes('인식할 수 없어요') && (
                  <TouchableOpacity style={styles.registerBtn} onPress={openRegisterModal}>
                    <Text style={styles.registerBtnText}>🐟 도감 + 일지에 등록하기</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
            <TouchableOpacity style={[styles.closeBtn, { marginTop: 8 }]} onPress={() => setAiModal(false)}>
              <Text style={styles.closeBtnText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 도감 등록 모달 */}
      <Modal visible={registerModal} transparent animationType="slide" onRequestClose={() => setRegisterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🐟 도감 + 일지 등록</Text>
              <TouchableOpacity onPress={() => setRegisterModal(false)}>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>
            {image && <Image source={{ uri: image }} style={{ width: '100%', height: 130, borderRadius: 12, marginBottom: 14 }} resizeMode="cover" />}
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>🐟 어종명 *</Text>
              <TextInput style={styles.input} value={registerData.name} onChangeText={(t) => setRegisterData({ ...registerData, name: t })} placeholder="어종명" placeholderTextColor="rgba(255,255,255,0.4)" />
              <Text style={styles.inputLabel}>📏 크기 (cm)</Text>
              <TextInput style={styles.input} value={registerData.size} onChangeText={(t) => setRegisterData({ ...registerData, size: t })} placeholder="크기 입력 (선택)" placeholderTextColor="rgba(255,255,255,0.4)" keyboardType="numeric" />
              <Text style={styles.inputLabel}>📍 잡은 장소</Text>
              <TextInput style={styles.input} value={registerData.location} onChangeText={(t) => setRegisterData({ ...registerData, location: t })} placeholder="장소 입력 (선택)" placeholderTextColor="rgba(255,255,255,0.4)" />
              <Text style={styles.inputLabel}>📝 메모</Text>
              <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]} value={registerData.memo} onChangeText={(t) => setRegisterData({ ...registerData, memo: t })} placeholder="메모 (선택)" placeholderTextColor="rgba(255,255,255,0.4)" multiline />
            </ScrollView>
            <TouchableOpacity style={styles.registerBtn} onPress={registerToMyFish} disabled={registering}>
              {registering ? <ActivityIndicator color="#fff" /> : <Text style={styles.registerBtnText}>✅ 도감 + 일지에 등록하기</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 수정 모달 */}
      <Modal visible={editModal} transparent animationType="slide" onRequestClose={() => setEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ 도감 수정</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>
            {editData.image && <Image source={{ uri: editData.image }} style={{ width: '100%', height: 130, borderRadius: 12, marginBottom: 14 }} resizeMode="cover" />}
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>🐟 어종명</Text>
              <TextInput style={styles.input} value={editData.name} onChangeText={(t) => setEditData({ ...editData, name: t })} placeholder="어종명" placeholderTextColor="rgba(255,255,255,0.4)" />
              <Text style={styles.inputLabel}>📏 최대 크기 (cm)</Text>
              <TextInput style={styles.input} value={editData.size} onChangeText={(t) => setEditData({ ...editData, size: t })} placeholder="크기" placeholderTextColor="rgba(255,255,255,0.4)" keyboardType="numeric" />
              <Text style={styles.inputLabel}>📍 장소</Text>
              <TextInput style={styles.input} value={editData.location} onChangeText={(t) => setEditData({ ...editData, location: t })} placeholder="장소" placeholderTextColor="rgba(255,255,255,0.4)" />
              <Text style={styles.inputLabel}>📅 날짜</Text>
              <TextInput style={styles.input} value={editData.date} onChangeText={(t) => setEditData({ ...editData, date: t })} placeholder="날짜" placeholderTextColor="rgba(255,255,255,0.4)" />
              <Text style={styles.inputLabel}>📝 메모</Text>
              <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]} value={editData.memo} onChangeText={(t) => setEditData({ ...editData, memo: t })} placeholder="메모" placeholderTextColor="rgba(255,255,255,0.4)" multiline />
            </ScrollView>
            <TouchableOpacity style={styles.registerBtn} onPress={saveEdit}>
              <Text style={styles.registerBtnText}>💾 수정 저장</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: '#e05c1a', marginTop: 8 }]} onPress={() => deleteFish(editData.id)}>
              <Text style={styles.closeBtnText}>🗑️ 삭제</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 어종 상세 모달 */}
      <Modal visible={detailModal} transparent animationType="slide" onRequestClose={() => setDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selectedFish?.name}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2, fontStyle: 'italic' }}>{selectedFish?.scientific}</Text>
              </View>
              <TouchableOpacity onPress={() => setDetailModal(false)}>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedFish?.photoUrl ? (
                <View style={{ marginBottom: 12 }}>
                  <Image source={{ uri: selectedFish.photoUrl }} style={styles.detailPhoto} resizeMode="cover" />
                  {selectedFish.photoAttr ? <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, textAlign: 'center', marginTop: 4 }}>📸 {selectedFish.photoAttr}</Text> : null}
                </View>
              ) : null}
              <View style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>📋 분류 정보</Text>
                {[
                  { label: '학명', value: selectedFish?.scientific },
                  { label: '분류군', value: selectedFish?.class },
                  { label: '관찰 기록', value: selectedFish?.observationsCount ? `${selectedFish.observationsCount.toLocaleString()}건` : null },
                ].filter(i => i.value).map((item, i) => (
                  <View key={i} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{item.label}</Text>
                    <Text style={[styles.detailValue, item.label === '학명' && { fontStyle: 'italic' }]}>{item.value}</Text>
                  </View>
                ))}
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, textAlign: 'center', marginTop: 4 }}>📚 iNaturalist</Text>
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setDetailModal(false)}>
              <Text style={styles.closeBtnText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a2a3a' },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  title: { color: '#fff', fontSize: 20, fontWeight: '600' },
  sub: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabBtnActive: { backgroundColor: '#f4a826' },
  tabText: { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: '500' },
  tabTextActive: { color: '#fff' },
  aiSection: { marginHorizontal: 16, marginBottom: 10, backgroundColor: 'rgba(42,159,196,0.15)', borderWidth: 1, borderColor: '#2a9fc4', borderRadius: 16, padding: 14 },
  aiTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  aiSub: { color: 'rgba(255,255,255,0.65)', fontSize: 11, lineHeight: 16, marginBottom: 12 },
  btnRow: { flexDirection: 'row' },
  cameraBtn: { flex: 1, backgroundColor: '#f4a826', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginRight: 8 },
  cameraBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  galleryBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  galleryBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12, marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, color: '#fff', fontSize: 13, marginLeft: 8 },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  resultCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 12, marginBottom: 10 },
  thumbnail: { width: 60, height: 60, borderRadius: 10 },
  taxonTag: { backgroundColor: 'rgba(42,159,196,0.2)', borderWidth: 1, borderColor: '#2a9fc4', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  taxonText: { color: '#2a9fc4', fontSize: 11 },
  catTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 10 },
  recommendChip: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  recommendChipText: { color: '#fff', fontSize: 13 },
  tipBox: { backgroundColor: 'rgba(42,159,196,0.1)', borderWidth: 1, borderColor: 'rgba(42,159,196,0.3)', borderRadius: 12, padding: 14, marginTop: 8 },
  tipText: { color: 'rgba(255,255,255,0.65)', fontSize: 12, lineHeight: 20, textAlign: 'center' },
  // 내 도감 그리드 스타일
  myFishGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  myFishGridCard: { width: '48%', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 14, marginBottom: 12, overflow: 'hidden' },
  myFishGridPhoto: { width: '100%', height: 110, borderRadius: 0 },
  myFishGridPhotoPlaceholder: { width: '100%', height: 110, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  myFishGridInfo: { padding: 10 },
  myFishGridName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  myFishGridSize: { color: '#f4a826', fontSize: 12, marginTop: 3 },
  myFishGridLocation: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 2 },
  myFishGridCount: { color: '#2a9fc4', fontSize: 11, marginTop: 2 },
  editBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0e4060', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '600', flex: 1 },
  previewImage: { width: '100%', height: 150, borderRadius: 12, marginBottom: 12 },
  detailPhoto: { width: '100%', height: 220, borderRadius: 12 },
  registerBtn: { backgroundColor: '#2a9fc4', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  registerBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  closeBtn: { backgroundColor: '#f4a826', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  closeBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  infoSection: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, marginBottom: 12 },
  infoSectionTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  detailLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  detailValue: { color: '#fff', fontSize: 12, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  input: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 14, color: '#fff', fontSize: 14, marginBottom: 10 },
  inputLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginBottom: 6 },
});