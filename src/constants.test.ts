import { describe, it, expect } from 'vitest';
import {
  HERO_CHAIN,
  SPAWN_TABLE,
  getHeroByTier,
  getHeroImagePath,
  getFontSize,
  YAO_YAO_SCORE,
} from './constants';

describe('constants', () => {
  it('HERO_CHAIN has exactly 10 entries', () => {
    expect(HERO_CHAIN).toHaveLength(10);
  });

  it('HERO_CHAIN tiers are 1 through 10 in order', () => {
    HERO_CHAIN.forEach((h, i) => {
      expect(h.tier).toBe(i + 1);
    });
  });

  it('radii increase monotonically', () => {
    for (let i = 1; i < HERO_CHAIN.length; i++) {
      expect(HERO_CHAIN[i].radius).toBeGreaterThan(HERO_CHAIN[i - 1].radius);
    }
  });

  it('radii match formula: 20 + (tier-1)*25/9 rounded to nearest int', () => {
    HERO_CHAIN.forEach(h => {
      const expected = Math.round(20 + (h.tier - 1) * (25 / 9));
      expect(h.radius).toBe(expected);
    });
  });

  it('scores match formula: tier1=0, tiers 2-10 = 10 * 2^(tier-2)', () => {
    expect(HERO_CHAIN[0].score).toBe(0);
    for (let i = 1; i < HERO_CHAIN.length; i++) {
      const expected = 10 * Math.pow(2, HERO_CHAIN[i].tier - 2);
      expect(HERO_CHAIN[i].score).toBe(expected);
    }
  });

  it('spawn probabilities sum to 1.0', () => {
    const sum = SPAWN_TABLE.reduce((acc, s) => acc + s.probability, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('getHeroByTier returns correct hero', () => {
    const yao = getHeroByTier(10);
    expect(yao?.nameZh).toBe('瑶');
  });

  it('getHeroByTier returns undefined for invalid tier', () => {
    expect(getHeroByTier(0)).toBeUndefined();
    expect(getHeroByTier(11)).toBeUndefined();
  });

  it('getHeroImagePath produces expected filename pattern', () => {
    const path = getHeroImagePath(3, 'kai');
    expect(path).toBe('heroes/03-kai');
  });

  it('getFontSize returns correct sizes for radius ranges', () => {
    expect(getFontSize(20)).toBe(10);
    expect(getFontSize(23)).toBe(10);
    expect(getFontSize(26)).toBe(12);
    expect(getFontSize(37)).toBe(12);
    expect(getFontSize(39)).toBe(14);
    expect(getFontSize(45)).toBe(14);
  });

  it('YAO_YAO_SCORE is 5000', () => {
    expect(YAO_YAO_SCORE).toBe(5000);
  });
});
