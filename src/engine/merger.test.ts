import { describe, it, expect, beforeEach } from 'vitest';
import Matter from 'matter-js';
import { createPhysicsEngine, createHeroBody, getHeroBodies } from './physics';
import { processMerges } from './merger';

const { Body } = Matter;

describe('merger', () => {
  let engine: Matter.Engine;
  beforeEach(() => { engine = createPhysicsEngine(); });

  it('does not merge different tiers', () => {
    createHeroBody(engine.world, { tier: 1, nameZh: 'A', radius: 20, x: 180, y: 200 });
    createHeroBody(engine.world, { tier: 2, nameZh: 'B', radius: 23, x: 200, y: 200 });
    const results = processMerges(engine.world, Date.now());
    expect(results).toHaveLength(0);
  });

  it('does not merge when bodies are far apart', () => {
    createHeroBody(engine.world, { tier: 1, nameZh: 'A', radius: 20, x: 50, y: 200 });
    createHeroBody(engine.world, { tier: 1, nameZh: 'B', radius: 20, x: 300, y: 200 });
    const results = processMerges(engine.world, Date.now());
    expect(results).toHaveLength(0);
  });

  it('merges two same-tier overlapping bodies into next tier', () => {
    const a = createHeroBody(engine.world, { tier: 1, nameZh: 'A', radius: 20, x: 180, y: 200 });
    const b = createHeroBody(engine.world, { tier: 1, nameZh: 'B', radius: 20, x: 190, y: 200 });
    // Move them to overlap
    Body.setPosition(a, { x: 180, y: 200 });
    Body.setPosition(b, { x: 181, y: 200 });
    const results = processMerges(engine.world, Date.now());
    expect(results).toHaveLength(1);
    expect(results[0].removed).toHaveLength(2);
    expect(results[0].created).not.toBeNull();
    expect((results[0].created as any).heroTier).toBe(2);
    expect(results[0].scoreDelta).toBeGreaterThan(0);
  });

  it('awards YAO_YAO_SCORE when merging two tier-10 bodies', () => {
    const a = createHeroBody(engine.world, { tier: 10, nameZh: '瑶', radius: 45, x: 180, y: 200 });
    const b = createHeroBody(engine.world, { tier: 10, nameZh: '瑶', radius: 45, x: 200, y: 200 });
    Body.setPosition(a, { x: 180, y: 200 });
    Body.setPosition(b, { x: 185, y: 200 });
    const results = processMerges(engine.world, Date.now());
    expect(results).toHaveLength(1);
    expect(results[0].created).toBeNull();
    expect(results[0].scoreDelta).toBe(5000);
  });

  it('respects merge cooldown', () => {
    const a = createHeroBody(engine.world, { tier: 1, nameZh: 'A', radius: 20, x: 180, y: 200 });
    const b = createHeroBody(engine.world, { tier: 1, nameZh: 'B', radius: 20, x: 190, y: 200 });
    Body.setPosition(a, { x: 180, y: 200 });
    Body.setPosition(b, { x: 181, y: 200 });
    // Set cooldown into the future
    const future = Date.now() + 10000;
    (a as any).mergeCooldownUntil = future;
    (b as any).mergeCooldownUntil = future;
    const results = processMerges(engine.world, Date.now());
    expect(results).toHaveLength(0);
  });
});
