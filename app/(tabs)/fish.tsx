import { useMutation, useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { AnalysisResult } from '@/components/fish/AnalysisResult';
import { DogamMemoModal } from '@/components/fish/DogamMemoModal';
import { searchTaxa, type TaxonResult } from '@/components/fish/inaturalist';
import { MyDogamTab } from '@/components/fish/MyDogamTab';
import { RegisterCatchModal, type RegisterDraft } from '@/components/fish/RegisterCatchModal';
import { SpeciesDetailModal } from '@/components/fish/SpeciesDetailModal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { BottomSheet } from '@/components/ui/Sheet';
import { identifyFish } from '@/data/ai';
import { useDogam } from '@/hooks/queries';
import { colors } from '@/theme/colors';
import type { DogamEntry } from '@/types/models';

const RECOMMENDED = [
  { category: '바다낚시 인기', species: ['광어', '우럭', '감성돔', '농어', '참돔', '방어', '고등어', '갈치', '볼락', '노래미', '숭어', '전어', '삼치', '돌돔'] },
  { category: '두족류', species: ['주꾸미', '오징어', '갑오징어', '문어', '낙지', '꼴뚜기'] },
  { category: '갑각류', species: ['꽃게', '대게', '새우', '보리새우'] },
  { category: '민물낚시', species: ['붕어', '잉어', '배스', '쏘가리', '메기', '가물치', '피라미'] },
  { category: '대형 어종', species: ['참치', '부시리', '다랑어', '줄삼치'] },
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

  const tabs: { key: Tab; label: string }[] = [
    { key: '전체', label: '전체 도감' },
    { key: '내도감', label: `내 도감${myFishList.length > 0 ? ` (${myFishList.length})` : ''}` },
  ];

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="어종 도감" eyebrow="AI 분석 · 자동 등록" />

      {/* 탭 */}
      <View className="mx-5 mb-4 flex-row rounded-field bg-surface p-1">
        {tabs.map((t) => {
          const selected = activeTab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setActiveTab(t.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              className={`h-9 flex-1 items-center justify-center rounded-[10px] ${selected ? 'bg-bg' : ''}`}
            >
              <Text className={`text-label ${selected ? 'font-semibold text-ink' : 'font-medium text-mute'}`}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === '전체' && (
        <>
          {/* AI 분석 */}
          {/* 갤러리(secondary) 버튼이 면 색과 겹치지 않도록 흰 바탕 + 테두리 카드 */}
          <Card tone="outline" className="mx-5 mb-4">
            <View className="mb-4 flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-soft">
                <Icon name="camera" size={20} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-body font-semibold text-ink">AI 어종 분석 & 자동 등록</Text>
                <Text className="mt-0.5 text-label text-mute">사진을 찍으면 AI가 어종을 분석하고 도감 + 일지에 자동 등록해줘요!</Text>
              </View>
            </View>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button label="카메라" icon="camera" size="md" onPress={takePhoto} />
              </View>
              <View className="flex-1">
                <Button label="갤러리" icon="image" size="md" variant="secondary" onPress={pickImage} />
              </View>
            </View>
          </Card>

          {/* 검색 */}
          <View className="mx-5 mb-3 h-[44px] flex-row items-center rounded-field bg-surface px-3.5">
            <Icon name="search" size={18} color={colors.mute} />
            <TextInput
              className="ml-2 flex-1 text-body text-ink"
              placeholder="어종 이름 검색..."
              placeholderTextColor={colors.mute}
              value={search}
              onChangeText={handleSearch}
              returnKeyType="search"
            />
            {search ? (
              <Pressable onPress={clearSearch} accessibilityLabel="검색어 지우기" hitSlop={8}>
                <Icon name="x-circle" size={18} color={colors.mute} />
              </Pressable>
            ) : null}
          </View>

          {search ? (
            <View className="flex-1">
              {taxa.isLoading || (search.trim() !== keyword) ? (
                <View className="items-center py-14">
                  <ActivityIndicator color={colors.primary} size="large" />
                  <Text className="mt-3 text-label text-mute">검색 중...</Text>
                </View>
              ) : searchResults.length > 0 ? (
                <FlashList
                  data={searchResults}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ paddingHorizontal: 20 }}
                  renderItem={({ item }) => (
                    <Pressable
                      className="flex-row items-center gap-3 border-b border-line py-3 active:opacity-70"
                      onPress={() => setSelectedFish(item)}
                    >
                      {item.photoUrl ? (
                        <Image source={{ uri: item.photoUrl }} style={{ width: 56, height: 56, borderRadius: 12 }} contentFit="cover" transition={150} />
                      ) : (
                        <View className="h-14 w-14 items-center justify-center rounded-field bg-surface">
                          <Icon name="fish" size={24} color={colors.mute} />
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="text-body font-semibold text-ink" numberOfLines={1}>{item.name}</Text>
                        <Text className="mt-0.5 text-caption italic text-mute" numberOfLines={1}>{item.scientific}</Text>
                        {item.class ? (
                          <View className="mt-1.5">
                            <Badge label={item.class} />
                          </View>
                        ) : null}
                      </View>
                      <Icon name="chevron-right" size={18} color={colors.mute} />
                    </Pressable>
                  )}
                  ListFooterComponent={<View className="h-[20px]" />}
                />
              ) : (
                <EmptyState icon="search" title={`"${search}" 검색 결과가 없어요`} />
              )}
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {RECOMMENDED.map((cat) => (
                <View key={cat.category} className="mb-5">
                  <Text className="mb-2 px-5 text-label font-medium text-mute">{cat.category}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-5">
                    {cat.species.map((name) => (
                      <Chip key={name} label={name} onPress={() => searchRecommended(name)} />
                    ))}
                  </ScrollView>
                </View>
              ))}
              <View className="mx-5 mt-1 flex-row items-center gap-2.5 rounded-card bg-surface p-4">
                <Icon name="info" size={16} color={colors.mute} />
                <Text className="flex-1 text-label text-sub">카메라로 물고기를 찍으면 AI가 자동으로 분석 & 도감 + 일지에 등록해줘요!</Text>
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
      <BottomSheet visible={aiModal} onClose={() => setAiModal(false)} title="AI 어종 분석">
        {image ? (
          <Image
            source={{ uri: image }}
            style={{ width: '100%', height: 160, borderRadius: 12, marginBottom: 12 }}
            contentFit="cover"
            transition={200}
          />
        ) : null}
        {identify.isPending ? (
          <View className="items-center py-10">
            <ActivityIndicator color={colors.primary} size="large" />
            <Text className="mt-3 text-label text-mute">AI가 분석하고 있어요...</Text>
          </View>
        ) : (
          <ScrollView className="max-h-[340px]" showsVerticalScrollIndicator={false}>
            <AnalysisResult analysis={identify.data ?? null} error={identify.error} onRegister={openRegisterModal} />
          </ScrollView>
        )}
        <Button label="닫기" variant="secondary" onPress={() => setAiModal(false)} className="mt-3" />
      </BottomSheet>

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
