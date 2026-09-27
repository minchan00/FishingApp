# 디자인 기준

"모래와 바다". 메인 화면은 바다 수면 사진(`assets/images/sea.jpg`) 위에 밝은 카드를 띄우고,
첫 화면(로딩·소개·시작하기)은 노을 그림(`assets/images/anglers-*.jpg`)을 쓴다.
한 화면에 핵심 정보 한두 개만 크게. 칩은 한 줄까지, 목록 한 줄에 배지는 하나까지(나머지는 "a · b · c" 텍스트).
하단 탭과 같은 메뉴를 화면 안에 다시 만들지 않는다.

시안: 디자인 캔버스 "짬낚고 디자인 시안" (로딩 → 소개 3장 → 시작하기 / 홈·포인트·일지·도감·커뮤니티 / 물때·방류 알림)

## 색 (tailwind 클래스 / `colors.*`)
| 용도 | 클래스 | 값 |
|---|---|---|
| 화면 바탕(모래) | `bg-bg` | #F5F2EB |
| 카드·탭바·시트 면 | `bg-card` | #FFFEFB |
| 카드 안 옅은 채움(칩, 입력칸) | `bg-surface` (눌림 `bg-surface-strong`) | #EFEBE2 |
| 구분선·테두리 | `border-line` | #E3DDD0 |
| 본문 글자 | `text-ink` | #232B30 |
| 보조 글자 | `text-sub` | #66706F |
| 흐린 글자·아이콘 | `text-mute` | #98A09E |
| 주색(바다 파랑): 버튼, 선택, 링크 | `bg-primary` / `text-primary` / `bg-primary-soft` | #236A8C |
| 짙은 바다(선택된 탭 아이콘, 진행 점) | `bg-navy` | #1A516C |
| 포인트(노을 주황): 시간이 걸린 정보, 방류 중 | `bg-accent` / `text-accent-ink` / `bg-accent-soft` | #E3845A |
| 위험·오류 | `text-danger` / `bg-danger-soft` | #D9483B |
| 성공·주의 | `success`, `warning` (+ `-soft`) | |

주색·포인트색은 화면당 한두 곳에만 쓴다. 등급·상태는 soft 배경 + 진한 글자 배지로 표시한다.

## 바다 배경 (`SeaScreen`)
- 홈·일지·도감·커뮤니티·방류 알림은 `<SeaScreen>`으로 감싼다. 포인트(지도)·설정·모달은 모래색 바탕.
- 바다 위에 바로 놓이는 글자는 흰색 + `SEA_TEXT_SHADOW`. 소제목은 `SeaSectionTitle`.
- `ScreenHeader`·`EmptyState`는 `SeaScreen` 안에서 자동으로 흰 글자로 바뀐다.
- 목록 한 줄도 카드(`rounded-card bg-card`)로 띄운다. 바다 위에 선(`border-b`)으로 나눈 목록을 두지 않는다.

## 글자
`text-display` 28 · `text-title` 22 · `text-heading` 18(섹션·시트 제목) · `text-body` 15(기본) · `text-label` 13 · `text-caption` 12

- 화면 제목과 큰 숫자(물때 시각, 낚시 지수, 통계)는 명조 `font-serif`(고운바탕 Bold).
- 본문·버튼·설명은 시스템 글꼴. 굵기는 제목만 semibold/bold.

## 모서리·여백
- 모서리: 카드 `rounded-card`(18), 입력·버튼 `rounded-field`(14), 시트 `rounded-t-sheet`(24), 칩 `rounded-full`
- 바다 화면 좌우 여백 16px(`px-4`), 카드 안쪽 16px(`p-4`), 카드 사이 10~12px
- 그림자는 바다·그림 위에 뜨는 카드(소개 화면 예시 카드, 시작하기 시트)에만.

## 아이콘
`<Icon name="map-pin" />` (Feather 선 아이콘 + `fish`). 이모지는 아이콘으로 쓰지 않는다.
사용자가 입력한 내용 속 이모지는 그대로 둔다.

## 공통 부품 (`src/components/ui/`)
| 부품 | 쓰는 곳 |
|---|---|
| `SeaScreen` / `SeaSectionTitle` / `SEA_TEXT_SHADOW` | 바다 배경 화면, 바다 위 소제목·글자 |
| `ScreenHeader` / `IconButton` | 화면 맨 위 제목 (명조). 바다 위면 흰 글자 + 흰 원 버튼, `tone="brand"`면 남색 |
| `Button` | primary(주 행동, 화면당 하나) · accent · secondary · light(바다·그림 위 흰 버튼) · ghost · danger · kakao |
| `TextField` | 라벨 + 입력 + 오류. react-hook-form `Controller`로 연결 |
| `Card` | 정보 묶음 (밝은 면). `tone="outline"`은 테두리 추가 |
| `Chip` | 필터·선택지 (선택 시 연한 바다색) |
| `ListRow` | 설정·목록 한 줄 (아이콘, 제목, 값, 화살표) |
| `BottomSheet` | 아래에서 올라오는 시트 (손잡이, 제목, 닫기, 하단 바 여백 자동) |
| `AppModal` | 전체 화면 모달 |
| `EmptyState` | 빈 목록·오류 (바다 위에서는 흰 글자) |

## 첫 화면 흐름
시스템 스플래시(아이콘) → `LoadingScreen`(그림 + "퇴근하고 짬낚고?" 대사, 최소 1.2초) →
처음 설치 때만 `onboarding`(소개 3장) → `sign-in`(그림 위 시트: 카카오 / 이메일).
