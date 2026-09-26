# 디자인 기준

밝은 화이트 테마. 흰 배경, 연회색 면, 바다색 강조 하나. 장식보다 여백과 글자 크기로 위계를 만든다.

## 색 (tailwind 클래스 / `colors.*`)
| 용도 | 클래스 | 값 |
|---|---|---|
| 화면 배경 | `bg-bg` | #FFFFFF |
| 카드·입력 면 | `bg-surface` (눌림 `bg-surface-strong`) | #F4F6F8 |
| 구분선·테두리 | `border-line` | #E5E8EB |
| 본문 글자 | `text-ink` | #191F28 |
| 보조 글자 | `text-sub` | #4E5968 |
| 흐린 글자·아이콘 | `text-mute` | #8B95A1 |
| 강조(버튼, 선택, 링크) | `bg-primary` / `text-primary` / `bg-primary-soft` | #0A7BB5 |
| 위험·오류 | `text-danger` / `bg-danger-soft` | #E5484D |
| 성공·주의 | `success`, `warning` (+ `-soft`) | |

강조색은 화면당 한두 곳에만 쓴다. 등급·상태는 soft 배경 + 진한 글자 배지로 표시한다.

## 글자
`text-display` 28 · `text-title` 22(화면 제목) · `text-heading` 18(섹션·시트 제목) · `text-body` 15(기본) · `text-label` 13(보조·버튼 작은 것) · `text-caption` 12(메타 정보)

굵기는 제목만 semibold/bold. 본문은 regular.

## 모서리·여백
- 모서리: 카드 `rounded-card`(16), 입력·버튼 `rounded-field`(12), 시트 `rounded-t-sheet`(24), 칩 `rounded-full`
- 화면 좌우 여백 20px(`px-5`), 카드 안쪽 16px(`p-4`), 섹션 사이 24px
- 그림자 쓰지 않는다. 구분은 면 색(`bg-surface`) 또는 테두리(`border-line`)로.

## 아이콘
`<Icon name="map-pin" />` (Feather 선 아이콘 + `fish`). 이모지는 아이콘으로 쓰지 않는다.
사용자가 입력한 내용 속 이모지는 그대로 둔다.

## 공통 부품 (`src/components/ui/`)
| 부품 | 쓰는 곳 |
|---|---|
| `ScreenHeader` / `IconButton` | 화면 맨 위 제목, 뒤로 가기, 오른쪽 아이콘 버튼 |
| `Button` | primary(주 행동, 화면당 하나) · secondary · ghost · danger · kakao |
| `TextField` | 라벨 + 입력 + 오류. react-hook-form `Controller`로 연결 |
| `Card` | 정보 묶음. `tone="outline"`은 흰 바탕 + 테두리 |
| `Chip` | 필터·선택지 |
| `ListRow` | 설정·목록 한 줄 (아이콘, 제목, 값, 화살표) |
| `BottomSheet` | 아래에서 올라오는 시트 (손잡이, 제목, 닫기, 하단 바 여백 자동) |
| `AppModal` | 전체 화면 모달 |
| `EmptyState` | 빈 목록·오류 |
