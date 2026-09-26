# 🎣 낚시 일지

바다와 함께하는 낚시 기록 앱

<br>

## 📱 주요 기능

| 기능 | 설명 |
|------|------|
| 🏠 홈 | 실시간 날씨 · 조위 정보 및 낚시 점수 제공 |
| 🗺️ 포인트 | 낚시 포인트 지도 · 즐겨찾기 관리 |
| 📔 일지 | 낚시 기록 작성 · 사진 업로드 · 통계 |
| 🐟 도감 | AI 어종 분석 · 일지 기반 내 도감 자동 집계 |
| 👥 커뮤니티 | 낚시 인증샷 · 조황 정보 공유 |

<br>

## 🛠️ 사용 기술

- **앱** : React Native 0.86, Expo SDK 57, TypeScript, Expo Router
- **데이터 패칭** : TanStack Query
- **백엔드** : Supabase (Postgres · Auth · Storage · Edge Functions)
- **AI 분석** : Groq API (llama-4) — Supabase Edge Function에서 호출
- **날씨** : OpenWeatherMap API
- **조위** : 공공데이터포털 조위 API
- **지도** : react-native-maps
- **어종 검색** : iNaturalist API

<br>

## 🗂️ 구조

```
app/                  # Expo Router 화면 (파일 = 경로)
  _layout.tsx         # 로그인 여부에 따라 sign-in / (tabs) 전환
  sign-in.tsx
  (tabs)/             # 홈 · 포인트 · 도감 · 일지 · 커뮤니티
src/
  data/               # DB·API 접근 함수 (화면은 여기만 호출)
  hooks/              # TanStack Query 훅, 세션
  components/
  types/              # models.ts(화면용) · database.ts(DB 스키마)
supabase/
  migrations/         # 테이블 · RLS 보안 정책 · Storage
  functions/          # Edge Functions (identify-fish)
```

<br>

## 🚀 실행 방법

### 1. 설치
```bash
git clone https://github.com/minchan00/FishingApp.git
cd FishingApp
npm install
```

### 2. Supabase 준비 (최초 1회)
1. [supabase.com](https://supabase.com)에서 프로젝트 생성
2. 스키마 적용 및 Edge Function 배포
   ```bash
   npx supabase login
   npx supabase link --project-ref <프로젝트 ref>
   npx supabase db push
   npx supabase secrets set GROQ_API_KEY=<Groq 키>
   npx supabase functions deploy identify-fish
   ```
3. 대시보드 → Authentication → Sign In / Providers → Email에서 개발 중에는 **Confirm email**을 꺼두면 가입 즉시 로그인됩니다.

### 3. 환경변수
`.env.example`을 `.env`로 복사한 뒤 값을 채웁니다. `.env`는 git에 올라가지 않습니다.

| 변수 | 설명 |
|------|------|
| `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `EXPO_PUBLIC_WEATHER_API_KEY` | OpenWeatherMap |
| `EXPO_PUBLIC_TIDE_API_KEY` | 공공데이터포털 조위 API |
| `GOOGLE_MAPS_API_KEY` | Android 지도 (빌드 시에만 사용) |

> Groq 키는 앱에 넣지 않고 Supabase secret으로만 관리합니다.

### 4. 실행
```bash
npx expo start
```

<br>

## 🔐 보안

- 모든 테이블에 **RLS(행 단위 보안)** 적용 — 남의 일지 조회, 남의 글·포인트 삭제는 DB에서 거부됩니다.
- 사진은 본인 폴더(`photos/{uid}/`)에만 업로드할 수 있습니다.
- 앱 내 **회원 탈퇴** 시 계정과 모든 데이터·사진이 삭제됩니다.

<br>

## 📸 스크린샷

> 추후 추가 예정
