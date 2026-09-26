// 날씨(OpenWeatherMap)·조위(국립해양조사원, data.go.kr) 조회와 낚시 점수 계산.
import * as Location from 'expo-location';
import { env } from '@/lib/env';
import { colors } from '@/theme/colors';

// ── 조위 관측소 ────────────────────────────────
export type ObsStation = { code: string; name: string; lat: number; lon: number };

export const OBS_LIST: readonly ObsStation[] = [
  { code: 'DT_0001', name: '인천', lat: 37.45194, lon: 126.59222 },
  { code: 'DT_0002', name: '평택', lat: 36.98, lon: 126.82 },
  { code: 'DT_0003', name: '영광', lat: 35.27, lon: 126.43 },
  { code: 'DT_0004', name: '제주', lat: 33.527, lon: 126.543 },
  { code: 'DT_0005', name: '부산', lat: 35.096, lon: 129.037 },
  { code: 'DT_0006', name: '묵호', lat: 37.55, lon: 129.116 },
  { code: 'DT_0007', name: '목포', lat: 34.779, lon: 126.375 },
  { code: 'DT_0008', name: '안산', lat: 37.19, lon: 126.64 },
  { code: 'DT_0010', name: '서귀포', lat: 33.24, lon: 126.561 },
  { code: 'DT_0011', name: '후포', lat: 36.676, lon: 129.452 },
  { code: 'DT_0012', name: '속초', lat: 38.204, lon: 128.594 },
  { code: 'DT_0014', name: '통영', lat: 34.854, lon: 128.433 },
  { code: 'DT_0016', name: '여수', lat: 34.747, lon: 127.765 },
  { code: 'DT_0017', name: '대산', lat: 37.0, lon: 126.35 },
  { code: 'DT_0018', name: '군산', lat: 35.975, lon: 126.536 },
  { code: 'DT_0020', name: '울산', lat: 35.497, lon: 129.387 },
  { code: 'DT_0022', name: '성산포', lat: 33.474, lon: 126.927 },
  { code: 'DT_0024', name: '장항', lat: 36.0, lon: 126.7 },
  { code: 'DT_0025', name: '보령', lat: 36.4, lon: 126.5 },
  { code: 'DT_0027', name: '완도', lat: 34.317, lon: 126.755 },
  { code: 'DT_0028', name: '진도', lat: 34.486, lon: 126.268 },
  { code: 'DT_0029', name: '거제도', lat: 34.867, lon: 128.7 },
  { code: 'DT_0031', name: '거문도', lat: 34.025, lon: 127.308 },
  { code: 'DT_0032', name: '강화대교', lat: 37.713, lon: 126.489 },
  { code: 'DT_0043', name: '영흥도', lat: 37.238, lon: 126.437 },
  { code: 'DT_0044', name: '영종대교', lat: 37.538, lon: 126.618 },
  { code: 'DT_0050', name: '태안', lat: 36.75, lon: 126.3 },
  { code: 'DT_0065', name: '덕적도', lat: 37.23, lon: 126.14 },
  { code: 'DT_0091', name: '포항', lat: 36.05, lon: 129.38 },
];

export const DEFAULT_OBS: ObsStation = OBS_LIST[0]!;

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getNearestObs(lat: number, lon: number): ObsStation {
  let nearest = DEFAULT_OBS;
  let minDist = Infinity;
  for (const obs of OBS_LIST) {
    const dist = getDistance(lat, lon, obs.lat, obs.lon);
    if (dist < minDist) { minDist = dist; nearest = obs; }
  }
  return nearest;
}

/** 현재 위치에서 가장 가까운 관측소. 위치 권한이 없으면 null. */
export async function locateNearestObs(): Promise<ObsStation | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const loc = await Location.getCurrentPositionAsync({});
  return getNearestObs(loc.coords.latitude, loc.coords.longitude);
}

// ── OpenWeatherMap ─────────────────────────────
type WeatherCondition = { main: string; description: string };

export type CurrentWeather = {
  main: { temp: number; temp_min: number; temp_max: number; feels_like: number; humidity: number };
  wind: { speed: number };
  clouds: { all: number };
  weather: WeatherCondition[];
};

export type ForecastItem = {
  dt_txt: string; // 'YYYY-MM-DD HH:mm:ss' (UTC)
  main: { temp: number; humidity: number };
  wind: { speed: number };
  weather: WeatherCondition[];
};

export type ForecastDay = {
  date: string; // YYYY-MM-DD
  tempMin: number;
  tempMax: number;
  avgWind: number;
  condition: string;
  conditionDesc: string;
  humidity: number;
  hourly: ForecastItem[];
};

const OWM_BASE = 'https://api.openweathermap.org/data/2.5';

export async function fetchCurrentWeather(lat: number, lon: number): Promise<CurrentWeather> {
  const res = await fetch(`${OWM_BASE}/weather?lat=${lat}&lon=${lon}&appid=${env.weatherApiKey}&units=metric&lang=kr`);
  const data = (await res.json()) as Partial<CurrentWeather>;
  if (!data.main) throw new Error('날씨 정보를 불러올 수 없어요');
  return data as CurrentWeather;
}

/** 3시간 간격 예보를 날짜별로 묶어 최대 5일치 요약을 만든다. */
export async function fetchForecast(lat: number, lon: number): Promise<ForecastDay[]> {
  const res = await fetch(`${OWM_BASE}/forecast?lat=${lat}&lon=${lon}&appid=${env.weatherApiKey}&units=metric&lang=kr&cnt=40`);
  const data = (await res.json()) as { list?: ForecastItem[] };
  if (!data.list) throw new Error('예보를 불러올 수 없어요');

  const grouped = new Map<string, ForecastItem[]>();
  for (const item of data.list) {
    const date = item.dt_txt.split(' ')[0] ?? '';
    grouped.set(date, [...(grouped.get(date) ?? []), item]);
  }

  return [...grouped.entries()].slice(0, 5).map(([date, items]) => {
    const temps = items.map((i) => i.main.temp);
    const winds = items.map((i) => i.wind.speed);
    const noon = items.find((i) => i.dt_txt.includes('12:00')) ?? items[Math.floor(items.length / 2)]!;
    return {
      date,
      tempMin: Math.round(Math.min(...temps)),
      tempMax: Math.round(Math.max(...temps)),
      avgWind: Math.round(winds.reduce((a, b) => a + b, 0) / winds.length),
      condition: noon.weather[0]?.main ?? '',
      conditionDesc: noon.weather[0]?.description ?? '',
      humidity: noon.main.humidity,
      hourly: items,
    };
  });
}

export function getConditionEmoji(main: string | undefined): string {
  switch (main) {
    case 'Clear': return '☀️';
    case 'Clouds': return '☁️';
    case 'Rain': return '🌧️';
    case 'Snow': return '❄️';
    case 'Thunderstorm': return '⛈️';
    case 'Drizzle': return '🌦️';
    default: return '🌤️';
  }
}

// ── 조위 (data.go.kr) ──────────────────────────
/** 조위 API는 숫자를 문자열로 주기도 해서 둘 다 받는다. */
export type TideItem = {
  obsrvnDt?: string; // 'YYYY-MM-DD HH:mm'
  bscTdlvHgt?: string | number | null; // 실측
  tdlvHgt?: string | number | null; // 예측
};

export type TideEvent = { type: '만조' | '간조'; time: string; height: number };

type TideResponse = { body?: { items?: { item?: TideItem[] } } };

const toYmd = (d: Date, sep = '') =>
  [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join(sep);

export const todayYmd = () => toYmd(new Date());

/** 하루치 시간별 조위(60분 간격). 데이터가 없으면 빈 배열. */
export async function fetchTide(obsCode: string, date: Date = new Date()): Promise<TideItem[]> {
  const url = `https://apis.data.go.kr/1192136/surveyTideLevel/GetSurveyTideLevelApiService?serviceKey=${env.tideApiKey}&type=json&obsCode=${obsCode}&reqDate=${toYmd(date)}&min=60&pageNo=1&numOfRows=24`;
  const res = await fetch(url);
  const data = (await res.json()) as TideResponse;
  return data.body?.items?.item ?? [];
}

/** 오늘부터 5일치 조위. 키는 'YYYY-MM-DD'이고, 데이터가 없거나 실패한 날은 빠진다. */
export async function fetchTideWeek(obsCode: string): Promise<Record<string, TideItem[]>> {
  const today = new Date();
  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
  const results = await Promise.all(days.map((d) => fetchTide(obsCode, d).catch(() => [])));
  const week: Record<string, TideItem[]> = {};
  results.forEach((items, i) => {
    if (items.length > 0) week[toYmd(days[i]!, '-')] = items;
  });
  return week;
}

export const tideTime = (item: TideItem) => item.obsrvnDt?.split(' ')[1]?.slice(0, 5) || '-';
export const tideHour = (item: TideItem) => parseInt(item.obsrvnDt?.split(' ')[1]?.split(':')[0] || '0', 10);
const tideHeight = (item: TideItem) => parseFloat(String(item.bscTdlvHgt || item.tdlvHgt || 0));

/** 앞뒤보다 높으면 만조, 낮으면 간조 */
export function findTideEvents(items: TideItem[] | null | undefined): TideEvent[] {
  if (!items || items.length < 3) return [];
  const events: TideEvent[] = [];
  for (let i = 1; i < items.length - 1; i++) {
    const prev = tideHeight(items[i - 1]!);
    const curr = tideHeight(items[i]!);
    const next = tideHeight(items[i + 1]!);
    if (!curr) continue;
    const time = tideTime(items[i]!);
    if (curr > prev && curr > next) events.push({ type: '만조', time, height: Math.round(curr) });
    else if (curr < prev && curr < next) events.push({ type: '간조', time, height: Math.round(curr) });
  }
  return events;
}

/** 현재 시각 직전부터 6개 구간 */
export function getCurrentTideSlice(items: TideItem[]): TideItem[] {
  const nowHour = new Date().getHours();
  const idx = items.findIndex((item) => tideHour(item) >= nowHour);
  const start = Math.max(0, idx === -1 ? items.length - 4 : idx - 1);
  return items.slice(start, start + 6);
}

// ── 낚시 점수 ─────────────────────────────────
/** 낚시 종합 점수 (바람 + 물때 + 시간대) */
export function getFishingScore(windSpeed: number, tideItems: TideItem[] | null): number {
  let score = 70;
  if (windSpeed <= 2) score += 20;
  else if (windSpeed <= 4) score += 10;
  else if (windSpeed <= 6) score -= 10;
  else if (windSpeed <= 8) score -= 25;
  else score -= 45;

  if (tideItems) {
    const nowHour = new Date().getHours();
    const nearChange = findTideEvents(tideItems).some((e) => Math.abs(parseInt(e.time.split(':')[0] || '0', 10) - nowHour) <= 1);
    if (nearChange) score += 15;
  }

  const hour = new Date().getHours();
  if ((hour >= 5 && hour <= 7) || (hour >= 17 && hour <= 19)) score += 10;
  return Math.max(0, Math.min(100, score));
}

export type ScoreGrade = { grade: 'A' | 'B' | 'C' | 'D'; label: string; color: string };

export function getScoreGrade(score: number): ScoreGrade {
  if (score >= 85) return { grade: 'A', label: '낚시 최적 🔥', color: colors.oceanLight };
  if (score >= 70) return { grade: 'B', label: '낚시 양호 👍', color: '#4caf50' };
  if (score >= 50) return { grade: 'C', label: '낚시 보통 😐', color: colors.accent };
  return { grade: 'D', label: '낚시 비추 💨', color: colors.accent2 };
}
