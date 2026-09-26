import { useMutation, useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AnalysisResult } from '@/components/fish/AnalysisResult';
import { DogamMemoModal } from '@/components/fish/DogamMemoModal';
import { searchTaxa, type TaxonResult } from '@/components/fish/inaturalist';
import { MyDogamTab } from '@/components/fish/MyDogamTab';
import { RegisterCatchModal, type RegisterDraft } from '@/components/fish/RegisterCatchModal';
import { SpeciesDetailModal } from '@/components/fish/SpeciesDetailModal';
import { CloseX, cls, PLACEHOLDER_COLOR, SheetModal } from '@/components/fish/ui';
import { identifyFish } from '@/data/ai';
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
    identify.mutate(asset.uri);
  };

  // 카메라로 찍기
  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('권한 필요', '카메라 권한이 필요해요!');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
      const asset = res.canceled ? undefined : res.assets[0];
      if (asset) analyzeImage(asset);
    } catch {
      Alert.alert('오류', '카메라를 열 수 없어요.');
    }
  };

  // 갤러리에서 선택
  const pickImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      const asset = res.canceled ? undefined : res.assets[0];
      if (asset) analyzeImage(asset);
    } catch {
      Alert.alert('오류', '갤러리를 열 수 없어요.');
    }
  };

  // 도감 등록 모달 열기 (현재 위치를 장소 기본값으로)
  const openRegisterModal = async () => {
    const id = identify.data?.identification;
    const speciesName = id?.recognized ? id.species : null;
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

  const tabBtnClass = (tab: Tab) => `flex-1 py-[8px] items-center rounded-[10px]${activeTab === tab ? ' bg-accent' : ''}`;
  const tabTextClass = (tab: Tab) => `text-[13px] font-medium ${activeTab === tab ? 'text-white' : 'text-muted'}`;

  return (
    <View className="flex-1 bg-ocean-deep">
      <View className="px-[20px] pt-[56px] pb-[8px]">
        <Text className="text-white text-[20px] font-semibold">🐟 어종 도감</Text>
        <Text className="text-muted text-[12px] mt-[2px]">AI 분석 · 자동 등록</Text>
      </View>

      {/* 탭 */}
      <View className="flex-row mx-[16px] mb-[12px] bg-card rounded-[12px] p-[4px]">
        <TouchableOpacity className={tabBtnClass('전체')} onPress={() => setActiveTab('전체')}>
          <Text className={tabTextClass('전체')}>📖 전체 도감</Text>
        </TouchableOpacity>
        <TouchableOpacity className={tabBtnClass('내도감')} onPress={() => setActiveTab('내도감')}>
          <Text className={tabTextClass('내도감')}>
            🏆 내 도감 {myFishList.length > 0 ? `(${myFishList.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === '전체' && (
        <>
          {/* AI 분석 */}
          <View className="mx-[16px] mb-[10px] bg-[rgba(42,159,196,0.15)] border border-ocean-light rounded-[16px] p-[14px]">
            <Text className="text-white text-[14px] font-semibold mb-[4px]">📸 AI 어종 분석 & 자동 등록</Text>
            <Text className="text-muted text-[11px] leading-[16px] mb-[12px]">사진을 찍으면 AI가 어종을 분석하고 도감 + 일지에 자동 등록해줘요!</Text>
            <View className="flex-row">
              <TouchableOpacity className="flex-1 bg-accent rounded-[10px] py-[10px] items-center mr-[8px]" onPress={takePhoto} activeOpacity={0.8}>
                <Text className="text-white text-[13px] font-semibold">📷 카메라</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-[10px] py-[10px] items-center"
                onPress={pickImage}
                activeOpacity={0.8}
              >
                <Text className="text-white text-[13px] font-semibold">🖼️ 갤러리</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 검색 */}
          <View className="flex-row items-center bg-card border border-card-border rounded-[12px] mx-[16px] mb-[8px] px-[14px] py-[10px]">
            <Text className="text-[14px] text-muted">🔍</Text>
            <TextInput
              className="flex-1 text-white text-[13px] ml-[8px]"
              placeholder="어종 이름 검색..."
              placeholderTextColor={PLACEHOLDER_COLOR}
              value={search}
              onChangeText={handleSearch}
            />
            {search ? (
              <TouchableOpacity onPress={clearSearch}>
                <Text className="text-[rgba(255,255,255,0.5)] text-[16px]">✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {search ? (
            <View className="flex-1">
              {taxa.isLoading || (search.trim() !== keyword) ? (
                <View className={cls.centerWrap}>
                  <ActivityIndicator color={colors.accent} size="large" />
                  <Text className="text-muted mt-[12px] text-[13px]">검색 중...</Text>
                </View>
              ) : searchResults.length > 0 ? (
                <FlashList
                  data={searchResults}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      className="flex-row items-center bg-card border border-card-border rounded-[14px] p-[12px] mb-[10px]"
                      onPress={() => setSelectedFish(item)}
                      activeOpacity={0.8}
                    >
                      {item.photoUrl ? (
                        <Image source={{ uri: item.photoUrl }} style={{ width: 60, height: 60, borderRadius: 10 }} contentFit="cover" transition={150} />
                      ) : (
                        <View className="w-[60px] h-[60px] rounded-[10px] items-center justify-center bg-[rgba(255,255,255,0.05)]">
                          <Text className="text-[24px]">🐟</Text>
                        </View>
                      )}
                      <View className="flex-1 ml-[12px]">
                        <Text className="text-white text-[15px] font-semibold">{item.name}</Text>
                        <Text className="text-[rgba(255,255,255,0.5)] text-[11px] italic mt-[2px]">{item.scientific}</Text>
                        {item.class ? (
                          <View className="bg-[rgba(42,159,196,0.2)] border border-ocean-light rounded-[6px] px-[8px] py-[3px] mt-[6px] self-start">
                            <Text className="text-ocean-light text-[11px]">{item.class}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text className="text-ocean-light text-[18px]">→</Text>
                    </TouchableOpacity>
                  )}
                  ListFooterComponent={<View className="h-[20px]" />}
                />
              ) : (
                <View className={cls.centerWrap}>
                  <Text className="text-[40px] mb-[12px]">🔍</Text>
                  <Text className="text-muted text-[14px] text-center">"{search}" 검색 결과가 없어요</Text>
                </View>
              )}
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="px-[16px] mt-[4px]">
                {RECOMMENDED.map((cat) => (
                  <View key={cat.category} className="mb-[20px]">
                    <Text className="text-white text-[14px] font-semibold mb-[10px]">{cat.category}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {cat.species.map((name) => (
                        <TouchableOpacity
                          key={name}
                          className="bg-card border border-[rgba(255,255,255,0.15)] rounded-[20px] px-[14px] py-[8px] mr-[8px]"
                          onPress={() => searchRecommended(name)}
                        >
                          <Text className="text-white text-[13px]">{name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ))}
                <View className="bg-[rgba(42,159,196,0.1)] border border-[rgba(42,159,196,0.3)] rounded-[12px] p-[14px] mt-[8px]">
                  <Text className="text-muted text-[12px] leading-[20px] text-center">💡 카메라로 물고기를 찍으면{'\n'}AI가 자동으로 분석 & 도감 + 일지에 등록해줘요!</Text>
                </View>
              </View>
              <View className="h-[30px]" />
            </ScrollView>
          )}
        </>
      )}

      {/* 내 도감 탭 */}
      {activeTab === '내도감' && (
        <MyDogamTab entries={myFishList} isLoading={dogam.isLoading} error={dogam.error} onSelect={setEditEntry} />
      )}

      {/* AI 분석 모달 */}
      <SheetModal visible={aiModal} onClose={() => setAiModal(false)}>
        <View className={cls.modalHeader}>
          <Text className={cls.modalTitle}>🤖 AI 어종 분석</Text>
          <CloseX onPress={() => setAiModal(false)} />
        </View>
        {image ? (
          <Image
            source={{ uri: image }}
            style={{ width: '100%', height: 150, borderRadius: 12, marginBottom: 12 }}
            contentFit="cover"
            transition={200}
          />
        ) : null}
        {identify.isPending ? (
          <View className={cls.centerWrap}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text className="text-muted mt-[12px] text-[13px]">AI가 분석하고 있어요...</Text>
          </View>
        ) : (
          <ScrollView className="max-h-[340px]" showsVerticalScrollIndicator={false}>
            <AnalysisResult analysis={identify.data ?? null} error={identify.error} onRegister={openRegisterModal} />
          </ScrollView>
        )}
        <TouchableOpacity className={`${cls.closeBtn} mt-[8px]`} onPress={() => setAiModal(false)}>
          <Text className={cls.btnText}>닫기</Text>
        </TouchableOpacity>
      </SheetModal>

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
