import { useMutation, useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { DogamMemoModal } from '@/components/fish/DogamMemoModal';
import { styles } from '@/components/fish/fishStyles';
import { searchTaxa, type TaxonResult } from '@/components/fish/inaturalist';
import { MyDogamTab } from '@/components/fish/MyDogamTab';
import { RegisterCatchModal, type RegisterDraft } from '@/components/fish/RegisterCatchModal';
import { SpeciesDetailModal } from '@/components/fish/SpeciesDetailModal';
import { extractSpeciesName, identifyFish } from '@/data/ai';
import { useDogam } from '@/hooks/queries';
import { colors } from '@/theme/colors';
import type { DogamEntry } from '@/types/models';

const RECOMMENDED = [
  { category: '🐟 바다낚시 인기', species: ['광어', '우럭', '감성돔', '농어', '참돔', '방어', '고등어', '갈치', '볼락', '노래미', '숭어', '전어', '삼치', '돌돔'] },
  { category: '🦑 두족류', species: ['주꾸미', '오징어', '갑오징어', '문어', '낙지', '꼴뚜기'] },
  { category: '🦀 갑각류', species: ['꽃게', '대게', '새우', '보리새우'] },
  { category: '🐟 민물낚시', species: ['붕어', '잉어', '배스', '쏘가리', '메기', '가물치', '피라미'] },
  { category: '🦈 대형 어종', species: ['참치', '부시리', '다랑어', '줄삼치'] },
];

type Tab = '전체' | '내도감';

export default function FishScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('전체');
  const [search, setSearch] = useState('');
  /** 입력이 500ms 멈춘 뒤의 검색어 */
  const [keyword, setKeyword] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [aiModal, setAiModal] = useState(false);
  const [selectedFish, setSelectedFish] = useState<TaxonResult | null>(null);
  const [registerDraft, setRegisterDraft] = useState<RegisterDraft | null>(null);
  const [editEntry, setEditEntry] = useState<DogamEntry | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dogam = useDogam();
  const myFishList = dogam.data ?? [];

  const taxa = useQuery({
    queryKey: ['inaturalist', keyword],
    queryFn: () => searchTaxa(keyword),
    enabled: keyword.length > 0,
    staleTime: 5 * 60_000,
  });
  const searchResults = taxa.data ?? [];

  const identify = useMutation({ mutationFn: identifyFish });
  const result = identify.data ?? null;

  useEffect(() => () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
  }, []);

  const handleSearch = (text: string) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!text.trim()) {
      setKeyword('');
      return;
    }
    searchTimer.current = setTimeout(() => setKeyword(text.trim()), 500);
  };

  const clearSearch = () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setSearch('');
    setKeyword('');
  };

  const searchRecommended = (name: string) => {
    setSearch(name);
    setKeyword(name);
  };

  const analyzeImage = (asset: ImagePicker.ImagePickerAsset) => {
    setImage(asset.uri);
    identify.reset();
    setAiModal(true);
    if (!asset.base64) {
      Alert.alert('오류', '이미지를 읽을 수 없어요.');
      setAiModal(false);
      return;
    }
    identify.mutate(asset.base64);
  };

  // 카메라로 찍기
  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('권한 필요', '카메라 권한이 필요해요!');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], base64: true, quality: 0.7 });
      const asset = res.canceled ? undefined : res.assets[0];
      if (asset) analyzeImage(asset);
    } catch {
      Alert.alert('오류', '카메라를 열 수 없어요.');
    }
  };

  // 갤러리에서 선택 (base64 포함)
  const pickImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.7 });
      const asset = res.canceled ? undefined : res.assets[0];
      if (asset) analyzeImage(asset);
    } catch {
      Alert.alert('오류', '갤러리를 열 수 없어요.');
    }
  };

  // 도감 등록 모달 열기 (현재 위치를 장소 기본값으로)
  const openRegisterModal = async () => {
    const speciesName = result ? extractSpeciesName(result) : null;
    let locationStr = '';
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const g = (await Location.reverseGeocodeAsync(loc.coords))[0];
        if (g) locationStr = `${g.city || g.region || ''} ${g.district || ''}`.trim();
      }
    } catch {
      // 위치를 못 가져오면 빈칸으로 둔다
    }
    setRegisterDraft({ name: speciesName ?? '', size: '', location: locationStr, memo: '' });
  };

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
          <Text style={[styles.tabText, activeTab === '내도감' && styles.tabTextActive]}>
            🏆 내 도감 {myFishList.length > 0 ? `(${myFishList.length})` : ''}
          </Text>
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
            <Text style={{ fontSize: 14, color: colors.textMuted }}>🔍</Text>
            <TextInput style={styles.searchInput} placeholder="어종 이름 검색..." placeholderTextColor="rgba(255,255,255,0.4)" value={search} onChangeText={handleSearch} />
            {search ? (
              <TouchableOpacity onPress={clearSearch}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {search ? (
            <View style={{ flex: 1 }}>
              {taxa.isLoading || (search.trim() !== keyword) ? (
                <View style={styles.centerWrap}>
                  <ActivityIndicator color={colors.accent} size="large" />
                  <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: 13 }}>검색 중...</Text>
                </View>
              ) : searchResults.length > 0 ? (
                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.resultCard} onPress={() => setSelectedFish(item)} activeOpacity={0.8}>
                      {item.photoUrl ? (
                        <Image source={{ uri: item.photoUrl }} style={styles.thumbnail} resizeMode="cover" />
                      ) : (
                        <View style={[styles.thumbnail, { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                          <Text style={{ fontSize: 24 }}>🐟</Text>
                        </View>
                      )}
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{ color: colors.white, fontSize: 15, fontWeight: '600' }}>{item.name}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontStyle: 'italic', marginTop: 2 }}>{item.scientific}</Text>
                        {item.class ? (
                          <View style={[styles.taxonTag, { marginTop: 6, alignSelf: 'flex-start' }]}>
                            <Text style={styles.taxonText}>{item.class}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={{ color: colors.oceanLight, fontSize: 18 }}>→</Text>
                    </TouchableOpacity>
                  )}
                  ListFooterComponent={<View style={{ height: 20 }} />}
                />
              ) : (
                <View style={styles.centerWrap}>
                  <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center' }}>"{search}" 검색 결과가 없어요</Text>
                </View>
              )}
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ paddingHorizontal: 16, marginTop: 4 }}>
                {RECOMMENDED.map((cat) => (
                  <View key={cat.category} style={{ marginBottom: 20 }}>
                    <Text style={styles.catTitle}>{cat.category}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {cat.species.map((name) => (
                        <TouchableOpacity key={name} style={styles.recommendChip} onPress={() => searchRecommended(name)}>
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
        <MyDogamTab entries={myFishList} isLoading={dogam.isLoading} error={dogam.error} onSelect={setEditEntry} />
      )}

      {/* AI 분석 모달 */}
      <Modal visible={aiModal} transparent animationType="slide" onRequestClose={() => setAiModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🤖 AI 어종 분석</Text>
              <TouchableOpacity onPress={() => setAiModal(false)}>
                <Text style={{ color: colors.textMuted, fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>
            {image ? <Image source={{ uri: image }} style={styles.previewImage} resizeMode="cover" /> : null}
            {identify.isPending ? (
              <View style={styles.centerWrap}>
                <ActivityIndicator color={colors.accent} size="large" />
                <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: 13 }}>AI가 분석하고 있어요...</Text>
              </View>
            ) : (
              <>
                <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
                  {identify.error ? (
                    <Text style={{ color: colors.white, fontSize: 14, lineHeight: 24 }}>오류: {identify.error.message}</Text>
                  ) : (
                    <Text style={{ color: colors.white, fontSize: 14, lineHeight: 24 }}>{result}</Text>
                  )}
                </ScrollView>
                {result && !result.includes('인식할 수 없어요') ? (
                  <TouchableOpacity style={styles.registerBtn} onPress={openRegisterModal}>
                    <Text style={styles.registerBtnText}>🐟 도감 + 일지에 등록하기</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}
            <TouchableOpacity style={[styles.closeBtn, { marginTop: 8 }]} onPress={() => setAiModal(false)}>
              <Text style={styles.closeBtnText}>닫기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <RegisterCatchModal
        draft={registerDraft}
        imageUri={image}
        onClose={() => setRegisterDraft(null)}
        onRegistered={() => {
          setRegisterDraft(null);
          setAiModal(false);
        }}
      />

      <DogamMemoModal entry={editEntry} onClose={() => setEditEntry(null)} />

      <SpeciesDetailModal fish={selectedFish} onClose={() => setSelectedFish(null)} />
    </View>
  );
}
