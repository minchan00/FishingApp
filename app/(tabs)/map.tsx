import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlashList } from '@shopify/flash-list';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NaverMapMarkerOverlay, NaverMapView, type Coord, type NaverMapViewRef } from '@mj-studio/react-native-naver-map';
import { AddPointModal } from '@/components/map/AddPointModal';
import { distanceKm, formatDistance, type Coords } from '@/components/map/distance';
import { MARKER_APPEARANCE, markerKind, ZOOM } from '@/components/map/markerAppearance';
import { PointDetailModal } from '@/components/map/PointDetailModal';
import { chipClass, chipTextClass, cls, PLACEHOLDER_COLOR } from '@/components/map/ui';
import { useCreatePoint, useDeletePoint, useFavoritePointIds, usePoints, useToggleFavorite } from '@/hooks/queries';
import { useUser } from '@/hooks/useSession';
import { colors } from '@/theme/colors';
import type { FishingPoint, FishingPointInput } from '@/types/models';

const FILTERS = ['전체', '방파제', '갯바위', '낚시터', '선상', '워킹'] as const;
const SPECIES = ['전체', '광어', '우럭', '감성돔', '농어', '참돔', '고등어', '갈치', '주꾸미'] as const;

const FALLBACK_CAMERA = { latitude: 37.4563, longitude: 126.4816, zoom: ZOOM.fallback };

export default function MapScreen() {
  const user = useUser();
  const [activeFilter, setActiveFilter] = useState<string>('전체');
  const [activeSpecies, setActiveSpecies] = useState<string>('전체');
  const [search, setSearch] = useState('');
  const [userLocation, setUserLocation] = useState<Coords | null>(null);
  const [selectedPointId, setSelectedPointId] = useState<number | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  /** 지도 탭 모드에서 고른 좌표 (포인트 추가 폼에 전달) */
  const [pickedCoords, setPickedCoords] = useState<Coords | null>(null);
  const [mapTapMode, setMapTapMode] = useState(false);
  const [calloutPointId, setCalloutPointId] = useState<number | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<NaverMapViewRef>(null);
  const centeredOnUser = useRef(false);

  const pointsQuery = usePoints();
  const favoritesQuery = useFavoritePointIds();
  const createPoint = useCreatePoint();
  const deletePoint = useDeletePoint();
  const toggleFavoriteMutation = useToggleFavorite();

  const points = useMemo(() => pointsQuery.data ?? [], [pointsQuery.data]);
  const favoriteIds = useMemo(() => new Set(favoritesQuery.data ?? []), [favoritesQuery.data]);
  const selectedPoint = points.find((p) => p.id === selectedPointId) ?? null;
  const calloutPoint = points.find((p) => p.id === calloutPointId) ?? null;

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        }
      } catch {
        // 위치를 못 가져오면 기본 지역을 보여준다
      }
    })();
  }, []);

  // 네이버 지도는 initialCamera가 마운트 시점에만 적용되므로,
  // 위치를 늦게 받아오면 한 번만 내 위치로 카메라를 옮기고 현위치 표시(NoFollow)를 켠다.
  useEffect(() => {
    if (!mapReady || !userLocation || centeredOnUser.current) return;
    centeredOnUser.current = true;
    mapRef.current?.setLocationTrackingMode('NoFollow');
    mapRef.current?.animateCameraTo({ ...userLocation, zoom: ZOOM.userArea, duration: 0 });
  }, [mapReady, userLocation]);

  const isFavorite = (pointId: number) => favoriteIds.has(pointId);
  const toggleFavorite = (pointId: number) =>
    toggleFavoriteMutation.mutate({ pointId, favorite: !isFavorite(pointId) });

  const isMine = (p: FishingPoint) => p.ownerId === user.id;

  const filtered = points
    .filter((p) => {
      const matchSearch = p.name.includes(search) || p.address.includes(search);
      const matchType = activeFilter === '전체' || p.type === activeFilter;
      const matchSpecies = activeSpecies === '전체' || p.species.includes(activeSpecies);
      const matchFav = !showFavorites || isFavorite(p.id);
      return matchSearch && matchType && matchSpecies && matchFav;
    })
    .sort((a, b) => {
      if (!userLocation) return 0;
      return distanceKm(userLocation, a.lat, a.lng) - distanceKm(userLocation, b.lat, b.lng);
    });

  const moveToPoint = (point: FishingPoint) => {
    setSelectedPointId(point.id);
    mapRef.current?.animateCameraTo({ latitude: point.lat, longitude: point.lng, zoom: ZOOM.point, duration: 800 });
  };

  const onMarkerTap = (point: FishingPoint) => {
    moveToPoint(point);
    setCalloutPointId(point.id);
  };

  const openDetail = (point: FishingPoint) => {
    setSelectedPointId(point.id);
    setDetailModal(true);
  };

  const onTapMap = ({ latitude, longitude }: Coord) => {
    // 빈 곳을 탭하면 말풍선을 닫는다 (react-native-maps Callout과 동일한 동작)
    setCalloutPointId(null);
    if (!mapTapMode) return;
    setPickedCoords({ latitude, longitude });
    Alert.alert('위치 선택됨', `위도: ${latitude.toFixed(4)}\n경도: ${longitude.toFixed(4)}`);
  };

  const addPoint = (input: FishingPointInput, resetForm: () => void) => {
    createPoint.mutate(input, {
      onSuccess: () => {
        resetForm();
        setPickedCoords(null);
        setAddModal(false);
        setMapTapMode(false);
      },
      onError: () => Alert.alert('오류', '포인트 추가에 실패했어요.'),
    });
  };

  const confirmDelete = (point: FishingPoint) => {
    Alert.alert('삭제', '이 포인트를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () =>
          deletePoint.mutate(point.id, {
            onSuccess: () => {
              setDetailModal(false);
              setSelectedPointId(null);
            },
            onError: (e) => Alert.alert('오류', e.message),
          }),
      },
    ]);
  };

  const ownerLabel = (point: FishingPoint) =>
    point.rating > 0
      ? `⭐ ${point.rating}`
      : point.isDefault
        ? '기본 포인트'
        : `🎣 ${isMine(point) ? '내 포인트' : '공유 포인트'}`;

  return (
    <View className="flex-1 bg-ocean-deep">
      <View className="px-[20px] pt-[56px] pb-[8px]">
        <Text className="text-white text-[20px] font-semibold">🗺️ 낚시 포인트</Text>
        <Text className="text-muted text-[12px] mt-[2px]">{userLocation ? '📍 내 위치 기준 가까운 순' : '주변 낚시 명소'}</Text>
      </View>

      <View className="h-[220px] mx-[16px] mt-[8px] rounded-[16px] overflow-hidden border border-card-border">
        <NaverMapView
          ref={mapRef}
          style={{ flex: 1 }}
          mapType="Hybrid"
          initialCamera={userLocation ? { ...userLocation, zoom: ZOOM.userArea } : FALLBACK_CAMERA}
          isShowLocationButton
          isShowZoomControls={false}
          locale="ko"
          onInitialized={() => setMapReady(true)}
          onTapMap={onTapMap}
        >
          {points.map((point) => {
            const look = MARKER_APPEARANCE[
              markerKind({ isFavorite: isFavorite(point.id), isMine: isMine(point), hot: point.hot, isDefault: point.isDefault })
            ];
            return (
              <NaverMapMarkerOverlay
                key={point.id}
                latitude={point.lat}
                longitude={point.lng}
                image={{ symbol: look.symbol }}
                width={selectedPointId === point.id ? 32 : 26}
                height={selectedPointId === point.id ? 42 : 34}
                zIndex={selectedPointId === point.id ? 10 : look.zIndex}
                caption={{ text: point.name, color: colors.white, haloColor: colors.oceanDeep, textSize: 11 }}
                subCaption={look.subCaption ? { text: look.subCaption, color: colors.accent, haloColor: colors.oceanDeep } : undefined}
                isHideCollidedCaptions
                onTap={() => onMarkerTap(point)}
              />
            );
          })}
        </NaverMapView>
        {calloutPoint && (
          <TouchableOpacity
            className="absolute top-[10px] left-[10px] right-[10px] bg-ocean-mid rounded-[10px] p-[10px] border border-[rgba(255,255,255,0.2)]"
            activeOpacity={0.85}
            onPress={() => openDetail(calloutPoint)}
          >
            <Text className="text-white text-[13px] font-semibold mb-[2px]">{calloutPoint.name}</Text>
            <Text className="text-muted text-[11px]">{calloutPoint.address}</Text>
            {userLocation && (
              <Text className="text-ocean-light text-[11px] mt-[2px]">📍 {formatDistance(userLocation, calloutPoint.lat, calloutPoint.lng)}</Text>
            )}
            <Text className="text-accent text-[11px] mt-[4px]">{ownerLabel(calloutPoint)}</Text>
            <Text className="text-ocean-light text-[11px] mt-[4px]">탭하여 상세 보기</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity className="absolute bottom-[10px] right-[10px] bg-accent rounded-[20px] px-[14px] py-[7px]" onPress={() => setAddModal(true)}>
          <Text className="text-white text-[13px] font-semibold">+ 포인트 추가</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center bg-card border border-card-border rounded-[12px] mx-[16px] mt-[10px] mb-[8px] px-[14px] py-[10px]">
        <Text className="text-[14px] text-muted">🔍</Text>
        <TextInput
          className="flex-1 text-white text-[13px] ml-[8px]"
          placeholder="포인트 이름, 지역 검색..."
          placeholderTextColor={PLACEHOLDER_COLOR}
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity
          onPress={() => setShowFavorites(!showFavorites)}
          className={`p-[4px] rounded-[8px]${showFavorites ? ' bg-[rgba(244,168,38,0.2)]' : ''}`}
        >
          <Text className="text-[14px]">⭐</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-[4px] grow-0" contentContainerClassName="px-[16px]">
        {FILTERS.map((f) => (
          <TouchableOpacity key={f} onPress={() => setActiveFilter(f)} className={`${chipClass(activeFilter === f)} mr-[8px]`}>
            <Text className={chipTextClass(activeFilter === f, true)}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-[6px] grow-0" contentContainerClassName="px-[16px]">
        {SPECIES.map((s) => (
          <TouchableOpacity key={s} onPress={() => setActiveSpecies(s)} className={`${chipClass(activeSpecies === s, 'ocean')} mr-[8px]`}>
            <Text className={chipTextClass(activeSpecies === s, true)}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View className="flex-1">
        <FlashList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          // renderItem이 선택·즐겨찾기·내 위치에 따라 달라지므로 바뀔 때 다시 그리게 한다
          extraData={[selectedPointId, favoriteIds, userLocation, user.id]}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          ListEmptyComponent={
            pointsQuery.isLoading ? (
              <ActivityIndicator color={colors.accent} className="mt-[20px]" />
            ) : pointsQuery.error ? (
              <Text className="text-accent-2 text-[13px] text-center mt-[20px]">
                포인트를 불러오지 못했어요.{'\n'}{pointsQuery.error.message}
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              className={`border rounded-[14px] p-[14px] mb-[10px] ${selectedPointId === item.id ? 'border-accent bg-[rgba(244,168,38,0.08)]' : 'bg-card border-card-border'}`}
              onPress={() => { moveToPoint(item); openDetail(item); }}
              activeOpacity={0.8}
            >
              <View className="flex-row justify-between items-start mb-[8px]">
                <View className="flex-1">
                  <View className="flex-row items-center">
                    {isFavorite(item.id) && <Text className="text-[12px] mr-[4px]">⭐</Text>}
                    <Text className="text-white text-[14px] font-medium">{item.name}</Text>
                    {!item.isDefault && !isMine(item) && <Text className="text-ocean-light text-[10px] ml-[6px]">공유</Text>}
                    {isMine(item) && <Text className="text-accent text-[10px] ml-[6px]">내 포인트</Text>}
                  </View>
                  <Text className="text-muted text-[11px] mt-[2px]">
                    {item.address}
                    {userLocation ? ` · ${formatDistance(userLocation, item.lat, item.lng)}` : ''}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  {item.hot && (
                    <View className="bg-[rgba(244,168,38,0.2)] border border-accent rounded-[6px] px-[8px] py-[3px]">
                      <Text className="text-accent text-[10px] font-semibold">🔥 핫</Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={() => toggleFavorite(item.id)} className="ml-[8px] p-[4px]">
                    <Text className="text-[18px]">{isFavorite(item.id) ? '⭐' : '☆'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View className="flex-row flex-wrap">
                <View className="bg-[rgba(42,159,196,0.2)] border border-ocean-light rounded-[6px] px-[8px] py-[3px]">
                  <Text className={cls.tagText}>{item.type}</Text>
                </View>
                {item.species.map((s) => (
                  <View key={s} className="bg-[rgba(255,255,255,0.08)] rounded-[6px] px-[8px] py-[3px] ml-[6px]">
                    <Text className={cls.tagText}>{s}</Text>
                  </View>
                ))}
                {item.rating > 0 && (
                  <View className="bg-[rgba(255,255,255,0.08)] rounded-[6px] px-[8px] py-[3px] ml-[6px]">
                    <Text className={cls.tagText}>⭐ {item.rating}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
          ListFooterComponent={<View className="h-[20px]" />}
        />
      </View>

      <PointDetailModal
        point={selectedPoint}
        visible={detailModal}
        userLocation={userLocation}
        isFavorite={selectedPoint ? isFavorite(selectedPoint.id) : false}
        canDelete={!!selectedPoint && !selectedPoint.isDefault && isMine(selectedPoint)}
        deleting={deletePoint.isPending}
        onToggleFavorite={() => selectedPoint && toggleFavorite(selectedPoint.id)}
        onDelete={() => selectedPoint && confirmDelete(selectedPoint)}
        onClose={() => setDetailModal(false)}
      />

      <AddPointModal
        visible={addModal}
        types={FILTERS.slice(1)}
        speciesOptions={SPECIES.slice(1)}
        mapTapMode={mapTapMode}
        onToggleMapTapMode={() => {
          if (!mapTapMode) setAddModal(false);
          setMapTapMode(!mapTapMode);
        }}
        pickedCoords={pickedCoords}
        userLocation={userLocation}
        submitting={createPoint.isPending}
        onSubmit={addPoint}
        onClose={() => { setAddModal(false); setMapTapMode(false); }}
      />
    </View>
  );
}
