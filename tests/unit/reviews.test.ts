import { describe, it, expect } from 'vitest';
import { scoreToStars, verdictLabel } from '@/lib/reviews';

describe('scoreToStars', () => {
  it('maps 0-100 to 0-5 rounded to the nearest half star', () => {
    expect(scoreToStars(100)).toBe(5);
    expect(scoreToStars(0)).toBe(0);
    expect(scoreToStars(50)).toBe(2.5);
    expect(scoreToStars(85)).toBe(4.5); // 4.25 → nearest half = 4.5
    expect(scoreToStars(70)).toBe(3.5);
  });

  it('clamps out-of-range scores', () => {
    expect(scoreToStars(150)).toBe(5);
    expect(scoreToStars(-20)).toBe(0);
  });
});

describe('verdictLabel', () => {
  it('bands scores into human labels', () => {
    expect(verdictLabel(90)).toBe('Essential');
    expect(verdictLabel(75)).toBe('Recommended');
    expect(verdictLabel(55)).toBe('Mixed');
    expect(verdictLabel(35)).toBe('Skip');
    expect(verdictLabel(10)).toBe('Avoid');
  });

  it('uses inclusive lower bounds at the band edges', () => {
    expect(verdictLabel(85)).toBe('Essential');
    expect(verdictLabel(70)).toBe('Recommended');
    expect(verdictLabel(50)).toBe('Mixed');
    expect(verdictLabel(30)).toBe('Skip');
  });
});
