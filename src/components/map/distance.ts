export type Coords = { latitude: number; longitude: number };

/** 두 좌표 사이의 거리(km), haversine 공식 */
export function distanceKm(from: Coords, lat: number, lng: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat - from.latitude);
  const dLon = toRad(lng - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(from.latitude)) * Math.cos(toRad(lat)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 1km 미만은 m, 그 이상은 소수 첫째 자리 km */
export function formatDistance(from: Coords, lat: number, lng: number): string {
  const dist = distanceKm(from, lat, lng);
  return dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`;
}
