import { describe, it, expect, beforeEach } from 'vitest';
import Matter from 'matter-js';
import { createPhysicsEngine, createHeroBody, getHeroBodies } from './physics';
import { processMerges } from './merger';

describe('merger', () => {
  let engine: Matter.Engine;
  beforeEach(() => { engine = createPhysicsEngine(); });

  it('does not merge different tiers', () => {
    createHeroBody(engine.world, { tier: 1, nameZh: 'A', radius: 20, x: 180, y: 200 });
    createHeroBody(engine.world, { tier: 2, nameZh: 'B', radius: 23, x: 181, y: 200 });
    // Run physics step to trigger collision detection
    Matter.Engine.update(engine, 16);
    const results = processMerges(engine.world, Date.now());
    expect(results).toHaveLength(0);
  });

  it('does not merge when bodies are far apart', () => {
    createHeroBody(engine.world, { tier: 1, nameZh: 'A', radius: 20, x: 50, y: 200 });
    createHeroBody(engine.world, { tier: 1, nameZh: 'B', radius: 20, x: 300, y: 200 });
    Matter.Engine.update(engine, 16);
    const results = processMerges(engine.world, Date.now());
    expect(results).toHaveLength(0);
  });

  it('merges two same-tier overlapping bodies into next tier', () => {
    createHeroBody(engine.world, { tier: 1, nameZh: 'A', radius: 20, x: 180, y: 200 });
    createHeroBody(engine.world, { tier: 1, nameZh: 'B', radius: 20, x: 181, y: 200 });
    Matter.Engine.update(engine, 16);
    const results = processMerges(engine.world, Date.now());
    expect(results).toHaveLength(1);
    expect(results[0].removed).toHaveLength(2);
    expect(results[0].created).not.toBeNull();
    expect((results[0].created as any).heroTier).toBe(2);
    expect(results[0].scoreDelta).toBeGreaterThan(0);
  });

  it('awards YAO_YAO_SCORE when merging two tier-11 bodies', () => {
    createHeroBody(engine.world, { tier: 11, nameZh: '瑶', radius: 45, x: 180, y: 200 });
    createHeroBody(engine.world, { tier: 11, nameZh: '瑶', radius: 45, x: 185, y: 200 });
    Matter.Engine.update(engine, 16);
    const results = processMerges(engine.world, Date.now());
    expect(results).toHaveLength(1);
    expect(results[0].created).toBeNull();
    expect(results[0].scoreDelta).toBe(10000);
  });

  it('respects merge cooldown', () => {
    const a = createHeroBody(engine.world, { tier: 1, nameZh: 'A', radius: 20, x: 180, y: 200 });
    const b = createHeroBody(engine.world, { tier: 1, nameZh: 'B', radius: 20, x: 181, y: 200 });
    // Set cooldown into the future (use performance.now() to match listener's clock source)
    const future = performance.now() + 10000;
    (a as any).mergeCooldownUntil = future;
    (b as any).mergeCooldownUntil = future;
    Matter.Engine.update(engine, 16);
    const results = processMerges(engine.world, performance.now());
    expect(results).toHaveLength(0);
  });
});
