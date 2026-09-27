import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlashList } from '@shopify/flash-list';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { NaverMapMarkerOverlay, NaverMapView, type Coord, type NaverMapViewRef } from '@mj-studio/react-native-naver-map';
import { AddPointModal } from '@/components/map/AddPointModal';
import { distanceKm, formatDistance, type Coords } from '@/components/map/distance';
import { MARKER_APPEARANCE, markerKind, ZOOM } from '@/components/map/markerAppearance';
import { PointDetailModal } from '@/components/map/PointDetailModal';
import { Badge, PointBadges } from '@/components/map/ui';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useCreatePoint, useDeletePoint, useFavoritePointIds, usePoints, useToggleFavorite } from '@/hooks/queries';
import { useUser } from '@/hooks/useSession';
import { colors } from '@/theme/colors';
import type { FishingPoint, FishingPointInput } from '@/types/models';

const FILTERS = ['전체', '방파제', '갯바위', '해변', '낚시공원'] as const;
const SPECIES = ['전체', '광어', '우럭', '감성돔', '농어', '참돔', '고등어', '갈치', '주꾸미'] as const;

const FALLBACK_CAMERA = { latitude: 37.4563, longitude: 126.4816, zoom: ZOOM.fallback };

export default function MapScreen() {
  const user = useUser();
  const [activeFilter, setActiveFilter] = useState<string>('전체');
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
      // 어종 칩을 없앤 대신 검색어로 어종도 찾는다
      const matchSearch = p.name.includes(search) || p.address.includes(search) || p.species.some((s) => s.includes(search));
      const matchType = activeFilter === '전체' || p.type === activeFilter;
      const matchFav = !showFavorites || isFavorite(p.id);
      return matchSearch && matchType && matchFav;
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

  return (
    <View className="flex-1 bg-bg">
      <ScreenHeader title="낚시 포인트" eyebrow={userLocation ? '내 위치 기준 가까운 순' : '주변 낚시 명소'} />

      {/* 검색 + 필터 */}
      <View className="mx-5 h-[44px] flex-row items-center rounded-field bg-surface pl-3.5 pr-1">
        <Icon name="search" size={18} color={colors.mute} />
        <TextInput
          className="ml-2 flex-1 text-body text-ink"
          placeholder="포인트 이름, 지역, 어종 검색"
          placeholderTextColor={colors.mute}
          value={search}
          onChangeText={setSearch}
        />
        <Pressable
          onPress={() => setShowFavorites(!showFavorites)}
          accessibilityRole="button"
          accessibilityLabel="즐겨찾기만 보기"
          accessibilityState={{ selected: showFavorites }}
          className={`h-9 w-9 items-center justify-center rounded-full ${showFavorites ? 'bg-primary-soft' : 'active:bg-surface-strong'}`}
        >
          <Icon name="star" size={18} color={showFavorites ? colors.primary : colors.mute} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3 grow-0" contentContainerClassName="gap-2 px-5">
        {FILTERS.map((f) => (
          <Chip key={f} label={f} selected={activeFilter === f} onPress={() => setActiveFilter(f)} />
        ))}
      </ScrollView>

      <View className="mx-5 mt-3 h-[240px] overflow-hidden rounded-card border border-line">
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
                caption={{ text: point.name, color: colors.ink, haloColor: colors.white, textSize: 11 }}
                subCaption={look.subCaption ? { text: look.subCaption, color: colors.primary, haloColor: colors.white } : undefined}
                isHideCollidedCaptions
                onTap={() => onMarkerTap(point)}
              />
            );
          })}
        </NaverMapView>
        {calloutPoint && (
          <Pressable
            className="absolute left-2 right-2 top-2 rounded-card border border-line bg-bg p-3.5 active:bg-surface"
            onPress={() => openDetail(calloutPoint)}
            accessibilityHint="탭하여 상세 보기"
          >
            <View className="flex-row items-start gap-2">
              <View className="flex-1">
                <Text className="text-heading text-ink" numberOfLines={1}>{calloutPoint.name}</Text>
                <Text className="mt-0.5 text-label text-mute" numberOfLines={1}>
                  {calloutPoint.address}
                  {userLocation ? ` · ${formatDistance(userLocation, calloutPoint.lat, calloutPoint.lng)}` : ''}
                </Text>
              </View>
              <Pressable
                onPress={() => toggleFavorite(calloutPoint.id)}
                accessibilityLabel={isFavorite(calloutPoint.id) ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                hitSlop={8}
                className="-mr-1 -mt-1 h-9 w-9 items-center justify-center rounded-full active:bg-surface"
              >
                <Icon name="star" size={20} color={isFavorite(calloutPoint.id) ? colors.primary : colors.mute} />
              </Pressable>
            </View>
            <View className="mt-2 flex-row items-center justify-between gap-2">
              <View className="flex-1 flex-row flex-wrap gap-1.5">
                <PointBadges point={calloutPoint} isMine={isMine(calloutPoint)} />
              </View>
              <Text className="text-caption text-primary">탭하여 상세 보기</Text>
            </View>
          </Pressable>
        )}
        <View className="absolute bottom-2.5 right-2.5">
          <Button label="포인트 추가" icon="plus" size="md" block={false} onPress={() => setAddModal(true)} />
        </View>
      </View>

      <View className="mt-2 flex-1">
        <FlashList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          // renderItem이 선택·즐겨찾기·내 위치에 따라 달라지므로 바뀔 때 다시 그리게 한다
          extraData={[selectedPointId, favoriteIds, userLocation, user.id]}
          ListEmptyComponent={
            pointsQuery.isLoading ? (
              <ActivityIndicator color={colors.primary} className="mt-[20px]" />
            ) : pointsQuery.error ? (
              <EmptyState icon="alert-circle" title="포인트를 불러오지 못했어요." description={pointsQuery.error.message} />
            ) : null
          }
          renderItem={({ item }) => {
            const selected = selectedPointId === item.id;
            const fav = isFavorite(item.id);
            return (
              <Pressable
                className={`flex-row items-start gap-3 border-b border-line px-5 py-3.5 ${selected ? 'bg-primary-soft' : 'active:bg-surface'}`}
                onPress={() => { moveToPoint(item); openDetail(item); }}
              >
                <View className="flex-1">
                  <Text className="text-body font-semibold text-ink" numberOfLines={1}>{item.name}</Text>
                  <Text className="mt-0.5 text-label text-mute" numberOfLines={1}>
                    {[
                      item.type,
                      userLocation ? formatDistance(userLocation, item.lat, item.lng) : item.address,
                      item.rating > 0 ? `★ ${item.rating}` : null,
                    ].filter(Boolean).join(' · ')}
                  </Text>
                  {item.species.length > 0 ? (
                    <Text className="mt-0.5 text-caption text-mute" numberOfLines={1}>{item.species.join(', ')}</Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => toggleFavorite(item.id)}
                  accessibilityLabel={fav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                  hitSlop={8}
                  className="-mr-2 h-9 w-9 items-center justify-center rounded-full active:bg-surface-strong"
                >
                  <Icon name="star" size={20} color={fav ? colors.primary : colors.mute} />
                </Pressable>
              </Pressable>
            );
          }}
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
