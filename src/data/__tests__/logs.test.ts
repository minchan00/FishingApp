import { ratingFor } from '../logs';

jest.mock('@/lib/supabase', () => ({ supabase: {}, unwrap: jest.fn(), check: jest.fn() }));
jest.mock('../photos', () => ({ photoUrl: jest.fn(), resolvePhoto: jest.fn() }));

describe('일지 평가', () => {
  const c = (count: number) => ({ species: '광어', sizeCm: null, count });

  it('조과 마릿수 합으로 평가한다', () => {
    expect(ratingFor([])).toBe('꽝');
    expect(ratingFor([c(1)])).toBe('보통');
    expect(ratingFor([c(3)])).toBe('보통');
    expect(ratingFor([c(2), c(2)])).toBe('대박');
  });
});
