// 여러 화면에서 같이 쓰는 낚시 관련 선택지
export const SPECIES_OPTIONS = ['광어', '우럭', '감성돔', '농어', '참돔', '고등어', '갈치', '주꾸미', '볼락', '숭어', '기타'] as const;

export const WEATHER_OPTIONS = ['맑음 ☀️', '흐림 ☁️', '비 🌧️', '바람 💨', '안개 🌫️'] as const;

export type Species = (typeof SPECIES_OPTIONS)[number];
export type Weather = (typeof WEATHER_OPTIONS)[number];
