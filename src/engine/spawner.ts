import Matter from 'matter-js';
import {
  HERO_CHAIN, SPAWN_TABLE, CONTAINER_WIDTH, SPAWN_Y, SPAWN_MAX_RETRIES,
} from '../constants';
import { createHeroBody, getHeroBodies, type HeroBodyOptions } from './physics';

const { Body } = Matter;

/** Weighted random selection of hero tier (1–4). */
export function pickRandomTier(): number {
  const r = Math.random();
  let cumulative = 0;
  for (const entry of SPAWN_TABLE) {
    cumulative += entry.probability;
    if (r <= cumulative) return entry.tier;
  }
  return SPAWN_TABLE[SPAWN_TABLE.length - 1].tier;
}

/** Pick a valid spawn X position that doesn't overlap existing bodies (with retries). */
export function pickSpawnX(world: Matter.World, radius: number): number {
  const minX = radius + 5;
  const maxX = CONTAINER_WIDTH - radius - 5;
  const existing = getHeroBodies(world);

  for (let attempt = 0; attempt < SPAWN_MAX_RETRIES; attempt++) {
    const x = minX + Math.random() * (maxX - minX);
    let blocked = false;
    for (const body of existing) {
      if (Math.abs(body.position.x - x) < (radius + (body as any).heroRadius)) {
        blocked = true;
        break;
      }
    }
    if (!blocked) return x;
  }
  // Fallback: center, blocked spawn will retry on next tick
  return CONTAINER_WIDTH / 2;
}

/** Create and return a randomly selected hero at the spawn position. */
export function spawnHero(world: Matter.World): Matter.Body | null {
  const tier = pickRandomTier();
  const hero = HERO_CHAIN.find(h => h.tier === tier);
  if (!hero) return null;

  const x = pickSpawnX(world, hero.radius);
  const opts: HeroBodyOptions = { tier: hero.tier, nameZh: hero.nameZh, radius: hero.radius, x, y: SPAWN_Y };
  return createHeroBody(world, opts);
}

/** Preview next hero tier (for HUD display). */
export function previewNextTier(): number {
  return pickRandomTier();
}
