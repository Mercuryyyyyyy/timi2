import { describe, it, expect } from 'vitest';
import { HERO_CHAIN, getHeroByTier, YAO_YAO_SCORE, getHeroImagePath } from './constants';

describe('integration: hero chain integrity', () => {
  it('all 11 heroes have valid properties', () => {
    for (const hero of HERO_CHAIN) {
      expect(hero.tier).toBeGreaterThan(0);
      expect(hero.nameZh.length).toBeGreaterThan(0);
      expect(hero.nameEn.length).toBeGreaterThan(0);
      expect(hero.heroId).toBeGreaterThan(0);
      expect(hero.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(hero.radius).toBeGreaterThan(0);
    }
  });

  it('merge chain scoring is correct end-to-end', () => {
    expect(getHeroByTier(2)!.score).toBe(10);
    expect(getHeroByTier(5)!.score).toBe(80);
    expect(getHeroByTier(11)!.score).toBe(5120);
    expect(YAO_YAO_SCORE).toBe(10000);
  });

  it('hero chain has ascending radii', () => {
    for (let i = 1; i < HERO_CHAIN.length; i++) {
      expect(HERO_CHAIN[i].radius).toBeGreaterThan(HERO_CHAIN[i - 1].radius);
    }
  });

  it('hero IDs match expected values from API', () => {
    expect(HERO_CHAIN[0].heroId).toBe(132);  // 马可波罗
    expect(HERO_CHAIN[1].heroId).toBe(157);  // 不知火舞
    expect(HERO_CHAIN[2].heroId).toBe(182);  // 干将莫邪
    expect(HERO_CHAIN[3].heroId).toBe(193);  // 铠
    expect(HERO_CHAIN[4].heroId).toBe(127);  // 甄姬
    expect(HERO_CHAIN[5].heroId).toBe(538);  // 云缨
    expect(HERO_CHAIN[6].heroId).toBe(563);  // 海诺
    expect(HERO_CHAIN[7].heroId).toBe(174);  // 虞姬
    expect(HERO_CHAIN[8].heroId).toBe(106);  // 小乔
    expect(HERO_CHAIN[9].heroId).toBe(184);  // 蔡文姬
    expect(HERO_CHAIN[10].heroId).toBe(505); // 瑶
  });

  it('getHeroImagePath generates correct filenames', () => {
    expect(getHeroImagePath(1, 'marco_polo')).toBe('heroes/01-marcopolo');
    expect(getHeroImagePath(11, 'yao')).toBe('heroes/11-yao');
  });
});
