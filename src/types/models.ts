// 화면에서 쓰는 도메인 타입. DB 컬럼명(snake_case)과 분리해 두면
// 나중에 백엔드를 바꿔도 화면 코드는 그대로 둘 수 있다.

export type Rating = '대박' | '보통' | '꽝';
export type PostCategory = '조황 정보' | '인증샷' | '낚시 팁' | '동출 모집' | '방류 소식';

export type Profile = {
  id: string;
  nickname: string;
  emoji: string;
};

export type Catch = {
  species: string;
  sizeCm: number | null;
  count: number;
};

export type FishingLog = {
  id: number;
  fishedOn: string; // YYYY-MM-DD
  location: string;
  weather: string;
  duration: string;
  memo: string;
  rating: Rating;
  imageUrl: string | null;
  catches: Catch[];
  createdAt: string;
};

/** 일지 저장 입력. imageUri는 새로 고른 로컬 파일 URI 또는 기존 공개 URL, 없으면 null. */
export type FishingLogInput = {
  fishedOn: string;
  location: string;
  weather: string;
  duration: string;
  memo: string;
  imageUri: string | null;
  catches: Catch[];
};

export type DogamEntry = {
  species: string;
  bestSizeCm: number | null;
  totalCount: number;
  lastCaughtOn: string;
  bestLocation: string | null;
  imageUrl: string | null;
  memo: string;
};

export type FishingPoint = {
  id: number;
  ownerId: string | null;
  isDefault: boolean; // 기본 제공 포인트(삭제 불가)
  name: string;
  address: string;
  type: string;
  species: string[];
  memo: string;
  lat: number;
  lng: number;
  hot: boolean;
  rating: number;
};

export type FishingPointInput = {
  name: string;
  address: string;
  type: string;
  species: string[];
  memo: string;
  lat: number;
  lng: number;
};

export type Post = {
  id: number;
  authorId: string;
  authorNickname: string;
  authorEmoji: string;
  category: PostCategory;
  content: string;
  imageUrl: string | null;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
  createdAt: string;
};

export type PostInput = {
  category: PostCategory;
  content: string;
  imageUri: string | null;
};

export type Comment = {
  id: number;
  postId: number;
  authorId: string;
  authorNickname: string;
  authorEmoji: string;
  content: string;
  createdAt: string;
};

export type FishIdentification =
  | { recognized: false }
  | {
      recognized: true;
      species: string;
      confidence: 'high' | 'medium' | 'low';
      averageSize: string;
      habitat: string;
      fishingMethod: string;
      bait: string;
      season: string;
      taste: string;
      features: string;
    };

export type FishAnalysis = {
  identification: FishIdentification;
  /** 오늘 남은 분석 횟수 */
  remainingToday: number;
};

/** 방류 알림 대상: 하굿둑·방조제 배수갑문 */
export type ReleaseFacility = {
  id: string;
  name: string;
  kind: '하굿둑' | '방조제';
  region: string;
  operator: string;
};

/**
 * active: 지금 방류 중(실측) / window: 방류 승인 기간(조위에 따라 여닫음) / notice: 방류 예정 공지 / ended: 끝남
 */
export type ReleaseStatus = 'active' | 'window' | 'notice' | 'ended';
/** official: 기관 API·자료 / notice: 기관 공지 / report: 관리자·사용자 입력 */
export type ReleaseSource = 'official' | 'notice' | 'report';

export type ReleaseEvent = {
  id: number;
  facilityId: string;
  status: ReleaseStatus;
  startsAt: string;
  endsAt: string | null;
  /** ㎥/s (톤/초). 공지에는 없을 수 있다 */
  flowCms: number | null;
  source: ReleaseSource;
  sourceUrl: string | null;
  note: string | null;
};
