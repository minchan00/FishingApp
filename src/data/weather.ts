// 날씨(OpenWeatherMap)·조위(국립해양조사원, data.go.kr) 조회와 낚시 점수 계산.
import { addDays, format, isSameDay, parseISO } from 'date-fns';
import * as Location from 'expo-location';
import type { IconName } from '@/components/ui/Icon';
import { env } from '@/lib/env';
import { colors } from '@/theme/colors';

// ── 한국 시간(KST) ─────────────────────────────
// 앱은 한국 전용이고 조위 API도 KST 기준 문자열을 준다. 기기 시간대와 무관하게 한국 날짜/시각을 쓰려고
// 시각(epoch) → KST 변환은 +9h 후 UTC 필드로 읽는다(기기 서머타임 영향 없음. 한국은 서머타임이 없어 +9 고정).
// '날짜'(시각 없는 달력 날짜)는 'yyyy-MM-dd' 문자열로 다루고, 날짜 계산만 date-fns로 한다.
const KST_OFFSET_MIN = 9 * 60;
const MINUTE = 60_000;

/** 'YYYY-MM-DDTHH:mm:ss.sssZ' 형태지만 필드 값이 KST인 문자열 */
const kstIso = (ms: number) => new Date(ms + KST_OFFSET_MIN * MINUTE).toISOString();

/** 시각 → KST 날짜 'yyyy-MM-dd' */
export const kstYmd = (ms: number = Date.now()) => kstIso(ms).slice(0, 10);

/** 시각 → KST 'HH:mm' */
export const kstHm = (ms: number) => kstIso(ms).slice(11, 16);

/** 시각 → KST 시(0~23) */
export const kstHour = (ms: number = Date.now()) => new Date(ms + KST_OFFSET_MIN * MINUTE).getUTCHours();

/** 현재 KST 시(0~23) */
export const kstHourNow = () => kstHour();

/** 오늘(KST) 달력 날짜. date-fns 날짜 계산용(로컬 자정 Date). */
const kstToday = () => parseISO(kstYmd());

/** 'yyyy-MM-dd'(KST 날짜)가 오늘(KST)인지 */
export const isKstToday = (ymd: string) => isSameDay(parseISO(ymd), kstToday());

/** KST 벽시계 성분 → epoch ms */
const kstToEpoch = (y: number, mo: number, d: number, h: number, mi: number) =>
  Date.UTC(y, mo - 1, d, h, mi) - KST_OFFSET_MIN * MINUTE;

/** 오늘(KST)부터 n일치 달력 날짜 */
const kstNextDays = (n: number) => {
  const today = kstToday();
  return Array.from({ length: n }, (_, i) => addDays(today, i));
};

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
  dt: number; // unix seconds (UTC 시각). 날짜/시간 표시는 반드시 이 값을 KST로 바꿔서 쓴다.
  dt_txt: string; // 'YYYY-MM-DD HH:mm:ss' (UTC) — 표시용으로 쓰지 말 것
  main: { temp: number; humidity: number };
  wind: { speed: number };
  weather: WeatherCondition[];
};

export type ForecastDay = {
  date: string; // YYYY-MM-DD (KST)
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

/** 예보 항목의 KST 시각 'HH:mm' */
export const forecastTime = (item: ForecastItem) => kstHm(item.dt * 1000);

/** 3시간 간격 예보를 KST 날짜별로 묶어 최대 5일치 요약을 만든다. */
export async function fetchForecast(lat: number, lon: number): Promise<ForecastDay[]> {
  const res = await fetch(`${OWM_BASE}/forecast?lat=${lat}&lon=${lon}&appid=${env.weatherApiKey}&units=metric&lang=kr&cnt=40`);
  const data = (await res.json()) as { list?: ForecastItem[] };
  if (!Array.isArray(data.list)) throw new Error('예보를 불러올 수 없어요');

  // dt_txt는 UTC라 그대로 자르면 KST 00~09시 예보가 전날로 묶인다 → dt를 KST 날짜로 바꿔 묶는다
  const grouped = new Map<string, ForecastItem[]>();
  for (const item of data.list) {
    if (typeof item.dt !== 'number') continue;
    const date = kstYmd(item.dt * 1000);
    grouped.set(date, [...(grouped.get(date) ?? []), item]);
  }

  return [...grouped.entries()].slice(0, 5).map(([date, items]) => {
    const temps = items.map((i) => i.main.temp);
    const winds = items.map((i) => i.wind.speed);
    const noon = items.find((i) => kstHour(i.dt * 1000) === 12) ?? items[Math.floor(items.length / 2)]!;
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

/** 날씨 상태에 맞는 선 아이콘 이름 (components/ui/Icon의 Feather 이름) */
export function getConditionIcon(main: string | undefined): IconName {
  switch (main) {
    case 'Clear': return 'sun';
    case 'Clouds': return 'cloud';
    case 'Rain': return 'cloud-rain';
    case 'Snow': return 'cloud-snow';
    case 'Thunderstorm': return 'cloud-lightning';
    case 'Drizzle': return 'cloud-drizzle';
    default: return 'cloud';
  }
}

// ── 조위 (data.go.kr) ──────────────────────────
// 공공데이터포털 응답은 { header, body } 또는 { response: { header, body } } 로 오고,
// item이 1건이면 배열이 아니라 객체로 오기도 한다. 필드도 숫자/문자열이 섞여서 모두 런타임에 검사한다.
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** 응답 JSON에서 body.items.item 목록을 꺼낸다. 형태가 다르면 빈 배열. */
function extractItems(json: unknown): Obj[] {
  if (!isObj(json)) return [];
  const root = isObj(json.response) ? json.response : json;
  const header = root.header;
  if (isObj(header) && header.resultCode !== undefined && String(header.resultCode) !== '00') {
    console.warn('조위 API 오류:', header.resultCode, header.resultMsg);
    return [];
  }
  const body = root.body;
  if (!isObj(body) || !isObj(body.items)) return [];
  const item = body.items.item;
  if (Array.isArray(item)) return item.filter(isObj);
  return isObj(item) ? [item] : [];
}

const toNum = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

// ─ 시간별 조위(실측·예측, surveyTideLevel) — 시간별 조위 표에만 쓴다
/** 조위 API는 숫자를 문자열로 주기도 해서 둘 다 받는다. */
export type TideItem = {
  obsrvnDt?: string; // 'YYYY-MM-DD HH:mm' (KST)
  bscTdlvHgt?: string | number | null; // 실측
  tdlvHgt?: string | number | null; // 예측
};

const toTideItem = (o: Obj): TideItem | null =>
  typeof o.obsrvnDt === 'string'
    ? {
        obsrvnDt: o.obsrvnDt,
        bscTdlvHgt: typeof o.bscTdlvHgt === 'string' || typeof o.bscTdlvHgt === 'number' ? o.bscTdlvHgt : null,
        tdlvHgt: typeof o.tdlvHgt === 'string' || typeof o.tdlvHgt === 'number' ? o.tdlvHgt : null,
      }
    : null;

/** 오늘(KST) 날짜 'yyyyMMdd' — 쿼리 키용 */
export const todayYmd = () => kstYmd().replace(/-/g, '');

/** 하루치 시간별 조위(60분 간격). date는 KST 달력 날짜. 데이터가 없으면 빈 배열. */
export async function fetchTide(obsCode: string, date: Date = kstToday()): Promise<TideItem[]> {
  const url = `https://apis.data.go.kr/1192136/surveyTideLevel/GetSurveyTideLevelApiService?serviceKey=${env.tideApiKey}&type=json&obsCode=${obsCode}&reqDate=${format(date, 'yyyyMMdd')}&min=60&pageNo=1&numOfRows=24`;
  const res = await fetch(url);
  const json: unknown = await res.json();
  return extractItems(json).map(toTideItem).filter((i): i is TideItem => i !== null);
}

/** 오늘(KST)부터 5일치 시간별 조위. 키는 'YYYY-MM-DD'(KST)이고, 데이터가 없거나 실패한 날은 빠진다. */
export async function fetchTideWeek(obsCode: string): Promise<Record<string, TideItem[]>> {
  const days = kstNextDays(5);
  const results = await Promise.all(days.map((d) => fetchTide(obsCode, d).catch(() => [])));
  const week: Record<string, TideItem[]> = {};
  results.forEach((items, i) => {
    if (items.length > 0) week[format(days[i]!, 'yyyy-MM-dd')] = items;
  });
  return week;
}

export const tideTime = (item: TideItem) => item.obsrvnDt?.split(' ')[1]?.slice(0, 5) || '-';
export const tideHour = (item: TideItem) => parseInt(item.obsrvnDt?.split(' ')[1]?.split(':')[0] || '0', 10);

/** 현재(KST) 시각 직전부터 6개 구간 */
export function getCurrentTideSlice(items: TideItem[]): TideItem[] {
  const nowHour = kstHourNow();
  const idx = items.findIndex((item) => tideHour(item) >= nowHour);
  const start = Math.max(0, idx === -1 ? items.length - 4 : idx - 1);
  return items.slice(start, start + 6);
}

// ─ 조석예보 고조·저조 (tideFcstHghLw)
// https://www.data.go.kr/data/15156018/openapi.do
// item: obsvtrNm(예보지점명), lat, lot, predcDt(예측일시, KST), predcTdlvVl(예측조위 cm),
//       extrSe(극치구분 1: 오전 고조, 2: 오전 저조, 3: 오후 고조, 4: 오후 저조)
export type TideEvent = {
  type: '만조' | '간조';
  /** KST 'HH:mm' */
  time: string;
  /** cm */
  height: number;
  /** epoch ms */
  at: number;
};

/** 'YYYY-MM-DD HH:mm[:ss]', 'YYYYMMDDHHmm', 'YYYY-MM-DDTHH:mm' 등을 KST 시각으로 해석 */
function parseKstDateTime(s: string): number | null {
  const m = /^(\d{4})-?(\d{2})-?(\d{2})[ T]?(\d{2}):?(\d{2})/.exec(s.trim());
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number) as [number, number, number, number, number];
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  return kstToEpoch(y, mo, d, h, mi);
}

function toTideEvent(o: Obj): TideEvent | null {
  const at = typeof o.predcDt === 'string' ? parseKstDateTime(o.predcDt) : null;
  const height = toNum(o.predcTdlvVl);
  const kind = toNum(o.extrSe);
  if (at === null || height === null) return null;
  const type = kind === 1 || kind === 3 ? '만조' : kind === 2 || kind === 4 ? '간조' : null;
  if (!type) return null;
  return { type, time: kstHm(at), height: Math.round(height), at };
}

/** 하루치(KST) 고조·저조 예보. 시각순 정렬. 응답 형태가 다르면 빈 배열. */
export async function fetchTideForecast(obsCode: string, date: Date = kstToday()): Promise<TideEvent[]> {
  const url = `https://apis.data.go.kr/1192136/tideFcstHghLw/GetTideFcstHghLwApiService?serviceKey=${env.tideApiKey}&type=json&obsCode=${obsCode}&reqDate=${format(date, 'yyyyMMdd')}&pageNo=1&numOfRows=10`;
  const res = await fetch(url);
  const json: unknown = await res.json();
  return extractItems(json)
    .map(toTideEvent)
    .filter((e): e is TideEvent => e !== null)
    .sort((a, b) => a.at - b.at);
}

/** 오늘(KST)부터 5일치 고조·저조 예보. 키는 'YYYY-MM-DD'(KST). 데이터가 없거나 실패한 날은 빠진다. */
export async function fetchTideForecastWeek(obsCode: string): Promise<Record<string, TideEvent[]>> {
  const days = kstNextDays(5);
  const results = await Promise.all(days.map((d) => fetchTideForecast(obsCode, d).catch(() => [])));
  const week: Record<string, TideEvent[]> = {};
  results.forEach((events, i) => {
    const key = format(days[i]!, 'yyyy-MM-dd');
    // 요청한 날짜의 이벤트만 담는다(혹시 전후일이 섞여 와도 다른 날 탭에 끼지 않게)
    const own = events.filter((e) => kstYmd(e.at) === key);
    if (own.length > 0) week[key] = own;
  });
  return week;
}

// ── 낚시 점수 ─────────────────────────────────
/** 물때 가점: 만조/간조 전후 이 시간 이내면 물이 바뀌는 때로 본다 */
const TIDE_CHANGE_WINDOW_MS = 90 * MINUTE;

/** 낚시 종합 점수 (바람 + 물때 + 시간대). tideEvents는 고조·저조 예보. */
export function getFishingScore(windSpeed: number, tideEvents: TideEvent[] | null, now: number = Date.now()): number {
  let score = 70;
  if (windSpeed <= 2) score += 20;
  else if (windSpeed <= 4) score += 10;
  else if (windSpeed <= 6) score -= 10;
  else if (windSpeed <= 8) score -= 25;
  else score -= 45;

  if (tideEvents && tideEvents.some((e) => Math.abs(e.at - now) <= TIDE_CHANGE_WINDOW_MS)) score += 15;

  const hour = kstHour(now);
  if ((hour >= 5 && hour <= 7) || (hour >= 17 && hour <= 19)) score += 10;
  return Math.max(0, Math.min(100, score));
}

export type ScoreGrade = { grade: 'A' | 'B' | 'C' | 'D'; label: string; color: string; soft: string };

export function getScoreGrade(score: number): ScoreGrade {
  if (score >= 85) return { grade: 'A', label: '낚시 최적', color: colors.primary, soft: colors.primarySoft };
  if (score >= 70) return { grade: 'B', label: '낚시 양호', color: colors.success, soft: colors.successSoft };
  if (score >= 50) return { grade: 'C', label: '낚시 보통', color: colors.warning, soft: colors.warningSoft };
  return { grade: 'D', label: '낚시 비추', color: colors.danger, soft: colors.dangerSoft };
}
