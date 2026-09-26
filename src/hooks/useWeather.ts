// 날씨·조위 조회 훅. obs가 null이면(위치 확인 전) 조회하지 않는다.
import { useQuery } from '@tanstack/react-query';
import {
  fetchCurrentWeather, fetchForecast, fetchTide, fetchTideForecastWeek, fetchTideWeek, todayYmd, type ObsStation,
} from '@/data/weather';

const round2 = (n: number) => Math.round(n * 100) / 100;
const TEN_MINUTES = 10 * 60_000;

export function useCurrentWeather(obs: ObsStation | null) {
  return useQuery({
    queryKey: ['weather', 'current', obs && round2(obs.lat), obs && round2(obs.lon)],
    queryFn: () => fetchCurrentWeather(obs!.lat, obs!.lon),
    enabled: obs !== null,
    staleTime: TEN_MINUTES,
  });
}

export function useForecast(obs: ObsStation | null) {
  return useQuery({
    queryKey: ['weather', 'forecast', obs && round2(obs.lat), obs && round2(obs.lon)],
    queryFn: () => fetchForecast(obs!.lat, obs!.lon),
    enabled: obs !== null,
    staleTime: TEN_MINUTES,
  });
}

// 조위는 날짜별(KST) 데이터라 날짜가 바뀌면 새로 받도록 키에 오늘(KST) 날짜를 넣는다

/** 오늘 시간별 조위(실측·예측) */
export function useTide(obs: ObsStation | null) {
  return useQuery({
    queryKey: ['tide', 'day', obs?.code, todayYmd()],
    queryFn: () => fetchTide(obs!.code),
    enabled: obs !== null,
    staleTime: TEN_MINUTES,
  });
}

/** 5일치 시간별 조위(실측·예측) */
export function useTideWeek(obs: ObsStation | null) {
  return useQuery({
    queryKey: ['tide', 'week', obs?.code, todayYmd()],
    queryFn: () => fetchTideWeek(obs!.code),
    enabled: obs !== null,
    staleTime: TEN_MINUTES,
  });
}

/** 5일치 고조·저조 예보. 천문조 예보라 자주 바뀌지 않는다. */
export function useTideForecastWeek(obs: ObsStation | null) {
  return useQuery({
    queryKey: ['tide', 'forecast', obs?.code, todayYmd()],
    queryFn: () => fetchTideForecastWeek(obs!.code),
    enabled: obs !== null,
    staleTime: 60 * 60_000,
  });
}
