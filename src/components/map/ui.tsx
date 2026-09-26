import { Badge } from '@/components/ui/Badge';
import type { FishingPoint } from '@/types/models';

// 낚시 포인트 화면들이 같이 쓰는 작은 조각. 배지·라벨/값 줄은 도감과 같은 것을 쓴다.
export { Badge, DetailRow } from '@/components/ui/Badge';

/** 포인트 상태 배지: 내 포인트 / 기본 / 공유 + 핫 + 평점. 줄 배치는 부모(flex-row gap)가 정한다 */
export function PointBadges({ point, isMine }: { point: FishingPoint; isMine: boolean }) {
  return (
    <>
      {isMine ? <Badge label="내 포인트" tone="primary" /> : point.isDefault ? <Badge label="기본" /> : <Badge label="공유" />}
      {point.hot ? <Badge label="핫" tone="danger" /> : null}
      {point.rating > 0 ? <Badge label={`평점 ${point.rating}`} tone="warning" /> : null}
    </>
  );
}
