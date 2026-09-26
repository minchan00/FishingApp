import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NaverMapMarkerOverlay, NaverMapView, type Coord, type NaverMapViewRef } from '@mj-studio/react-native-naver-map';
import { AddPointModal, DEFAULT_NEW_POINT } from '@/components/map/AddPointModal';
import { distanceKm, formatDistance, type Coords } from '@/components/map/distance';
import { MARKER_APPEARANCE, markerKind, ZOOM } from '@/components/map/markerAppearance';
import { styles } from '@/components/map/mapStyles';
import { PointDetailModal } from '@/components/map/PointDetailModal';
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
  const [newPoint, setNewPoint] = useState<FishingPointInput>(DEFAULT_NEW_POINT);
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
    setNewPoint((prev) => ({ ...prev, lat: latitude, lng: longitude }));
    Alert.alert('위치 선택됨', `위도: ${latitude.toFixed(4)}\n경도: ${longitude.toFixed(4)}`);
  };

  const addPoint = () => {
    if (!newPoint.name.trim()) {
      Alert.alert('알림', '포인트 이름을 입력해주세요!');
      return;
    }
    createPoint.mutate(newPoint, {
      onSuccess: () => {
        setNewPoint(DEFAULT_NEW_POINT);
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🗺️ 낚시 포인트</Text>
        <Text style={styles.sub}>{userLocation ? '📍 내 위치 기준 가까운 순' : '주변 낚시 명소'}</Text>
      </View>

      <View style={styles.mapContainer}>
        <NaverMapView
          ref={mapRef}
          style={styles.map}
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
          <TouchableOpacity style={styles.callout} activeOpacity={0.85} onPress={() => openDetail(calloutPoint)}>
            <Text style={styles.calloutTitle}>{calloutPoint.name}</Text>
            <Text style={styles.calloutSub}>{calloutPoint.address}</Text>
            {userLocation && (
              <Text style={styles.calloutDist}>📍 {formatDistance(userLocation, calloutPoint.lat, calloutPoint.lng)}</Text>
            )}
            <Text style={styles.calloutRating}>{ownerLabel(calloutPoint)}</Text>
            <Text style={styles.calloutHint}>탭하여 상세 보기</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.addMapBtn} onPress={() => setAddModal(true)}>
          <Text style={styles.addMapBtnText}>+ 포인트 추가</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Text style={{ fontSize: 14, color: colors.textMuted }}>🔍</Text>
        <TextInput style={styles.searchInput} placeholder="포인트 이름, 지역 검색..." placeholderTextColor="rgba(255,255,255,0.4)" value={search} onChangeText={setSearch} />
        <TouchableOpacity onPress={() => setShowFavorites(!showFavorites)} style={[styles.favBtn, showFavorites && styles.favBtnActive]}>
          <Text style={{ fontSize: 14 }}>⭐</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {FILTERS.map((f) => (
          <TouchableOpacity key={f} onPress={() => setActiveFilter(f)} style={[styles.chip, activeFilter === f && styles.chipActive, { marginRight: 8 }]}>
            <Text style={[styles.chipText, activeFilter === f && { color: colors.white, fontWeight: '500' }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {SPECIES.map((s) => (
          <TouchableOpacity key={s} onPress={() => setActiveSpecies(s)} style={[styles.chip, activeSpecies === s && styles.chipSpeciesActive, { marginRight: 8 }]}>
            <Text style={[styles.chipText, activeSpecies === s && { color: colors.white, fontWeight: '500' }]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ListEmptyComponent={
          pointsQuery.isLoading ? (
            <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
          ) : pointsQuery.error ? (
            <Text style={{ color: colors.accent2, fontSize: 13, textAlign: 'center', marginTop: 20 }}>
              포인트를 불러오지 못했어요.{'\n'}{pointsQuery.error.message}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.pointCard, selectedPointId === item.id && styles.pointCardActive]}
            onPress={() => { moveToPoint(item); openDetail(item); }}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {isFavorite(item.id) && <Text style={{ fontSize: 12, marginRight: 4 }}>⭐</Text>}
                  <Text style={{ color: colors.white, fontSize: 14, fontWeight: '500' }}>{item.name}</Text>
                  {!item.isDefault && !isMine(item) && <Text style={{ color: colors.oceanLight, fontSize: 10, marginLeft: 6 }}>공유</Text>}
                  {isMine(item) && <Text style={{ color: colors.accent, fontSize: 10, marginLeft: 6 }}>내 포인트</Text>}
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                  {item.address}
                  {userLocation ? ` · ${formatDistance(userLocation, item.lat, item.lng)}` : ''}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {item.hot && (
                  <View style={styles.hotBadge}>
                    <Text style={{ color: colors.accent, fontSize: 10, fontWeight: '600' }}>🔥 핫</Text>
                  </View>
                )}
                <TouchableOpacity onPress={() => toggleFavorite(item.id)} style={{ marginLeft: 8, padding: 4 }}>
                  <Text style={{ fontSize: 18 }}>{isFavorite(item.id) ? '⭐' : '☆'}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              <View style={styles.typeTag}><Text style={styles.tagText}>{item.type}</Text></View>
              {item.species.map((s) => (
                <View key={s} style={[styles.tag, { marginLeft: 6 }]}><Text style={styles.tagText}>{s}</Text></View>
              ))}
              {item.rating > 0 && <View style={[styles.tag, { marginLeft: 6 }]}><Text style={styles.tagText}>⭐ {item.rating}</Text></View>}
            </View>
          </TouchableOpacity>
        )}
        ListFooterComponent={<View style={{ height: 20 }} />}
      />

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
        value={newPoint}
        onChange={setNewPoint}
        types={FILTERS.slice(1)}
        speciesOptions={SPECIES.slice(1)}
        mapTapMode={mapTapMode}
        onToggleMapTapMode={() => {
          if (!mapTapMode) setAddModal(false);
          setMapTapMode(!mapTapMode);
        }}
        userLocation={userLocation}
        submitting={createPoint.isPending}
        onSubmit={addPoint}
        onClose={() => { setAddModal(false); setMapTapMode(false); }}
      />
    </View>
  );
}
