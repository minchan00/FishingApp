import { fetchTideForecast, getFishingScore, isKstToday, kstHour, kstYmd, type TideEvent } from '../weather';

jest.mock('@/lib/env', () => ({ env: { tideApiKey: 'test', weatherApiKey: 'test' } }));

// 2026-09-26 23:30 UTC = 2026-09-27 08:30 KST (오전 9시 전: 예전 버그 구간)
const BEFORE_9AM_KST = Date.UTC(2026, 8, 26, 23, 30);

describe('한국 시간 날짜', () => {
  it('오전 9시 전에도 KST 날짜를 쓴다', () => {
    expect(kstYmd(BEFORE_9AM_KST)).toBe('2026-09-27');
    expect(kstHour(BEFORE_9AM_KST)).toBe(8);
  });

  it('자정 직후 KST는 다음 날이다', () => {
    expect(kstYmd(Date.UTC(2026, 8, 26, 15, 0))).toBe('2026-09-27'); // 00:00 KST
    expect(kstYmd(Date.UTC(2026, 8, 26, 14, 59))).toBe('2026-09-26'); // 23:59 KST
  });

  it('isKstToday는 현재 KST 날짜와 비교한다', () => {
    jest.useFakeTimers().setSystemTime(BEFORE_9AM_KST);
    expect(isKstToday('2026-09-27')).toBe(true);
    expect(isKstToday('2026-09-26')).toBe(false);
    jest.useRealTimers();
  });
});

describe('낚시 점수', () => {
  const at = (h: number, m = 0) => Date.UTC(2026, 8, 27, h - 9, m); // KST h:m
  const event = (ms: number): TideEvent => ({ type: '만조', time: '', height: 600, at: ms });

  it('바람이 약하고 물때·아침 시간대면 만점', () => {
    expect(getFishingScore(1, [event(at(6, 30))], at(6))).toBe(100);
  });

  it('만조 ±90분 안에서만 물때 가점', () => {
    const base = getFishingScore(3, [], at(12));
    expect(getFishingScore(3, [event(at(13, 30))], at(12))).toBe(base + 15);
    expect(getFishingScore(3, [event(at(13, 31))], at(12))).toBe(base);
  });

  it('강풍이면 0점 아래로 내려가지 않는다', () => {
    expect(getFishingScore(20, null, at(12))).toBe(25);
    expect(getFishingScore(20, null, at(12))).toBeGreaterThanOrEqual(0);
  });
});

describe('조석예보 응답 파싱', () => {
  const mockFetch = (body: unknown) => {
    global.fetch = jest.fn().mockResolvedValue({ json: async () => body }) as unknown as typeof fetch;
  };
  const items = [
    { predcDt: '2026-09-27 15:10', predcTdlvVl: '702.4', extrSe: 3 },
    { predcDt: '2026-09-27 03:02', predcTdlvVl: 689, extrSe: '1' },
    { predcDt: '202609270921', predcTdlvVl: 88, extrSe: 2 },
    { predcDt: '엉뚱한 값', predcTdlvVl: 1, extrSe: 1 },
    { predcDt: '2026-09-27 21:40', predcTdlvVl: 70, extrSe: 9 },
  ];

  it('정상 응답을 시각순 만조/간조로 바꾸고 잘못된 항목은 버린다', async () => {
    mockFetch({ response: { header: { resultCode: '00' }, body: { items: { item: items } } } });
    const events = await fetchTideForecast('DT_0001', new Date(BEFORE_9AM_KST));
    expect(events.map((e) => [e.type, e.time, e.height])).toEqual([
      ['만조', '03:02', 689],
      ['간조', '09:21', 88],
      ['만조', '15:10', 702],
    ]);
  });

  it('item이 배열이 아니라 객체 하나여도 처리한다', async () => {
    mockFetch({ header: { resultCode: '00' }, body: { items: { item: items[0] } } });
    expect(await fetchTideForecast('DT_0001')).toHaveLength(1);
  });

  it('오류 코드나 모르는 형태면 빈 배열', async () => {
    mockFetch({ response: { header: { resultCode: '30', resultMsg: 'SERVICE KEY IS NOT REGISTERED' } } });
    expect(await fetchTideForecast('DT_0001')).toEqual([]);
    mockFetch('<xml>error</xml>');
    expect(await fetchTideForecast('DT_0001')).toEqual([]);
  });
});
