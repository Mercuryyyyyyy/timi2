import { describe, it, expect, beforeEach } from 'vitest';
import Matter from 'matter-js';
import { createPhysicsEngine } from './physics';
import { pickRandomTier, pickSpawnX, spawnHero, previewNextTier } from './spawner';
import { SPAWN_TABLE, CONTAINER_WIDTH } from '../constants';

describe('spawner', () => {
  let engine: Matter.Engine;
  beforeEach(() => { engine = createPhysicsEngine(); });

  it('pickRandomTier returns a valid tier from spawn table', () => {
    for (let i = 0; i < 100; i++) {
      const tier = pickRandomTier();
      expect(tier).toBeGreaterThanOrEqual(1);
      expect(tier).toBeLessThanOrEqual(4);
    }
  });

  it('pickRandomTier distribution approximates weights over 1000 iterations', () => {
    const counts: Record<number, number> = {};
    for (let i = 0; i < 1000; i++) {
      const tier = pickRandomTier();
      counts[tier] = (counts[tier] || 0) + 1;
    }
    // Tier 1 (40%) should be most common, tier 4 (10%) least common
    expect(counts[1]).toBeGreaterThan(counts[4]);
  });

  it('pickSpawnX returns a value within container bounds', () => {
    const x = pickSpawnX(engine.world, 25);
    expect(x).toBeGreaterThanOrEqual(25);
    expect(x).toBeLessThanOrEqual(CONTAINER_WIDTH - 25);
  });

  it('pickSpawnX returns center when blocked repeatedly', () => {
    // Fill the world with hero-mimicking bodies to force fallback
    for (let x = 40; x < CONTAINER_WIDTH - 40; x += 30) {
      const body = Matter.Bodies.circle(x, 100, 15, { isStatic: true });
      (body as any).heroTier = 1;
      (body as any).heroRadius = 15;
      Matter.Composite.add(engine.world, body);
    }
    const x = pickSpawnX(engine.world, 55);
    expect(x).toBe(CONTAINER_WIDTH / 2);
  });

  it('spawnHero creates a body with valid tier (1-4)', () => {
    const body = spawnHero(engine.world);
    expect(body).not.toBeNull();
    expect((body as any).heroTier).toBeGreaterThanOrEqual(1);
    expect((body as any).heroTier).toBeLessThanOrEqual(4);
  });

  it('previewNextTier returns a valid tier (1-4)', () => {
    const tier = previewNextTier();
    expect(tier).toBeGreaterThanOrEqual(1);
    expect(tier).toBeLessThanOrEqual(4);
  });
});
