import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Alert, FlatList
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const FILTERS = ['전체', '방파제', '갯바위', '낚시터', '선상', '워킹'];
const SPECIES = ['전체', '광어', '우럭', '감성돔', '농어', '참돔', '고등어', '갈치', '주꾸미'];

const DEFAULT_POINTS = [
  { id: 'd1', name: '영종도 씨사이드 방파제', address: '인천 중구', type: '방파제', distance: '12km', hot: true, species: ['광어', '우럭'], rating: 4.5, lat: 37.495, lng: 126.51, memo: '', isDefault: true },
  { id: 'd2', name: '강화도 외포리 선착장', address: '인천 강화군', type: '방파제', distance: '28km', hot: false, species: ['숭어', '망둑어'], rating: 4.2, lat: 37.703, lng: 126.437, memo: '', isDefault: true },
  { id: 'd3', name: '대부도 방아머리 갯바위', address: '경기 안산시', type: '갯바위', distance: '41km', hot: false, species: ['감성돔', '볼락'], rating: 4.0, lat: 37.27, lng: 126.585, memo: '', isDefault: true },
];

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`;
};

const getDistanceRaw = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function MapScreen() {
  const [activeFilter, setActiveFilter] = useState('전체');
  const [activeSpecies, setActiveSpecies] = useState('전체');
  const [search, setSearch] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [mapRef, setMapRef] = useState(null);
  const [points, setPoints] = useState(DEFAULT_POINTS);
  const [addModal, setAddModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [newPoint, setNewPoint] = useState({ name: '', address: '', type: '방파제', species: [], memo: '', lat: 37.5, lng: 126.9 });
  const [mapTapMode, setMapTapMode] = useState(false);

  const uid = auth.currentUser?.uid;

  useEffect(() => {
    loadFirebasePoints();
    loadFavorites();
    getLocation();
  }, []);

  const loadFirebasePoints = async () => {
    try {
      const q = query(collection(db, 'fishing_points'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const fbPoints = snapshot.docs.map(d => ({ id: d.id, ...d.data(), isDefault: false }));
      setPoints([...DEFAULT_POINTS, ...fbPoints]);
    } catch (e) { console.error('포인트 불러오기 실패:', e); }
  };

  const loadFavorites = async () => {
    try {
      const saved = await AsyncStorage.getItem(`favorites_${uid}`);
      if (saved) setFavorites(JSON.parse(saved));
    } catch (e) {}
  };

  const saveFavorites = async (updated) => {
    setFavorites(updated);
    await AsyncStorage.setItem(`favorites_${uid}`, JSON.stringify(updated));
  };

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({});
      setUserLocation(loc.coords);
    }
  };

  const isFavorite = (pointId) => favorites.includes(pointId);

  const toggleFavorite = async (pointId) => {
    const updated = isFavorite(pointId)
      ? favorites.filter(id => id !== pointId)
      : [...favorites, pointId];
    await saveFavorites(updated);
    if (selectedPoint?.id === pointId) {
      setSelectedPoint({ ...selectedPoint, favorite: !isFavorite(pointId) });
    }
  };

  const filtered = points
    .filter(p => {
      const matchSearch = p.name.includes(search) || p.address.includes(search);
      const matchType = activeFilter === '전체' || p.type === activeFilter;
      const matchSpecies = activeSpecies === '전체' || (p.species || []).includes(activeSpecies);
      const matchFav = !showFavorites || isFavorite(p.id);
      return matchSearch && matchType && matchSpecies && matchFav;
    })
    .sort((a, b) => {
      if (!userLocation) return 0;
      return getDistanceRaw(userLocation.latitude, userLocation.longitude, a.lat, a.lng) -
             getDistanceRaw(userLocation.latitude, userLocation.longitude, b.lat, b.lng);
    });

  const moveToPoint = (point) => {
    setSelectedPoint(point);
    if (mapRef) mapRef.animateToRegion({ latitude: point.lat, longitude: point.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 800);
  };

  const addPoint = async () => {
    if (!newPoint.name.trim()) { Alert.alert('알림', '포인트 이름을 입력해주세요!'); return; }
    try {
      const docRef = await addDoc(collection(db, 'fishing_points'), {
        uid,
        name: newPoint.name.trim(),
        address: newPoint.address.trim(),
        type: newPoint.type,
        species: newPoint.species,
        memo: newPoint.memo,
        lat: newPoint.lat,
        lng: newPoint.lng,
        hot: false,
        rating: 0,
        createdAt: serverTimestamp(),
      });
      const added = { id: docRef.id, ...newPoint, uid, hot: false, rating: 0, isDefault: false };
      setPoints(prev => [...prev, added]);
      setNewPoint({ name: '', address: '', type: '방파제', species: [], memo: '', lat: 37.5, lng: 126.9 });
      setAddModal(false);
      setMapTapMode(false);
    } catch (e) { Alert.alert('오류', '포인트 추가에 실패했어요.'); }
  };

  const deletePoint = async (pointId) => {
    const point = points.find(p => p.id === pointId);
    if (point?.isDefault) { Alert.alert('알림', '기본 포인트는 삭제할 수 없어요!'); return; }
    if (point?.uid !== uid) { Alert.alert('알림', '내가 추가한 포인트만 삭제할 수 있어요!'); return; }
    Alert.alert('삭제', '이 포인트를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        await deleteDoc(doc(db, 'fishing_points', pointId));
        setPoints(prev => prev.filter(p => p.id !== pointId));
        setDetailModal(false);
      }},
    ]);
  };

  const toggleSpeciesSelect = (sp) => {
    const current = newPoint.species;
    setNewPoint({ ...newPoint, species: current.includes(sp) ? current.filter(s => s !== sp) : [...current, sp] });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🗺️ 낚시 포인트</Text>
        <Text style={styles.sub}>{userLocation ? '📍 내 위치 기준 가까운 순' : '주변 낚시 명소'}</Text>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={(r) => setMapRef(r)}
          style={styles.map}
          mapType="satellite"
          region={userLocation ? {
            latitude: userLocation.latitude, longitude: userLocation.longitude,
            latitudeDelta: 0.3, longitudeDelta: 0.3,
          } : { latitude: 37.4563, longitude: 126.4816, latitudeDelta: 0.5, longitudeDelta: 0.5 }}
          showsUserLocation
          showsMyLocationButton
          onPress={(e) => {
            if (mapTapMode) {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              setNewPoint({ ...newPoint, lat: latitude, lng: longitude });
              Alert.alert('위치 선택됨', `위도: ${latitude.toFixed(4)}\n경도: ${longitude.toFixed(4)}`);
            }
          }}
        >
          {points.map((point) => (
            <Marker key={point.id} coordinate={{ latitude: point.lat, longitude: point.lng }} onPress={() => moveToPoint(point)}>
              <View style={[styles.markerWrap, point.hot && styles.markerHot, isFavorite(point.id) && styles.markerFav]}>
                <Text style={{ fontSize: 16 }}>{isFavorite(point.id) ? '⭐' : '🎣'}</Text>
              </View>
              <Callout tooltip onPress={() => { setSelectedPoint(point); setDetailModal(true); }}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{point.name}</Text>
                  <Text style={styles.calloutSub}>{point.address}</Text>
                  {userLocation && <Text style={styles.calloutDist}>📍 {getDistance(userLocation.latitude, userLocation.longitude, point.lat, point.lng)}</Text>}
                  <Text style={styles.calloutRating}>{point.rating > 0 ? `⭐ ${point.rating}` : point.uid ? `🎣 ${point.uid === uid ? '내 포인트' : '공유 포인트'}` : '기본 포인트'}</Text>
                  <Text style={{ color: '#2a9fc4', fontSize: 11, marginTop: 4 }}>탭하여 상세 보기</Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
        <TouchableOpacity style={styles.addMapBtn} onPress={() => setAddModal(true)}>
          <Text style={styles.addMapBtnText}>+ 포인트 추가</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>🔍</Text>
        <TextInput style={styles.searchInput} placeholder="포인트 이름, 지역 검색..." placeholderTextColor="rgba(255,255,255,0.4)" value={search} onChangeText={setSearch} />
        <TouchableOpacity onPress={() => setShowFavorites(!showFavorites)} style={[styles.favBtn, showFavorites && styles.favBtnActive]}>
          <Text style={{ fontSize: 14 }}>⭐</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {FILTERS.map((f) => (
          <TouchableOpacity key={f} onPress={() => setActiveFilter(f)} style={[styles.chip, activeFilter === f && styles.chipActive, { marginRight: 8 }]}>
            <Text style={[styles.chipText, activeFilter === f && { color: '#fff', fontWeight: '500' }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {SPECIES.map((s) => (
          <TouchableOpacity key={s} onPress={() => setActiveSpecies(s)} style={[styles.chip, activeSpecies === s && styles.chipSpeciesActive, { marginRight: 8 }]}>
            <Text style={[styles.chipText, activeSpecies === s && { color: '#fff', fontWeight: '500' }]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.pointCard, selectedPoint?.id === item.id && styles.pointCardActive]}
            onPress={() => { moveToPoint(item); setSelectedPoint(item); setDetailModal(true); }}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {isFavorite(item.id) && <Text style={{ fontSize: 12, marginRight: 4 }}>⭐</Text>}
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}>{item.name}</Text>
                  {item.uid && item.uid !== uid && <Text style={{ color: '#2a9fc4', fontSize: 10, marginLeft: 6 }}>공유</Text>}
                  {item.uid === uid && <Text style={{ color: '#f4a826', fontSize: 10, marginLeft: 6 }}>내 포인트</Text>}
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 2 }}>
                  {item.address} · {userLocation ? getDistance(userLocation.latitude, userLocation.longitude, item.lat, item.lng) : item.distance}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {item.hot && <View style={styles.hotBadge}><Text style={{ color: '#f4a826', fontSize: 10, fontWeight: '600' }}>🔥 핫</Text></View>}
                <TouchableOpacity onPress={() => toggleFavorite(item.id)} style={{ marginLeft: 8, padding: 4 }}>
                  <Text style={{ fontSize: 18 }}>{isFavorite(item.id) ? '⭐' : '☆'}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              <View style={styles.typeTag}><Text style={styles.tagText}>{item.type}</Text></View>
              {(item.species || []).map((s) => (
                <View key={s} style={[styles.tag, { marginLeft: 6 }]}><Text style={styles.tagText}>{s}</Text></View>
              ))}
              {item.rating > 0 && <View style={[styles.tag, { marginLeft: 6 }]}><Text style={styles.tagText}>⭐ {item.rating}</Text></View>}
            </View>
          </TouchableOpacity>
        )}
        ListFooterComponent={<View style={{ height: 20 }} />}
      />

      {/* 포인트 상세 모달 */}
      <Modal visible={detailModal} transparent animationType="slide" onRequestClose={() => setDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedPoint && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>{selectedPoint.name}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 }}>
                      {selectedPoint.address} · {selectedPoint.type}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => toggleFavorite(selectedPoint.id)} style={{ marginRight: 12 }}>
                    <Text style={{ fontSize: 24 }}>{isFavorite(selectedPoint.id) ? '⭐' : '☆'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setDetailModal(false)}>
                    <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 20 }}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>📍 거리</Text>
                    <Text style={styles.detailValue}>
                      {userLocation ? getDistance(userLocation.latitude, userLocation.longitude, selectedPoint.lat, selectedPoint.lng) : '-'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>🎣 어종</Text>
                    <Text style={styles.detailValue}>{(selectedPoint.species || []).join(', ') || '-'}</Text>
                  </View>
                  {selectedPoint.rating > 0 && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>⭐ 평점</Text>
                      <Text style={styles.detailValue}>{selectedPoint.rating}</Text>
                    </View>
                  )}
                  {selectedPoint.memo ? (
                    <View style={{ marginTop: 12 }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', marginBottom: 8 }}>📝 메모</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 20 }}>{selectedPoint.memo}</Text>
                    </View>
                  ) : null}
                  {selectedPoint.uid === uid && !selectedPoint.isDefault && (
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => deletePoint(selectedPoint.id)}>
                      <Text style={styles.deleteBtnText}>🗑️ 포인트 삭제</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* 포인트 추가 모달 */}
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📍 포인트 추가</Text>
              <TouchableOpacity onPress={() => { setAddModal(false); setMapTapMode(false); }}>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput style={styles.input} placeholder="포인트 이름 *" placeholderTextColor="rgba(255,255,255,0.4)" value={newPoint.name} onChangeText={(t) => setNewPoint({ ...newPoint, name: t })} />
              <TextInput style={styles.input} placeholder="주소 (예: 인천 중구)" placeholderTextColor="rgba(255,255,255,0.4)" value={newPoint.address} onChangeText={(t) => setNewPoint({ ...newPoint, address: t })} />

              <Text style={styles.inputLabel}>포인트 유형</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {FILTERS.slice(1).map((f) => (
                  <TouchableOpacity key={f} onPress={() => setNewPoint({ ...newPoint, type: f })} style={[styles.chip, newPoint.type === f && styles.chipActive, { marginRight: 8 }]}>
                    <Text style={[styles.chipText, newPoint.type === f && { color: '#fff' }]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>주요 어종 (복수 선택)</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
                {SPECIES.slice(1).map((s) => (
                  <TouchableOpacity key={s} onPress={() => toggleSpeciesSelect(s)} style={[styles.chip, newPoint.species.includes(s) && styles.chipActive, { marginRight: 8, marginBottom: 8 }]}>
                    <Text style={[styles.chipText, newPoint.species.includes(s) && { color: '#fff' }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>위치 선택</Text>
              <TouchableOpacity
                style={[styles.mapTapBtn, mapTapMode && styles.mapTapBtnActive]}
                onPress={() => {
                  setMapTapMode(!mapTapMode);
                  if (!mapTapMode) {
                    setAddModal(false);
                    Alert.alert('위치 선택', '지도에서 원하는 위치를 탭해주세요!\n탭 후 다시 추가 버튼을 누르세요.');
                  }
                }}
              >
                <Text style={{ color: mapTapMode ? '#f4a826' : '#fff', fontSize: 13 }}>
                  {mapTapMode ? '✅ 지도 탭 모드 활성화됨' : '🗺️ 지도에서 위치 선택'}
                </Text>
              </TouchableOpacity>
              {newPoint.lat !== 37.5 && (
                <Text style={{ color: '#2a9fc4', fontSize: 12, marginBottom: 8 }}>
                  선택된 위치: {newPoint.lat.toFixed(4)}, {newPoint.lng.toFixed(4)}
                </Text>
              )}
              {userLocation && (
                <TouchableOpacity style={styles.myLocBtn} onPress={() => setNewPoint({ ...newPoint, lat: userLocation.latitude, lng: userLocation.longitude })}>
                  <Text style={{ color: '#fff', fontSize: 13 }}>📍 현재 내 위치로 설정</Text>
                </TouchableOpacity>
              )}

              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top', marginTop: 8 }]} placeholder="메모 (조황 정보, 팁 등)" placeholderTextColor="rgba(255,255,255,0.4)" multiline value={newPoint.memo} onChangeText={(t) => setNewPoint({ ...newPoint, memo: t })} />
            </ScrollView>
            <TouchableOpacity style={styles.submitBtn} onPress={addPoint}>
              <Text style={styles.submitBtnText}>포인트 등록 (전체 공유)</Text>
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
  mapContainer: { height: 220, marginHorizontal: 16, marginTop: 8, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  map: { flex: 1 },
  addMapBtn: { position: 'absolute', bottom: 10, right: 10, backgroundColor: '#f4a826', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  addMapBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  markerWrap: { backgroundColor: '#1a6a8a', borderRadius: 20, padding: 6, borderWidth: 2, borderColor: '#2a9fc4' },
  markerHot: { backgroundColor: '#f4a826', borderColor: '#e05c1a' },
  markerFav: { backgroundColor: '#2a9fc4', borderColor: '#fff' },
  callout: { backgroundColor: '#0e4060', borderRadius: 10, padding: 10, minWidth: 150, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  calloutTitle: { color: '#fff', fontSize: 13, fontWeight: '600', marginBottom: 2 },
  calloutSub: { color: 'rgba(255,255,255,0.65)', fontSize: 11 },
  calloutDist: { color: '#2a9fc4', fontSize: 11, marginTop: 2 },
  calloutRating: { color: '#f4a826', fontSize: 11, marginTop: 4 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12, marginHorizontal: 16, marginTop: 10, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, color: '#fff', fontSize: 13, marginLeft: 8 },
  favBtn: { padding: 4, borderRadius: 8 },
  favBtnActive: { backgroundColor: 'rgba(244,168,38,0.2)' },
  chip: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  chipActive: { backgroundColor: '#f4a826', borderColor: '#f4a826' },
  chipSpeciesActive: { backgroundColor: '#2a9fc4', borderColor: '#2a9fc4' },
  chipText: { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  pointCard: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 14, marginBottom: 10 },
  pointCardActive: { borderColor: '#f4a826', backgroundColor: 'rgba(244,168,38,0.08)' },
  hotBadge: { backgroundColor: 'rgba(244,168,38,0.2)', borderWidth: 1, borderColor: '#f4a826', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeTag: { backgroundColor: 'rgba(42,159,196,0.2)', borderWidth: 1, borderColor: '#2a9fc4', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tag: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { color: 'rgba(255,255,255,0.65)', fontSize: 11 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0e4060', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: '600', flex: 1 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  detailLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 13 },
  detailValue: { color: '#fff', fontSize: 13, fontWeight: '500' },
  deleteBtn: { backgroundColor: 'rgba(224,92,26,0.2)', borderWidth: 1, borderColor: '#e05c1a', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  deleteBtnText: { color: '#e05c1a', fontSize: 14, fontWeight: '600' },
  input: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 14, color: '#fff', fontSize: 14, marginBottom: 10 },
  inputLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginBottom: 8 },
  mapTapBtn: { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 8 },
  mapTapBtnActive: { borderColor: '#f4a826', backgroundColor: 'rgba(244,168,38,0.1)' },
  myLocBtn: { backgroundColor: 'rgba(42,159,196,0.2)', borderWidth: 1, borderColor: '#2a9fc4', borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 8 },
  submitBtn: { backgroundColor: '#f4a826', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
