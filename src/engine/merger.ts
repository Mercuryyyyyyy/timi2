import Matter from 'matter-js';
import { HERO_CHAIN, YAO_YAO_SCORE, MERGE_COOLDOWN_MS, CONTAINER_WIDTH, CONTAINER_HEIGHT } from '../constants';
import { createHeroBody, removeBody, getPendingMerges, clearPendingMerges } from './physics';
import { pickRandomTier } from './spawner';

const { Body } = Matter;

export interface MergeResult {
  removed: Matter.Body[];
  created: Matter.Body | null;
  scoreDelta: number;
  /** Extra bodies spawned after a 瑶+瑶 merge (cleanup refresh) */
  spawnedBodies?: Matter.Body[];
}

/**
 * Process collision-detected merge pairs and produce merge results.
 * After removing old bodies, creates the combined hero (or awards YAO_YAO_SCORE).
 */
export function processMerges(world: Matter.World, now: number): MergeResult[] {
  const results: MergeResult[] = [];
  const pairs = [...getPendingMerges()];
  clearPendingMerges();

  const processed = new Set<number>();

  for (const [bodyA, bodyB] of pairs) {
    // Skip if either body was already merged in this batch (e.g. 3+ simultaneous collisions)
    if (processed.has(bodyA.id) || processed.has(bodyB.id)) continue;
    processed.add(bodyA.id);
    processed.add(bodyB.id);

    const tierI = (bodyA as any).heroTier;
    const nextTier = tierI + 1;
    const nextHero = HERO_CHAIN.find(h => h.tier === nextTier);

    // Set cooldown
    (bodyA as any).mergeCooldownUntil = now + MERGE_COOLDOWN_MS;
    (bodyB as any).mergeCooldownUntil = now + MERGE_COOLDOWN_MS;

    const centerX = (bodyA.position.x + bodyB.position.x) / 2;
    const centerY = (bodyA.position.y + bodyB.position.y) / 2;

    removeBody(world, bodyA);
    removeBody(world, bodyB);

    let created: Matter.Body | null = null;
    let scoreDelta = 0;

    if (nextHero) {
      created = createHeroBody(world, {
        tier: nextHero.tier,
        nameZh: nextHero.nameZh,
        radius: nextHero.radius,
        x: centerX,
        y: centerY,
      });
      Body.setVelocity(created, { x: 0, y: -2 });
      scoreDelta = nextHero.score;
    } else {
      // 瑶 + 瑶: both disappear, award score, spawn 3 small heroes as cleanup refresh
      scoreDelta = YAO_YAO_SCORE;
      const spawnedBodies: Matter.Body[] = [];
      for (let i = 0; i < 3; i++) {
        const tier = pickRandomTier();
        const hero = HERO_CHAIN.find(h => h.tier === tier);
        if (hero) {
          const sx = 40 + Math.random() * (CONTAINER_WIDTH - 80);
          const sy = CONTAINER_HEIGHT - 60 - Math.random() * 120;
          const body = createHeroBody(world, {
            tier: hero.tier, nameZh: hero.nameZh, radius: hero.radius, x: sx, y: sy,
          });
          Body.setVelocity(body, { x: (Math.random() - 0.5) * 2, y: -3 });
          spawnedBodies.push(body);
        }
      }
      results.push({ removed: [bodyA, bodyB], created: null, scoreDelta, spawnedBodies });
      continue;
    }

    results.push({ removed: [bodyA, bodyB], created, scoreDelta });
  }

  return results;
}
