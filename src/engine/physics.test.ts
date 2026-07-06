import { describe, it, expect, beforeEach } from 'vitest';
import Matter from 'matter-js';
import { createPhysicsEngine, createHeroBody, clampBodyVelocity, getHeroBodies, removeBody, HERO_CATEGORY } from './physics';
import { MAX_VELOCITY } from '../constants';

describe('physics', () => {
  let engine: Matter.Engine;
  beforeEach(() => { engine = createPhysicsEngine(); });

  it('creates engine with gravity', () => {
    expect(engine.gravity.y).toBeGreaterThan(0);
  });

  it('has 3 wall bodies', () => {
    const heroCount = engine.world.bodies.filter(b => (b as any).heroTier != null).length;
    expect(engine.world.bodies.length - heroCount).toBe(3);
  });

  it('creates a hero body with correct properties', () => {
    const body = createHeroBody(engine.world, { tier: 1, nameZh: '马可波罗', radius: 20, x: 180, y: 100 });
    expect((body as any).heroTier).toBe(1);
    expect((body as any).heroNameZh).toBe('马可波罗');
    expect((body as any).heroRadius).toBe(20);
    expect((body as any).mergeCooldownUntil).toBe(0);
    expect(body.collisionFilter.category).toBe(HERO_CATEGORY);
  });

  it('clampBodyVelocity caps excessive positive velocity at MAX_VELOCITY', () => {
    const body = createHeroBody(engine.world, { tier: 1, nameZh: 'Test', radius: 20, x: 180, y: 100 });
    Matter.Body.setVelocity(body, { x: 100, y: 100 });
    clampBodyVelocity(body);
    expect(body.velocity.x).toBe(MAX_VELOCITY);
    expect(body.velocity.y).toBe(MAX_VELOCITY);
  });

  it('clampBodyVelocity caps excessive negative velocity at -MAX_VELOCITY', () => {
    const body = createHeroBody(engine.world, { tier: 1, nameZh: 'Test', radius: 20, x: 180, y: 100 });
    Matter.Body.setVelocity(body, { x: -100, y: -100 });
    clampBodyVelocity(body);
    expect(body.velocity.x).toBe(-MAX_VELOCITY);
    expect(body.velocity.y).toBe(-MAX_VELOCITY);
  });

  it('clampBodyVelocity does not modify velocity below the cap', () => {
    const body = createHeroBody(engine.world, { tier: 1, nameZh: 'Test', radius: 20, x: 180, y: 100 });
    Matter.Body.setVelocity(body, { x: 5, y: -3 });
    clampBodyVelocity(body);
    expect(body.velocity.x).toBe(5);
    expect(body.velocity.y).toBe(-3);
  });

  it('getHeroBodies returns only hero bodies', () => {
    createHeroBody(engine.world, { tier: 1, nameZh: 'A', radius: 20, x: 100, y: 100 });
    createHeroBody(engine.world, { tier: 2, nameZh: 'B', radius: 23, x: 200, y: 100 });
    expect(getHeroBodies(engine.world)).toHaveLength(2);
  });

  it('removeBody removes a body from the world', () => {
    const body = createHeroBody(engine.world, { tier: 1, nameZh: 'A', radius: 20, x: 100, y: 100 });
    expect(getHeroBodies(engine.world)).toHaveLength(1);
    removeBody(engine.world, body);
    expect(getHeroBodies(engine.world)).toHaveLength(0);
  });
});
