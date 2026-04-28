# 🎣 낚시 일지

바다와 함께하는 낚시 기록 앱

<br>

## 📱 주요 기능

| 기능 | 설명 |
|------|------|
| 🏠 홈 | 실시간 날씨 · 조위 정보 및 낚시 점수 제공 |
| 🗺️ 포인트 | 낚시 포인트 지도 · 즐겨찾기 관리 |
| 📔 일지 | 낚시 기록 작성 · 사진 업로드 · 통계 |
| 🐟 도감 | AI 어종 분석 · 내 도감 관리 |
| 👥 커뮤니티 | 낚시 인증샷 · 조황 정보 공유 |

<br>

## 🛠️ 사용 기술

- **Frontend** : React Native, Expo
- **Auth / DB** : Firebase Auth, Firestore
- **이미지** : Cloudinary
- **AI 분석** : Groq API (llama-4)
- **날씨** : OpenWeatherMap API
- **조위** : 공공데이터포털 조위 API
- **지도** : react-native-maps
- **어종 검색** : iNaturalist API

<br>

## 📸 스크린샷

> 추후 추가 예정

<br>

## 🚀 실행 방법

### 1. 레포 클론
```bash
git clone https://github.com/minchan00/FishingApp.git
cd FishingApp
```

### 2. 패키지 설치
```bash
npm install
```

### 3. API 키 설정
```bash
# src/config/api.example.js → api.js 로 복사 후 키 입력
# src/config/firebase.example.js → firebase.js 로 복사 후 키 입력
```

### 4. 실행
```bash
npx expo start
```

<br>

## ⚠️ 환경 설정

아래 파일들은 보안상 GitHub에 올라가지 않습니다.  
`api.example.js`, `firebase.example.js` 를 참고해서 직접 만들어주세요.

| 파일 | 설명 |
|------|------|
| `src/config/api.js` | OpenWeatherMap · 조위 · Groq API 키 |
| `src/config/firebase.js` | Firebase 프로젝트 설정 |
